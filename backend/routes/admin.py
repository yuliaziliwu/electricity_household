from flask import Blueprint, jsonify, request

from utils.auth_guard import admin_required
from utils.db_conn import get_db_connection


admin_bp = Blueprint('admin', __name__)

VALID_ROLES = {'admin', 'end_user'}


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
