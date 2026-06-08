# app.py
from flask import Flask, jsonify
from flask_cors import CORS
from routes.admin import admin_bp
from routes.alat import alat_bp
from routes.auth import auth_bp
from routes.laporan import laporan_bp
from routes.pemakaian import pemakaian_bp
from routes.prediksi import prediksi_bp
from routes.rekomendasi import rekomendasi_bp
from routes.tagihan import tagihan_bp


def create_app():
    app = Flask(__name__)
    CORS(app)

    register_blueprints(app)

    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({
            "status": "OK",
            "message": "Backend Flask berjalan"
        })

    return app


def register_blueprints(app):
    # Daftarkan semua blueprint sebelum app.run().
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(tagihan_bp, url_prefix='/api/tagihan')
    app.register_blueprint(alat_bp, url_prefix='/api/alat')
    app.register_blueprint(pemakaian_bp, url_prefix='/api/pemakaian')
    app.register_blueprint(prediksi_bp, url_prefix='/api/prediksi')
    app.register_blueprint(rekomendasi_bp, url_prefix='/api/rekomendasi')
    app.register_blueprint(laporan_bp, url_prefix='/api/laporan')


app = create_app()


if __name__ == '__main__':
    app.run(debug=True, port=5000)
