import calendar
import json
import warnings
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


MODEL_PATH = Path(__file__).resolve().parents[1] / "electricity_bill_model_rf.pkl"
DEFAULT_DURATION_HOURS = 6.0
MIN_DAILY_ROWS_FOR_HYBRID = 7
RF_STD_TREE_LIMIT = 50
RF_STD_FACTOR = 0.65
MAX_MARGIN_PERCENT = 6
MIN_MARGIN_PERCENT = 1


@lru_cache(maxsize=1)
def load_prediction_artifact():
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        artifact = joblib.load(MODEL_PATH)

    metadata = artifact.get("metadata") or {}
    model = artifact.get("model")
    if metadata.get("model_type") != "random_forest":
        raise ValueError("Artifact prediksi harus bertipe random_forest")
    if not hasattr(model, "predict"):
        raise ValueError("Model prediksi tidak memiliki method predict")

    return artifact


def calculate_estimated_kwh(power_watt, duration_hours, days):
    return power_watt * duration_hours * days / 1000


def get_next_month_year(month, year):
    if month == 12:
        return 1, year + 1
    return month + 1, year


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
        (daya_va,),
    )
    row = cursor.fetchone()
    return float(row[0]) if row and row[0] is not None else None


def fetch_user(cursor, user_id):
    cursor.execute(
        """
        SELECT user_id, daya_terpasang
        FROM users
        WHERE user_id = ?
        """,
        (user_id,),
    )
    return cursor.fetchone()


def fetch_tagihan_history(cursor, user_id, tarif_per_kwh):
    cursor.execute(
        """
        SELECT bulan, tahun, konsumsi_kWh, biaya
        FROM tagihan
        WHERE user_id = ?
        ORDER BY tahun ASC, bulan ASC
        """,
        (user_id,),
    )
    rows = []
    for row in cursor.fetchall():
        kwh = float(row[2] or 0)
        bill = float(row[3]) if row[3] is not None else kwh * tarif_per_kwh
        rows.append(
            {
                "month": int(row[0]),
                "year": int(row[1]),
                "kwh": kwh,
                "bill": bill,
            }
        )
    return rows


def fetch_device_summary(cursor, user_id):
    cursor.execute(
        """
        SELECT COALESCE(SUM(jumlah), 0),
               COALESCE(SUM(jumlah * daya_watt), 0),
               COALESCE(SUM(jumlah * daya_watt * jam_default_per_hari), 0)
        FROM alat_elektronik
        WHERE user_id = ?
        """,
        (user_id,),
    )
    row = cursor.fetchone()
    active_device_count = int(row[0] or 0)
    total_power_watt = float(row[1] or 0)
    weighted_watt_hours = float(row[2] or 0)

    if total_power_watt > 0:
        total_duration_hours = weighted_watt_hours / total_power_watt
    else:
        total_duration_hours = DEFAULT_DURATION_HOURS

    return {
        "active_device_count": active_device_count,
        "total_power_watt": total_power_watt,
        "total_duration_hours": total_duration_hours,
    }


def fetch_daily_kwh(cursor, user_id, limit_days=30):
    cursor.execute(
        f"""
        SELECT TOP {int(limit_days)} tanggal, konsumsi_kWh
        FROM v_konsumsi_harian
        WHERE user_id = ?
        ORDER BY tanggal DESC
        """,
        (user_id,),
    )
    return [float(row[1] or 0) for row in cursor.fetchall()]


def _lag_value(values, lag):
    index = len(values) - 1 - lag
    if index >= 0:
        return values[index]
    return values[0]


def _mean(values):
    safe_values = [float(value) for value in values if value is not None]
    if not safe_values:
        return 0.0
    return float(np.mean(safe_values))


def _build_bill_features(history):
    bills = [item["bill"] for item in history]
    kwh_values = [item["kwh"] for item in history]
    current_bill = bills[-1]
    bill_lag_1 = _lag_value(bills, 1)

    return {
        "bill_amount": current_bill,
        "bill_lag_1": bill_lag_1,
        "bill_lag_2": _lag_value(bills, 2),
        "bill_lag_3": _lag_value(bills, 3),
        "bill_lag_4": _lag_value(bills, 4),
        "bill_rolling_avg_3": _mean([_lag_value(bills, lag) for lag in range(1, 4)]),
        "bill_rolling_avg_6": _mean([_lag_value(bills, lag) for lag in range(1, 7)]),
        "bill_mom_change": ((current_bill - bill_lag_1) / bill_lag_1 * 100)
        if bill_lag_1 > 0
        else 0.0,
        "estimated_kwh_lag_1": _lag_value(kwh_values, 1),
    }


def _build_device_features(device_summary, daily_kwh_values, latest_kwh, days):
    total_power_watt = device_summary["total_power_watt"]
    active_device_count = device_summary["active_device_count"]
    total_duration_hours = device_summary["total_duration_hours"]
    method = "hanya_tagihan"

    if len(daily_kwh_values) >= MIN_DAILY_ROWS_FOR_HYBRID:
        avg_daily_kwh = _mean(daily_kwh_values)
        estimated_kwh = avg_daily_kwh * days
        method = "hybrid_harian"
    elif total_power_watt > 0:
        estimated_kwh = calculate_estimated_kwh(
            total_power_watt,
            total_duration_hours,
            days,
        )
        avg_daily_kwh = estimated_kwh / days
    else:
        estimated_kwh = latest_kwh
        avg_daily_kwh = estimated_kwh / days

    if total_power_watt <= 0:
        total_duration_hours = DEFAULT_DURATION_HOURS
        total_power_watt = estimated_kwh * 1000 / max(total_duration_hours * days, 1)
        active_device_count = max(active_device_count, 1)
    elif method == "hybrid_harian":
        total_duration_hours = estimated_kwh * 1000 / max(total_power_watt * days, 1)

    total_duration_hours = min(max(total_duration_hours, 0), 24)
    estimated_kwh = calculate_estimated_kwh(total_power_watt, total_duration_hours, days)
    avg_daily_kwh = estimated_kwh / days if days else 0

    efficiency_base = total_power_watt * total_duration_hours / 1000
    efficiency_score = estimated_kwh / efficiency_base if efficiency_base > 0 else 1
    efficiency_score = min(max(efficiency_score, 0.5), 2)

    return {
        "estimated_kwh": estimated_kwh,
        "total_duration_hours": total_duration_hours,
        "total_power_watt": total_power_watt,
        "active_device_count": active_device_count,
        "avg_daily_kwh": avg_daily_kwh,
        "efficiency_score": efficiency_score,
        "metode": method,
    }


def build_prediction_input(cursor, user_id):
    user = fetch_user(cursor, user_id)
    if not user:
        raise ValueError("User tidak ditemukan")

    daya_va = int(user[1] or 0)
    tarif_per_kwh = get_active_tarif(cursor, daya_va)
    if not tarif_per_kwh or tarif_per_kwh <= 0:
        raise ValueError("Tarif listrik aktif tidak ditemukan untuk daya user")

    history = fetch_tagihan_history(cursor, user_id, tarif_per_kwh)
    if len(history) < 3:
        raise ValueError("Minimal 3 data tagihan diperlukan untuk membuat prediksi")

    latest = history[-1]
    target_month, target_year = get_next_month_year(latest["month"], latest["year"])
    days = calendar.monthrange(target_year, target_month)[1]

    bill_features = _build_bill_features(history)
    device_summary = fetch_device_summary(cursor, user_id)
    daily_kwh_values = fetch_daily_kwh(cursor, user_id)
    latest_kwh = latest["kwh"] or latest["bill"] / tarif_per_kwh
    device_features = _build_device_features(
        device_summary,
        daily_kwh_values,
        latest_kwh,
        days,
    )

    features = {
        **bill_features,
        **device_features,
        "month": target_month,
        "month_sin": np.sin(2 * np.pi * target_month / 12),
        "month_cos": np.cos(2 * np.pi * target_month / 12),
        "quarter": (target_month - 1) // 3 + 1,
        "is_holiday_season": 1 if target_month in [12, 1] else 0,
        "is_ramadan_effect": 1 if target_month in [3, 4] else 0,
        "days_in_month": days,
    }
    method = features.pop("metode")

    artifact = load_prediction_artifact()
    feature_columns = artifact["feature_columns"]
    missing = [column for column in feature_columns if column not in features]
    if missing:
        raise ValueError(f"Feature model belum lengkap: {missing}")

    ordered_features = {column: float(features[column]) for column in feature_columns}

    return {
        "features": ordered_features,
        "target_month": target_month,
        "target_year": target_year,
        "tarif_per_kwh": tarif_per_kwh,
        "metode": method,
        "history_count": len(history),
        "daily_history_count": len(daily_kwh_values),
    }


def predict_bill_from_features(features):
    artifact = load_prediction_artifact()
    feature_columns = artifact["feature_columns"]
    model = artifact["model"]
    scaler = artifact["scaler"]

    input_df = pd.DataFrame([features])[feature_columns].astype(float)
    scaled_input = scaler.transform(input_df)
    prediction = float(model.predict(scaled_input)[0])
    prediction = max(prediction, 0)

    if hasattr(model, "estimators_"):
        tree_predictions = np.column_stack(
            [tree.predict(scaled_input) for tree in model.estimators_[:RF_STD_TREE_LIMIT]]
        )
        prediction_std = float(np.std(tree_predictions, axis=1)[0])
    else:
        prediction_std = prediction * 0.02

    margin = prediction_std * RF_STD_FACTOR
    max_margin = prediction * (MAX_MARGIN_PERCENT / 100)
    final_margin = min(margin, max_margin)
    final_margin_percent = (final_margin / prediction * 100) if prediction else 0

    if prediction and final_margin_percent < MIN_MARGIN_PERCENT:
        final_margin = prediction * (MIN_MARGIN_PERCENT / 100)

    metadata = artifact.get("metadata") or {}
    return {
        "predicted_next_month_bill": round(prediction, 2),
        "confidence_lower": round(max(prediction - final_margin, 0), 2),
        "confidence_upper": round(prediction + final_margin, 2),
        "model_version": str(metadata.get("version") or "2.0-random-forest"),
        "model_metrics": metadata.get("metrics") or {},
    }


def create_prediction(cursor, user_id):
    prediction_input = build_prediction_input(cursor, user_id)
    prediction = predict_bill_from_features(prediction_input["features"])
    predicted_kwh = (
        prediction["predicted_next_month_bill"] / prediction_input["tarif_per_kwh"]
    )

    feature_snapshot = json.dumps(
        {
            "features": prediction_input["features"],
            "history_count": prediction_input["history_count"],
            "daily_history_count": prediction_input["daily_history_count"],
            "tarif_per_kwh": prediction_input["tarif_per_kwh"],
            "model_metrics": prediction["model_metrics"],
        },
        ensure_ascii=True,
    )

    return {
        **prediction,
        "predicted_kWh": round(predicted_kwh, 2),
        "bulan_target": prediction_input["target_month"],
        "tahun_target": prediction_input["target_year"],
        "metode": prediction_input["metode"],
        "feature_snapshot": feature_snapshot,
    }
