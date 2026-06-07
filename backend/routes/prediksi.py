from flask import Blueprint, jsonify

from utils.auth_guard import get_current_user
from utils.bill_prediction import create_prediction
from utils.db_conn import get_db_connection


prediksi_bp = Blueprint('prediksi', __name__)


PREDIKSI_COLUMNS = """
prediksi_id,
user_id,
bulan_target,
tahun_target,
prediksi_kWh,
metode,
created_at,
prediksi_biaya,
confidence_lower,
confidence_upper,
model_version
"""


def get_request_user_id():
    current_user, error_response = get_current_user()
    if error_response:
        return None, error_response

    return current_user["user_id"], None


def ensure_prediksi_schema(cursor):
    statements = [
        """
        IF COL_LENGTH('prediksi', 'prediksi_biaya') IS NULL
            ALTER TABLE prediksi ADD prediksi_biaya DECIMAL(15,2) NULL
        """,
        """
        IF COL_LENGTH('prediksi', 'confidence_lower') IS NULL
            ALTER TABLE prediksi ADD confidence_lower DECIMAL(15,2) NULL
        """,
        """
        IF COL_LENGTH('prediksi', 'confidence_upper') IS NULL
            ALTER TABLE prediksi ADD confidence_upper DECIMAL(15,2) NULL
        """,
        """
        IF COL_LENGTH('prediksi', 'feature_snapshot') IS NULL
            ALTER TABLE prediksi ADD feature_snapshot NVARCHAR(MAX) NULL
        """,
        """
        IF COL_LENGTH('prediksi', 'model_version') IS NULL
            ALTER TABLE prediksi ADD model_version NVARCHAR(50) NULL
        """,
    ]
    for statement in statements:
        cursor.execute(statement)


def serialize_prediksi(row):
    return {
        "prediksi_id": row[0],
        "user_id": row[1],
        "bulan_target": row[2],
        "tahun_target": row[3],
        "prediksi_kWh": float(row[4]) if row[4] is not None else None,
        "metode": row[5],
        "created_at": row[6].isoformat() if row[6] else None,
        "prediksi_biaya": float(row[7]) if row[7] is not None else None,
        "confidence_lower": float(row[8]) if row[8] is not None else None,
        "confidence_upper": float(row[9]) if row[9] is not None else None,
        "model_version": row[10],
    }


def fetch_latest_prediction(cursor, user_id):
    cursor.execute(
        f"""
        SELECT TOP 1 {PREDIKSI_COLUMNS}
        FROM prediksi
        WHERE user_id = ?
        ORDER BY created_at DESC, prediksi_id DESC
        """,
        (user_id,),
    )
    row = cursor.fetchone()
    return serialize_prediksi(row) if row else None


def fetch_prediction_history(cursor, user_id):
    cursor.execute(
        f"""
        SELECT {PREDIKSI_COLUMNS}
        FROM prediksi
        WHERE user_id = ?
        ORDER BY created_at DESC, prediksi_id DESC
        """,
        (user_id,),
    )
    return [serialize_prediksi(row) for row in cursor.fetchall()]


@prediksi_bp.route('/', methods=['POST'], strict_slashes=False)
def create_prediksi():
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_prediksi_schema(cursor)

        prediction = create_prediction(cursor, user_id)
        cursor.execute(
            """
            INSERT INTO prediksi (
                user_id,
                bulan_target,
                tahun_target,
                prediksi_kWh,
                metode,
                prediksi_biaya,
                confidence_lower,
                confidence_upper,
                feature_snapshot,
                model_version
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                prediction["bulan_target"],
                prediction["tahun_target"],
                prediction["predicted_kWh"],
                prediction["metode"],
                prediction["predicted_next_month_bill"],
                prediction["confidence_lower"],
                prediction["confidence_upper"],
                prediction["feature_snapshot"],
                prediction["model_version"],
            ),
        )
        conn.commit()

        latest = fetch_latest_prediction(cursor, user_id)
        return jsonify(
            {
                "message": "Prediksi tagihan bulan depan berhasil dibuat",
                "predicted_next_month_bill": prediction["predicted_next_month_bill"],
                "predicted_kWh": prediction["predicted_kWh"],
                "confidence_lower": prediction["confidence_lower"],
                "confidence_upper": prediction["confidence_upper"],
                "bulan_target": prediction["bulan_target"],
                "tahun_target": prediction["tahun_target"],
                "metode": prediction["metode"],
                "model_version": prediction["model_version"],
                "prediksi": latest,
            }
        ), 201
    except ValueError as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@prediksi_bp.route('/latest', methods=['GET'])
def latest_prediksi():
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_prediksi_schema(cursor)
        conn.commit()
        return jsonify({"prediksi": fetch_latest_prediction(cursor, user_id)}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@prediksi_bp.route('/history', methods=['GET'])
def history_prediksi():
    user_id, error_response = get_request_user_id()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_prediksi_schema(cursor)
        conn.commit()
        return jsonify({"prediksi": fetch_prediction_history(cursor, user_id)}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()
