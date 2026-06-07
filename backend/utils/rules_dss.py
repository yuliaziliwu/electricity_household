from datetime import date, datetime
from decimal import Decimal, InvalidOperation


DEFAULT_TARIF_PER_KWH = Decimal("1444.70")


def _to_decimal(value, default=Decimal("0")):
    if value in (None, ""):
        return default

    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return default


def _to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_date(value):
    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def _contains(text, keyword):
    return keyword in str(text or "").lower()


def _recommendation(kode, teks, prioritas, kategori, potensi_hemat=0):
    return {
        "kode": kode,
        "teks": teks,
        "prioritas": prioritas,
        "kategori": kategori,
        "potensi_hemat": float(round(_to_decimal(potensi_hemat), 2)),
    }


def _sorted_daily_consumption(konsumsi_harian):
    rows = []
    for item in konsumsi_harian or []:
        tanggal = _parse_date(item.get("tanggal"))
        if not tanggal:
            continue

        rows.append({
            "tanggal": tanggal,
            "konsumsi_kWh": _to_decimal(item.get("konsumsi_kWh")),
        })

    return sorted(rows, key=lambda row: row["tanggal"])


def _average(values):
    numbers = [_to_decimal(value) for value in values]
    if not numbers:
        return Decimal("0")

    return sum(numbers, Decimal("0")) / Decimal(len(numbers))


def _rule_r1(user):
    daya = _to_int(user.get("daya_terpasang"))
    if daya <= 900:
        return _recommendation(
            "R1",
            "Hindari menggunakan perangkat tinggi watt seperti setrika, pompa air, dispenser, dan magicom secara bersamaan untuk mencegah listrik turun atau mati.",
            "tinggi",
            "daya",
        )

    return None


def _rule_r2(user):
    daya = _to_int(user.get("daya_terpasang"))
    if daya >= 1300:
        return _recommendation(
            "R2",
            "Pertimbangkan menggunakan perangkat hemat energi seperti AC inverter, kulkas inverter, dan lampu LED untuk menekan konsumsi listrik.",
            "sedang",
            "daya",
        )

    return None


def _rule_r3(user, konsumsi_harian):
    daily_rows = _sorted_daily_consumption(konsumsi_harian)
    if not daily_rows:
        return None

    jumlah_penghuni = max(_to_int(user.get("jumlah_penghuni"), 1), 1)
    rata_rata_harian = _average(row["konsumsi_kWh"] for row in daily_rows)
    estimasi_bulanan = rata_rata_harian * Decimal("30")
    konsumsi_per_orang = estimasi_bulanan / Decimal(jumlah_penghuni)

    if konsumsi_per_orang > Decimal("120"):
        return _recommendation(
            "R3",
            "Konsumsi listrik per penghuni cukup tinggi. Lakukan audit penggunaan alat elektronik harian.",
            "tinggi",
            "profil",
        )

    return None


def _rule_r4(alat_list, tarif_per_kwh):
    recommendations = []
    tarif = _to_decimal(tarif_per_kwh, DEFAULT_TARIF_PER_KWH)

    for alat in alat_list or []:
        daya_watt = _to_decimal(alat.get("daya_watt"))
        jam_default = _to_decimal(alat.get("jam_default_per_hari"))
        if not _contains(alat.get("nama_alat"), "ac") or daya_watt <= 500 or jam_default <= 8:
            continue

        jumlah = max(_to_int(alat.get("jumlah"), 1), 1)
        hemat_kwh_bulan = Decimal(jumlah) * daya_watt * Decimal("2") * Decimal("30") / Decimal("1000")
        potensi_hemat = hemat_kwh_bulan * tarif
        recommendations.append(_recommendation(
            "R4",
            f"{alat.get('nama_alat')} digunakan lebih dari 8 jam per hari. Gunakan timer dan atur suhu 24-26 derajat C untuk menghemat listrik.",
            "tinggi",
            "alat",
            potensi_hemat,
        ))

    return recommendations


def _rule_r5(alat_list, tarif_per_kwh):
    recommendations = []
    tarif = _to_decimal(tarif_per_kwh, DEFAULT_TARIF_PER_KWH)

    for alat in alat_list or []:
        jumlah = max(_to_int(alat.get("jumlah"), 1), 1)
        daya_watt = _to_decimal(alat.get("daya_watt"))
        jam_default = _to_decimal(alat.get("jam_default_per_hari"))
        if not _contains(alat.get("nama_alat"), "lampu") or jumlah <= 5 or daya_watt <= 15:
            continue

        hemat_per_lampu = max(daya_watt - Decimal("10"), Decimal("0"))
        potensi_hemat = Decimal(jumlah) * hemat_per_lampu * jam_default * Decimal("30") / Decimal("1000") * tarif
        recommendations.append(_recommendation(
            "R5",
            "Jumlah atau daya lampu cukup besar. Ganti lampu ke LED 5-10 watt untuk menghemat biaya pencahayaan.",
            "sedang",
            "alat",
            potensi_hemat,
        ))

    return recommendations


def _rule_r6(konsumsi_harian):
    daily_rows = _sorted_daily_consumption(konsumsi_harian)
    if len(daily_rows) < 7:
        return None

    latest = daily_rows[-1]
    comparison_rows = daily_rows[-8:-1] if len(daily_rows) >= 8 else daily_rows[:-1]
    rata_rata_pembanding = _average(row["konsumsi_kWh"] for row in comparison_rows)

    if rata_rata_pembanding > 0 and latest["konsumsi_kWh"] > Decimal("1.5") * rata_rata_pembanding:
        return _recommendation(
            "R6",
            "Konsumsi listrik terakhir melonjak dibanding rata-rata 7 hari terakhir. Cek kemungkinan ada perangkat yang lupa dimatikan.",
            "tinggi",
            "konsumsi",
        )

    return None


def _rule_r7(konsumsi_harian):
    daily_rows = _sorted_daily_consumption(konsumsi_harian)
    weekend = [row["konsumsi_kWh"] for row in daily_rows if row["tanggal"].weekday() >= 5]
    weekday = [row["konsumsi_kWh"] for row in daily_rows if row["tanggal"].weekday() < 5]

    if not weekend or not weekday:
        return None

    weekend_avg = _average(weekend)
    weekday_avg = _average(weekday)

    if weekday_avg > 0 and weekend_avg > Decimal("1.3") * weekday_avg:
        return _recommendation(
            "R7",
            "Konsumsi akhir pekan lebih tinggi dari hari kerja. Kurangi penggunaan TV, gaming, AC, atau perangkat hiburan berdaya besar saat hari libur.",
            "sedang",
            "konsumsi",
        )

    return None


def _rule_r8(user, alat_list):
    daya_terpasang = _to_decimal(user.get("daya_terpasang"))
    if daya_terpasang <= 0:
        return None

    total_watt_alat = sum(
        Decimal(max(_to_int(alat.get("jumlah"), 1), 1)) * _to_decimal(alat.get("daya_watt"))
        for alat in alat_list or []
    )
    batas_aman = Decimal("0.9") * daya_terpasang

    if total_watt_alat > batas_aman:
        return _recommendation(
            "R8",
            "Total daya perangkat elektronik berisiko mendekati batas daya terpasang. Hindari menyalakan banyak perangkat besar secara bersamaan.",
            "tinggi",
            "daya",
        )

    return None


def _rule_r9():
    return _recommendation(
        "R9",
        "Cabut charger, TV, rice cooker, dan perangkat elektronik lain saat tidak digunakan karena mode standby tetap menggunakan listrik.",
        "rendah",
        "default",
    )


def _rule_r10():
    return _recommendation(
        "R10",
        "Penggunaan listrik Anda masih tergolong normal. Tetap pantau konsumsi harian dan gunakan alat elektronik seperlunya.",
        "rendah",
        "default",
    )


def generate_dss_recommendations(user, alat_list=None, konsumsi_harian=None, tarif_per_kwh=None):
    recommendations = []
    safe_user = user or {}
    safe_alat = alat_list or []
    safe_konsumsi = konsumsi_harian or []
    tarif = _to_decimal(tarif_per_kwh, DEFAULT_TARIF_PER_KWH)

    single_rules = [
        _rule_r1(safe_user),
        _rule_r2(safe_user),
        _rule_r3(safe_user, safe_konsumsi),
        _rule_r6(safe_konsumsi),
        _rule_r7(safe_konsumsi),
        _rule_r8(safe_user, safe_alat),
    ]
    recommendations.extend(rule for rule in single_rules if rule)
    recommendations.extend(_rule_r4(safe_alat, tarif))
    recommendations.extend(_rule_r5(safe_alat, tarif))

    specific_count = len(recommendations)
    if specific_count == 0:
        recommendations.append(_rule_r10())
    elif specific_count < 3:
        recommendations.append(_rule_r9())

    return recommendations
