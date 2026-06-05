from flask import Blueprint, request, jsonify
from utils.db_conn import get_db_connection
from utils.jwt_utils import create_token_pair, decode_token, TokenError
import hashlib

auth_bp = Blueprint('auth', __name__)


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def serialize_auth_user(row):
    return {
        "user_id": row[0],
        "username": row[1],
        "email": row[2],
        "role": row[3] or 'end_user',
        "daya_terpasang": row[4],
        "jumlah_penghuni": row[5]
    }


def get_user_by_id(user_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT user_id, username, email, role, daya_terpasang, jumlah_penghuni
            FROM users
            WHERE user_id = ?
            """,
            (user_id,)
        )
        return cursor.fetchone()
    finally:
        if conn:
            conn.close()


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    password = data.get('password')
    email = (data.get('email') or '').strip()
    daya = data.get('daya_terpasang')
    penghuni = data.get('jumlah_penghuni')

    if not all([username, password, email, daya, penghuni]):
        return jsonify({
            "error": "Username, email, password, daya terpasang, dan jumlah penghuni wajib"
        }), 400

    try:
        daya = int(daya)
        penghuni = int(penghuni)
    except (TypeError, ValueError):
        return jsonify({"error": "Daya terpasang dan jumlah penghuni harus berupa angka"}), 400

    if penghuni < 1:
        return jsonify({"error": "Jumlah penghuni minimal 1"}), 400

    hashed = hash_password(password)
    role = 'end_user'

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT user_id FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            return jsonify({"error": "Username sudah digunakan"}), 409

        cursor.execute("""
            INSERT INTO users (username, password_hash, email, role, daya_terpasang, jumlah_penghuni)
            OUTPUT INSERTED.user_id,
                   INSERTED.username,
                   INSERTED.email,
                   INSERTED.role,
                   INSERTED.daya_terpasang,
                   INSERTED.jumlah_penghuni
            VALUES (?, ?, ?, ?, ?, ?)
        """, (username, hashed, email, role, daya, penghuni))
        user = cursor.fetchone()
        conn.commit()
        user_payload = serialize_auth_user(user)

        return jsonify({
            "message": "Registrasi berhasil",
            **user_payload,
            "user": user_payload
        }), 201
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username dan password wajib"}), 400

    hashed = hash_password(password)
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT user_id, username, email, role, daya_terpasang, jumlah_penghuni
            FROM users
            WHERE username = ? AND password_hash = ?
            """,
            (username, hashed)
        )
        user = cursor.fetchone()
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()

    if user:
        user_payload = serialize_auth_user(user)
        return jsonify({
            "message": "Login sukses",
            **user_payload,
            "user": user_payload,
            **create_token_pair(user_payload)
        }), 200
    else:
        return jsonify({"error": "Username atau password salah"}), 401


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    data = request.get_json(silent=True) or {}
    refresh_token = data.get('refresh_token')

    if not refresh_token:
        return jsonify({"error": "refresh_token wajib diisi"}), 400

    try:
        payload = decode_token(refresh_token, expected_type="refresh")
    except TokenError as exc:
        return jsonify({"error": str(exc)}), 401

    user = get_user_by_id(payload.get("sub"))
    if not user:
        return jsonify({"error": "User tidak ditemukan"}), 401

    user_payload = serialize_auth_user(user)
    return jsonify({
        "message": "Token berhasil diperbarui",
        "user": user_payload,
        **create_token_pair(user_payload)
    }), 200
