from datetime import date
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request

from utils.auth_guard import admin_required
from utils.db_conn import get_db_connection
from utils.rf_train import retrain_random_forest


admin_bp = Blueprint('admin', __name__)

VALID_ROLES = {'admin', 'end_user'}

DEFAULT_DSS_RULES = [
    ("R1", "Daya kecil", "Daya <= 900 VA", "Hindari menggunakan perangkat tinggi watt secara bersamaan untuk mencegah mati listrik.", 1),
    ("R2", "Daya besar", "Daya >= 1300 VA", "Pertimbangkan mengganti AC dan kulkas dengan varian inverter yang lebih hemat energi.", 1),
    ("R3", "Konsumsi melebihi rata-rata", "Konsumsi per orang > 120 kWh/bulan", "Lakukan audit peralatan listrik karena konsumsi di atas rata-rata rumah tangga sejenis.", 1),
    ("R4", "AC boros", "AC daya > 500W dan jam/hari > 8", "Gunakan timer 6 jam dan set suhu AC sekitar 24 derajat C.", 1),
    ("R5", "Kulkas boros", "Kulkas berusia > 10 tahun", "Pertimbangkan mengganti kulkas lama dengan unit yang lebih efisien.", 1),
    ("R6", "Lonjakan konsumsi", "Konsumsi hari ini > 1.5x rata-rata 7 hari terakhir", "Cek perangkat yang mungkin lupa dimatikan.", 1),
    ("R7", "Akhir pekan boros", "Rata-rata Sabtu-Minggu > 1.3x Senin-Jumat", "Kurangi penggunaan TV dan gaming di hari libur.", 1),
    ("R8", "Risiko melebihi daya", "Estimasi beban puncak > 90 persen kapasitas daya", "Hindari menyalakan banyak perangkat besar bersamaan.", 1),
    ("R9", "Pencahayaan", "Jumlah lampu > 5 dan daya per lampu > 15W", "Ganti lampu ke LED 5-10W untuk menghemat biaya pencahayaan.", 1),
    ("R10", "Standby power", "Aturan default jika tidak ada data spesifik", "Cabut charger, TV, dan perangkat elektronik lain saat tidak digunakan.", 1),
]


def serialize_user(row):
    created_at = row[6]
    return {
        "user_id": row[0],
        "username": row[1],
        "email": row[2],
        "role": row[3] or 'end_user',
        "daya_terpasang": row[4],
        "jumlah_penghuni": row[5],
        "created_at": created_at.isoformat() if created_at else None
    }


def decimal_or_none(value):
    if value in (None, ''):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def serialize_tarif(row):
    return {
        "tarif_id": row[0],
        "daya_va": row[1],
        "tarif_per_kwh": float(row[2]) if row[2] is not None else None,
        "berlaku_dari": row[3].isoformat() if row[3] else None,
        "berlaku_sampai": row[4].isoformat() if row[4] else None,
        "created_at": row[5].isoformat() if row[5] else None,
        "updated_at": row[6].isoformat() if row[6] else None,
    }


def serialize_dss_rule(row):
    return {
        "rule_id": row[0],
        "kode": row[1],
        "nama_aturan": row[2],
        "kondisi": row[3],
        "rekomendasi": row[4],
        "aktif": bool(row[5]),
        "created_at": row[6].isoformat() if row[6] else None,
        "updated_at": row[7].isoformat() if row[7] else None,
    }


def parse_date(value, field_name, required=True):
    if value in (None, ''):
        if required:
            return None, f"{field_name} wajib diisi"
        return None, None
    try:
        return date.fromisoformat(str(value)), None
    except ValueError:
        return None, f"{field_name} harus format YYYY-MM-DD"


def normalize_tarif_payload(data):
    try:
        daya_va = int(data.get('daya_va'))
    except (TypeError, ValueError):
        return None, "Daya VA harus berupa angka"

    tarif_per_kwh = decimal_or_none(data.get('tarif_per_kwh'))
    if tarif_per_kwh is None or tarif_per_kwh <= 0:
        return None, "Tarif per kWh harus lebih dari 0"

    berlaku_dari, error = parse_date(data.get('berlaku_dari'), "Tanggal berlaku dari")
    if error:
        return None, error

    berlaku_sampai, error = parse_date(data.get('berlaku_sampai'), "Tanggal berlaku sampai", required=False)
    if error:
        return None, error

    if berlaku_sampai and berlaku_sampai < berlaku_dari:
        return None, "Tanggal berlaku sampai tidak boleh sebelum berlaku dari"

    return {
        "daya_va": daya_va,
        "tarif_per_kwh": round(tarif_per_kwh, 2),
        "berlaku_dari": berlaku_dari,
        "berlaku_sampai": berlaku_sampai,
    }, None


def normalize_dss_rule_payload(data):
    kode = (data.get('kode') or '').strip().upper()
    nama_aturan = (data.get('nama_aturan') or '').strip()
    kondisi = (data.get('kondisi') or '').strip()
    rekomendasi = (data.get('rekomendasi') or '').strip()
    aktif = 1 if data.get('aktif', True) else 0

    if not kode or not nama_aturan or not kondisi or not rekomendasi:
        return None, "Kode, nama aturan, kondisi, dan rekomendasi wajib diisi"

    return {
        "kode": kode,
        "nama_aturan": nama_aturan,
        "kondisi": kondisi,
        "rekomendasi": rekomendasi,
        "aktif": aktif,
    }, None


def ensure_dss_rules_table(cursor):
    cursor.execute(
        """
        IF OBJECT_ID('dbo.dss_rules', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.dss_rules (
                rule_id INT IDENTITY(1,1) PRIMARY KEY,
                kode NVARCHAR(20) NOT NULL UNIQUE,
                nama_aturan NVARCHAR(150) NOT NULL,
                kondisi NVARCHAR(500) NOT NULL,
                rekomendasi NVARCHAR(500) NOT NULL,
                aktif BIT NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            )
        END
        """
    )
    cursor.execute("SELECT COUNT(*) FROM dbo.dss_rules")
    if cursor.fetchone()[0] == 0:
        cursor.executemany(
            """
            INSERT INTO dbo.dss_rules (kode, nama_aturan, kondisi, rekomendasi, aktif)
            VALUES (?, ?, ?, ?, ?)
            """,
            DEFAULT_DSS_RULES
        )


def fetch_user(cursor, user_id):
    cursor.execute(
        """
        SELECT user_id, username, email, role, daya_terpasang, jumlah_penghuni, created_at
        FROM users
        WHERE user_id = ?
        """,
        (user_id,)
    )
    return cursor.fetchone()


@admin_bp.route('/tarif/daya-options', methods=['GET'])
def get_daya_options():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT DISTINCT daya_va
            FROM electricity_household.dbo.tarif_listrik
            WHERE berlaku_sampai IS NULL OR berlaku_sampai >= CAST(GETDATE() AS DATE)
            ORDER BY daya_va ASC
            """
        )
        return jsonify([
            {"daya_va": row[0]}
            for row in cursor.fetchall()
        ]), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/tarif', methods=['GET'])
@admin_required
def list_tarif():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT tarif_id, daya_va, tarif_per_kwh, berlaku_dari, berlaku_sampai, created_at, updated_at
            FROM tarif_listrik
            ORDER BY daya_va ASC, berlaku_dari DESC
            """
        )
        return jsonify({"tarif": [serialize_tarif(row) for row in cursor.fetchall()]}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/tarif', methods=['POST'])
@admin_required
def create_tarif():
    data = request.get_json(silent=True) or {}
    normalized, error = normalize_tarif_payload(data)
    if error:
        return jsonify({"error": error}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO tarif_listrik (daya_va, tarif_per_kwh, berlaku_dari, berlaku_sampai)
            OUTPUT INSERTED.tarif_id,
                   INSERTED.daya_va,
                   INSERTED.tarif_per_kwh,
                   INSERTED.berlaku_dari,
                   INSERTED.berlaku_sampai,
                   INSERTED.created_at,
                   INSERTED.updated_at
            VALUES (?, ?, ?, ?)
            """,
            (
                normalized["daya_va"],
                normalized["tarif_per_kwh"],
                normalized["berlaku_dari"],
                normalized["berlaku_sampai"],
            )
        )
        tarif = cursor.fetchone()
        conn.commit()
        return jsonify({
            "message": "Tarif listrik berhasil ditambahkan",
            "tarif": serialize_tarif(tarif),
        }), 201
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/tarif/<int:tarif_id>', methods=['PUT'])
@admin_required
def update_tarif(tarif_id):
    data = request.get_json(silent=True) or {}
    normalized, error = normalize_tarif_payload(data)
    if error:
        return jsonify({"error": error}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE tarif_listrik
            SET daya_va = ?, tarif_per_kwh = ?, berlaku_dari = ?, berlaku_sampai = ?, updated_at = GETDATE()
            WHERE tarif_id = ?
            """,
            (
                normalized["daya_va"],
                normalized["tarif_per_kwh"],
                normalized["berlaku_dari"],
                normalized["berlaku_sampai"],
                tarif_id,
            )
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Tarif tidak ditemukan"}), 404

        conn.commit()
        cursor.execute(
            """
            SELECT tarif_id, daya_va, tarif_per_kwh, berlaku_dari, berlaku_sampai, created_at, updated_at
            FROM tarif_listrik
            WHERE tarif_id = ?
            """,
            (tarif_id,)
        )
        return jsonify({
            "message": "Tarif listrik berhasil diubah",
            "tarif": serialize_tarif(cursor.fetchone()),
        }), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/tarif/<int:tarif_id>', methods=['DELETE'])
@admin_required
def delete_tarif(tarif_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tarif_listrik WHERE tarif_id = ?", (tarif_id,))
        if cursor.rowcount == 0:
            return jsonify({"error": "Tarif tidak ditemukan"}), 404

        conn.commit()
        return jsonify({"message": "Tarif listrik berhasil dihapus"}), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/statistics', methods=['GET'])
@admin_required
def global_statistics():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        total_admin = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM users WHERE ISNULL(role, 'end_user') = 'end_user'")
        total_end_user = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(konsumsi_kWh), 0), COALESCE(SUM(biaya), 0) FROM tagihan")
        tagihan_count, total_kwh, total_biaya = cursor.fetchone()
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(konsumsi_kWh), 0), COALESCE(AVG(konsumsi_kWh), 0) FROM v_konsumsi_harian")
        harian_count, harian_kwh, avg_harian = cursor.fetchone()

        cursor.execute(
            """
            SELECT TOP 12 tahun, bulan, COALESCE(SUM(konsumsi_kWh), 0) AS konsumsi_kWh
            FROM tagihan
            GROUP BY tahun, bulan
            ORDER BY tahun DESC, bulan DESC
            """
        )
        monthly_rows = cursor.fetchall()
        monthly_consumption = [
            {"label": f"{row[1]:02d}/{row[0]}", "konsumsi_kWh": float(row[2] or 0)}
            for row in reversed(monthly_rows)
        ]

        cursor.execute(
            """
            SELECT daya_terpasang, COUNT(*) AS total
            FROM users
            GROUP BY daya_terpasang
            ORDER BY daya_terpasang ASC
            """
        )
        users_by_daya = [
            {"daya_va": row[0], "total": row[1]}
            for row in cursor.fetchall()
        ]

        return jsonify({
            "summary": {
                "total_users": total_users,
                "total_admin": total_admin,
                "total_end_user": total_end_user,
                "total_tagihan": tagihan_count,
                "total_kWh_tagihan": float(total_kwh or 0),
                "total_biaya_tagihan": float(total_biaya or 0),
                "total_hari_pemakaian": harian_count,
                "total_kWh_harian": float(harian_kwh or 0),
                "rata_rata_kWh_harian": float(avg_harian or 0),
            },
            "monthly_consumption": monthly_consumption,
            "users_by_daya": users_by_daya,
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/dss-rules', methods=['GET'])
@admin_required
def list_dss_rules():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_dss_rules_table(cursor)
        conn.commit()
        cursor.execute(
            """
            SELECT rule_id, kode, nama_aturan, kondisi, rekomendasi, aktif, created_at, updated_at
            FROM dss_rules
            ORDER BY kode ASC
            """
        )
        return jsonify({"rules": [serialize_dss_rule(row) for row in cursor.fetchall()]}), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/dss-rules', methods=['POST'])
@admin_required
def create_dss_rule():
    data = request.get_json(silent=True) or {}
    normalized, error = normalize_dss_rule_payload(data)
    if error:
        return jsonify({"error": error}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_dss_rules_table(cursor)
        cursor.execute(
            """
            INSERT INTO dss_rules (kode, nama_aturan, kondisi, rekomendasi, aktif)
            OUTPUT INSERTED.rule_id,
                   INSERTED.kode,
                   INSERTED.nama_aturan,
                   INSERTED.kondisi,
                   INSERTED.rekomendasi,
                   INSERTED.aktif,
                   INSERTED.created_at,
                   INSERTED.updated_at
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                normalized["kode"],
                normalized["nama_aturan"],
                normalized["kondisi"],
                normalized["rekomendasi"],
                normalized["aktif"],
            )
        )
        rule = cursor.fetchone()
        conn.commit()
        return jsonify({
            "message": "Aturan DSS berhasil ditambahkan",
            "rule": serialize_dss_rule(rule),
        }), 201
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/dss-rules/<int:rule_id>', methods=['PUT'])
@admin_required
def update_dss_rule(rule_id):
    data = request.get_json(silent=True) or {}
    normalized, error = normalize_dss_rule_payload(data)
    if error:
        return jsonify({"error": error}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_dss_rules_table(cursor)
        cursor.execute(
            """
            UPDATE dss_rules
            SET kode = ?, nama_aturan = ?, kondisi = ?, rekomendasi = ?, aktif = ?, updated_at = GETDATE()
            WHERE rule_id = ?
            """,
            (
                normalized["kode"],
                normalized["nama_aturan"],
                normalized["kondisi"],
                normalized["rekomendasi"],
                normalized["aktif"],
                rule_id,
            )
        )
        if cursor.rowcount == 0:
            return jsonify({"error": "Aturan DSS tidak ditemukan"}), 404

        conn.commit()
        cursor.execute(
            """
            SELECT rule_id, kode, nama_aturan, kondisi, rekomendasi, aktif, created_at, updated_at
            FROM dss_rules
            WHERE rule_id = ?
            """,
            (rule_id,)
        )
        return jsonify({
            "message": "Aturan DSS berhasil diubah",
            "rule": serialize_dss_rule(cursor.fetchone()),
        }), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/dss-rules/<int:rule_id>', methods=['DELETE'])
@admin_required
def delete_dss_rule(rule_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_dss_rules_table(cursor)
        cursor.execute("DELETE FROM dss_rules WHERE rule_id = ?", (rule_id,))
        if cursor.rowcount == 0:
            return jsonify({"error": "Aturan DSS tidak ditemukan"}), 404

        conn.commit()
        return jsonify({"message": "Aturan DSS berhasil dihapus"}), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/retrain-model', methods=['POST'])
@admin_required
def retrain_model():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT t.bulan, t.tahun, t.konsumsi_kWh, u.daya_terpasang, u.jumlah_penghuni
            FROM tagihan t
            JOIN users u ON t.user_id = u.user_id
            ORDER BY t.tahun ASC, t.bulan ASC
            """
        )
        result = retrain_random_forest(cursor.fetchall())
        return jsonify({
            "message": "Model Random Forest berhasil di-retrain",
            **result,
        }), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT user_id, username, email, role, daya_terpasang, jumlah_penghuni, created_at
            FROM users
            ORDER BY user_id ASC
            """
        )
        users = [serialize_user(row) for row in cursor.fetchall()]
        return jsonify({"users": users}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@admin_required
def update_user_role(user_id):
    data = request.get_json(silent=True) or {}
    role = data.get('role')

    if role not in VALID_ROLES:
        return jsonify({"error": "Role hanya boleh admin atau end_user"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        if not fetch_user(cursor, user_id):
            return jsonify({"error": "User tidak ditemukan"}), 404

        cursor.execute(
            """
            UPDATE users
            SET role = ?
            WHERE user_id = ?
            """,
            (role, user_id)
        )
        conn.commit()

        updated_user = fetch_user(cursor, user_id)
        return jsonify({
            "message": "Role user berhasil diubah",
            "user": serialize_user(updated_user)
        }), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()
