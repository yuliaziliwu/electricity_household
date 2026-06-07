IF COL_LENGTH('prediksi', 'prediksi_biaya') IS NULL
    ALTER TABLE prediksi ADD prediksi_biaya DECIMAL(15,2) NULL;

IF COL_LENGTH('prediksi', 'confidence_lower') IS NULL
    ALTER TABLE prediksi ADD confidence_lower DECIMAL(15,2) NULL;

IF COL_LENGTH('prediksi', 'confidence_upper') IS NULL
    ALTER TABLE prediksi ADD confidence_upper DECIMAL(15,2) NULL;

IF COL_LENGTH('prediksi', 'feature_snapshot') IS NULL
    ALTER TABLE prediksi ADD feature_snapshot NVARCHAR(MAX) NULL;

IF COL_LENGTH('prediksi', 'model_version') IS NULL
    ALTER TABLE prediksi ADD model_version NVARCHAR(50) NULL;
