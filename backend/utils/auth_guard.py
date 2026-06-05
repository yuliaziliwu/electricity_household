from functools import wraps

from flask import g, jsonify, request

from utils.db_conn import get_db_connection
from utils.jwt_utils import TokenError, decode_token


def _get_header_user_id():
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return None

    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


def _get_bearer_token():
    auth_header = request.headers.get('Authorization') or ''
    parts = auth_header.split()

    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1]

    return None


def _get_request_user_id():
    token = _get_bearer_token()
    if token:
        payload = decode_token(token, expected_type="access")
        try:
            return int(payload.get("sub"))
        except (TypeError, ValueError) as exc:
            raise TokenError("Subject user pada token tidak valid") from exc

    return _get_header_user_id()


def get_current_user():
    try:
        user_id = _get_request_user_id()
    except TokenError as exc:
        return None, (jsonify({"error": str(exc)}), 401)

    if not user_id:
        return None, (
            jsonify({"error": "Header Authorization Bearer token atau X-User-Id wajib diisi"}),
            401,
        )

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
        return None, (jsonify({"error": str(exc)}), 500)
    finally:
        if conn:
            conn.close()

    if not user:
        return None, (jsonify({"error": "User tidak ditemukan"}), 401)

    role = user[2] or 'end_user'
    current_user = {
        "user_id": user[0],
        "username": user[1],
        "role": role
    }
    g.current_user = current_user
    return current_user, None


def admin_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        current_user, error_response = get_current_user()
        if error_response:
            return error_response

        if current_user["role"] != 'admin':
            return jsonify({"error": "Akses hanya untuk admin"}), 403

        return view_func(*args, **kwargs)

    return wrapper
