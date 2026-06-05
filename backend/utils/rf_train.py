from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor


MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "rf_model.pkl"


def retrain_random_forest(tagihan_rows):
    rows = list(tagihan_rows or [])
    if len(rows) < 3:
        raise ValueError("Minimal 3 data tagihan diperlukan untuk retrain model")

    features = []
    targets = []
    for row in rows:
        bulan = int(row[0])
        tahun = int(row[1])
        konsumsi_kwh = float(row[2])
        daya_va = int(row[3] or 0)
        jumlah_penghuni = int(row[4] or 1)

        features.append([bulan, tahun, daya_va, jumlah_penghuni])
        targets.append(konsumsi_kwh)

    model = RandomForestRegressor(
        n_estimators=120,
        random_state=42,
        min_samples_leaf=1,
    )
    model.fit(np.array(features), np.array(targets))

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    return {
        "model_path": str(MODEL_PATH),
        "training_rows": len(rows),
        "feature_count": len(features[0]),
    }
