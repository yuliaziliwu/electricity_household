from utils.db_conn import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("SELECT DB_NAME()")
print("Terhubung ke database:", cursor.fetchone()[0])
conn.close()