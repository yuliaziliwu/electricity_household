from decimal import Decimal

from flask import Blueprint, jsonify

from utils.auth_guard import get_current_user
from utils.db_conn import get_db_connection
from utils.rules_dss import generate_dss_recommendations


rekomendasi_bp = Blueprint('rekomendasi', __name__)


def get_request_user_id():
    current_user, error_response = get_current_user()
    if error_response:
        return None, error_response

    return current_user["user_id"], None


def ensure_rekomendasi_columns(cursor):
    column_statements = [
        """
        IF COL_LENGTH('dbo.rekomendasi', 'kode') IS NULL
            ALTER TABLE dbo.rekomendasi ADD kode NVARCHAR(20) NULL
        """,
        """
        IF COL_LENGTH('dbo.rekomendasi', 'prioritas') IS NULL
            ALTER TABLE dbo.rekomendasi ADD prioritas NVARCHAR(20) NULL
        """,
        """
        IF COL_LENGTH('dbo.rekomendasi', 'kategori') IS NULL
            ALTER TABLE dbo.rekomendasi ADD kategori NVARCHAR(50) NULL
        """,
        """
        IF COL_LENGTH('dbo.rekomendasi', 'potensi_hemat') IS NULL
            ALTER TABLE dbo.rekomendasi ADD potensi_hemat DECIMAL(15,2) NOT NULL DEFAULT 0
        """,
    ]

    for statement in column_statements:
        cursor.execute(statement)


def serialize_rekomendasi(row):
    return {
        "rekomendasi_id": row[0],
        "user_id": row[1],
        "kode": row[2] or "DSS",
        "teks": row[3],
        "prioritas": row[4] or "rendah",
        "kategori": row[5] or "default",
        "potensi_hemat": float(row[6] or 0),
        "tanggal": row[7].isoformat() if row[7] else None,
        "sudah_diterapkan": bool(row[8]),
    }


def fetch_user_profile(cursor, user_id):
    cursor.execute(
        """
        SELECT user_id, username, email, role, daya_terpasang, jumlah_penghuni
        FROM users
        WHERE user_id = ?
        """,
        (user_id,)
    )
    row = cursor.fetchone()
    if not row:
        return None

    return {
        "user_id": row[0],
        "username": row[1],
        "email": row[2],
        "role": row[3] or 'end_user',
        "daya_terpasang": row[4],
        "jumlah_penghuni": row[5] or 1,
    }


def fetch_alat(cursor, user_id):
    cursor.execute(
        """
        SELECT alat_id, nama_alat, jumlah, daya_watt, jam_default_per_hari
        FROM alat_elektronik
        WHERE user_id = ?
        ORDER BY alat_id ASC
        """,
        (user_id,)
    )
    return [
        {
            "alat_id": row[0],
            "nama_alat": row[1],
            "jumlah": row[2],
            "daya_watt": row[3],
            "jam_default_per_hari": row[4],
        }
        for row in cursor.fetchall()
    ]


def fetch_konsumsi_harian(cursor, user_id):
    cursor.execute(
        """
        SELECT tanggal, konsumsi_kWh
        FROM v_konsumsi_harian
        WHERE user_id = ?
        ORDER BY tanggal ASC
        """,
        (user_id,)
    )
    return [
        {
            "tanggal": row[0],
            "konsumsi_kWh": row[1],
        }
        for row in cursor.fetchall()
    ]


def fetch_active_tarif(cursor, daya_va):
    cursor.execute(
        """
        SELECT TOP 1 tarif_per_kwh
        FROM tarif_listrik
        WHERE daya_va = ?
          AND berlaku_dari <= CAST(GETDATE() AS DATE)
          AND (berlaku_sampai IS NULL OR berlaku_sampai >= CAST(GETDATE() AS DATE))
        ORDER BY berlaku_dari DESC
        """,
        (daya_va,)
    )
    row = cursor.fetchone()
    if not row:
        return None

    return Decimal(str(row[0]))


def insert_recommendations(cursor, user_id, recommendations):
    inserted_rows = []
    for item in recommendations:
        cursor.execute(
            """
            INSERT INTO rekomendasi
                (user_id, teks_rekomendasi, kode, prioritas, kategori, potensi_hemat)
            OUTPUT INSERTED.rekomendasi_id,
                   INSERTED.user_id,
                   INSERTED.kode,
                   INSERTED.teks_rekomendasi,
                   INSERTED.prioritas,
                   INSERTED.kategori,
                   INSERTED.potensi_hemat,
                   INSERTED.tanggal,
                   INSERTED.sudah_diterapkan
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                item["teks"],
                item["kode"],
                item["prioritas"],
                item["kategori"],
                item["potensi_hemat"],
            )
        )
        inserted_rows.append(cursor.fetchone())

    return [serialize_rekomendasi(row) for row in inserted_rows]


def fetch_recommendation_history(cursor, user_id):
    cursor.execute(
        """
        SELECT rekomendasi_id,
               user_id,
               kode,
               teks_rekomendasi,
               prioritas,
               kategori,
               potensi_hemat,
               tanggal,
               sudah_diterapkan
        FROM rekomendasi
        WHERE user_id = ?
        ORDER BY tanggal DESC, rekomendasi_id DESC
        """,
        (user_id,)
    )
    return [serialize_rekomendasi(row) for row in cursor.fetchall()]


@rekomendasi_bp.route('/', methods=['GET'], strict_slashes=False)
def generate_rekomendasi():
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_rekomendasi_columns(cursor)

        user = fetch_user_profile(cursor, user_id)
        if not user:
            return jsonify({"error": "User tidak ditemukan"}), 404

        alat_list = fetch_alat(cursor, user_id)
        konsumsi_harian = fetch_konsumsi_harian(cursor, user_id)
        tarif_per_kwh = fetch_active_tarif(cursor, user["daya_terpasang"])
        recommendations = generate_dss_recommendations(
            user,
            alat_list,
            konsumsi_harian,
            tarif_per_kwh,
        )
        inserted = insert_recommendations(cursor, user_id, recommendations)
        conn.commit()

        return jsonify({
            "message": "Rekomendasi DSS berhasil dibuat",
            "rekomendasi": inserted,
        }), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@rekomendasi_bp.route('/riwayat', methods=['GET'])
def list_riwayat_rekomendasi():
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_rekomendasi_columns(cursor)
        conn.commit()
        return jsonify({
            "rekomendasi": fetch_recommendation_history(cursor, user_id),
        }), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@rekomendasi_bp.route('/<int:rekomendasi_id>/terapkan', methods=['PUT'])
def mark_rekomendasi_applied(rekomendasi_id):
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_rekomendasi_columns(cursor)
        cursor.execute(
            """
            UPDATE rekomendasi
            SET sudah_diterapkan = 1
            WHERE rekomendasi_id = ? AND user_id = ?
            """,
            (rekomendasi_id, user_id)
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Rekomendasi tidak ditemukan"}), 404

        conn.commit()
        cursor.execute(
            """
            SELECT rekomendasi_id,
                   user_id,
                   kode,
                   teks_rekomendasi,
                   prioritas,
                   kategori,
                   potensi_hemat,
                   tanggal,
                   sudah_diterapkan
            FROM rekomendasi
            WHERE rekomendasi_id = ? AND user_id = ?
            """,
            (rekomendasi_id, user_id)
        )
        return jsonify({
            "message": "Rekomendasi berhasil ditandai sudah diterapkan",
            "rekomendasi": serialize_rekomendasi(cursor.fetchone()),
        }), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()
