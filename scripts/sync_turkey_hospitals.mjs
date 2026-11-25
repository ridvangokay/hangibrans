// HangiBranş — Tüm Türkiye (81 İl, ~1.900+ Hastane + Doğrulanmış Hekim Kadroları) Veritabanı Senkronizasyonu
// Kullanım (Node 18+):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync_turkey_hospitals.mjs
//
// Ne yapar?
// 1. Çoklu Overpass API aynalarından (yedekli & yeniden denemeli) Türkiye sınırları içindeki tüm hastaneleri çeker.
// 2. Ağız ve Diş Sağlığı / veteriner kurumlarını pasif yapar (is_active: false).
// 3. Tek branşlı dal hastanelerini (Göz, Kalp-Damar, Göğüs, Kadın Doğum/Çocuk, Ruh ve Sinir, FTR, KBB) sadece kendi branşlarına atar.
// 4. Vakıf Üniversitelerini kesin olarak "Özel (Vakıf Üniversitesi)" kategorisine ayırır.
// 5. Eksik il bilgilerini hastane adı ve 81 il koordinat eşleştirmesiyle tamamlar.
// 6. `hospitals.js` içindeki doğrulanmış pilot hastaneleri ve doktor kadrolarını `public.hospitals` & `public.doctors` tablolarına aktarır (çakışan OSM kopyalarını kapatır).

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Hata: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri tanımlanmalıdır.");
  process.exit(1);
}

const ALL_SPECIALTIES = [
  "genel-cerrahi", "gastroenteroloji", "kardiyoloji", "kalp-damar", "gogus-hastaliklari",
  "ortopedi", "beyin-cerrahi", "kbb", "noroloji", "dermatoloji", "uroloji", "goz",
  "kadin-dogum", "dahiliye", "cocuk-sagligi", "psikiyatri"
];

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];

const PROVINCE_CENTERS = [
  ["Adana", 37.0, 35.3213], ["Adıyaman", 37.7648, 38.2786], ["Afyonkarahisar", 38.7507, 30.5567],
  ["Ağrı", 39.7191, 43.0503], ["Aksaray", 38.3687, 34.037], ["Amasya", 40.6499, 35.8353],
  ["Ankara", 39.9334, 32.8597], ["Antalya", 36.8969, 30.7133], ["Ardahan", 41.1105, 42.7022],
  ["Artvin", 41.1828, 41.8183], ["Aydın", 37.856, 27.8416], ["Balıkesir", 39.6484, 27.8826],
  ["Bartın", 41.6344, 32.3375], ["Batman", 37.8812, 41.1351], ["Bayburt", 40.2552, 40.2249],
  ["Bilecik", 40.1451, 29.9799], ["Bingöl", 38.8855, 40.4966], ["Bitlis", 38.4006, 42.1095],
  ["Bolu", 40.7392, 31.6089], ["Burdur", 37.7203, 30.2908], ["Bursa", 40.1885, 29.061],
  ["Çanakkale", 40.1553, 26.4142], ["Çankırı", 40.6013, 33.6134], ["Çorum", 40.5506, 34.9556],
  ["Denizli", 37.7765, 29.0864], ["Diyarbakır", 37.9144, 40.2306], ["Düzce", 40.8438, 31.1565],
  ["Edirne", 41.6818, 26.5623], ["Elazığ", 38.681, 39.2264], ["Erzincan", 39.75, 39.5],
  ["Erzurum", 39.9, 41.27], ["Eskişehir", 39.7767, 30.5206], ["Gaziantep", 37.0662, 37.3833],
  ["Giresun", 40.9128, 38.3895], ["Gümüşhane", 40.4603, 39.4814], ["Hakkâri", 37.5833, 43.7333],
  ["Hatay", 36.2023, 36.1613], ["Iğdır", 39.9167, 44.0333], ["Isparta", 37.7648, 30.5566],
  ["İstanbul", 41.0082, 28.9784], ["İzmir", 38.4237, 27.1428], ["Kahramanmaraş", 37.5858, 36.9371],
  ["Karabük", 41.2061, 32.6204], ["Karaman", 37.1759, 33.2287], ["Kars", 40.6013, 43.0975],
  ["Kastamonu", 41.3887, 33.7827], ["Kayseri", 38.7312, 35.4787], ["Kırıkkale", 39.8468, 33.5153],
  ["Kırklareli", 41.7333, 27.2167], ["Kırşehir", 39.1425, 34.1709], ["Kilis", 36.7184, 37.1212],
  ["Kocaeli", 40.7654, 29.9408], ["Konya", 37.8746, 32.4932], ["Kütahya", 39.4167, 29.9833],
  ["Malatya", 38.3552, 38.3095], ["Manisa", 38.6191, 27.4289], ["Mardin", 37.3212, 40.7245],
  ["Mersin", 36.8121, 34.6415], ["Muğla", 37.2153, 28.3636], ["Muş", 38.7432, 41.5064],
  ["Nevşehir", 38.6244, 34.7239], ["Niğde", 37.9667, 34.6833], ["Ordu", 40.9839, 37.8764],
  ["Osmaniye", 37.0742, 36.2478], ["Rize", 41.0201, 40.5234], ["Sakarya", 40.7569, 30.3781],
  ["Samsun", 41.2867, 36.33], ["Siirt", 37.9333, 41.95], ["Sinop", 42.0231, 35.1531],
  ["Sivas", 39.7477, 37.0179], ["Şanlıurfa", 37.1674, 38.7955], ["Şırnak", 37.5164, 42.4611],
  ["Tekirdağ", 40.9833, 27.5167], ["Tokat", 40.3167, 36.55], ["Trabzon", 41.0015, 39.7178],
  ["Tunceli", 39.1079, 39.5401], ["Uşak", 38.6823, 29.4082], ["Van", 38.4891, 43.4089],
  ["Yalova", 40.65, 29.2667], ["Yozgat", 39.8181, 34.8147], ["Zonguldak", 41.4564, 31.7987]
];

const VAKIF_UNI_KEYWORDS = [
  "istinye", "medipol", "acıbadem üniversitesi", "acibadem universitesi", "koç üniversitesi", "koc universitesi",
  "başkent üniversitesi", "baskent universitesi", "yeditepe", "bezmialem", "biruni", "bahçeşehir", "bahcesehir",
  "lokman hekim", "maltepe üniversitesi", "okan üniversitesi", "atlas üniversitesi", "yeni yüzyıl",
  "demiroğlu bilim", "sanko", "tobb", "yüksek ihtisas üniversitesi", "karatay", "ufuk üniversitesi",
  "fenerbahçe üniversitesi", "liv hospital", "medical park", "medicana", "memorial", "acıbadem", "acibadem",
  "florence nightingale", "amerikan hastanesi"
];

const DEVLET_KEYWORDS = [
  "devlet hastanesi", "şehir hastanesi", "sehir hastanesi", "eğitim ve araştırma", "egitim ve arastirma",
  "sağlık bakanlığı", "numune", "siyami ersek", "süreyyapaşa", "ahi evren"
];

const DEVLET_UNI_EXTRA = [
  "ktü", "farabi hastanesi", "ibni sina hastanesi", "balcalı", "tıp fakültesi", "tip fakultesi"
];

function isExcludedFacility(name = "") {
  const n = ` ${name.toLocaleLowerCase("tr-TR")} `;
  const excluded = [
    "veteriner", "hayvan", "ağız ve diş", "agiz ve dis", "diş sağlığı", "dis sagligi",
    "diş hastanesi", "dis hastanesi", "diş merkezi", "dis merkezi", "diş polikliniği",
    "diş kliniği", "dental", "ortodonti", "adsm", "adsh", "aile sağlığı", "asm ",
    "toplum sağlığı", "kan merkezi", "kızılay kan", "huzurevi", "yaşlı bakım",
    "reyap", "medilife beylikdüzü"
  ];
  return excluded.some((kw) => n.includes(kw));
}

function detectSpecialties(name = "") {
  const n = ` ${name.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ")} `;

  // 1) Göz Dal Hastaneleri ("Göztepe" hariç!)
  const isEyeOnly =
    !n.includes("göztepe") &&
    (n.includes(" göz ") || n.includes(" goz ") || n.includes("dünyagöz") || n.includes("dunyagoz") ||
      n.includes("batıgöz") || n.includes("venigöz") || n.includes("kudret göz") ||
      n.includes("maya göz") || n.includes("kaşkaloğlu") || n.includes("ulucanlar göz") ||
      n.includes("beyoğlu göz"));
  if (isEyeOnly) return ["goz"];

  // 2) Göğüs + Kalp / Damar Dal Hastaneleri
  const hasGogus = n.includes("göğüs") || n.includes("gogus") || n.includes("süreyyapaşa") || n.includes("yedikule göğüs") || n.includes("suat seren");
  const hasKalp = n.includes(" kalp ") || n.includes("kardiyoloji") || n.includes("damar cerrahisi") || n.includes("siyami ersek") || n.includes("koşuyolu yüksek ihtisas");
  if (hasGogus && hasKalp) return ["kardiyoloji", "kalp-damar", "gogus-hastaliklari"];
  if (hasKalp) return ["kardiyoloji", "kalp-damar"];
  if (hasGogus) return ["gogus-hastaliklari"];

  // 3) Kadın Doğum ve/veya Çocuk Dal Hastaneleri
  const hasKadinDogum = n.includes("kadın doğum") || n.includes("kadin dogum") || n.includes("kadın hastalıkları") || n.includes("doğumevi") || n.includes("dogumevi") || n.includes("zeynep kamil") || n.includes("zekai tahir") || n.includes("tüp bebek");
  const hasCocuk = n.includes("çocuk hast") || n.includes("cocuk hast") || n.includes("çocuk sağlığı") || n.includes("behçet uz") || n.includes("sami ulus") || n.includes("pediatri");
  if (hasKadinDogum && hasCocuk) return ["kadin-dogum", "cocuk-sagligi"];
  if (hasKadinDogum) return ["kadin-dogum"];
  if (hasCocuk) return ["cocuk-sagligi"];

  // 4) Ruh ve Sinir Hastalıkları / Psikiyatri Dal Hastaneleri
  if (n.includes("ruh ve sinir") || n.includes("ruh sağlığı") || n.includes("ruh sagligi") || n.includes("mazhar osman") || n.includes("npistanbul") || n.includes("np istanbul") || n.includes("psikiyatri hast") || n.includes("amatem")) {
    return ["psikiyatri", "noroloji"];
  }

  // 5) Ortopedi / Kemik / Fizik Tedavi Dal Hastaneleri
  if (n.includes("fizik tedavi") || n.includes("rehabilitasyon") || n.includes("kemik hastalıkları") || n.includes("baltalimanı") || n.includes("ortopedi hast")) {
    return ["ortopedi", "beyin-cerrahi"];
  }

  // 6) KBB Dal Hastaneleri
  if (n.includes("kulak burun") || n.includes(" kbb ")) {
    return ["kbb"];
  }

  // 7) Cildiye / Deri Dal Hastaneleri
  if (n.includes("deri ve zührevi") || n.includes("cildiye hast") || n.includes("lepra")) {
    return ["dermatoloji"];
  }

  // 8) Diyaliz / Böbrek Merkezleri
  if (n.includes("diyaliz") || n.includes("böbrek hast")) {
    return ["dahiliye", "uroloji"];
  }

  // 9) Onkoloji Dal Hastaneleri
  if (n.includes("onkoloji") && !n.includes("şehir hastanesi") && !n.includes("devlet hastanesi")) {
    return ["genel-cerrahi", "dahiliye", "gogus-hastaliklari", "kadin-dogum", "uroloji", "gastroenteroloji"];
  }

  // Genel tam teşekküllü hastaneler
  return ALL_SPECIALTIES;
}

function classify(name, operatorType = "") {
  const n = (name || "").toLocaleLowerCase("tr-TR");
  const op = (operatorType || "").toLocaleLowerCase("tr-TR");

  if (VAKIF_UNI_KEYWORDS.some((kw) => n.includes(kw))) {
    const isUni = n.includes("üniversite") || n.includes("universite");
    return { institution_type: "Özel", sub_type_label: isUni ? "Özel (Vakıf Üniversitesi)" : "Özel Hastane" };
  }
  if (DEVLET_UNI_EXTRA.some((kw) => n.includes(kw))) {
    return { institution_type: "Üniversite", sub_type_label: "Devlet Üniversitesi Hastanesi" };
  }
  if (DEVLET_KEYWORDS.some((kw) => n.includes(kw)) || op === "public" || op === "government") {
    if (n.includes("üniversite") || n.includes("tıp fakültesi")) {
      return { institution_type: "Üniversite", sub_type_label: "Devlet Üniversitesi Hastanesi" };
    }
    if (n.includes("şehir hastanesi")) {
      return { institution_type: "Devlet", sub_type_label: "Şehir Hastanesi (Devlet)" };
    }
    return { institution_type: "Devlet", sub_type_label: "Devlet Hastanesi" };
  }
  if (n.includes("üniversite") || n.includes("tıp fakültesi")) {
    return { institution_type: "Üniversite", sub_type_label: "Devlet Üniversitesi Hastanesi" };
  }
  return { institution_type: "Özel", sub_type_label: "Özel Hastane" };
}

function resolveProvince(tags, name, lat, lng) {
  const rawCity = (tags["addr:province"] || tags["addr:city"] || "").trim();
  const rawLow = rawCity.toLocaleLowerCase("tr-TR");
  const nameLow = (name || "").toLocaleLowerCase("tr-TR");

  for (const [prov] of PROVINCE_CENTERS) {
    const pLow = prov.toLocaleLowerCase("tr-TR");
    if (rawLow === pLow || rawLow.includes(pLow)) return prov;
  }
  for (const [prov] of PROVINCE_CENTERS) {
    const pLow = prov.toLocaleLowerCase("tr-TR");
    if (nameLow.includes(pLow)) return prov;
  }

  let bestProv = "Türkiye";
  let minDistSq = Infinity;
  for (const [prov, pLat, pLng] of PROVINCE_CENTERS) {
    const dSq = (lat - pLat) ** 2 + (lng - pLng) ** 2;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      bestProv = prov;
    }
  }
  return bestProv;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function loadPilotHospitals() {
  const filePath = path.resolve(__dirname, "..", "hospitals.js");
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  const list = vm.runInNewContext(`${raw}\n;DOKTORUM_HOSPITALS;`, {});
  return Array.isArray(list) ? list : [];
}

function matchesPilotDuplicate(osmName, osmType, osmLat, osmLng, pilot) {
  const dist = haversineKm(osmLat, osmLng, pilot.lat, pilot.lng);
  if (dist > 1.8) return false;
  if (osmType !== pilot.type) return false;
  if (dist <= 0.35) return true;

  const stop = new Set([
    "özel", "ozel", "hastanesi", "hastane", "devlet", "şehir", "sehir", "eğitim", "egitim",
    "araştırma", "arastirma", "üniversitesi", "universitesi", "tıp", "tip", "fakültesi",
    "fakultesi", "sağlık", "saglik", "bakanlığı", "istanbul", "ankara", "izmir", "bursa",
    "antalya", "prof", "dr", "ve", "tc", "international", "hospital"
  ]);
  const tokens = (s) =>
    s.toLocaleLowerCase("tr-TR")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stop.has(w));

  const a = new Set(tokens(osmName));
  const b = tokens(pilot.name);
  const shared = b.filter((w) => a.has(w));
  return shared.length >= 1 && (shared.some((w) => w.length >= 6) || shared.length >= 2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchAllTurkeyHospitals() {
  console.log("Türkiye genelindeki tüm hastaneler Overpass API aynalarından çekiliyor...");
  const query = `
    [out:json][timeout:120];
    area["ISO3166-1"="TR"][admin_level=2]->.tr;
    nwr["amenity"="hospital"](area.tr);
    out center tags;
  `;

  let lastError = null;
  for (let round = 1; round <= 2; round++) {
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        console.log(`[Tur ${round}] Deneniyor: ${endpoint}`);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 110000);
        const resp = await fetch(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "HangiBransSync/1.0 (https://github.com/ridvangokay/hangibrans)"
          },
          body: `data=${encodeURIComponent(query)}`
        });
        clearTimeout(timer);

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (Array.isArray(data.elements) && data.elements.length > 0) {
          console.log(`Başarılı (${endpoint}): ${data.elements.length} kayıt alındı.`);
          return data.elements;
        }
        throw new Error("Boş yanıt döndü");
      } catch (err) {
        lastError = `${endpoint} -> ${err.message}`;
        console.warn(`Ayna başarısız: ${lastError}`);
        await sleep(3000);
      }
    }
  }

  throw new Error(`Tüm Overpass aynaları başarısız oldu. Son hata: ${lastError}`);
}

async function supabaseUpsert(table, rows, onConflict = "") {
  const qs = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : "";
  const resp = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}${qs}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify(rows)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Supabase ${table} upsert hatası (${resp.status}): ${errText}`);
  }
}

async function main() {
  const pilotHospitals = loadPilotHospitals();
  console.log(`Doğrulanmış pilot hastane sayısı: ${pilotHospitals.length}`);

  const elements = await fetchAllTurkeyHospitals();
  console.log(`Toplam ham OSM kaydı: ${elements.length}`);

  const rows = [];
  const seen = new Set();
  let excludedCount = 0;
  let specialtyFilteredCount = 0;
  let dedupPilotCount = 0;

  for (const el of elements) {
    const tags = el.tags || {};
    const name = (tags.name || "").trim();
    if (!name) continue;

    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const low = name.toLocaleLowerCase("tr-TR");
    const dedupKey = `${low}-${lat.toFixed(2)}-${lng.toFixed(2)}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const cls = classify(name, tags["operator:type"]);
    const excluded = isExcludedFacility(name);
    const pilotDup = !excluded && pilotHospitals.some((p) => matchesPilotDuplicate(name, cls.institution_type, lat, lng, p));
    const specialties = detectSpecialties(name);

    if (excluded) excludedCount++;
    if (pilotDup) dedupPilotCount++;
    if (!excluded && specialties.length < ALL_SPECIALTIES.length) specialtyFilteredCount++;

    const isState = cls.institution_type === "Devlet";
    const phoneRaw = tags.phone || tags["contact:phone"] || "";
    const phoneDigits = phoneRaw.replace(/[^\d+]/g, "");
    const website = tags.website || tags["contact:website"] || "";
    const city = resolveProvince(tags, name, lat, lng);
    const district = (tags["addr:district"] || tags["addr:suburb"] || "Merkez").trim();

    rows.push({
      id: `tr-${el.type}-${el.id}`,
      name,
      institution_type: cls.institution_type,
      sub_type_label: cls.sub_type_label,
      city,
      district,
      address: tags["addr:full"] || [tags["addr:street"], tags["addr:suburb"], district, city].filter(Boolean).join(", "),
      lat,
      lng,
      phone: phoneDigits,
      phone_display: phoneRaw || (isState ? "ALO 182 (MHRS)" : ""),
      appointment_phone: isState ? "182" : phoneDigits,
      appointment_label: isState ? "ALO 182 (MHRS)" : phoneRaw || "Hastane İletişim",
      mhrs_url: "https://www.mhrs.gov.tr/",
      schedule_url: website,
      schedule_label: isState ? "Resmi Hekim Çalışma Listesi" : "Hastane Sitesi · Doktorlarımız",
      specialties,
      is_active: !excluded && !pilotDup,
      updated_at: new Date().toISOString()
    });
  }

  console.log(`OSM özet -> Toplam: ${rows.length} | Diş/hariç pasif: ${excludedCount} | Dal hastanesi filtrelenen: ${specialtyFilteredCount} | Pilotla birleştirilen: ${dedupPilotCount}`);

  // 1) Tüm Türkiye OSM hastanelerini 200'lük paketlerle aktar
  const BATCH_SIZE = 200;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const slice = rows.slice(i, i + BATCH_SIZE);
    await supabaseUpsert("hospitals", slice);
    console.log(`OSM aktarıldı: ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
  }

  // 2) Doğrulanmış pilot hastaneleri ve doktor kadrolarını aktar
  if (pilotHospitals.length > 0) {
    const pilotRows = pilotHospitals.map((h) => ({
      id: h.id,
      name: h.name,
      institution_type: h.type,
      sub_type_label: h.subTypeLabel || h.type,
      city: h.city,
      district: (h.district || "").split("/")[0].trim(),
      address: h.address || "",
      lat: h.lat,
      lng: h.lng,
      phone: h.phone || "",
      phone_display: h.phoneDisplay || "",
      appointment_phone: h.appointmentPhone || (h.type === "Devlet" ? "182" : ""),
      appointment_label: h.appointmentLabel || "",
      mhrs_url: h.mhrsUrl || "https://www.mhrs.gov.tr/",
      schedule_url: h.scheduleUrl || "",
      schedule_label: h.scheduleLabel || "",
      specialties: Array.isArray(h.specialties) && h.specialties.length ? h.specialties : ALL_SPECIALTIES,
      is_active: true,
      updated_at: new Date().toISOString()
    }));

    await supabaseUpsert("hospitals", pilotRows);
    console.log(`Doğrulanmış pilot hastaneler aktarıldı: ${pilotRows.length}`);

    const doctorRows = [];
    for (const h of pilotHospitals) {
      const bySpec = h.doctorsBySpecialty || {};
      for (const [specId, docs] of Object.entries(bySpec)) {
        for (const doc of docs || []) {
          doctorRows.push({
            hospital_id: h.id,
            full_name: doc.name,
            specialty_id: specId,
            sub_focus: doc.focus || "",
            source_url: h.scheduleUrl || "",
            is_active: true,
            last_synced_at: new Date().toISOString()
          });
        }
      }
    }

    if (doctorRows.length > 0) {
      await supabaseUpsert("doctors", doctorRows, "hospital_id,full_name,specialty_id");
      console.log(`Doğrulanmış doktor kadroları aktarıldı: ${doctorRows.length} hekim`);
    }
  }

  console.log("Tamamlandı! Dal hastanesi filtreleri ve doktor kadrolarıyla tüm Türkiye veritabanı güncellendi.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});