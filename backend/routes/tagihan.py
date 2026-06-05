from decimal import Decimal, InvalidOperation

import pyodbc
from flask import Blueprint, jsonify, request

from utils.db_conn import get_db_connection
from utils.auth_guard import get_current_user


tagihan_bp = Blueprint('tagihan', __name__)


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


def serialize_tagihan(row):
    return {
        "tagihan_id": row[0],
        "user_id": row[1],
        "bulan": row[2],
        "tahun": row[3],
        "konsumsi_kWh": float(row[4]) if row[4] is not None else None,
        "biaya": float(row[5]) if row[5] is not None else None,
    }


def get_user_daya(cursor, user_id):
    cursor.execute("SELECT daya_terpasang FROM users WHERE user_id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        return None

    return user[0]


def get_active_tarif(cursor, daya_va):
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
    tarif = cursor.fetchone()
    if not tarif:
        return None

    return Decimal(str(tarif[0]))


def validate_month_year(bulan, tahun):
    try:
        bulan = int(bulan)
        tahun = int(tahun)
    except (TypeError, ValueError):
        return None, None, "Bulan dan tahun harus berupa angka"

    if bulan < 1 or bulan > 12:
        return None, None, "Bulan harus 1 sampai 12"

    if tahun < 2000:
        return None, None, "Tahun minimal 2000"

    return bulan, tahun, None


def normalize_tagihan_item(item, tarif_per_kwh):
    bulan, tahun, error = validate_month_year(item.get('bulan'), item.get('tahun'))
    if error:
        return None, error

    konsumsi_kwh = decimal_or_none(item.get('konsumsi_kWh') or item.get('konsumsi_kwh'))
    biaya = decimal_or_none(item.get('biaya'))

    if konsumsi_kwh is None and biaya is None:
        return None, "Isi konsumsi kWh atau biaya"

    if konsumsi_kwh is None:
        if not tarif_per_kwh or tarif_per_kwh <= 0:
            return None, "Tarif listrik aktif tidak ditemukan untuk daya user"
        konsumsi_kwh = biaya / tarif_per_kwh

    if konsumsi_kwh <= 0:
        return None, "Konsumsi kWh harus lebih dari 0"

    if biaya is not None and biaya < 0:
        return None, "Biaya tidak boleh negatif"

    return {
        "bulan": bulan,
        "tahun": tahun,
        "konsumsi_kWh": round(konsumsi_kwh, 2),
        "biaya": round(biaya, 2) if biaya is not None else None,
    }, None


@tagihan_bp.route('/', methods=['GET'], strict_slashes=False)
def list_tagihan():
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response
    if not user_id:
        return jsonify({"error": "Header Authorization Bearer token atau X-User-Id wajib diisi"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT tagihan_id, user_id, bulan, tahun, konsumsi_kWh, biaya
            FROM tagihan
            WHERE user_id = ?
            ORDER BY tahun DESC, bulan DESC
            """,
            (user_id,)
        )
        return jsonify({"tagihan": [serialize_tagihan(row) for row in cursor.fetchall()]}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@tagihan_bp.route('/bulk', methods=['POST'])
def create_tagihan_bulk():
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response
    if not user_id:
        return jsonify({"error": "Header Authorization Bearer token atau X-User-Id wajib diisi"}), 401

    data = request.get_json(silent=True) or {}
    items = data.get('tagihan') or []

    if len(items) < 3 or len(items) > 6:
        return jsonify({"error": "Input tagihan wajib 3 sampai 6 baris"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        daya_va = get_user_daya(cursor, user_id)
        if not daya_va:
            return jsonify({"error": "User tidak ditemukan"}), 404

        tarif_per_kwh = get_active_tarif(cursor, daya_va)
        normalized_items = []
        month_keys = set()

        for item in items:
            normalized, error = normalize_tagihan_item(item, tarif_per_kwh)
            if error:
                return jsonify({"error": error}), 400

            key = (normalized["bulan"], normalized["tahun"])
            if key in month_keys:
                return jsonify({"error": "Bulan dan tahun tidak boleh duplikat"}), 400

            month_keys.add(key)
            normalized_items.append(normalized)

        for item in normalized_items:
            cursor.execute(
                """
                INSERT INTO tagihan (user_id, bulan, tahun, konsumsi_kWh, biaya)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    item["bulan"],
                    item["tahun"],
                    item["konsumsi_kWh"],
                    item["biaya"],
                )
            )

        conn.commit()

        cursor.execute(
            """
            SELECT tagihan_id, user_id, bulan, tahun, konsumsi_kWh, biaya
            FROM tagihan
            WHERE user_id = ?
            ORDER BY tahun DESC, bulan DESC
            """,
            (user_id,)
        )
        return jsonify({
            "message": "Tagihan berhasil disimpan",
            "tagihan": [serialize_tagihan(row) for row in cursor.fetchall()]
        }), 201
    except pyodbc.IntegrityError:
        if conn:
            conn.rollback()
        return jsonify({"error": "Bulan dan tahun tagihan sudah pernah diinput"}), 409
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@tagihan_bp.route('/<int:tagihan_id>', methods=['PUT'])
def update_tagihan(tagihan_id):
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response
    if not user_id:
        return jsonify({"error": "Header Authorization Bearer token atau X-User-Id wajib diisi"}), 401

    data = request.get_json(silent=True) or {}

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        daya_va = get_user_daya(cursor, user_id)
        if not daya_va:
            return jsonify({"error": "User tidak ditemukan"}), 404

        tarif_per_kwh = get_active_tarif(cursor, daya_va)
        normalized, error = normalize_tagihan_item(data, tarif_per_kwh)
        if error:
            return jsonify({"error": error}), 400

        cursor.execute(
            """
            UPDATE tagihan
            SET bulan = ?, tahun = ?, konsumsi_kWh = ?, biaya = ?
            WHERE tagihan_id = ? AND user_id = ?
            """,
            (
                normalized["bulan"],
                normalized["tahun"],
                normalized["konsumsi_kWh"],
                normalized["biaya"],
                tagihan_id,
                user_id,
            )
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Tagihan tidak ditemukan"}), 404

        conn.commit()

        cursor.execute(
            """
            SELECT tagihan_id, user_id, bulan, tahun, konsumsi_kWh, biaya
            FROM tagihan
            WHERE tagihan_id = ? AND user_id = ?
            """,
            (tagihan_id, user_id)
        )
        return jsonify({
            "message": "Tagihan berhasil diubah",
            "tagihan": serialize_tagihan(cursor.fetchone())
        }), 200
    except pyodbc.IntegrityError:
        if conn:
            conn.rollback()
        return jsonify({"error": "Bulan dan tahun tagihan sudah pernah diinput"}), 409
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@tagihan_bp.route('/<int:tagihan_id>', methods=['DELETE'])
def delete_tagihan(tagihan_id):
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response
    if not user_id:
        return jsonify({"error": "Header Authorization Bearer token atau X-User-Id wajib diisi"}), 401

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM tagihan WHERE tagihan_id = ? AND user_id = ?",
            (tagihan_id, user_id)
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Tagihan tidak ditemukan"}), 404

        conn.commit()
        return jsonify({"message": "Tagihan berhasil dihapus"}), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()
