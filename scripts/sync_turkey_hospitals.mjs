// HangiBranş — Tüm Türkiye (81 İl, ~1.550+ Hastane) Otomatik Veritabanı Doldurma Scripti
// Kullanım (Node 18+):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync_turkey_hospitals.mjs
//
// Ne yapar?
// 1. OpenStreetMap Overpass API'den Türkiye sınırları içindeki tüm hastaneleri (Devlet, Üniversite, Özel) çeker.
// 2. Vakıf Üniversitelerini otomatik olarak "Özel (Vakıf Üniversitesi)" kategorisine ayırır.
// 3. Supabase `public.hospitals` tablosuna tek seferde upsert eder (tekrar çalıştırıldığında günceller).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Hata: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri tanımlanmalıdır.");
  process.exit(1);
}

const VAKIF_UNI_KEYWORDS = [
  "istinye", "medipol", "acıbadem üniversitesi", "acibadem universitesi", "koç üniversitesi", "koc universitesi",
  "başkent üniversitesi", "baskent universitesi", "yeditepe", "bezmialem", "biruni", "bahçeşehir", "bahcesehir",
  "lokman hekim", "maltepe üniversitesi", "okan üniversitesi", "atlas üniversitesi", "yeni yüzyıl",
  "demiroğlu bilim", "sanko", "tobb", "yüksek ihtisas", "karatay", "ufuk üniversitesi",
  "liv hospital", "medical park", "medicana", "memorial", "acıbadem", "acibadem", "florence nightingale"
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

async function fetchAllTurkeyHospitals() {
  console.log("Türkiye genelindeki tüm hastaneler Overpass API'den çekiliyor...");
  const query = `
    [out:json][timeout:90];
    area["ISO3166-1"="TR"][admin_level=2]->.tr;
    (
      node["amenity"="hospital"](area.tr);
      way["amenity"="hospital"](area.tr);
      relation["amenity"="hospital"](area.tr);
    );
    out center tags;
  `;

  const resp = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!resp.ok) throw new Error(`Overpass hatası: ${resp.status}`);
  const data = await resp.json();
  return data.elements || [];
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

    rows.push({
      id: `tr-${el.type}-${el.id}`,
      name,
      institution_type: cls.institution_type,
      sub_type_label: cls.sub_type_label,
      city: tags["addr:province"] || tags["addr:city"] || "Türkiye",
      district: tags["addr:district"] || tags["addr:suburb"] || "Merkez",
      address: tags["addr:full"] || [tags["addr:street"], tags["addr:suburb"], tags["addr:district"], tags["addr:city"]].filter(Boolean).join(", "),
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
