from functools import wraps

from flask import g, jsonify, request

from utils.db_conn import get_db_connection


def _get_header_user_id():
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return None

    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


def admin_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        user_id = _get_header_user_id()
        if not user_id:
            return jsonify({"error": "Header X-User-Id wajib diisi"}), 401

        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT user_id, username, role
                FROM users
                WHERE user_id = ?
                """,
                (user_id,)
            )
            user = cursor.fetchone()
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            if conn:
                conn.close()

        if not user:
            return jsonify({"error": "User tidak ditemukan"}), 401

        role = user[2] or 'end_user'
        if role != 'admin':
            return jsonify({"error": "Akses hanya untuk admin"}), 403

        g.current_user = {
            "user_id": user[0],
            "username": user[1],
            "role": role
        }
        return view_func(*args, **kwargs)

    return wrapper
