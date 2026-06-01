# utils/db_conn.py
import pyodbc

def get_db_connection():
    conn_str = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=localhost\SQLEXPRESS;"
        "DATABASE=electricity_household;"
        "Trusted_Connection=yes;"
    )
    return pyodbc.connect(conn_str)