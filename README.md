# HangiBranş — Tüm Türkiye (81 İl / 973 İlçe) Yayına Alma Kılavuzu

**HangiBranş**, hastaların şikayetlerini konuşarak veya yazarak anlatıp **hekim onaylı 15 klinik akışla olası ön tanıyı, doğru branşı**, konumlarına göre **en yakın Devlet / Devlet Üniversitesi / Özel (Vakıf Üniversitesi dahil) hastaneleri**, doktor kadrolarını ve **en yakın / nöbetçi eczaneleri** tek ekranda bulmalarını sağlar.

---

## Proje Yapısı
- `index.html`, `styles.css`, `app.js`, `logo.svg` — Mobil öncelikli web uygulaması
- `data.js` — Hekim onaylı 15 klinik triyaj akışı (16 branş + acil kırmızı bayraklar)
- `turkey_districts.js` — Türkiye 81 il ve tüm ilçeleri (bağlantılı İl → İlçe seçimi)
- `hospitals.js` — Çevrimdışı demo / pilot hastane ve doktor kadroları
- `api/triage.js` — Güvenli sunucu tarafı **Gemini Flash API** uç noktası
- `api/hospitals.js` — Tüm Türkiye **canlı hastane + doktor** API'si *(Supabase PostGIS öncelikli + otomatik OpenStreetMap 81 il yedeği)*
- `db/schema.sql` — Supabase / PostgreSQL (PostGIS) veritabanı kurulum dosyası
- `scripts/sync_turkey_hospitals.mjs` — Türkiye'deki tüm hastaneleri (~1.550+) otomatik çekip veritabanına aktaran script
- `.github/workflows/weekly-sync.yml` — Her hafta Pazar gecesi hastaneleri ücretsiz güncelleyen otomasyon
- `vercel.json` & `.env.example` — Tek tık canlı yayın yapılandırması

---

## 15 Dakikada Tüm Türkiye İçin Canlı Yayına Alma (3 Adım)

### Adım 1: Veritabanını Kur *(Supabase — Başlangıç Ücretsiz)*
1. [supabase.com](https://supabase.com) üzerinden ücretsiz yeni bir proje aç.
2. **SQL Editor** ekranına gir, `db/schema.sql` dosyasının içeriğini yapıştırıp **Run** butonuna bas.
3. **Project Settings → API** bölümünden şu 3 bilgiyi kopyala: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Adım 2: GitHub'a Yükle ve Tüm Türkiye Hastanelerini Doldur
1. Bu klasörü GitHub'da yeni bir depoya yükle.
2. GitHub depo ayarlarından **Settings → Secrets and variables → Actions** kısmına `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` ekle.
3. **Actions → Haftalık Türkiye Hastane Veritabanı Güncellemesi → Run workflow** butonuna tıkla.  
   *(Yaklaşık 1 dakika içinde 81 ildeki ~1.550+ hastane otomatik sınıflandırılıp veritabanına dolar; her Pazar gecesi kendiliğinden güncellenir.)*

### Adım 3: Canlı Yayına Al *(Vercel — Başlangıç Ücretsiz)*
1. [vercel.com](https://vercel.com) hesabında **Add New Project** deyip GitHub deponu seç.
2. **Environment Variables** bölümüne `.env.example` içindeki anahtarları ekle:
   - `GEMINI_API_KEY` *(Google AI Studio'dan alınan Paid Tier anahtar)*
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. **Deploy** butonuna bas — birkaç saniye içinde **HTTPS** üzerinden GPS, canlı Gemini yapay zeka ve tüm 81 il/973 ilçe hastane aramasıyla **HangiBranş** canlıya çıkar!
4. İstersen `hangibrans.com.tr` alan adını Vercel **Domains** sekmesinden bağlayabilirsin.
