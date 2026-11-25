// HangiBranş — Tüm Türkiye (81 İl, ~1.550+ Hastane) Otomatik Veritabanı Doldurma Scripti
// Kullanım (Node 18+):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync_turkey_hospitals.mjs
//
// Ne yapar?
// 1. Çoklu Overpass API aynalarından (yedekli & yeniden denemeli) Türkiye sınırları içindeki tüm hastaneleri çeker.
// 2. Vakıf Üniversitelerini otomatik olarak "Özel (Vakıf Üniversitesi)" kategorisine ayırır.
// 3. Eksik il bilgilerini hastane adı ve 81 il koordinat eşleştirmesiyle otomatik tamamlar.
// 4. Supabase `public.hospitals` tablosuna tek seferde upsert eder (tekrar çalıştırıldığında günceller).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Hata: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri tanımlanmalıdır.");
  process.exit(1);
}

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
  "demiroğlu bilim", "sanko", "tobb", "yüksek ihtisas", "karatay", "ufuk üniversitesi", "fenerbahçe üniversitesi",
  "liv hospital", "medical park", "medicana", "memorial", "acıbadem", "acibadem", "florence nightingale", "amerikan hastanesi"
];

const DEVLET_KEYWORDS = [
  "devlet hastanesi", "şehir hastanesi", "sehir hastanesi", "eğitim ve araştırma", "egitim ve arastirma",
  "sağlık bakanlığı", "numune", "siyami ersek", "süreyyapaşa"
];

function classify(name, operatorType = "") {
  const n = (name || "").toLocaleLowerCase("tr-TR");
  const op = (operatorType || "").toLocaleLowerCase("tr-TR");

  if (VAKIF_UNI_KEYWORDS.some((kw) => n.includes(kw))) {
    const isUni = n.includes("üniversite") || n.includes("universite");
    return { institution_type: "Özel", sub_type_label: isUni ? "Özel (Vakıf Üniversitesi)" : "Özel Hastane" };
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

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
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

async function upsertBatch(rows) {
  const resp = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/hospitals`, {
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
    throw new Error(`Supabase upsert hatası (${resp.status}): ${errText}`);
  }
}

async function main() {
  const elements = await fetchAllTurkeyHospitals();
  console.log(`Toplam ham kayıt: ${elements.length}`);

  const rows = [];
  const seen = new Set();

  for (const el of elements) {
    const tags = el.tags || {};
    const name = (tags.name || "").trim();
    if (!name) continue;
    const low = name.toLocaleLowerCase("tr-TR");
    if (low.includes("veteriner") || low.includes("hayvan")) continue;

    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const dedupKey = `${low}-${lat.toFixed(2)}-${lng.toFixed(2)}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const cls = classify(name, tags["operator:type"]);
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
      is_active: true,
      updated_at: new Date().toISOString()
    });
  }

  console.log(`Temizlenmiş Türkiye hastane sayısı: ${rows.length}`);

  // 200'lük paketler halinde Supabase'e aktar
  const BATCH_SIZE = 200;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const slice = rows.slice(i, i + BATCH_SIZE);
    await upsertBatch(slice);
    console.log(`Aktarıldı: ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
  }

  console.log("Tamamlandı! Tüm Türkiye hastane veritabanı güncellendi.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});