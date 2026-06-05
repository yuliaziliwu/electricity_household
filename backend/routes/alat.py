from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request

from utils.auth_guard import get_current_user
from utils.db_conn import get_db_connection


alat_bp = Blueprint('alat', __name__)


def get_request_user_id():
    current_user, error_response = get_current_user()
    if error_response:
        return None, error_response

    return current_user["user_id"], None


def decimal_or_none(value):
    if value in (None, ''):
        return None

    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def serialize_alat(row):
    jumlah = int(row[3] or 0)
    daya_watt = int(row[4] or 0)
    jam_default = Decimal(str(row[5] or 0))
    estimasi_kwh = Decimal(jumlah * daya_watt) * jam_default / Decimal(1000)

    return {
        "alat_id": row[0],
        "user_id": row[1],
        "nama_alat": row[2],
        "jumlah": jumlah,
        "daya_watt": daya_watt,
        "jam_default_per_hari": float(jam_default),
        "estimasi_kWh_per_hari": float(round(estimasi_kwh, 3)),
        "created_at": row[6].isoformat() if row[6] else None,
    }


def normalize_alat_item(item):
    nama_alat = (item.get('nama_alat') or '').strip()
    if not nama_alat:
        return None, "Nama alat wajib diisi"

    try:
        jumlah = int(item.get('jumlah'))
        daya_watt = int(item.get('daya_watt'))
    except (TypeError, ValueError):
        return None, "Jumlah dan daya watt harus berupa angka"

    jam_default = decimal_or_none(item.get('jam_default_per_hari'))
    if jam_default is None:
        return None, "Jam default per hari wajib berupa angka"

    if jumlah < 1:
        return None, "Jumlah alat minimal 1"

    if daya_watt < 1:
        return None, "Daya watt minimal 1"

    if jam_default < 0 or jam_default > 24:
        return None, "Jam default per hari harus 0 sampai 24"

    return {
        "nama_alat": nama_alat,
        "jumlah": jumlah,
        "daya_watt": daya_watt,
        "jam_default_per_hari": round(jam_default, 2),
    }, None


def fetch_alat(cursor, user_id):
    cursor.execute(
        """
        SELECT alat_id, user_id, nama_alat, jumlah, daya_watt, jam_default_per_hari, created_at
        FROM alat_elektronik
        WHERE user_id = ?
        ORDER BY created_at DESC, alat_id DESC
        """,
        (user_id,)
    )
    return [serialize_alat(row) for row in cursor.fetchall()]


@alat_bp.route('/', methods=['GET'], strict_slashes=False)
def list_alat():
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        alat = fetch_alat(cursor, user_id)
        total_estimasi = sum(item["estimasi_kWh_per_hari"] for item in alat)
        return jsonify({
            "alat": alat,
            "total_estimasi_kWh_per_hari": round(total_estimasi, 3),
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@alat_bp.route('/bulk', methods=['POST'])
def create_alat_bulk():
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    items = data.get('alat') or []

    if not items:
        return jsonify({"error": "Minimal satu alat wajib diisi"}), 400

    normalized_items = []
    for item in items:
        normalized, error = normalize_alat_item(item)
        if error:
            return jsonify({"error": error}), 400
        normalized_items.append(normalized)

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        for item in normalized_items:
            cursor.execute(
                """
                INSERT INTO alat_elektronik (user_id, nama_alat, jumlah, daya_watt, jam_default_per_hari)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    item["nama_alat"],
                    item["jumlah"],
                    item["daya_watt"],
                    item["jam_default_per_hari"],
                )
            )

        conn.commit()
        alat = fetch_alat(cursor, user_id)
        return jsonify({
            "message": "Alat elektronik berhasil disimpan",
            "alat": alat,
        }), 201
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@alat_bp.route('/<int:alat_id>', methods=['PUT'])
def update_alat(alat_id):
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    normalized, error = normalize_alat_item(data)
    if error:
        return jsonify({"error": error}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE alat_elektronik
            SET nama_alat = ?, jumlah = ?, daya_watt = ?, jam_default_per_hari = ?
            WHERE alat_id = ? AND user_id = ?
            """,
            (
                normalized["nama_alat"],
                normalized["jumlah"],
                normalized["daya_watt"],
                normalized["jam_default_per_hari"],
                alat_id,
                user_id,
            )
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Alat tidak ditemukan"}), 404

        conn.commit()
        cursor.execute(
            """
            SELECT alat_id, user_id, nama_alat, jumlah, daya_watt, jam_default_per_hari, created_at
            FROM alat_elektronik
            WHERE alat_id = ? AND user_id = ?
            """,
            (alat_id, user_id)
        )
        return jsonify({
            "message": "Alat elektronik berhasil diubah",
            "alat": serialize_alat(cursor.fetchone()),
        }), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@alat_bp.route('/<int:alat_id>', methods=['DELETE'])
def delete_alat(alat_id):
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM pemakaian_harian WHERE alat_id = ? AND user_id = ?",
            (alat_id, user_id)
        )
        cursor.execute(
            "DELETE FROM alat_elektronik WHERE alat_id = ? AND user_id = ?",
            (alat_id, user_id)
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Alat tidak ditemukan"}), 404

        conn.commit()
        return jsonify({"message": "Alat elektronik berhasil dihapus"}), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()
