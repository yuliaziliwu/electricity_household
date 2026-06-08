from datetime import datetime
from io import BytesIO

from flask import Blueprint, jsonify, send_file
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from utils.auth_guard import get_current_user
from utils.db_conn import get_db_connection


laporan_bp = Blueprint("laporan", __name__)


MONTH_LABELS = {
    1: "Januari",
    2: "Februari",
    3: "Maret",
    4: "April",
    5: "Mei",
    6: "Juni",
    7: "Juli",
    8: "Agustus",
    9: "September",
    10: "Oktober",
    11: "November",
    12: "Desember",
}

PAGE_SIZE = landscape(A4)
PAGE_MARGIN = 1.2 * cm
CONTENT_WIDTH = PAGE_SIZE[0] - (2 * PAGE_MARGIN)


def get_request_user():
    current_user, error_response = get_current_user()
    if error_response:
        return None, error_response

    return current_user, None


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
        IF COL_LENGTH('prediksi', 'model_version') IS NULL
            ALTER TABLE prediksi ADD model_version NVARCHAR(50) NULL
        """,
    ]
    for statement in statements:
        cursor.execute(statement)


def ensure_rekomendasi_schema(cursor):
    statements = [
        """
        IF COL_LENGTH('dbo.rekomendasi', 'kode') IS NULL
            ALTER TABLE dbo.rekomendasi ADD kode NVARCHAR(20) NULL
        """,
        """
        IF COL_LENGTH('dbo.rekomendasi', 'prioritas') IS NULL
            ALTER TABLE dbo.rekomendasi ADD prioritas NVARCHAR(20) NULL
        """,
        """
        IF COL_LENGTH('dbo.rekomendasi', 'kategori') IS NULL
            ALTER TABLE dbo.rekomendasi ADD kategori NVARCHAR(50) NULL
        """,
        """
        IF COL_LENGTH('dbo.rekomendasi', 'potensi_hemat') IS NULL
            ALTER TABLE dbo.rekomendasi ADD potensi_hemat DECIMAL(15,2) NOT NULL DEFAULT 0
        """,
    ]
    for statement in statements:
        cursor.execute(statement)


def month_label(month, year):
    return f"{MONTH_LABELS.get(int(month), month)} {year}"


def format_number(value, digits=2):
    if value is None:
        return "-"
    return f"{float(value):,.{digits}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def format_currency(value):
    if value is None:
        return "-"
    return f"Rp {format_number(value, 0)}"


def format_datetime(value):
    if not value:
        return "-"
    if hasattr(value, "strftime"):
        return value.strftime("%d/%m/%Y %H:%M")
    return str(value)


def build_table_styles():
    styles = getSampleStyleSheet()

    cell = styles["BodyText"].clone("TableCell")
    cell.fontName = "Helvetica"
    cell.fontSize = 8
    cell.leading = 10
    cell.alignment = TA_LEFT

    header = cell.clone("TableHeader")
    header.fontName = "Helvetica-Bold"
    header.alignment = TA_CENTER

    right = cell.clone("TableCellRight")
    right.alignment = TA_RIGHT

    center = cell.clone("TableCellCenter")
    center.alignment = TA_CENTER

    return {
        "cell": cell,
        "header": header,
        "right": right,
        "center": center,
    }


def p(value, style):
    return Paragraph(str(value if value is not None else "-"), style)


def fetch_user_profile(cursor, user_id):
    cursor.execute(
        """
        SELECT user_id, username, email, role, daya_terpasang, jumlah_penghuni
        FROM users
        WHERE user_id = ?
        """,
        (user_id,),
    )
    row = cursor.fetchone()
    if not row:
        return None

    return {
        "user_id": row[0],
        "username": row[1],
        "email": row[2],
        "role": row[3] or "end_user",
        "daya_terpasang": row[4],
        "jumlah_penghuni": row[5],
    }


def fetch_tagihan(cursor, user_id):
    cursor.execute(
        """
        SELECT bulan, tahun, konsumsi_kWh, biaya
        FROM tagihan
        WHERE user_id = ?
        ORDER BY tahun ASC, bulan ASC
        """,
        (user_id,),
    )
    return [
        {
            "bulan": row[0],
            "tahun": row[1],
            "konsumsi_kWh": float(row[2] or 0),
            "biaya": float(row[3]) if row[3] is not None else None,
        }
        for row in cursor.fetchall()
    ]


def fetch_prediksi(cursor, user_id):
    cursor.execute(
        """
        SELECT bulan_target,
               tahun_target,
               prediksi_kWh,
               metode,
               created_at,
               prediksi_biaya,
               confidence_lower,
               confidence_upper,
               model_version
        FROM prediksi
        WHERE user_id = ?
        ORDER BY created_at ASC, prediksi_id ASC
        """,
        (user_id,),
    )
    return [
        {
            "bulan_target": row[0],
            "tahun_target": row[1],
            "prediksi_kWh": float(row[2]) if row[2] is not None else None,
            "metode": row[3],
            "created_at": row[4],
            "prediksi_biaya": float(row[5]) if row[5] is not None else None,
            "confidence_lower": float(row[6]) if row[6] is not None else None,
            "confidence_upper": float(row[7]) if row[7] is not None else None,
            "model_version": row[8],
        }
        for row in cursor.fetchall()
    ]


def fetch_rekomendasi(cursor, user_id):
    cursor.execute(
        """
        SELECT kode,
               kategori,
               prioritas,
               teks_rekomendasi,
               potensi_hemat,
               sudah_diterapkan,
               tanggal
        FROM rekomendasi
        WHERE user_id = ?
        ORDER BY tanggal DESC, rekomendasi_id DESC
        """,
        (user_id,),
    )
    return [
        {
            "kode": row[0] or "DSS",
            "kategori": row[1] or "default",
            "prioritas": row[2] or "rendah",
            "teks": row[3],
            "potensi_hemat": float(row[4] or 0),
            "sudah_diterapkan": bool(row[5]),
            "tanggal": row[6],
        }
        for row in cursor.fetchall()
    ]


def add_title(story, styles, title, profile):
    story.append(Paragraph(title, styles["Title"]))
    story.append(Spacer(1, 0.2 * cm))
    story.append(
        Paragraph(
            f"User: {profile['username']} | Daya: {profile['daya_terpasang'] or '-'} VA | "
            f"Jumlah penghuni: {profile['jumlah_penghuni'] or '-'}",
            styles["Normal"],
        )
    )
    story.append(
        Paragraph(
            f"Dicetak pada: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.45 * cm))


def add_summary(story, styles, tagihan_rows, prediksi_rows):
    table_styles = build_table_styles()
    total_biaya = sum(item["biaya"] or 0 for item in tagihan_rows)
    total_kwh = sum(item["konsumsi_kWh"] or 0 for item in tagihan_rows)
    avg_biaya = total_biaya / len(tagihan_rows) if tagihan_rows else 0
    latest_prediksi = prediksi_rows[-1] if prediksi_rows else None

    summary_data = [
        [p("Total Tagihan", table_styles["cell"]), p(str(len(tagihan_rows)), table_styles["right"])],
        [
            p("Total kWh Tagihan", table_styles["cell"]),
            p(f"{format_number(total_kwh)} kWh", table_styles["right"]),
        ],
        [
            p("Total Biaya Tagihan", table_styles["cell"]),
            p(format_currency(total_biaya), table_styles["right"]),
        ],
        [
            p("Rata-rata Tagihan", table_styles["cell"]),
            p(format_currency(avg_biaya), table_styles["right"]),
        ],
        [
            p("Prediksi Terbaru", table_styles["cell"]),
            p(
                format_currency(latest_prediksi["prediksi_biaya"]) if latest_prediksi else "-",
                table_styles["right"],
            ),
        ],
    ]
    table = Table(summary_data, colWidths=[8 * cm, CONTENT_WIDTH - 8 * cm])
    table.hAlign = "LEFT"
    table.setStyle(base_table_style(header=False))

    story.append(Paragraph("Ringkasan", styles["Heading2"]))
    story.append(table)
    story.append(Spacer(1, 0.45 * cm))


def base_table_style(header=True):
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cfded6")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        commands.extend(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e5f2ec")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#13201d")),
            ]
        )
    return TableStyle(commands)


def add_tagihan_table(story, styles, tagihan_rows):
    table_styles = build_table_styles()
    story.append(Paragraph("Riwayat Tagihan Bulanan", styles["Heading2"]))
    if not tagihan_rows:
        story.append(Paragraph("Belum ada data tagihan.", styles["Normal"]))
        story.append(Spacer(1, 0.45 * cm))
        return

    data = [
        [
            p("Bulan", table_styles["header"]),
            p("Konsumsi kWh", table_styles["header"]),
            p("Biaya", table_styles["header"]),
        ]
    ]
    for item in tagihan_rows:
        data.append(
            [
                p(month_label(item["bulan"], item["tahun"]), table_styles["cell"]),
                p(f"{format_number(item['konsumsi_kWh'])} kWh", table_styles["right"]),
                p(format_currency(item["biaya"]), table_styles["right"]),
            ]
        )

    table = Table(
        data,
        colWidths=[9 * cm, 9 * cm, CONTENT_WIDTH - 18 * cm],
        repeatRows=1,
    )
    table.hAlign = "LEFT"
    table.setStyle(base_table_style())
    story.append(table)
    story.append(Spacer(1, 0.45 * cm))


def add_prediksi_table(story, styles, prediksi_rows):
    table_styles = build_table_styles()
    story.append(Paragraph("Riwayat Prediksi", styles["Heading2"]))
    if not prediksi_rows:
        story.append(Paragraph("Belum ada data prediksi.", styles["Normal"]))
        story.append(Spacer(1, 0.45 * cm))
        return

    data = [
        [
            p("Target", table_styles["header"]),
            p("Prediksi Biaya", table_styles["header"]),
            p("Estimasi kWh", table_styles["header"]),
            p("Range Estimasi", table_styles["header"]),
            p("Metode", table_styles["header"]),
            p("Dibuat", table_styles["header"]),
        ]
    ]
    for item in prediksi_rows:
        data.append(
            [
                p(month_label(item["bulan_target"], item["tahun_target"]), table_styles["cell"]),
                p(format_currency(item["prediksi_biaya"]), table_styles["right"]),
                p(f"{format_number(item['prediksi_kWh'])} kWh", table_styles["right"]),
                p(
                    f"{format_currency(item['confidence_lower'])} - {format_currency(item['confidence_upper'])}",
                    table_styles["right"],
                ),
                p(item["metode"] or "-", table_styles["center"]),
                p(format_datetime(item["created_at"]), table_styles["center"]),
            ]
        )

    table = Table(
        data,
        colWidths=[
            4.2 * cm,
            4.4 * cm,
            3.8 * cm,
            6.8 * cm,
            3.2 * cm,
            CONTENT_WIDTH - 22.4 * cm,
        ],
        repeatRows=1,
    )
    table.hAlign = "LEFT"
    table.setStyle(base_table_style())
    story.append(table)
    story.append(Spacer(1, 0.45 * cm))


def add_rekomendasi_table(story, styles, rekomendasi_rows):
    if not rekomendasi_rows:
        return

    table_styles = build_table_styles()
    story.append(Paragraph("Riwayat Rekomendasi", styles["Heading2"]))

    data = [
        [
            p("Kode", table_styles["header"]),
            p("Kategori", table_styles["header"]),
            p("Prioritas", table_styles["header"]),
            p("Rekomendasi", table_styles["header"]),
            p("Potensi Hemat", table_styles["header"]),
            p("Status", table_styles["header"]),
            p("Tanggal", table_styles["header"]),
        ]
    ]
    for item in rekomendasi_rows:
        data.append(
            [
                p(item["kode"], table_styles["center"]),
                p(item["kategori"], table_styles["center"]),
                p(item["prioritas"], table_styles["center"]),
                p(item["teks"], table_styles["cell"]),
                p(format_currency(item["potensi_hemat"]), table_styles["right"]),
                p("Diterapkan" if item["sudah_diterapkan"] else "Belum", table_styles["center"]),
                p(format_datetime(item["tanggal"]), table_styles["center"]),
            ]
        )

    table = Table(
        data,
        colWidths=[
            2 * cm,
            3 * cm,
            2.7 * cm,
            9.7 * cm,
            3.5 * cm,
            2.8 * cm,
            CONTENT_WIDTH - 23.7 * cm,
        ],
        repeatRows=1,
    )
    table.hAlign = "LEFT"
    table.setStyle(base_table_style())
    story.append(table)
    story.append(Spacer(1, 0.45 * cm))


def build_pdf(
    title,
    profile,
    tagihan_rows=None,
    prediksi_rows=None,
    rekomendasi_rows=None,
    include_tagihan=True,
):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=PAGE_SIZE,
        rightMargin=PAGE_MARGIN,
        leftMargin=PAGE_MARGIN,
        topMargin=PAGE_MARGIN,
        bottomMargin=PAGE_MARGIN,
    )
    styles = getSampleStyleSheet()
    story = []
    tagihan_rows = tagihan_rows or []
    prediksi_rows = prediksi_rows or []
    rekomendasi_rows = rekomendasi_rows or []

    add_title(story, styles, title, profile)
    if include_tagihan:
        add_summary(story, styles, tagihan_rows, prediksi_rows)
        add_tagihan_table(story, styles, tagihan_rows)
    add_prediksi_table(story, styles, prediksi_rows)
    add_rekomendasi_table(story, styles, rekomendasi_rows)

    doc.build(story)
    buffer.seek(0)
    return buffer


def create_pdf_response(buffer, filename):
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


@laporan_bp.route("/bulanan-prediksi.pdf", methods=["GET"])
def export_bulanan_prediksi_pdf():
    current_user, error_response = get_request_user()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_prediksi_schema(cursor)
        ensure_rekomendasi_schema(cursor)
        conn.commit()

        profile = fetch_user_profile(cursor, current_user["user_id"])
        if not profile:
            return jsonify({"error": "User tidak ditemukan"}), 404

        tagihan_rows = fetch_tagihan(cursor, current_user["user_id"])
        prediksi_rows = fetch_prediksi(cursor, current_user["user_id"])
        rekomendasi_rows = fetch_rekomendasi(cursor, current_user["user_id"])
        buffer = build_pdf(
            "Laporan Bulanan dan Prediksi Listrik",
            profile,
            tagihan_rows,
            prediksi_rows,
            rekomendasi_rows,
            include_tagihan=True,
        )
        return create_pdf_response(buffer, "laporan-bulanan-prediksi.pdf")
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()


@laporan_bp.route("/prediksi.pdf", methods=["GET"])
def export_prediksi_pdf():
    current_user, error_response = get_request_user()
    if error_response:
        return error_response

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_prediksi_schema(cursor)
        conn.commit()

        profile = fetch_user_profile(cursor, current_user["user_id"])
        if not profile:
            return jsonify({"error": "User tidak ditemukan"}), 404

        prediksi_rows = fetch_prediksi(cursor, current_user["user_id"])
        buffer = build_pdf(
            "Laporan Prediksi Listrik",
            profile,
            prediksi_rows=prediksi_rows,
            include_tagihan=False,
        )
        return create_pdf_response(buffer, "laporan-prediksi.pdf")
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        if conn:
            conn.close()
