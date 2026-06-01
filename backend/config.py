# backend/config.py
from urllib.parse import quote_plus

class Config:
    SECRET_KEY = "super-secret-key"
    JWT_SECRET_KEY = "jwt-super-secret"

    username = "sa"
    password = quote_plus("sumitomo")
    server = "localhost"
    database = "household_electricity"
    driver = "ODBC Driver 17 for SQL Server"

    # Jika ingin menggunakan SQLAlchemy nanti, bisa pakai ini
    SQLALCHEMY_DATABASE_URI = (
        f"mssql+pyodbc://{username}:{password}@{server}/{database}"
        f"?driver={driver}"
    )