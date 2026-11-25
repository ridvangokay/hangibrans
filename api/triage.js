// Doktorum — Güvenli Sunucu Tarafı Gemini Flash API Uç Noktası (Vercel / Serverless uyumlu)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sadece POST istekleri desteklenir." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Sunucuda GEMINI_API_KEY tanımlı değil." });
  }

  const { complaint } = req.body || {};
  if (!complaint || typeof complaint !== "string" || complaint.trim().length < 3) {
    return res.status(400).json({ error: "Geçerli bir şikayet metni gönderilmelidir." });
  }

  const systemPrompt = [
    "Sen Türkiye'deki hastalar için sade bir klinik ön değerlendirme ve branş yönlendirme asistanısın.",
    "Kesin tanı koyma veya ilaç önerme. Sadece olası ön tanıyı, ayırıcı olasılıkları, doğru branşı ve acil kırmızı bayrak durumunu belirle.",
    "Geçerli specialtyId değerleri: genel-cerrahi, gastroenteroloji, kardiyoloji, kalp-damar, gogus-hastaliklari, ortopedi, beyin-cerrahi, kbb, noroloji, dermatoloji, uroloji, goz, kadin-dogum, dahiliye, cocuk-sagligi, psikiyatri.",
    "Hekim onaylı klinik kurallar: Akut apandisit, safra kesesi/kolesistit, akut divertikülit (sol alt karın), ileus (gaz-dışkı çıkışı yok), makat hastalıkları (fissür/hemoroid/apse/pilonidal), fıtık/boğulmuş fıtık, meme kitlesi/mastit, tiroid nodülü, lipom/apse/tırnak batması → genel-cerrahi. Testis torsiyonu/glob/ateşli taş → uroloji (acil). Tek bacak ani şişlik (DVT) → kalp-damar (acil). Kauda ekina/bel-boyun fıtığı → beyin-cerrahi. Periferik vertigo/BPPV → kbb. Dış gebelik → kadin-dogum (acil). Anafilaksi/AKS/inme/emboli → 112 acil.",
    'Sadece geçerli JSON döndür: {"specialtyId":"...","preliminaryDiagnosis":"...","differential":["..."],"explanation":"...","redFlagNote":"...","isEmergency":false,"emergencyReason":""}'
  ].join("\n");

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nHasta bilgisi: ${complaint.trim().slice(0, 900)}` }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      })
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Yapay zeka servisi şu an yanıt veremiyor." });
    }

    const payload = await response.json();
    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return res.status(200).json(JSON.parse(rawText));
  } catch {
    return res.status(500).json({ error: "Analiz sırasında beklenmeyen bir hata oluştu." });
  }
}
