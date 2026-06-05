from datetime import date
from decimal import Decimal, InvalidOperation

import pyodbc
from flask import Blueprint, jsonify, request

from utils.auth_guard import get_current_user
from utils.db_conn import get_db_connection


pemakaian_bp = Blueprint('pemakaian', __name__)


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


def parse_date(value):
    if not value:
        return None, "Tanggal wajib diisi"

    try:
        return date.fromisoformat(str(value)), None
    except ValueError:
        return None, "Tanggal harus format YYYY-MM-DD"


def serialize_pemakaian(row):
    jumlah = int(row[5] or 0)
    daya_watt = int(row[6] or 0)
    jam_aktual = Decimal(str(row[4] or 0))
    konsumsi_kwh = Decimal(jumlah * daya_watt) * jam_aktual / Decimal(1000)

    return {
        "pemakaian_id": row[0],
        "user_id": row[1],
        "alat_id": row[2],
        "tanggal": row[3].isoformat() if row[3] else None,
        "jam_aktual": float(jam_aktual),
        "nama_alat": row[7],
        "jumlah": jumlah,
        "daya_watt": daya_watt,
        "konsumsi_kWh": float(round(konsumsi_kwh, 3)),
    }


def serialize_summary(row):
    return {
        "tanggal": row[0].isoformat() if row[0] else None,
        "konsumsi_kWh": float(row[1] or 0),
    }


def validate_jam_aktual(value):
    jam_aktual = decimal_or_none(value)
    if jam_aktual is None:
        return None, "Jam aktual wajib berupa angka"

    if jam_aktual < 0 or jam_aktual > 24:
        return None, "Jam aktual harus 0 sampai 24"

    return round(jam_aktual, 2), None


def ensure_alat_owned(cursor, user_id, alat_id):
    cursor.execute(
        "SELECT alat_id FROM alat_elektronik WHERE alat_id = ? AND user_id = ?",
        (alat_id, user_id)
    )
    return cursor.fetchone() is not None


def normalize_pemakaian_item(item):
    try:
        alat_id = int(item.get('alat_id'))
    except (TypeError, ValueError):
        return None, "Alat wajib dipilih"

    jam_aktual, error = validate_jam_aktual(item.get('jam_aktual'))
    if error:
        return None, error

    return {
        "alat_id": alat_id,
        "jam_aktual": jam_aktual,
    }, None


def fetch_pemakaian(cursor, user_id):
    cursor.execute(
        """
        SELECT ph.pemakaian_id,
               ph.user_id,
               ph.alat_id,
               ph.tanggal,
               ph.jam_aktual,
               ae.jumlah,
               ae.daya_watt,
               ae.nama_alat
        FROM pemakaian_harian ph
        JOIN alat_elektronik ae ON ph.alat_id = ae.alat_id
        WHERE ph.user_id = ?
        ORDER BY ph.tanggal DESC, ph.pemakaian_id DESC
        """,
        (user_id,)
    )
    return [serialize_pemakaian(row) for row in cursor.fetchall()]


def fetch_daily_summary(cursor, user_id):
    cursor.execute(
        """
        SELECT tanggal, konsumsi_kWh
        FROM v_konsumsi_harian
        WHERE user_id = ?
        ORDER BY tanggal DESC
        """,
        (user_id,)
    )
    return [serialize_summary(row) for row in cursor.fetchall()]


@pemakaian_bp.route('/', methods=['GET'], strict_slashes=False)
def list_pemakaian():
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        return jsonify({
            "pemakaian": fetch_pemakaian(cursor, user_id),
            "ringkasan_harian": fetch_daily_summary(cursor, user_id),
            "pesan": "Lengkapi data pemakaian harian untuk mendapatkan rekomendasi pengoptimalan yang lebih akurat!",
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@pemakaian_bp.route('/bulk', methods=['POST'])
def create_pemakaian_bulk():
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    tanggal, error = parse_date(data.get('tanggal'))
    if error:
        return jsonify({"error": error}), 400

    items = data.get('pemakaian') or []
    if not items:
        return jsonify({"error": "Minimal satu data pemakaian wajib diisi"}), 400

    normalized_items = []
    alat_keys = set()
    for item in items:
        normalized, error = normalize_pemakaian_item(item)
        if error:
            return jsonify({"error": error}), 400

        if normalized["alat_id"] in alat_keys:
            return jsonify({"error": "Alat tidak boleh duplikat dalam tanggal yang sama"}), 400

        alat_keys.add(normalized["alat_id"])
        normalized_items.append(normalized)

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        for item in normalized_items:
            if not ensure_alat_owned(cursor, user_id, item["alat_id"]):
                return jsonify({"error": "Alat tidak ditemukan"}), 404

            cursor.execute(
                """
                INSERT INTO pemakaian_harian (user_id, alat_id, tanggal, jam_aktual)
                VALUES (?, ?, ?, ?)
                """,
                (
                    user_id,
                    item["alat_id"],
                    tanggal,
                    item["jam_aktual"],
                )
            )

        conn.commit()
        return jsonify({
            "message": "Pemakaian harian berhasil disimpan",
            "pemakaian": fetch_pemakaian(cursor, user_id),
            "ringkasan_harian": fetch_daily_summary(cursor, user_id),
        }), 201
    except pyodbc.IntegrityError:
        if conn:
            conn.rollback()
        return jsonify({"error": "Pemakaian untuk alat dan tanggal tersebut sudah ada"}), 409
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@pemakaian_bp.route('/<int:pemakaian_id>', methods=['PUT'])
def update_pemakaian(pemakaian_id):
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    tanggal, error = parse_date(data.get('tanggal'))
    if error:
        return jsonify({"error": error}), 400

    normalized, error = normalize_pemakaian_item(data)
    if error:
        return jsonify({"error": error}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if not ensure_alat_owned(cursor, user_id, normalized["alat_id"]):
            return jsonify({"error": "Alat tidak ditemukan"}), 404

        cursor.execute(
            """
            UPDATE pemakaian_harian
            SET alat_id = ?, tanggal = ?, jam_aktual = ?
            WHERE pemakaian_id = ? AND user_id = ?
            """,
            (
                normalized["alat_id"],
                tanggal,
                normalized["jam_aktual"],
                pemakaian_id,
                user_id,
            )
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Pemakaian harian tidak ditemukan"}), 404

        conn.commit()
        return jsonify({
            "message": "Pemakaian harian berhasil diubah",
            "pemakaian": fetch_pemakaian(cursor, user_id),
            "ringkasan_harian": fetch_daily_summary(cursor, user_id),
        }), 200
    except pyodbc.IntegrityError:
        if conn:
            conn.rollback()
        return jsonify({"error": "Pemakaian untuk alat dan tanggal tersebut sudah ada"}), 409
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@pemakaian_bp.route('/<int:pemakaian_id>', methods=['DELETE'])
def delete_pemakaian(pemakaian_id):
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM pemakaian_harian WHERE pemakaian_id = ? AND user_id = ?",
            (pemakaian_id, user_id)
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Pemakaian harian tidak ditemukan"}), 404

        conn.commit()
        return jsonify({
            "message": "Pemakaian harian berhasil dihapus",
            "pemakaian": fetch_pemakaian(cursor, user_id),
            "ringkasan_harian": fetch_daily_summary(cursor, user_id),
        }), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()
