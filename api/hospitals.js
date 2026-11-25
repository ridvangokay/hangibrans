// HangiBranş — Tüm Türkiye Canlı Hastane & Doktor Sorgulama API'si (Vercel Serverless)
// 1. Öncelik: Supabase (PostGIS) veritabanındaki doğrulanmış 81 il hastane & doktor kadrosu
// 2. Otomatik Yedek: Supabase henüz kurulmadıysa OpenStreetMap Overpass API ile Türkiye'nin
//    herhangi bir il/ilçesindeki gerçek hastaneleri canlı getirir ve Vakıf Üniversitelerini "Özel" sınıflar.

const VAKIF_UNI_KEYWORDS = [
  "istinye", "medipol", "acıbadem üniversitesi", "acibadem universitesi", "koç üniversitesi", "koc universitesi",
  "başkent üniversitesi", "baskent universitesi", "yeditepe", "bezmialem", "biruni", "bahçeşehir", "bahcesehir",
  "lokman hekim", "maltepe üniversitesi", "okan üniversitesi", "atlas üniversitesi", "yeni yüzyıl",
  "demiroğlu bilim", "sanko", "tobb", "yüksek ihtisas", "karatay", "ufuk üniversitesi", "fenerbahçe üniversitesi",
  "liv hospital", "medical park", "medicana", "memorial", "acıbadem", "acibadem", "florence nightingale", "amerikan hastanesi"
];

const DEVLET_KEYWORDS = [
  "devlet hastanesi", "şehir hastanesi", "sehir hastanesi", "eğitim ve araştırma", "egitim ve arastirma",
  "ağız ve diş sağlığı", "devlet", "sağlık bakanlığı", "numune", "süreyyapaşa", "siyami ersek", "hasek", "taksim eah"
];

function classifyHospital(name = "", operatorType = "") {
  const n = name.toLocaleLowerCase("tr-TR");
  const op = operatorType.toLocaleLowerCase("tr-TR");

  // 1) Vakıf Üniversiteleri & Özel Zincirler -> KESİNLİKLE ÖZEL
  if (VAKIF_UNI_KEYWORDS.some((kw) => n.includes(kw))) {
    const isUni = n.includes("üniversite") || n.includes("universite");
    return {
      type: "Özel",
      subTypeLabel: isUni ? "Özel (Vakıf Üniversitesi)" : "Özel Hastane"
    };
  }

  // 2) Devlet Hastaneleri / Şehir Hastaneleri / EAH
  if (DEVLET_KEYWORDS.some((kw) => n.includes(kw)) || op === "public" || op === "government") {
    if (n.includes("üniversite") || n.includes("tıp fakültesi")) {
      return { type: "Üniversite", subTypeLabel: "Devlet Üniversitesi Hastanesi" };
    }
    if (n.includes("şehir hastanesi")) {
      return { type: "Devlet", subTypeLabel: "Şehir Hastanesi (Devlet)" };
    }
    return { type: "Devlet", subTypeLabel: "Devlet Hastanesi" };
  }

  // 3) Kamu Üniversite Hastaneleri (İstanbul Tıp, Cerrahpaşa, Hacettepe, Ege, DEÜ, Akdeniz, Uludağ, Gazi, Ankara Üniv., Marmara vb.)
  if (n.includes("üniversite") || n.includes("tıp fakültesi") || n.includes("tip fakultesi")) {
    return { type: "Üniversite", subTypeLabel: "Devlet Üniversitesi Hastanesi" };
  }

  // 4) Diğer özel hastaneler
  return { type: "Özel", subTypeLabel: "Özel Hastane" };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function querySupabase({ lat, lng, city, district, specialty, instType }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const isGeo = Number.isFinite(lat) && Number.isFinite(lng);
  const rpcName = isGeo ? "get_nearest_hospitals" : "get_hospitals_by_district";
  const body = isGeo
    ? { p_lat: lat, p_lng: lng, p_specialty_id: specialty || "genel-cerrahi", p_inst_type: instType || "Tümü", p_max_km: 25, p_limit: 12 }
    : { p_city: city, p_district: district, p_specialty_id: specialty || "genel-cerrahi", p_inst_type: instType || "Tümü", p_limit: 12 };

  const resp = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) return null;
  const rows = await resp.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.institution_type,
    subTypeLabel: r.sub_type_label,
    city: r.city,
    district: r.district,
    address: r.address || `${r.district}, ${r.city}`,
    lat: r.lat,
    lng: r.lng,
    distanceKm: typeof r.distance_km === "number" ? r.distance_km : null,
    phoneDisplay: r.phone_display || "Hastane santrali",
    appointmentPhone: r.appointment_phone || (r.institution_type === "Devlet" ? "182" : ""),
    appointmentLabel: r.appointment_label || (r.institution_type === "Devlet" ? "ALO 182 (MHRS)" : r.phone_display || "Ara"),
    mhrsUrl: r.mhrs_url || "https://www.mhrs.gov.tr/",
    scheduleUrl: r.schedule_url || "",
    scheduleLabel: r.schedule_label || (r.institution_type === "Devlet" ? "Resmi Hekim Çalışma Listesi" : "Hastane Sitesi · Doktorlarımız"),
    doctors: Array.isArray(r.doctors) ? r.doctors : []
  }));
}

async function queryOpenStreetMapFallback({ lat, lng, city, district, instType }) {
  // Koordinat yoksa Nominatim ile seçilen İl + İlçe merkez koordinatını al (ücretsiz)
  let cLat = lat;
  let cLng = lng;
  if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) {
    const q = encodeURIComponent(`${district || ""}, ${city || ""}, Turkey`);
    const nomResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, {
      headers: { "User-Agent": "HangiBransApp/1.0 (https://hangibrans.com.tr)" }
    });
    if (nomResp.ok) {
      const nomData = await nomResp.json();
      if (nomData[0]) {
        cLat = parseFloat(nomData[0].lat);
        cLng = parseFloat(nomData[0].lon);
      }
    }
  }
  if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) return [];

  // Overpass API ile 15 km yarıçaptaki tüm gerçek hastaneleri getir
  const overpassQuery = `[out:json][timeout:12];(node["amenity"="hospital"](around:15000,${cLat},${cLng});way["amenity"="hospital"](around:15000,${cLat},${cLng});relation["amenity"="hospital"](around:15000,${cLat},${cLng}););out center tags;`;
  const ovResp = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(overpassQuery)}`
  });
  if (!ovResp.ok) return [];
  const ovJson = await ovResp.json();

  const seen = new Set();
  const hospitals = [];

  for (const el of ovJson.elements || []) {
    const tags = el.tags || {};
    const name = (tags.name || "").trim();
    if (!name || seen.has(name.toLocaleLowerCase("tr-TR"))) continue;
    // Ağız/Diş veya hayvan hastanesi gibi ilgisiz kayıtları ayıkla
    const lowerName = name.toLocaleLowerCase("tr-TR");
    if (lowerName.includes("veteriner") || lowerName.includes("hayvan")) continue;

    const hLat = el.lat ?? el.center?.lat;
    const hLng = el.lon ?? el.center?.lon;
    if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) continue;

    seen.add(lowerName);
    const cls = classifyHospital(name, tags["operator:type"] || "");
    if (instType && instType !== "Tümü" && cls.type !== instType) continue;

    const rawPhone = tags.phone || tags["contact:phone"] || "";
    const cleanPhone = rawPhone.replace(/[^\d+]/g, "");
    const website = tags.website || tags["contact:website"] || "";
    const isState = cls.type === "Devlet";

    hospitals.push({
      id: `osm-${el.type}-${el.id}`,
      name,
      type: cls.type,
      subTypeLabel: cls.subTypeLabel,
      city: tags["addr:city"] || city || "",
      district: tags["addr:district"] || tags["addr:suburb"] || district || "",
      address: tags["addr:full"] || [tags["addr:street"], tags["addr:suburb"], district, city].filter(Boolean).join(", "),
      lat: hLat,
      lng: hLng,
      distanceKm: Number(haversineKm(cLat, cLng, hLat, hLng).toFixed(1)),
      phoneDisplay: rawPhone || (isState ? "ALO 182 (MHRS)" : "Harita / Web sitesinden teyit edin"),
      appointmentPhone: isState ? "182" : cleanPhone,
      appointmentLabel: isState ? "ALO 182 (MHRS)" : rawPhone || "Web / Harita",
      mhrsUrl: "https://www.mhrs.gov.tr/",
      scheduleUrl: website,
      scheduleLabel: isState ? "Resmi Hastane Sitesi / Çalışma Listesi" : "Hastane Sitesi · Doktorlarımız",
      doctors: []
    });
  }

  hospitals.sort((a, b) => a.distanceKm - b.distanceKm);
  return hospitals.slice(0, 10);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  const city = (req.query.city || "").toString().trim();
  const district = (req.query.district || "").toString().trim();
  const specialty = (req.query.specialty || "genel-cerrahi").toString().trim();
  const instType = (req.query.type || "Tümü").toString().trim();
  const lat = req.query.lat ? parseFloat(req.query.lat) : NaN;
  const lng = req.query.lng ? parseFloat(req.query.lng) : NaN;

  try {
    // 1) Önce kendi Supabase (PostGIS) veritabanımızı sorgula
    const dbResults = await querySupabase({ lat, lng, city, district, specialty, instType });
    if (dbResults && dbResults.length > 0) {
      return res.status(200).json({ source: "supabase", hospitals: dbResults });
    }

    // 2) Veritabanı henüz boşsa/kurulmadıysa canlı OpenStreetMap (81 il / 973 ilçe) yedeğini kullan
    const liveResults = await queryOpenStreetMapFallback({ lat, lng, city, district, instType });
    return res.status(200).json({ source: "live-osm", hospitals: liveResults });
  } catch (err) {
    return res.status(500).json({ error: "Hastane sorgusu sırasında hata oluştu.", details: err.message });
  }
}
