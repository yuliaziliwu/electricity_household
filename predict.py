import calendar
import os

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split


DATA_PATH = "training_data.csv"
MODEL_PATH = "electricity_bill_model.pkl"
RANDOM_STATE = 42

FEATURE_COLUMNS = [
    "bill_amount",
    "bill_lag_1",
    "bill_lag_2",
    "bill_lag_3",
    "bill_rolling_avg_3",
    "estimated_kwh",
    "total_duration_hours",
    "total_power_watt",
    "active_device_count",
    "month",
]


def calculate_estimated_kwh(power_watt, duration_hours, days):
    return power_watt * duration_hours * days / 1000


def create_dummy_training_data(path=DATA_PATH, households=120, months=24):
    rng = np.random.default_rng(RANDOM_STATE)
    rows = []

    for household_id in range(1, households + 1):
        base_bill = rng.uniform(180_000, 650_000)
        previous_bill = base_bill

        for idx in range(months):
            year = 2024 + idx // 12
            month = (idx % 12) + 1
            days = calendar.monthrange(year, month)[1]

            active_device_count = int(rng.integers(5, 22))
            avg_power = rng.uniform(80, 260)
            total_power_watt = active_device_count * avg_power
            total_duration_hours = rng.uniform(3, 10)
            estimated_kwh = calculate_estimated_kwh(
                total_power_watt,
                total_duration_hours,
                days,
            )

            seasonal_factor = 1 + 0.08 * np.sin((month - 1) / 12 * 2 * np.pi)
            device_bill = estimated_kwh * rng.uniform(1300, 1700)
            noise = rng.normal(0, 25_000)
            bill_amount = (
                0.65 * previous_bill
                + 0.35 * device_bill * seasonal_factor
                + noise
            )
            bill_amount = max(50_000, bill_amount)

            rows.append(
                {
                    "household_id": household_id,
                    "year": year,
                    "month": month,
                    "bill_amount": round(bill_amount, 2),
                    "estimated_kwh": round(estimated_kwh, 3),
                    "total_duration_hours": round(total_duration_hours, 2),
                    "total_power_watt": round(total_power_watt, 2),
                    "active_device_count": active_device_count,
                }
            )

            previous_bill = bill_amount

    df = pd.DataFrame(rows)
    df.to_csv(path, index=False)
    return df


def load_training_data(path=DATA_PATH):
    if not os.path.exists(path):
        print(f"{path} tidak ditemukan. Membuat dataset dummy realistis...")
        return create_dummy_training_data(path)

    return pd.read_csv(path)


def engineer_features(df):
    required = {
        "household_id",
        "year",
        "month",
        "bill_amount",
        "estimated_kwh",
        "total_duration_hours",
        "total_power_watt",
        "active_device_count",
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Kolom training_data.csv kurang: {sorted(missing)}")

    data = df.copy()
    data = data.sort_values(["household_id", "year", "month"])

    group = data.groupby("household_id")["bill_amount"]
    data["bill_lag_1"] = group.shift(1)
    data["bill_lag_2"] = group.shift(2)
    data["bill_lag_3"] = group.shift(3)
    data["bill_rolling_avg_3"] = group.transform(
        lambda bills: bills.shift(1).rolling(window=3).mean()
    )
    data["next_month_bill"] = group.shift(-1)

    return data.dropna(
        subset=[
            "bill_lag_1",
            "bill_lag_2",
            "bill_lag_3",
            "bill_rolling_avg_3",
            "next_month_bill",
        ]
    )


def train_model(data):
    if data.empty:
        raise ValueError("Data training kosong setelah feature engineering")

    X = data[FEATURE_COLUMNS]
    y = data["next_month_bill"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
    )

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=4,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))

    metrics = {
        "mae": float(mean_absolute_error(y_test, predictions)),
        "rmse": float(rmse),
        "r2": float(r2_score(y_test, predictions)),
    }

    return model, metrics


def save_model(model, metrics, path=MODEL_PATH):
    artifact = {
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "metadata": {
            "target": "next_month_bill",
            "currency": "IDR",
            "estimated_kwh_formula": "power_watt * duration_hours * days / 1000",
            "metrics": metrics,
        },
    }
    joblib.dump(artifact, path)
    return artifact


def _to_dataframe(input_data):
    if isinstance(input_data, pd.DataFrame):
        return input_data.copy()
    if isinstance(input_data, dict):
        return pd.DataFrame([input_data])
    raise TypeError("input_data harus berupa dict atau pandas DataFrame")


def prepare_prediction_input(input_data, feature_columns):
    df = _to_dataframe(input_data)

    aliases = {
        "current_bill": "bill_amount",
        "biaya": "bill_amount",
        "tagihan_bulan_ini": "bill_amount",
        "power_watt": "total_power_watt",
        "duration_hours": "total_duration_hours",
        "jumlah_device_aktif": "active_device_count",
    }
    for source, target in aliases.items():
        if source in df.columns and target not in df.columns:
            df[target] = df[source]

    if "estimated_kwh" not in df.columns:
        required_columns = {"total_power_watt", "total_duration_hours"}
        if required_columns.issubset(df.columns):
            days = df["days"] if "days" in df.columns else 30
            df["estimated_kwh"] = calculate_estimated_kwh(
                df["total_power_watt"],
                df["total_duration_hours"],
                days,
            )

    if "bill_rolling_avg_3" not in df.columns:
        lag_cols = ["bill_lag_1", "bill_lag_2", "bill_lag_3"]
        if set(lag_cols).issubset(df.columns):
            df["bill_rolling_avg_3"] = df[lag_cols].mean(axis=1)

    missing = [col for col in feature_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Input prediksi kurang kolom: {missing}")

    return df[feature_columns].astype(float)


def predict_next_bill(input_data, model_path=MODEL_PATH):
    artifact = joblib.load(model_path)
    model = artifact["model"]
    feature_columns = artifact["feature_columns"]

    X = prepare_prediction_input(input_data, feature_columns)
    prediction = model.predict(X)

    if len(prediction) == 1:
        return {
            "predicted_next_month_bill": round(float(max(prediction[0], 0)), 2)
        }

    return [
        {"predicted_next_month_bill": round(float(max(value, 0)), 2)}
        for value in prediction
    ]


def main():
    raw_data = load_training_data(DATA_PATH)
    training_data = engineer_features(raw_data)
    model, metrics = train_model(training_data)
    save_model(model, metrics, MODEL_PATH)

    print("Model berhasil disimpan:", MODEL_PATH)
    print("Feature columns:", FEATURE_COLUMNS)
    print("Metrics:", metrics)

    sample = {
        "bill_amount": 350000,
        "bill_lag_1": 330000,
        "bill_lag_2": 310000,
        "bill_lag_3": 300000,
        "total_power_watt": 2200,
        "total_duration_hours": 6,
        "days": 30,
        "active_device_count": 12,
        "month": 6,
    }
    print("Sample prediction:", predict_next_bill(sample))


if __name__ == "__main__":
    main()
