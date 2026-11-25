// HangiBranş — Hekim Onaylı 15 Başlıklı Klinik Triyaj & Branş Yönlendirme Motoru

const DOKTORUM_TRIAGE = {
  quickExamples: [
    { label: "Karnım ağrıyor", text: "Karnım ağrıyor, hangi bölüme gitmeliyim?" },
    { label: "Makat ağrım var", text: "Makat ağrım var, nereye gitmeliyim?" },
    { label: "Kasık / göbek şişliği", text: "Kasığımda şişlik fark ettim." },
    { label: "Memede kitle / ağrı", text: "Mememde şişlik fark ettim." },
    { label: "Boyunda şişlik / tiroid", text: "Boynumda şişlik ve guatr şüphesi var." },
    { label: "Göğüs ağrısı / çarpıntı", text: "Göğsümde ağrı ve sıkışma var." },
    { label: "Nefes darlığı / öksürük", text: "Uzun süren öksürük ve nefes darlığım var." },
    { label: "Baş ağrısı / baş dönmesi", text: "Baş dönmesi ve baş ağrım var." },
    { label: "Bel / diz / eklem ağrısı", text: "Belimden bacağıma vuran ağrı veya diz ağrım var." },
    { label: "İdrar yanması / yan ağrısı", text: "İdrar yaparken yanma ve böbrek bölgemde ağrı var." },
    { label: "Bacakta ani şişlik / cilt", text: "Tek bacağımda ani şişlik ve baldır ağrısı başladı." }
  ],

  emergencyPatterns: [
    {
      keywords: ["göğsümde şiddetli", "sol koluma", "çeneme vuruyor", "soğuk ter", "nefes alamıyorum"],
      minMatches: 2,
      preliminaryDiagnosis: "Akut Koroner Sendrom / Acil Kardiyak Durum Şüphesi",
      specialtyId: "kardiyoloji",
      reason: "Göğüste baskı/sıkışma, kola veya çeneye yayılan ağrı, soğuk terleme ya da nefes darlığı acil müdahale gerektirir. Randevu beklemeden hemen 112'yi arayın."
    },
    {
      keywords: ["yüzüm kaydı", "konuşamıyorum", "konuşma bozukluğu", "kolum tutmuyor", "bacağım tutmuyor", "ani felç"],
      minMatches: 1,
      preliminaryDiagnosis: "Akut İnme (Felç) Şüphesi",
      specialtyId: "noroloji",
      reason: "Ani güç kaybı, konuşma bozukluğu veya yüz asimetrisi zamanla yarışılan acil bir durumdur. Hemen 112'yi arayın."
    },
    {
      keywords: ["dudak şişmesi", "dilim şişti", "boğazım şişti", "nefes alamıyorum", "anafilaksi"],
      minMatches: 1,
      preliminaryDiagnosis: "Anafilaksi / Akut Hava Yolu Ödemi Şüphesi",
      specialtyId: "dahiliye",
      reason: "Dudak/dil şişmesi ve nefes darlığı hayati risk taşıyan ağır alerjik reaksiyon veya hava yolu ödemi bulgusudur. Hemen 112'yi arayın!"
    },
    {
      keywords: ["dayanılmaz karın", "karnım taş gibi", "kanlı kusma", "siyah dışkı", "durmayan kanama", "bayıldım", "gaz çıkaramıyorum"],
      minMatches: 1,
      preliminaryDiagnosis: "Akut Batın / İleus veya Acil Kanama Şüphesi",
      specialtyId: "genel-cerrahi",
      reason: "Anlattığınız bulgular acil cerrahi veya dahili müdahale gerektirir. Beklemeden en yakın Acil Servise başvurun."
    }
  ],

  specialties: {
    "genel-cerrahi": { id: "genel-cerrahi", name: "Genel Cerrahi", mhrsName: "Genel Cerrahi" },
    "gastroenteroloji": { id: "gastroenteroloji", name: "Gastroenteroloji", mhrsName: "Gastroenteroloji (veya önce İç Hastalıkları)" },
    "kardiyoloji": { id: "kardiyoloji", name: "Kardiyoloji", mhrsName: "Kardiyoloji" },
    "kalp-damar": { id: "kalp-damar", name: "Kalp ve Damar Cerrahisi", mhrsName: "Kalp ve Damar Cerrahisi" },
    "gogus-hastaliklari": { id: "gogus-hastaliklari", name: "Göğüs Hastalıkları", mhrsName: "Göğüs Hastalıkları" },
    "ortopedi": { id: "ortopedi", name: "Ortopedi ve Travmatoloji", mhrsName: "Ortopedi ve Travmatoloji" },
    "beyin-cerrahi": { id: "beyin-cerrahi", name: "Beyin ve Sinir Cerrahisi", mhrsName: "Beyin ve Sinir Cerrahisi" },
    "kbb": { id: "kbb", name: "Kulak Burun Boğaz (KBB)", mhrsName: "Kulak Burun Boğaz Hastalıkları" },
    "noroloji": { id: "noroloji", name: "Nöroloji", mhrsName: "Nöroloji" },
    "dermatoloji": { id: "dermatoloji", name: "Dermatoloji (Cildiye)", mhrsName: "Deri ve Zührevi Hastalıkları (Cildiye)" },
    "uroloji": { id: "uroloji", name: "Üroloji", mhrsName: "Üroloji" },
    "goz": { id: "goz", name: "Göz Hastalıkları", mhrsName: "Göz Hastalıkları" },
    "kadin-dogum": { id: "kadin-dogum", name: "Kadın Hastalıkları ve Doğum", mhrsName: "Kadın Hastalıkları ve Doğum" },
    "dahiliye": { id: "dahiliye", name: "İç Hastalıkları (Dahiliye)", mhrsName: "İç Hastalıkları (Dahiliye)" },
    "cocuk-sagligi": { id: "cocuk-sagligi", name: "Çocuk Sağlığı ve Hastalıkları", mhrsName: "Çocuk Sağlığı ve Hastalıkları" },
    "psikiyatri": { id: "psikiyatri", name: "Psikiyatri", mhrsName: "Ruh Sağlığı ve Hastalıkları (Psikiyatri)" }
  },

  // Hekim Onaylı 15 Klinik Akış
  flows: [
    // 1. KARIN AĞRISI
    {
      id: "karin-agrisi",
      title: "1 · Karın Ağrısı Ön Değerlendirmesi",
      matchKeywords: ["karın", "karnım", "karnımda", "safra", "apandisit", "divertikülit", "mide", "reflü", "gastrit", "ileus", "gaz çıkaram"],
      questions: [
        {
          id: "location",
          text: "Ağrı karnınızın tam olarak neresinde hissediliyor?",
          options: [
            { value: "sag-ust", label: "Sağ üst (kaburga altı)" },
            { value: "sag-alt", label: "Sağ alt karın" },
            { value: "sol-alt", label: "Sol alt karın" },
            { value: "mide", label: "Mide / üst orta bölge" },
            { value: "alt-idrar", label: "Alt karın / kasık (idrar şikayetiyle)" },
            { value: "alt-jinekoloji", label: "Alt karın (adet gecikmesi / kadın sağlığı)" },
            { value: "yaygin", label: "Tüm karında yaygın" }
          ]
        },
        {
          id: "duration",
          text: "Kaç gündür devam ediyor?",
          options: [
            { value: "akut", label: "Bugün / son 24–48 saatte başladı" },
            { value: "birkac-gun", label: "2–5 gündür var" },
            { value: "kronik", label: "1 haftadan uzun süredir / tekrarlıyor" }
          ]
        },
        {
          id: "extra",
          text: "Eşlik eden belirgin bir bulgunuz var mı?",
          options: [
            { value: "yemek-bulanti", label: "Yemek sonrası artış / bulantı" },
            { value: "ates-kusma", label: "Yüksek ateş, sarılık veya sürekli kusma" },
            { value: "gaz-yok", label: "Şişkinlik ve gaz-dışkı çıkaramama" },
            { value: "yanma", label: "Mide yanması / ağza acı su gelmesi" },
            { value: "ishal", label: "İshal ve kramp" },
            { value: "yok", label: "Ek şikayet yok" }
          ]
        }
      ],
      evaluate(ans) {
        const loc = ans.location || "yaygin";
        const dur = ans.duration || "birkac-gun";
        const extra = ans.extra || "yok";

        if (extra === "gaz-yok") {
          return {
            preliminaryDiagnosis: "İleus (Bağırsak Tıkanıklığı) Şüphesi",
            differential: ["Şiddetli kabızlık", "Boğulmuş fıtık", "Kolon patolojisi"],
            specialtyId: "genel-cerrahi",
            alternatives: ["Gastroenteroloji"],
            isEmergency: true,
            emergencyReason: "Karın ağrısına belirgin şişkinlik, kusma ve gaz-dışkı çıkaramama eşlik etmesi İleus (bağırsak tıkanıklığı) bulgusudur. Randevu beklemeden hemen Acil Servise başvurun!",
            explanation: "Bağırsak tıkanıklığı şüphesi acil cerrahi muayene ve görüntüleme gerektirir.",
            redFlagNote: "Ağızdan yemek/su almayı kesin ve vakit kaybetmeden Acil Servise gidin."
          };
        }

        if (loc === "sag-alt") {
          const isEmerg = dur === "akut" || extra === "ates-kusma" || extra === "yemek-bulanti";
          return {
            preliminaryDiagnosis: "Akut Apandisit Şüphesi",
            differential: ["Üreter taşı", "Mezenter lenfadenit", "Yumurtalık kisti (kadınlarda)"],
            specialtyId: "genel-cerrahi",
            alternatives: ["Üroloji", "Kadın Hastalıkları ve Doğum"],
            isEmergency: isEmerg,
            emergencyReason: "Sağ alt karın ağrısının yeni başlaması ve ateş/bulantı eşlik etmesi Akut Apandisit bulgusudur. Randevu beklemeden Acil Servise başvurun.",
            explanation: "Sağ alt kadran karın ağrısı öncelikle Akut Apandisit açısından Genel Cerrahi değerlendirmesi gerektirir.",
            redFlagNote: "Ağrı yürürken veya öksürürken artıyorsa, ateş ya da kusma başladıysa hemen Acil Servise başvurun."
          };
        }

        if (loc === "sag-ust") {
          const isEmerg = extra === "ates-kusma";
          return {
            preliminaryDiagnosis: isEmerg
              ? "Akut Kolesistit (Safra Kesesi İltihabı) Şüphesi"
              : "Safra Kesesi Taşı (Biliyer Kolik) Şüphesi",
            differential: ["Gastrit / Duodenum ülseri", "Karaciğer yağlanması"],
            specialtyId: "genel-cerrahi",
            alternatives: ["Gastroenteroloji", "İç Hastalıkları (Dahiliye)"],
            isEmergency: isEmerg,
            emergencyReason: "Sağ üst karın ağrısına yüksek ateş, sarılık veya sürekli kusma eşlik etmesi Akut Kolesistit / safra yolu tıkanıklığı bulgusudur. Acil Servise başvurun.",
            explanation: "Özellikle yemeklerden sonra sağ kaburga altında hissedilen ağrılar safra kesesi taşı veya iltihabı açısından öncelikle Genel Cerrahi muayenesi gerektirir.",
            redFlagNote: "Gözlerde sararma, yüksek ateş, titreme veya geçmeyen şiddetli ağrı varsa Acil Servise başvurun."
          };
        }

        if (loc === "sol-alt") {
          const isEmerg = extra === "ates-kusma";
          return {
            preliminaryDiagnosis: isEmerg || dur === "akut"
              ? "Akut Divertikülit Şüphesi"
              : "Divertikülit / Sol Kolon Patolojisi Şüphesi",
            differential: ["Üreter taşı", "Kolon patolojisi", "Jinekolojik nedenler (kadınlarda)"],
            specialtyId: "genel-cerrahi",
            alternatives: ["Gastroenteroloji", "Üroloji", "Kadın Hastalıkları ve Doğum"],
            isEmergency: isEmerg,
            emergencyReason: "Sol alt karın ağrısı ve yüksek ateş/kusma birlikteliği Akut Divertikülit açısından acil cerrahi değerlendirme ve tomografi gerektirir. Acil Servise başvurun.",
            explanation: "Sol alt karın ağrısında öncelikle Akut Divertikülit ve cerrahi kalın bağırsak patolojileri için doğru bölüm Genel Cerrahi'dir (akut dönemde kolonoskopi ertelenir).",
            redFlagNote: "Yüksek ateş, karında sertlik, makattan kanama veya gaz-dışkı çıkaramama varsa hemen Acil Servise başvurun."
          };
        }

        if (loc === "mide" || extra === "yanma") {
          const isAcuteSurg = dur === "akut" && extra === "ates-kusma";
          return {
            preliminaryDiagnosis: isAcuteSurg
              ? "Akut Pankreatit / Ülser Perforasyonu Şüphesi"
              : extra === "yanma"
              ? "Gastroözofageal Reflü (GÖR) / Gastrit Şüphesi"
              : "Gastrit / Peptik Ülser Şüphesi",
            differential: isAcuteSurg ? ["Safra yolu taşı / kolanjit"] : ["Safra kesesi taşı", "Fonksiyonel dispepsi"],
            specialtyId: isAcuteSurg ? "genel-cerrahi" : "gastroenteroloji",
            alternatives: isAcuteSurg ? ["Gastroenteroloji", "İç Hastalıkları (Dahiliye)"] : ["İç Hastalıkları (Dahiliye)", "Genel Cerrahi"],
            isEmergency: isAcuteSurg,
            emergencyReason: "Ani şiddetli üst karın ağrısına sürekli kusma veya ateş eşlik etmesi Akut Pankreatit ya da Ülser Perforasyonu bulgusu olabilir. Beklemeden Acil Servise başvurun.",
            explanation: isAcuteSurg
              ? "Sistemik bulguların eşlik ettiği akut üst karın ağrıları acil cerrahi/görüntüleme gerektirir."
              : "Mide bölgesindeki yanma, ekşime ve hazımsızlık şikayetleri öncelikle Gastroenteroloji (ilk basamakta İç Hastalıkları) değerlendirmesi gerektirir.",
            redFlagNote: "Kanlı kusma, siyah katran rengi dışkı veya ani bıçak saplanır tarzda ağrı olursa hemen Acil Servise başvurun."
          };
        }

        if (loc === "alt-idrar") {
          return {
            preliminaryDiagnosis: "İdrar Yolu Enfeksiyonu / Üreter Taşı Şüphesi",
            differential: ["Böbrek taşı", "Prostatit / Sistit"],
            specialtyId: "uroloji",
            alternatives: ["İç Hastalıkları (Dahiliye)", "Kadın Hastalıkları ve Doğum"],
            isEmergency: extra === "ates-kusma",
            emergencyReason: "İdrar şikayetleri ve alt karın/yan ağrısına yüksek ateş eşlik etmesi acil ürolojik enfeksiyon değerlendirmesi gerektirir.",
            explanation: "Alt karın ağrısına idrar yanması veya sık idrara çıkma eşlik ediyorsa öncelikli bölüm Üroloji'dir.",
            redFlagNote: "Yüksek ateş, titreme veya hiç idrar yapamama varsa hemen Acil Servise başvurun."
          };
        }

        if (loc === "alt-jinekoloji") {
          return {
            preliminaryDiagnosis: dur === "akut" ? "Dış Gebelik (Ektopik) / Yumurtalık Kisti Şüphesi" : "Jinekolojik Pelvik Ağrı Değerlendirmesi",
            differential: ["Pelvik inflamatuar hastalık", "Endometriozis", "Akut apandisit"],
            specialtyId: "kadin-dogum",
            alternatives: ["Genel Cerrahi", "Üroloji"],
            isEmergency: dur === "akut" && extra === "ates-kusma",
            emergencyReason: "Adet gecikmesi / gebelik şüphesinde şiddetli alt karın ağrısı, kanama veya bayılma hissi Dış Gebelik bulgusu olabilir. Hemen Acil Servise başvurun!",
            explanation: "Adet düzensizliği, gecikme veya vajinal kanamayla ilişkili alt karın ağrıları için öncelikli bölüm Kadın Hastalıkları ve Doğum'dur.",
            redFlagNote: "Gebelik şüphesinde tek taraflı şiddetli ağrı, kanama veya baş dönmesi varsa hemen Acil Servise başvurun."
          };
        }

        return {
          preliminaryDiagnosis: extra === "ishal" ? "Akut Gastroenterit Şüphesi" : "Yaygın Karın Ağrısı / Genel Değerlendirme",
          differential: ["Gastrit", "Bağırsak enfeksiyonu", "Cerrahi karın ağrısı nedenleri"],
          specialtyId: extra === "ates-kusma" ? "genel-cerrahi" : "dahiliye",
          alternatives: ["Genel Cerrahi", "Gastroenteroloji"],
          isEmergency: extra === "ates-kusma" && dur === "akut",
          emergencyReason: "Yeni başlayan yaygın karın ağrısına yüksek ateş veya durmayan kusma eşlik ediyorsa Acil Servise başvurmanız önerilir.",
          explanation: "Yaygın ve ishal/kramp ağırlıklı karın ağrılarında ilk değerlendirme İç Hastalıkları; cerrahi bulgular varsa Genel Cerrahi tarafından yapılmalıdır.",
          redFlagNote: "Karında sertlik, kanlı ishal, ağızdan sıvı alamama veya gaz-dışkı çıkaramama varsa Acil Servise başvurun."
        };
      }
    },

    // 2. MAKAT / PERİANAL ŞİKAYETLER
    {
      id: "makat-agrisi",
      title: "2 · Makat Bölgesi (Proktoloji) Ön Değerlendirmesi",
      matchKeywords: ["makat", "makatta", "basur", "hemoroid", "fissür", "çatlak", "kıl dönmesi", "pilonidal", "tuvalette kanama", "dışkıda kan"],
      questions: [
        {
          id: "type",
          text: "Şikayetinizin özelliği hangisine daha çok benziyor?",
          options: [
            { value: "yirtici", label: "Tuvalet sırasında cam kesiği gibi ağrı / parlak kan" },
            { value: "sislik-meme", label: "Ele gelen şişlik (meme) ve parlak kırmızı kanama" },
            { value: "zonklayici", label: "Hızla büyüyen kızarık şişlik, zonklayıcı ağrı" },
            { value: "kuyruk", label: "Kuyruk sokumunda şişlik / akıntı" },
            { value: "kolorektal", label: "50+ yaş yeni dışkılama değişikliği / koyu kan / kilo kaybı" }
          ]
        },
        {
          id: "fever",
          text: "Ateş, oturmaya engel zonklama veya durmayan yoğun kanama var mı?",
          options: [
            { value: "hayir", label: "Hayır, yok" },
            { value: "evet", label: "Evet, ateş veya şiddetli kanama / zonklama var" }
          ]
        }
      ],
      evaluate(ans) {
        const t = ans.type || "yirtici";
        const red = ans.fever === "evet";

        if (t === "zonklayici" || red) {
          return {
            preliminaryDiagnosis: "Perianal Apse (Makat Apsesi) veya Tromboze Hemoroid Şüphesi",
            differential: ["Tromboze eksternal hemoroid", "Enfekte pilonidal kist"],
            specialtyId: "genel-cerrahi",
            alternatives: ["Gastroenteroloji"],
            isEmergency: true,
            emergencyReason: "Makat çevresinde hızla büyüyen ağrılı şişlik, zonklama ve ateş Perianal Apse bulgusu olabilir ve erken cerrahi drenaj gerektirir. Beklemeden Acil Servise veya Genel Cerrahiye başvurun.",
            explanation: "Bu bulgular acil proktolojik/cerrahi değerlendirme gerektirir.",
            redFlagNote: "Ateş yükseliyorsa, oturmakta zorlanıyorsanız veya yoğun kanama varsa beklemeyin."
          };
        }
        if (t === "kolorektal") {
          return {
            preliminaryDiagnosis: "Kolorektal Değerlendirme *(Kolonoskopi Gerekli)*",
            differential: ["Kolon polipi", "Hemoroidal hastalık", "Divertiküler hastalık"],
            specialtyId: "genel-cerrahi",
            alternatives: ["Gastroenteroloji"],
            isEmergency: false,
            explanation: "50 yaş üzeri yeni başlayan dışkılama alışkanlığı değişikliği, koyu renkli kanama veya kilo kaybında mutlaka kolonoskopik değerlendirme için Genel Cerrahi veya Gastroenteroloji'ye başvurulmalıdır.",
            redFlagNote: "Yoğun rektal kanama veya baş dönmesi olursa Acil Servise başvurun."
          };
        }
        if (t === "kuyruk") {
          return {
            preliminaryDiagnosis: "Pilonidal Sinüs (Kıl Dönmesi) Şüphesi",
            differential: ["Sakral apse", "Cilt kisti"],
            specialtyId: "genel-cerrahi",
            alternatives: ["Dermatoloji (Cildiye)"],
            isEmergency: false,
            explanation: "Kuyruk sokumu bölgesindeki şişlik, ağrı ve akıntı şikayetleri Pilonidal Sinüs (kıl dönmesi) açısından Genel Cerrahi muayenesi gerektirir.",
            redFlagNote: "Ani şişme, kızarıklık, ısı artışı ve ateş gelişirse apseleşmiş olabilir; Acil Servise başvurun."
          };
        }
        if (t === "sislik-meme") {
          return {
            preliminaryDiagnosis: "Hemoroidal Hastalık (Basur) Şüphesi",
            differential: ["Anal fissür", "Rektal kanama nedenleri"],
            specialtyId: "genel-cerrahi",
            alternatives: ["Gastroenteroloji"],
            isEmergency: false,
            explanation: "Makat çevresinde ele gelen şişlik ve parlak kırmızı kanama öncelikle Hemoroidal Hastalık açısından Genel Cerrahi (Proktoloji) muayenesi gerektirir.",
            redFlagNote: "Durmayan yoğun kanama veya sert ağrılı şişlik gelişirse Acil Servise başvurun."
          };
        }
        return {
          preliminaryDiagnosis: "Anal Fissür (Makat Çatlağı) Şüphesi",
          differential: ["Hemoroidal hastalık", "Perianal dermatit"],
          specialtyId: "genel-cerrahi",
          alternatives: ["Gastroenteroloji"],
          isEmergency: false,
          explanation: "Dışkılama sırasında keskin/yırtıcı ağrı ve parlak kırmızı kan tipik olarak Anal Fissür düşündürür; doğru bölüm Genel Cerrahi'dir.",
          redFlagNote: "Ateş, hızla büyüyen şişlik veya yoğun kanama eklenirse Acil Servise başvurun."
        };
      }
    },

    // 3. KASIK, GÖBEK, AMELİYAT YERİ ŞİŞLİĞİ & TESTİS
    {
      id: "kasik-fitik",
      title: "3 · Kasık, Göbek ve Skrotum Şişliği Ön Değerlendirmesi",
      matchKeywords: ["fıtık", "kasık", "kasığım", "kasığımda", "göbek fıtığı", "ameliyat yerinde şişlik", "testis", "yumurtalıkta şişlik"],
      questions: [
        {
          id: "site",
          text: "Şişlik veya ağrı tam olarak nerede?",
          options: [
            { value: "kasik-gobek", label: "Kasık, göbek veya eski ameliyat yerinde şişlik" },
            { value: "testis", label: "Erkekte testiste (skrotumda) ani şiddetli ağrı / şişlik" }
          ]
        },
        {
          id: "reducible",
          text: "Şişlik uzanınca içeri giriyor mu veya çok ağrılı mı?",
          options: [
            { value: "giriyor", label: "Uzanınca küçülüyor / içeri giriyor" },
            { value: "girmiyor-agrisiz", label: "İçeri girmiyor ama şiddetli ağrı yok" },
            { value: "bogulmus", label: "Sertleşti, içeri girmiyor, çok ağrılı / bulantı-kusma var" }
          ]
        }
      ],
      evaluate(ans) {
        if (ans.site === "testis") {
          return {
            preliminaryDiagnosis: "Testis Torsiyonu / Epididimoorşit Şüphesi",
            differential: ["İnkarsere inguinal herni", "Epididimit"],
            specialtyId: "uroloji",
            alternatives: ["Genel Cerrahi"],
            isEmergency: true,
            emergencyReason: "Testiste ani başlayan şiddetli ağrı ve şişlik Testis Torsiyonu olabilir; ilk 6 saat organ kurtarma açısından kritiktir. Hemen Acil Servise başvurun!",
            explanation: "Ani skrotal ağrı acil ürolojik muayene ve Doppler ultrason gerektirir.",
            redFlagNote: "Ağrı kesici alıp beklemeyin; hemen Acil Servise gidin."
          };
        }
        const isStrang = ans.reducible === "bogulmus";
        return {
          preliminaryDiagnosis: isStrang
            ? "İnkarsere / Strangüle (Boğulmuş) Fıtık Şüphesi"
            : "İnguinal / Umblikal / İnsizyonel Herni (Fıtık) Şüphesi",
          differential: ["Lenf bezi büyümesi", "Lipom (yağ bezesi)"],
          specialtyId: "genel-cerrahi",
          alternatives: ["Üroloji"],
          isEmergency: isStrang,
          emergencyReason: "Sertleşen, içeri girmeyen, şiddetli ağrılı fıtık ve bulantı/kusma acil ameliyat gerektirebilir. Hemen Acil Servise başvurun!",
          explanation: "Ayakta durunca veya öksürünce belirginleşen kasık, göbek veya ameliyat yeri şişlikleri fıtık açısından Genel Cerrahi muayenesi gerektirir.",
          redFlagNote: "Şişlik aniden sertleşir, içeri girmez, kızarır veya kusma başlarsa hemen Acil Servise başvurun."
        };
      }
    },

    // 4. MEME ŞİKAYETLERİ
    {
      id: "meme-sikayeti",
      title: "4 · Meme Şikayeti Ön Değerlendirmesi",
      matchKeywords: ["meme", "mememde", "memede", "göğsümde kitle", "mastit"],
      questions: [
        {
          id: "finding",
          text: "En belirgin şikayetiniz hangisi?",
          options: [
            { value: "kitle", label: "Ele gelen sertlik / kitle, cilt çekintisi veya kanlı akıntı" },
            { value: "hassasiyet", label: "Adet dönemiyle artan ağrı / dolgunluk" },
            { value: "iltihap", label: "Kızarıklık, ısı artışı, şişlik ve ateş" }
          ]
        }
      ],
      evaluate(ans) {
        const f = ans.finding || "kitle";
        if (f === "iltihap") {
          return {
            preliminaryDiagnosis: "Mastit / Meme Apsesi Şüphesi",
            differential: ["İnflamatuar meme hastalıkları"],
            specialtyId: "genel-cerrahi",
            alternatives: ["Kadın Hastalıkları ve Doğum"],
            isEmergency: true,
            emergencyReason: "Memede kızarıklık, ısı artışı ve ateş enfeksiyon/apse (mastit) bulgusudur; erken tedavi için Acil Servise veya Genel Cerrahiye başvurun.",
            explanation: "Enfeksiyon bulguları eşlik eden meme şişlikleri Genel Cerrahi tarafından değerlendirilmelidir.",
            redFlagNote: "Ateş yükselirse veya kızarıklık hızla yayılırsa Acil Servise başvurun."
          };
        }
        if (f === "hassasiyet") {
          return {
            preliminaryDiagnosis: "Mastodini / Fibrokistik Meme Değişikliği Şüphesi",
            differential: ["Hormonal hassasiyet", "Basit meme kisti"],
            specialtyId: "genel-cerrahi",
            alternatives: ["Kadın Hastalıkları ve Doğum"],
            isEmergency: false,
            explanation: "Adet döngüsüyle ilişkili meme hassasiyetleri çoğunlukla iyi huyludur; muayene ve gerekirse ultrason için Genel Cerrahi uygundur.",
            redFlagNote: "Meme başında kanlı akıntı veya yeni ele gelen sertlik olursa gecikmeden başvurun."
          };
        }
        return {
          preliminaryDiagnosis: "Meme Kitlesi *(USG / Mamografi Değerlendirmesi Gerekli)*",
          differential: ["Basit meme kisti", "Fibroadenom", "İleri tetkik gerektiren kitle"],
          specialtyId: "genel-cerrahi",
          alternatives: [],
          isEmergency: false,
          explanation: "Memede ele gelen her yeni kitle, cilt çekintisi veya kanlı akıntı mutlaka Genel Cerrahi uzmanı tarafından muayene edilmelidir.",
          redFlagNote: "Hızlı büyüme veya ciltte portakal kabuğu görünümü varsa vakit kaybetmeden başvurun."
        };
      }
    },

    // 5. BOYUN ŞİŞLİĞİ / TİROİD / GUATR
    {
      id: "boyun-tiroid",
      title: "5 · Boyun Şişliği / Tiroid / Guatr Ön Değerlendirmesi",
      matchKeywords: ["tiroid", "guatr", "nodül", "boynumda şişlik", "boyun şişliği", "beze", "lenf bezi"],
      questions: [
        {
          id: "zone",
          text: "Şişlik boynunuzun neresinde?",
          options: [
            { value: "on-orta", label: "Boyun ön orta hatta (tiroid / guatr bölgesi)" },
            { value: "yan-enfeksiyon", label: "Boğaz enfeksiyonu sonrası çene altı / yan boyunda ağrılı beze" },
            { value: "yan-sert", label: "2 haftadan uzun süren sert, ağrısız yan boyun kitlesi" }
          ]
        }
      ],
      evaluate(ans) {
        if (ans.zone === "yan-enfeksiyon") {
          return {
            preliminaryDiagnosis: "Reaktif Lenfadenit (Enfeksiyona Bağlı Beze Şişliği)",
            differential: ["Tonsillit / Farenjit", "Tükürük bezi iltihabı"],
            specialtyId: "kbb",
            alternatives: ["İç Hastalıkları (Dahiliye)"],
            isEmergency: false,
            explanation: "Boğaz veya diş enfeksiyonları sonrası gelişen ağrılı boyun bezeleri için öncelikli bölüm Kulak Burun Boğaz (KBB)'dır.",
            redFlagNote: "Yüksek ateş, yutkunamama veya boyunda hızla büyüyen kızarık apse olursa Acil Servise başvurun."
          };
        }
        if (ans.zone === "yan-sert") {
          return {
            preliminaryDiagnosis: "Servikal Kitle Değerlendirmesi",
            differential: ["Lenfadenopati", "Brankial kist / Tükürük bezi kitlesi"],
            specialtyId: "kbb",
            alternatives: ["Genel Cerrahi", "İç Hastalıkları (Dahiliye)"],
            isEmergency: false,
            explanation: "2 haftadan uzun süren ağrısız ve sert yan boyun kitleleri mutlaka Kulak Burun Boğaz (KBB) tarafından değerlendirilmelidir.",
            redFlagNote: "Ses kısıklığı, nefes darlığı veya yutma güçlüğü eşlik ediyorsa gecikmeden başvurun."
          };
        }
        return {
          preliminaryDiagnosis: "Tiroid Nodülü / Guatr Değerlendirmesi",
          differential: ["Tiroidit", "Hipertiroidi / Hipotiroidi"],
          specialtyId: "genel-cerrahi",
          alternatives: ["İç Hastalıkları (Dahiliye)", "Kulak Burun Boğaz (KBB)"],
          isEmergency: false,
          explanation: "Boyun ön orta hatta tiroid/guatr şişliği ve nodüller için hormon+ultrason değerlendirmesi ve cerrahi gereksinim açısından Genel Cerrahi veya İç Hastalıkları (Endokrinoloji) uygundur.",
          redFlagNote: "Ani nefes darlığı veya belirgin yutma güçlüğü gelişirse Acil Servise başvurun."
        };
      }
    },

    // 6. GÖĞÜS AĞRISI VE ÇARPINTI
    {
      id: "gogus-agrisi",
      title: "6 · Göğüs Ağrısı ve Çarpıntı Ön Değerlendirmesi",
      matchKeywords: ["göğüs", "göğsüm", "göğsümde", "kalp", "çarpıntı", "tansiyon", "nabız"],
      questions: [
        {
          id: "character",
          text: "Göğsünüzdeki şikayet hangisine daha yakın?",
          options: [
            { value: "baski", label: "Baskı / sıkışma, kola-çeneye yayılım veya terleme" },
            { value: "emboli", label: "Ani nefes darlığı + göğüs ağrısı + tek bacakta şişlik" },
            { value: "carpinti", label: "Çarpıntı / nabız düzensizliği / yüksek tansiyon" },
            { value: "yanma", label: "Yemek sonrası yanma ve ağza acı su gelmesi" },
            { value: "oksuruk", label: "Öksürük, balgam veya derin nefesle batan ağrı" }
          ]
        }
      ],
      evaluate(ans) {
        if (ans.character === "baski") {
          return {
            preliminaryDiagnosis: "Akut Koroner Sendrom Şüphesi",
            differential: ["Angina pektoris", "Aort diseksiyonu"],
            specialtyId: "kardiyoloji",
            alternatives: [],
            isEmergency: true,
            emergencyReason: "Göğüste baskı/sıkışma, kola-çeneye yayılım veya terleme acil kalp krizi bulgusudur. Kendiniz araç kullanmayın, hemen 112'yi arayın!",
            explanation: "Acil EKG ve kardiyak enzim değerlendirmesi gerekir.",
            redFlagNote: "Hemen 112 Acil Yardım çağırın."
          };
        }
        if (ans.character === "emboli") {
          return {
            preliminaryDiagnosis: "Pulmoner Emboli (Akciğer Pıhtısı) Şüphesi",
            differential: ["Akut koroner sendrom", "Pnömotoraks"],
            specialtyId: "gogus-hastaliklari",
            alternatives: ["Kardiyoloji", "Kalp ve Damar Cerrahisi"],
            isEmergency: true,
            emergencyReason: "Ani nefes darlığı, göğüs ağrısı ve tek bacak şişliği Pulmoner Emboli bulgusu olabilir. Hemen 112'yi arayın!",
            explanation: "Hayati risk taşıyan bu bulgular acil hastane değerlendirmesi gerektirir.",
            redFlagNote: "Beklemeden 112'yi arayın."
          };
        }
        if (ans.character === "yanma") {
          return {
            preliminaryDiagnosis: "Gastroözofageal Reflü (Mide Yanması) Şüphesi",
            differential: ["Gastrit", "Kardiyak atipik ağrı"],
            specialtyId: "gastroenteroloji",
            alternatives: ["Kardiyoloji", "İç Hastalıkları (Dahiliye)"],
            isEmergency: false,
            explanation: "Yemek sonrası yanma çoğunlukla reflü kaynaklıdır; 40 yaş üzeri veya risk faktörü varsa kalp açısından da kontrol önerilir.",
            redFlagNote: "Ağrı eforla artıyorsa veya soğuk terleme eklenirse hemen 112'yi arayın."
          };
        }
        if (ans.character === "oksuruk") {
          return {
            preliminaryDiagnosis: "Alt Solunum Yolu Enfeksiyonu / Plörezi Şüphesi",
            differential: ["Bronşit / Pnömoni", "Kas-iskelet ağrısı"],
            specialtyId: "gogus-hastaliklari",
            alternatives: ["Kardiyoloji", "İç Hastalıkları (Dahiliye)"],
            isEmergency: false,
            explanation: "Öksürük, balgam ve derin nefesle batan ağrı öncelikle Göğüs Hastalıkları değerlendirmesi gerektirir.",
            redFlagNote: "Morarma, kanlı balgam veya şiddetli nefes darlığı olursa hemen 112'yi arayın."
          };
        }
        return {
          preliminaryDiagnosis: "Kardiyak Aritmi (Ritim Bozukluğu) / Hipertansiyon",
          differential: ["Anemi / Tiroid kaynaklı çarpıntı", "Anksiyete"],
          specialtyId: "kardiyoloji",
          alternatives: ["İç Hastalıkları (Dahiliye)"],
          isEmergency: false,
          explanation: "Çarpıntı, nabız düzensizliği ve tansiyon yüksekliği için doğru bölüm Kardiyoloji'dir.",
          redFlagNote: "Bayılma hissi, şiddetli nefes darlığı veya göğüs baskısı başlarsa 112'yi arayın."
        };
      }
    },

    // 7. NEFES DARLIĞI VE ÖKSÜRÜK
    {
      id: "nefes-oksuruk",
      title: "7 · Nefes Darlığı ve Öksürük Ön Değerlendirmesi",
      matchKeywords: ["nefes darlığı", "öksürük", "balgam", "hırıltı", "astım", "koah", "bronşit", "zatürre"],
      questions: [
        {
          id: "pattern",
          text: "Hangisi şikayetinizi daha iyi tarif ediyor?",
          options: [
            { value: "akciger", label: "Uzun süren öksürük, balgam, hırıltı veya astım/KOAH" },
            { value: "kalp", label: "Eforla nefes darlığı + ayak bileğinde şişlik + gece yatamama" },
            { value: "kbb", label: "Geniz akıntısı, boğaz gıcığı ve burun tıkanıklığı" },
            { value: "acil", label: "Şu an ani şiddetli nefes darlığı, morarma veya kanlı balgam" }
          ]
        }
      ],
      evaluate(ans) {
        if (ans.pattern === "acil") {
          return {
            preliminaryDiagnosis: "Akut Solunum Sıkıntısı / Hemoptizi",
            differential: ["Pulmoner emboli", "Akut astım atağı", "Akciğer ödemi"],
            specialtyId: "gogus-hastaliklari",
            alternatives: ["Kardiyoloji"],
            isEmergency: true,
            emergencyReason: "Ani şiddetli nefes darlığı, dudaklarda morarma veya kanlı balgam acil müdahale gerektirir. Hemen 112'yi arayın!",
            explanation: "Akut solunum sıkıntısında poliklinik beklenmez.",
            redFlagNote: "Hemen 112'yi arayın."
          };
        }
        if (ans.pattern === "kalp") {
          return {
            preliminaryDiagnosis: "Kalp Yetmezliği / Kardiyak Efor Dispnesi Değerlendirmesi",
            differential: ["KOAH", "Anemi"],
            specialtyId: "kardiyoloji",
            alternatives: ["Göğüs Hastalıkları", "İç Hastalıkları (Dahiliye)"],
            isEmergency: false,
            explanation: "Eforla nefes darlığı, ayaklarda şişlik ve gece yüksek yastık ihtiyacı öncelikle Kardiyoloji (EKO) değerlendirmesi gerektirir.",
            redFlagNote: "İstirahatte nefes alamama başlarsa hemen 112'yi arayın."
          };
        }
        if (ans.pattern === "kbb") {
          return {
            preliminaryDiagnosis: "Üst Solunum Yolu / Sinüzit / Geniz Akıntısı",
            differential: ["Alerjik rinit", "Reflü öksürüğü"],
            specialtyId: "kbb",
            alternatives: ["Göğüs Hastalıkları"],
            isEmergency: false,
            explanation: "Geniz akıntısı ve burun tıkanıklığına bağlı öksürükler için Kulak Burun Boğaz (KBB) uygundur.",
            redFlagNote: "Nefes darlığı veya yüksek ateş eklenirse Acil Servise başvurun."
          };
        }
        return {
          preliminaryDiagnosis: "Bronşit / Astım / KOAH / Alt Solunum Yolu Değerlendirmesi",
          differential: ["Pnömoni (Zatürre)", "Alerjik bronşit"],
          specialtyId: "gogus-hastaliklari",
          alternatives: ["İç Hastalıkları (Dahiliye)", "Kulak Burun Boğaz (KBB)"],
          isEmergency: false,
          explanation: "Uzun süren öksürük, balgam ve hırıltı şikayetleri için doğru bölüm Göğüs Hastalıkları'dır.",
          redFlagNote: "Yüksek ateş, kanlı balgam veya ani nefes darlığı olursa Acil Servise başvurun."
        };
      }
    },

    // 8. BAŞ AĞRISI VE BAŞ DÖNMESİ
    {
      id: "bas-agrisi-donmesi",
      title: "8 · Baş Ağrısı ve Baş Dönmesi Ön Değerlendirmesi",
      matchKeywords: ["baş ağrısı", "migren", "baş dönmesi", "vertigo", "nöbet", "epilepsi", "titreme", "unutkanlık"],
      questions: [
        {
          id: "type",
          text: "Şikayetiniz hangisine daha çok uyuyor?",
          options: [
            { value: "inme-acil", label: "Ani en şiddetli baş ağrısı, ateş+ense sertliği, konuşma/güç kaybı" },
            { value: "bppv", label: "Baş hareketiyle saniyeler süren dönme / kulak çınlaması" },
            { value: "migren", label: "Tek taraflı zonklayıcı ağrı + ışık/ses hassasiyeti veya tekrarlayan ağrı" }
          ]
        }
      ],
      evaluate(ans) {
        if (ans.type === "inme-acil") {
          return {
            preliminaryDiagnosis: "Akut İnme / Subaraknoid Kanama / Menenjit Şüphesi",
            differential: ["Hipertansif acil"],
            specialtyId: "noroloji",
            alternatives: ["Beyin ve Sinir Cerrahisi"],
            isEmergency: true,
            emergencyReason: "Hayatınızdaki en şiddetli ani baş ağrısı, ateş+ense sertliği veya konuşma/güç kaybı acil nörolojik durumdur. Hemen 112'yi arayın!",
            explanation: "Bu belirtiler acil beyin görüntüleme ve müdahale gerektirir.",
            redFlagNote: "Beklemeden 112'yi arayın."
          };
        }
        if (ans.type === "bppv") {
          return {
            preliminaryDiagnosis: "Periferik Vertigo (BPPV / Kristal Oynaması) Şüphesi",
            differential: ["Meniere hastalığı", "Santral vertigo"],
            specialtyId: "kbb",
            alternatives: ["Nöroloji"],
            isEmergency: false,
            explanation: "Baş hareketleriyle tetiklenen kısa süreli dönme hissi ve kulak çınlaması öncelikle Kulak Burun Boğaz (KBB) muayenesi gerektirir.",
            redFlagNote: "Çift görme, konuşma bozukluğu veya yürüyememe eşlik ediyorsa hemen Acil Servise başvurun."
          };
        }
        return {
          preliminaryDiagnosis: "Migren / Gerilim Tipi Baş Ağrısı Değerlendirmesi",
          differential: ["Hipertansiyon baş ağrısı", "Sinüzit"],
          specialtyId: "noroloji",
          alternatives: ["İç Hastalıkları (Dahiliye)", "Kulak Burun Boğaz (KBB)"],
          isEmergency: false,
          explanation: "Tekrarlayan baş ağrıları, migren, titreme ve unutkanlık şikayetleri için doğru bölüm Nöroloji'dir.",
          redFlagNote: "Ani görme kaybı, konuşma bozukluğu veya şiddetli ani ağrı gelişirse 112'yi arayın."
        };
      }
    },

    // 9. BEL, BOYUN VE EKLEM AĞRISI
    {
      id: "bel-eklem",
      title: "9 · Bel, Boyun ve Eklem Ağrısı Ön Değerlendirmesi",
      matchKeywords: ["bel", "boyun", "diz", "omuz", "bilek", "eklem", "kırık", "burkulma", "menisküs", "uyuşma", "siyatik", "romatizma"],
      questions: [
        {
          id: "region",
          text: "Şikayetiniz hangisine uyuyor?",
          options: [
            { value: "kauda", label: "Bel ağrısı + idrar/dışkı kaçırma veya ayakta ani düşüklük" },
            { value: "bel-boyun", label: "Bel/boyundan bacağa veya kola vuran ağrı ve uyuşma" },
            { value: "eklem", label: "Diz, omuz, ayak bileği ağrısı, kilitlenme veya düşme/burkulma" },
            { value: "romatizma", label: "Sabah >1 saat tutukluk ve birden fazla küçük eklemde şişlik" }
          ]
        }
      ],
      evaluate(ans) {
        if (ans.region === "kauda") {
          return {
            preliminaryDiagnosis: "Kauda Ekina Sendromu / Acil Sinir Basısı Şüphesi",
            differential: ["Akut ağır disk hernisi"],
            specialtyId: "beyin-cerrahi",
            alternatives: ["Ortopedi ve Travmatoloji"],
            isEmergency: true,
            emergencyReason: "Bel ağrısına idrar/dışkı kontrol kaybı veya ayakta ani güç kaybı eşlik etmesi acil cerrahi gerektiren sinir basısı (Kauda Ekina) bulgusudur. Hemen Acil Servise başvurun!",
            explanation: "Kalıcı sinir hasarını önlemek için acil MR ve Beyin Cerrahisi değerlendirmesi gerekir.",
            redFlagNote: "Vakit kaybetmeden Acil Servise gidin."
          };
        }
        if (ans.region === "bel-boyun") {
          return {
            preliminaryDiagnosis: "Bel / Boyun Fıtığı (Disk Hernisi) Şüphesi",
            differential: ["Sinir sıkışması / Siyatik", "Kas spazmı"],
            specialtyId: "beyin-cerrahi",
            alternatives: ["Ortopedi ve Travmatoloji", "Nöroloji"],
            isEmergency: false,
            explanation: "Bacağa veya kola yayılan ağrı ve uyuşma şikayetleri için Beyin ve Sinir Cerrahisi (alternatif: Fizik Tedavi) değerlendirmesi uygundur.",
            redFlagNote: "İlerleyici güç kaybı veya idrar kaçırma gelişirse hemen Acil Servise başvurun."
          };
        }
        if (ans.region === "romatizma") {
          return {
            preliminaryDiagnosis: "İnflamatuar Artrit / Romatolojik Değerlendirme",
            differential: ["Romatoid artrit", "Osteoartrit"],
            specialtyId: "dahiliye",
            alternatives: ["Ortopedi ve Travmatoloji"],
            isEmergency: false,
            explanation: "Sabah 1 saatten uzun süren tutukluk ve çoklu küçük eklem şişlikleri Romatoloji (MHRS'de ilk basamakta İç Hastalıkları) değerlendirmesi gerektirir.",
            redFlagNote: "Tek eklemde ani yüksek ateş, yoğun kızarıklık ve şişlik (septik artrit) olursa Acil Servise başvurun."
          };
        }
        return {
          preliminaryDiagnosis: "Menisküs / Bağ Yaralanması veya Eklem Kireçlenmesi Şüphesi",
          differential: ["Tendinit / Bursit", "Burkulma / Kırık"],
          specialtyId: "ortopedi",
          alternatives: ["Beyin ve Sinir Cerrahisi"],
          isEmergency: false,
          explanation: "Diz, omuz, ayak bileği ağrısı, kilitlenme veya travma sonrası şikayetler için doğru bölüm Ortopedi ve Travmatoloji'dir.",
          redFlagNote: "Travma sonrası şekil bozukluğu, açık yara veya hiç basamama varsa Acil Servise başvurun."
        };
      }
    },

    // 10. İDRAR VE BÖBREK / YAN AĞRISI
    {
      id: "idrar-bobrek",
      title: "10 · İdrar ve Böbrek / Yan Ağrısı Ön Değerlendirmesi",
      matchKeywords: ["idrar", "idrar yanması", "böbrek", "böbrek taşı", "yan ağrısı", "prostat", "idrarda kan"],
      questions: [
        {
          id: "state",
          text: "Hangisi mevcut durumunuzu tarif ediyor?",
          options: [
            { value: "glob", label: "İdrarım var ama hiç idrar yapamıyorum (tıkanıklık)" },
            { value: "atesli-tas", label: "Şiddetli yan/böbrek ağrısı + yüksek ateş ve titreme" },
            { value: "rutin", label: "İdrar yanması, sık idrara çıkma, taş ağrısı veya prostat şikayeti" }
          ]
        }
      ],
      evaluate(ans) {
        if (ans.state === "glob") {
          return {
            preliminaryDiagnosis: "Akut İdrar Retansiyonu (Glob Vezikale)",
            differential: ["Prostat büyümesi tıkanıklığı", "Üretral taş"],
            specialtyId: "uroloji",
            alternatives: [],
            isEmergency: true,
            emergencyReason: "İdrar kesesi doluyken hiç idrar yapamama acil sonda/ürolojik müdahale gerektirir. Beklemeden Acil Servise başvurun!",
            explanation: "Akut idrar retansiyonu acil müdahale gerektirir.",
            redFlagNote: "Hemen Acil Servise başvurun."
          };
        }
        if (ans.state === "atesli-tas") {
          return {
            preliminaryDiagnosis: "Obstrüktif Piyelonefrit / Enfekte Böbrek Taşı Şüphesi",
            differential: ["Akut piyelonefrit"],
            specialtyId: "uroloji",
            alternatives: ["İç Hastalıkları (Dahiliye)"],
            isEmergency: true,
            emergencyReason: "Böbrek/yan ağrısına yüksek ateş ve titreme eşlik etmesi acil enfeksiyon (obstrüktif piyelonefrit) bulgusudur. Beklemeden Acil Servise başvurun!",
            explanation: "Ateşli taş/idrar yolu enfeksiyonu acil değerlendirme gerektirir.",
            redFlagNote: "Hemen Acil Servise başvurun."
          };
        }
        return {
          preliminaryDiagnosis: "İdrar Yolu Enfeksiyonu / Böbrek Taşı / Prostat Değerlendirmesi",
          differential: ["Sistit", "Üreter taşı", "BPH"],
          specialtyId: "uroloji",
          alternatives: ["İç Hastalıkları (Dahiliye)", "Kadın Hastalıkları ve Doğum"],
          isEmergency: false,
          explanation: "İdrar yanması, sık idrara çıkma, yan ağrısı veya idrarda kan şikayetleri için doğru bölüm Üroloji'dir.",
          redFlagNote: "Yüksek ateş, titreme veya hiç idrar yapamama gelişirse Acil Servise başvurun."
        };
      }
    },

    // 11. KADIN SAĞLIĞI VE GEBELİK
    {
      id: "kadin-sagligi",
      title: "11 · Kadın Sağlığı ve Gebelik Ön Değerlendirmesi",
      matchKeywords: ["adet", "regl", "gebelik", "hamile", "hamilelik", "jinekoloji", "yumurtalık", "kist", "akıntı"],
      questions: [
        {
          id: "status",
          text: "Hangisi durumunuza daha yakın?",
          options: [
            { value: "acil-gebe", label: "Gebelikte kanama veya tek taraflı şiddetli kasık ağrısı + bayılma" },
            { value: "poliklinik", label: "Adet düzensizliği, vajinal akıntı, kist veya rutin gebelik takibi" }
          ]
        }
      ],
      evaluate(ans) {
        const isEm = ans.status === "acil-gebe";
        return {
          preliminaryDiagnosis: isEm ? "Dış Gebelik (Ektopik) / Düşük Tehdidi Şüphesi" : "Jinekolojik Değerlendirme / Gebelik Takibi",
          differential: isEm ? ["Over kist rüptürü / torsiyonu"] : ["Hormonal düzensizlik", "Vajinit", "Over kisti"],
          specialtyId: "kadin-dogum",
          alternatives: isEm ? ["Genel Cerrahi"] : ["Üroloji"],
          isEmergency: isEm,
          emergencyReason: "Gebelikte kanama veya tek taraflı şiddetli kasık ağrısı/bayılma hissi Dış Gebelik veya düşük tehdidi olabilir. Beklemeden Acil Servise başvurun!",
          explanation: "Kadın sağlığı, adet düzensizliği ve gebelik şikayetleri için doğru bölüm Kadın Hastalıkları ve Doğum'dur.",
          redFlagNote: "Şiddetli kanama, bayılma hissi veya ateş gelişirse hemen Acil Servise başvurun."
        };
      }
    },

    // 12. KULAK, BURUN VE BOĞAZ
    {
      id: "kbb-sikayet",
      title: "12 · Kulak, Burun ve Boğaz Ön Değerlendirmesi",
      matchKeywords: ["kulak", "boğaz", "burun", "sinüzit", "bademcik", "ses kısıklığı", "çınlama", "işitme", "horlama"],
      questions: [
        {
          id: "type",
          text: "En belirgin şikayetiniz hangisi?",
          options: [
            { value: "havayolu", label: "Yutkunamama, nefes darlığı veya boğazda hızlı şişme" },
            { value: "ani-isitme", label: "Tek kulakta aniden başlayan işitme kaybı" },
            { value: "rutin", label: "Kulak ağrısı, sinüzit, bademcik veya 3 haftayı geçen ses kısıklığı" }
          ]
        }
      ],
      evaluate(ans) {
        if (ans.type === "havayolu") {
          return {
            preliminaryDiagnosis: "Akut Hava Yolu Ödemi / Epiglottit / Peritonsiller Apse Şüphesi",
            differential: ["Alerjik ödem"],
            specialtyId: "kbb",
            alternatives: [],
            isEmergency: true,
            emergencyReason: "Yutkunamama ve nefes darlığı eşlik eden boğaz şişmesi hava yolunu tehdit edebilir. Hemen 112'yi arayın veya Acil Servise başvurun!",
            explanation: "Acil KBB ve hava yolu değerlendirmesi gerekir.",
            redFlagNote: "Hemen 112'yi arayın."
          };
        }
        return {
          preliminaryDiagnosis: ans.type === "ani-isitme"
            ? "Ani İşitme Kaybı *(Erken Tedavi Kritik — Kısa Sürede KBB)*"
            : "Otit / Sinüzit / Tonsillit / Larinks Değerlendirmesi",
          differential: ["Kulak kiri / Orta kulak iltihabı", "Alerjik rinit"],
          specialtyId: "kbb",
          alternatives: ["İç Hastalıkları (Dahiliye)"],
          isEmergency: false,
          explanation: ans.type === "ani-isitme"
            ? "Ani işitme kaybında ilk 24–72 saat içinde başlanan tedavi çok önemlidir; vakit kaybetmeden KBB uzmanına başvurun."
            : "Kulak, burun, sinüs, bademcik ve 3 haftayı aşan ses kısıklığı için doğru bölüm Kulak Burun Boğaz (KBB)'dır.",
          redFlagNote: "Nefes darlığı, yutkunamama veya kulak arkasında kızarık şişlik gelişirse Acil Servise başvurun."
        };
      }
    },

    // 13. GÖZ ŞİKAYETLERİ
    {
      id: "goz-sikayet",
      title: "13 · Göz Şikayetleri Ön Değerlendirmesi",
      matchKeywords: ["göz", "bulanık görme", "göz kızarıklığı", "çapak", "arpacık", "ışık çakması", "görme"],
      questions: [
        {
          id: "urgent",
          text: "Görme kaybı, perde inmesi veya göze travma/kimyasal temas oldu mu?",
          options: [
            { value: "evet", label: "Evet, ani görme kaybı / perde inmesi / travma / kimyasal var" },
            { value: "hayir", label: "Hayır, kızarıklık, batma, çapaklanma veya yavaş bulanıklık var" }
          ]
        }
      ],
      evaluate(ans) {
        const isEm = ans.urgent === "evet";
        return {
          preliminaryDiagnosis: isEm ? "Retina Dekolmanı / Göz Travması / Akut Glokom Şüphesi" : "Konjonktivit / Kırma Kusuru / Blefarit Değerlendirmesi",
          differential: isEm ? ["Kornea yaralanması"] : ["Göz kuruluğu", "Arpacık"],
          specialtyId: "goz",
          alternatives: ["Nöroloji"],
          isEmergency: isEm,
          emergencyReason: "Ani görme kaybı, perde inmesi veya göze kimyasal/travma teması acil göz müdahalesi gerektirir. Hemen Acil Servise başvurun!",
          explanation: "Göz şikayetleri için doğru bölüm Göz Hastalıkları polikliniğidir.",
          redFlagNote: "Şiddetli göz ağrısıyla birlikte baş ağrısı-bulantı veya ani görme kaybı olursa hemen Acil Servise başvurun."
        };
      }
    },

    // 14. CİLT, DAMAR (DVT) VE YUMUŞAK DOKU
    {
      id: "cilt-damar",
      title: "14 · Cilt, Damar ve Yumuşak Doku Ön Değerlendirmesi",
      matchKeywords: ["bacakta şişlik", "bacağım şişti", "baldır", "varis", "damar", "pıhtı", "yağ bezesi", "lipom", "tırnak batması", "apse", "cilt", "döküntü", "kaşıntı", "egzama", "akne", "ben", "saç dökülmesi", "mantar", "kurdeşen"],
      questions: [
        {
          id: "kind",
          text: "Şikayetiniz hangisine daha çok uyuyor?",
          options: [
            { value: "dvt", label: "Tek bacakta ani şişlik, kızarıklık, ısı artışı ve baldır ağrısı" },
            { value: "anafilaksi", label: "Yaygın döküntü + dudak/dil şişmesi veya nefes darlığı" },
            { value: "cerrahi-doku", label: "Cilt altı yağ bezesi, kızarık apse/çıban veya tırnak batması" },
            { value: "cildiye", label: "Döküntü, kaşıntı, egzama, akne, mantar, ben veya saç dökülmesi" }
          ]
        }
      ],
      evaluate(ans) {
        if (ans.kind === "anafilaksi") {
          return {
            preliminaryDiagnosis: "Anafilaksi (Ağır Alerjik Reaksiyon) Şüphesi",
            differential: ["Anjiyoödem"],
            specialtyId: "dahiliye",
            alternatives: ["Dermatoloji (Cildiye)"],
            isEmergency: true,
            emergencyReason: "Döküntüye dudak/dil şişmesi veya nefes darlığı eşlik etmesi hayati risk taşıyan Anafilaksi bulgusudur. Hemen 112'yi arayın!",
            explanation: "Ağır alerjik reaksiyon saniyeler içinde hava yolunu tıkayabilir.",
            redFlagNote: "Hemen 112'yi arayın."
          };
        }
        if (ans.kind === "dvt") {
          return {
            preliminaryDiagnosis: "Derin Ven Trombozu (DVT — Bacak Toplardamar Pıhtısı) Şüphesi",
            differential: ["Selülit (cilt enfeksiyonu)", "Baker kisti rüptürü"],
            specialtyId: "kalp-damar",
            alternatives: ["Ortopedi ve Travmatoloji", "Göğüs Hastalıkları"],
            isEmergency: true,
            emergencyReason: "Tek bacakta ani şişlik, sıcaklık ve baldır ağrısı pıhtı (DVT) bulgusu olabilir ve akciğere pıhtı atma (emboli) riski taşır. Bacağı ovuşturmadan Acil Servise veya Kalp Damar Cerrahisine başvurun!",
            explanation: "Acil venöz Doppler ultrason ve Kalp ve Damar Cerrahisi değerlendirmesi gerekir.",
            redFlagNote: "Nefes darlığı veya göğüs ağrısı eklenirse hemen 112'yi arayın."
          };
        }
        if (ans.kind === "cerrahi-doku") {
          return {
            preliminaryDiagnosis: "Lipom (Yağ Bezesi) / Sebase Kist / Apse / Tırnak Batması",
            differential: ["Fronkül / Karbonkül", "Yumuşak doku enfeksiyonu"],
            specialtyId: "genel-cerrahi",
            alternatives: ["Dermatoloji (Cildiye)", "Ortopedi ve Travmatoloji"],
            isEmergency: false,
            explanation: "Cilt altı yağ bezeleri, kistler, drenaj gerektiren apseler ve tırnak batması işlemleri için Genel Cerrahi uygundur.",
            redFlagNote: "Kızarıklık hızla yayılıyor, şiddetli zonklama ve yüksek ateş eşlik ediyorsa Acil Servise başvurun."
          };
        }
        return {
          preliminaryDiagnosis: "Dermatit / Egzama / Akne / Nevüs (Ben) Değerlendirmesi",
          differential: ["Ürtiker", "Mantar enfeksiyonu", "Sedef"],
          specialtyId: "dermatoloji",
          alternatives: ["İç Hastalıkları (Dahiliye)"],
          isEmergency: false,
          explanation: "Cilt döküntüleri, kaşıntı, egzama, akne, mantar, ben değişikliği ve saç dökülmesi için doğru bölüm Dermatoloji (Cildiye)'dir.",
          redFlagNote: "Dudak/dil şişmesi veya nefes darlığı eklenirse hemen 112'yi arayın."
        };
      }
    },

    // 15. GENEL DAHİLİ, ÇOCUK VE RUH SAĞLIĞI
    {
      id: "genel-cocuk-psik",
      title: "15 · Genel Sağlık, Çocuk veya Ruh Sağlığı Ön Değerlendirmesi",
      matchKeywords: ["halsizlik", "yorgunluk", "ateş", "şeker", "diyabet", "kansızlık", "çocuk", "oğlum", "kızım", "bebek", "panik", "uykusuzluk", "depresyon", "kaygı", "stres"],
      questions: [
        {
          id: "group",
          text: "Şikayet hangi gruba giriyor?",
          options: [
            { value: "dahili", label: "Erişkin halsizlik, ateş, şeker/tansiyon, kansızlık veya genel kontrol" },
            { value: "cocuk", label: "0–18 yaş çocukta ateş, öksürük, döküntü veya ishal" },
            { value: "psikiyatri", label: "Panik atak, yoğun kaygı, uzun süren uykusuzluk veya depresif durum" }
          ]
        }
      ],
      evaluate(ans) {
        if (ans.group === "cocuk") {
          return {
            preliminaryDiagnosis: "Pediatrik Değerlendirme (0–18 Yaş)",
            differential: ["Viral enfeksiyon", "Üst/alt solunum yolu enfeksiyonu"],
            specialtyId: "cocuk-sagligi",
            alternatives: ["Genel Cerrahi"],
            isEmergency: false,
            explanation: "0–18 yaş çocukların ateş, öksürük, döküntü ve genel şikayetleri için doğru bölüm Çocuk Sağlığı ve Hastalıkları'dır.",
            redFlagNote: "Havale, morarma, beslenememe, hızlı nefes alma veya uyandırılamama varsa hemen 112'yi arayın."
          };
        }
        if (ans.group === "psikiyatri") {
          return {
            preliminaryDiagnosis: "Anksiyete / Panik Bozukluk / Uyku veya Duygudurum Değerlendirmesi",
            differential: ["Depresyon", "Stres ilişkili bozukluklar"],
            specialtyId: "psikiyatri",
            alternatives: ["Nöroloji", "İç Hastalıkları (Dahiliye)"],
            isEmergency: false,
            explanation: "Panik atak, yoğun kaygı, ağır uykusuzluk ve depresif ruh hali için uzman hekim değerlendirmesi Psikiyatri bölümünde yapılır.",
            redFlagNote: "Kendine veya başkasına zarar verme düşüncesi varsa hemen 112'yi arayın veya Acil Servise başvurun."
          };
        }
        return {
          preliminaryDiagnosis: "Metabolik / Enfeksiyöz / Genel Dahili Değerlendirme",
          differential: ["Diyabet / Tiroid / Vitamin eksikliği", "Anemi"],
          specialtyId: "dahiliye",
          alternatives: ["Genel Cerrahi"],
          isEmergency: false,
          explanation: "Halsizlik, ateş, kilo kaybı, kansızlık ve şeker/tansiyon takibi için ilk başvuru bölümü İç Hastalıkları (Dahiliye)'dir.",
          redFlagNote: "Yüksek ateşle birlikte bilinç bulanıklığı veya nefes darlığı varsa Acil Servise başvurun."
        };
      }
    }
  ],

  directMatches: [
    { id: "dahiliye", diag: "Genel Dahili Değerlendirme", kws: ["kontrol", "check up", "genel"], rf: "Yüksek ateş, nefes darlığı veya ani kötüleşme varsa Acil Servise başvurun." }
  ]
};
