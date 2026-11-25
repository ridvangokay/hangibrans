// HangiBranş — Soru-Cevaplı Olası Ön Tanı, Otomatik Konum, PWA ve Canlı Sunucu Entegrasyonu

(function () {
  const state = {
    location: null, // Başlangıçta konum boş — kullanıcı GPS veya il/ilçe seçer
    instFilter: "Tümü",
    expandedHospitalId: null,
    liveHospitalsCache: null, // Canlı /api/hospitals sonucu (tüm Türkiye 81 il)
    activeFlow: null,
    answers: {},
    result: null,
    serverAiReady: false // Sunucuda GEMINI_API_KEY tanımlıysa /api/triage otomatik devreye girer
  };

  let deferredInstallPrompt = null;

  const $ = (id) => document.getElementById(id);

  function normalizeTR(text) {
    return (text || "")
      .toLocaleLowerCase("tr-TR")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function showToast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.add("hidden"), 3000);
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function detectLocationFromText(rawText) {
    const norm = normalizeTR(rawText);
    for (const loc of DOKTORUM_LOCATIONS) {
      if (loc.aliases.some((a) => norm.includes(normalizeTR(a)))) return loc;
    }
    return null;
  }

  function updateLocationUI() {
    const banner = $("locationBanner");
    if (!state.location) {
      $("currentLocLabel").textContent = "Konum Seç";
      $("locBannerTitle").textContent = "Konumunuzu girin (İl / İlçe veya GPS)";
      $("locBannerDesc").textContent = "En yakın hastaneleri, eczaneleri ve nöbetçi eczaneleri doğru göstermek için konumunuzu belirleyin.";
      banner.classList.remove("confirmed");
    } else {
      const label = state.location.district
        ? `${state.location.district}, ${state.location.city}`
        : state.location.city;
      $("currentLocLabel").textContent = label;
      $("locBannerTitle").textContent = `Seçili Konum: ${label}`;
      $("locBannerDesc").textContent =
        window.location.protocol.startsWith("http") || state.location.hasExactCoords !== false
          ? "En yakın hastaneler, eczaneler ve nöbetçi eczaneler bu konuma göre güncellendi."
          : "Bu ilçe için canlı harita üzerinden en yakın Devlet, Üniversite, Özel hastaneler ve eczaneler hazırlanır.";
      banner.classList.add("confirmed");
      if ($("provinceSelect")) {
        $("provinceSelect").value = state.location.city || "";
        populateDistrictsForProvince(state.location.city, state.location.district);
      }
    }
    updatePharmacyLinks();
    renderLocationOptions();
    if (state.result) renderHospitals();
  }

  function populateDistrictsForProvince(city, selectedDistrict) {
    const distSel = $("districtSelect");
    if (!distSel) return;
    distSel.innerHTML = "";
    const districts = (typeof TURKEY_IL_ILCE !== "undefined" && TURKEY_IL_ILCE[city]) || [];
    if (!city || districts.length === 0) {
      distSel.disabled = true;
      distSel.innerHTML = `<option value="">2. Önce il seçin...</option>`;
      return;
    }
    distSel.disabled = false;
    const defOpt = document.createElement("option");
    defOpt.value = "";
    defOpt.textContent = `2. ${city} ilçesi seçin...`;
    distSel.appendChild(defOpt);

    districts.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      distSel.appendChild(opt);
    });

    if (selectedDistrict && districts.includes(selectedDistrict)) {
      distSel.value = selectedDistrict;
    }
  }

  function updatePharmacyLinks() {
    const nearEl = $("nearestPharmacyLink");
    const dutyEl = $("dutyPharmacyMapLink");
    const subEl = $("pharmacySub");
    const ieoEl = $("ieoDutyLink");
    if (!nearEl || !dutyEl) return;

    if (!state.location) {
      subEl.textContent = "Konumunuzu seçtiğinizde bulunduğunuz ilçedeki açık ve nöbetçi eczanelere tek dokunuşla ulaşın.";
      nearEl.href = "https://www.google.com/maps/search/en+yak%C4%B1n+eczane";
      dutyEl.href = "https://www.google.com/maps/search/n%C3%B6bet%C3%A7i+eczane";
      ieoEl.classList.add("hidden");
      return;
    }

    const locText = `${state.location.district} ${state.location.city}`.replace("(GPS)", "").trim();
    subEl.textContent = `${state.location.district}, ${state.location.city} için en yakın açık eczaneler ve bugünün nöbetçi eczaneleri:`;

    if (state.location.hasExactCoords !== false && state.location.lat && state.location.lng) {
      nearEl.href = `https://www.google.com/maps/search/eczane/@${state.location.lat},${state.location.lng},15z`;
    } else {
      nearEl.href = `https://www.google.com/maps/search/${encodeURIComponent(locText + " eczane")}`;
    }
    dutyEl.href = `https://www.google.com/maps/search/${encodeURIComponent(locText + " nöbetçi eczane")}`;

    if (normalizeTR(state.location.city) === normalizeTR("İstanbul")) {
      ieoEl.classList.remove("hidden");
    } else {
      ieoEl.classList.add("hidden");
    }
  }

  function applyManualLocation() {
    const city = ($("provinceSelect").value || "").trim();
    const districtRaw = ($("districtSelect") ? $("districtSelect").value : "").trim();
    if (!city) {
      showToast("Lütfen önce 1. kutudan ilinizi seçin.");
      $("provinceSelect").focus();
      return;
    }
    if (!districtRaw) {
      showToast(`Lütfen ${city} için ilçenizi seçin.`);
      $("districtSelect").focus();
      return;
    }
    const district = districtRaw;
    const normDist = normalizeTR(district);
    const normCity = normalizeTR(city);

    const matched = DOKTORUM_LOCATIONS.find(
      (l) =>
        normalizeTR(l.city) === normCity &&
        (normalizeTR(l.district) === normDist || l.aliases.some((a) => normalizeTR(a) === normDist))
    );

    if (matched) {
      state.location = { ...matched, district, hasExactCoords: true };
    } else {
      state.location = {
        id: `custom-${normCity}-${normDist}`,
        city,
        district,
        lat: null,
        lng: null,
        hasExactCoords: false,
        aliases: []
      };
    }

    state.expandedHospitalId = null;
    updateLocationUI();
    showToast(`Konum kaydedildi: ${district}, ${city}`);
  }

  function requestGpsLocation() {
    if (!navigator.geolocation) {
      showToast("Tarayıcı GPS desteklemiyor, listeden ilçe seçebilirsiniz.");
      $("locationModal").classList.remove("hidden");
      return;
    }
    showToast("GPS konumunuz alınıyor...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let nearest = DOKTORUM_LOCATIONS[0];
        let minD = Infinity;
        DOKTORUM_LOCATIONS.forEach((loc) => {
          const d = haversineKm(latitude, longitude, loc.lat, loc.lng);
          if (d < minD) { minD = d; nearest = loc; }
        });
        state.location = {
          id: "gps-live",
          city: nearest.city,
          district: `${nearest.district} çevresi (GPS)`,
          lat: latitude,
          lng: longitude,
          aliases: []
        };
        updateLocationUI();
        $("locationModal").classList.add("hidden");
        showToast("Canlı GPS konumunuz alındı.");
      },
      () => {
        showToast("GPS izni alınamadı, listeden il/ilçenizi seçebilirsiniz.");
        $("locationModal").classList.remove("hidden");
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  async function checkServerAiStatus() {
    if (!window.location.protocol.startsWith("http")) return;
    try {
      const resp = await fetch("/api/triage", { method: "GET" });
      if (resp.ok) {
        const data = await resp.json();
        state.serverAiReady = Boolean(data.aiReady);
      }
    } catch {
      state.serverAiReady = false;
    }
  }

  async function startAssessment() {
    const rawText = $("symptomInput").value.trim();
    if (rawText.length < 3) {
      showToast("Lütfen şikayetinizi kısaca yazın veya sesli anlatın.");
      $("symptomInput").focus();
      return;
    }

    const detectedLoc = detectLocationFromText(rawText);
    if (detectedLoc && (!state.location || detectedLoc.id !== state.location.id)) {
      state.location = detectedLoc;
      updateLocationUI();
      showToast(`Konum otomatik seçildi: ${detectedLoc.district}, ${detectedLoc.city}`);
    }

    const norm = normalizeTR(rawText);

    // 1. Doğrudan yüksek aciliyet kırmızı bayrak kontrolü
    for (const p of DOKTORUM_TRIAGE.emergencyPatterns) {
      const hits = p.keywords.filter((k) => norm.includes(normalizeTR(k))).length;
      if (hits >= p.minMatches) {
        $("questionsCard").classList.add("hidden");
        state.result = {
          specialty: DOKTORUM_TRIAGE.specialties[p.specialtyId],
          preliminaryDiagnosis: p.preliminaryDiagnosis,
          differential: [],
          explanation: p.reason,
          redFlagNote: p.reason,
          alternatives: [],
          isEmergency: true,
          emergencyReason: p.reason,
          engine: "Acil Kırmızı Bayrak"
        };
        renderResult();
        return;
      }
    }

    // 2. Hekim onaylı 15 soru-cevaplı klinik akış eşleşmesi
    let matchedFlow = null;
    let bestHits = 0;
    for (const flow of DOKTORUM_TRIAGE.flows) {
      let score = 0;
      for (const kw of flow.matchKeywords) {
        const nkw = normalizeTR(kw);
        if (norm.includes(nkw)) score += nkw.includes(" ") ? 3 : 1.5;
      }
      if (score > bestHits) {
        bestHits = score;
        matchedFlow = flow;
      }
    }

    if (matchedFlow) {
      state.activeFlow = matchedFlow;
      state.answers = {};
      renderQuestions(matchedFlow, norm);
      return;
    }

    // 3. Serbest şikayetler için sunucu tarafı Gemini AI (/api/triage) veya yerel klinik motor
    $("questionsCard").classList.add("hidden");
    await finalizeDirectOrAI(rawText);
  }

  function renderQuestions(flow, normText) {
    $("emergencyCard").classList.add("hidden");
    $("resultSection").classList.add("hidden");
    $("questionsTitle").textContent = flow.title;

    const list = $("questionsList");
    list.innerHTML = "";

    if (flow.id === "karin-agrisi") {
      if (normText.includes("sağ üst") || normText.includes("safra")) state.answers.location = "sag-ust";
      else if (normText.includes("sağ alt") || normText.includes("apandisit")) state.answers.location = "sag-alt";
      else if (normText.includes("mide") || normText.includes("reflü") || normText.includes("gastrit")) state.answers.location = "mide";
    }

    flow.questions.forEach((q) => {
      const block = document.createElement("div");
      block.className = "q-block";
      block.innerHTML = `<p class="q-title">${q.text}</p>`;

      const row = document.createElement("div");
      row.className = "q-options";

      q.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "q-opt-btn" + (state.answers[q.id] === opt.value ? " selected" : "");
        btn.textContent = opt.label;
        btn.addEventListener("click", () => {
          row.querySelectorAll(".q-opt-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          state.answers[q.id] = opt.value;
        });
        row.appendChild(btn);
      });

      block.appendChild(row);
      list.appendChild(block);
    });

    $("questionsCard").classList.remove("hidden");
    $("questionsCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function submitQuestions() {
    if (!state.activeFlow) return;
    const evalRes = state.activeFlow.evaluate(state.answers);
    $("questionsCard").classList.add("hidden");
    state.result = {
      specialty: DOKTORUM_TRIAGE.specialties[evalRes.specialtyId],
      preliminaryDiagnosis: evalRes.preliminaryDiagnosis,
      differential: evalRes.differential || [],
      explanation: evalRes.explanation,
      redFlagNote: evalRes.redFlagNote,
      alternatives: evalRes.alternatives || [],
      isEmergency: Boolean(evalRes.isEmergency),
      emergencyReason: evalRes.emergencyReason || "",
      engine: "Klinik Ön Değerlendirme"
    };
    renderResult();
  }

  async function finalizeDirectOrAI(rawText) {
    if (window.location.protocol.startsWith("http") && state.serverAiReady) {
      const btnText = $("analyzeBtnText");
      if (btnText) btnText.textContent = "Değerlendiriliyor...";
      try {
        const aiRes = await liveGeminiAnalyze(rawText);
        if (aiRes) {
          state.result = aiRes;
          renderResult();
          if (btnText) btnText.textContent = "Değerlendirmeye Başla";
          return;
        }
      } catch {
        // Sessizce yerel klinik motora düş
      }
      if (btnText) btnText.textContent = "Değerlendirmeye Başla";
    }

    const norm = normalizeTR(rawText);
    let matched = DOKTORUM_TRIAGE.directMatches[DOKTORUM_TRIAGE.directMatches.length - 1];
    let best = 0;
    for (const dm of DOKTORUM_TRIAGE.directMatches) {
      let sc = 0;
      for (const k of dm.kws) {
        const nk = normalizeTR(k);
        if (norm.includes(nk)) sc += nk.includes(" ") ? 3 : 1.5;
      }
      if (sc > best) {
        best = sc;
        matched = dm;
      }
    }

    const spec = DOKTORUM_TRIAGE.specialties[matched.id];
    state.result = {
      specialty: spec,
      preliminaryDiagnosis: matched.diag,
      differential: [],
      explanation: `Anlattığınız şikayet öncelikle ${spec.name} polikliniğinde değerlendirilmelidir.`,
      redFlagNote: matched.rf,
      alternatives: spec.id === "dahiliye" ? ["Genel Cerrahi"] : ["İç Hastalıkları (Dahiliye)"],
      isEmergency: false,
      emergencyReason: "",
      engine: "Klinik Ön Değerlendirme"
    };
    renderResult();
  }

  async function liveGeminiAnalyze(fullText) {
    const resp = await fetch("/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint: fullText })
    });
    if (!resp.ok) return null;
    const data = await resp.json();

    const spec = DOKTORUM_TRIAGE.specialties[data.specialtyId] || DOKTORUM_TRIAGE.specialties["dahiliye"];
    return {
      specialty: spec,
      preliminaryDiagnosis: data.preliminaryDiagnosis || `${spec.name} Ön Değerlendirmesi`,
      differential: Array.isArray(data.differential) ? data.differential : [],
      explanation: data.explanation || `Şikayetiniz ${spec.name} bölümünde değerlendirilmelidir.`,
      redFlagNote: data.redFlagNote || "Şikayetiniz hızla ağırlaşırsa Acil Servise başvurun.",
      alternatives: [],
      isEmergency: Boolean(data.isEmergency),
      emergencyReason: data.emergencyReason || "",
      engine: "Yapay Zeka Destekli Ön Değerlendirme"
    };
  }

  function renderResult() {
    const r = state.result;
    if (!r) return;

    if (r.isEmergency) {
      $("emergencyReason").textContent = r.emergencyReason;
      const erQuery = state.location ? `${state.location.district} ${state.location.city} acil servis` : "en yakın acil servis";
      $("nearestErLink").href = `https://www.google.com/maps/search/${encodeURIComponent(erQuery)}`;
      $("emergencyCard").classList.remove("hidden");
    } else {
      $("emergencyCard").classList.add("hidden");
    }

    $("specialtyTitle").textContent = r.specialty.name;
    $("prelimTitle").textContent = r.preliminaryDiagnosis;

    const diffWrap = $("differentialWrap");
    if (r.differential && r.differential.length) {
      diffWrap.textContent = `Diğer olası nedenler: ${r.differential.join(", ")}`;
      diffWrap.classList.remove("hidden");
    } else {
      diffWrap.classList.add("hidden");
    }

    $("explanationText").textContent = r.explanation;
    $("redFlagText").textContent = r.redFlagNote;

    const tag = $("engineTag");
    tag.textContent = r.engine;
    tag.classList.toggle("ai", r.engine.includes("Yapay Zeka"));

    const altWrap = $("altWrap");
    const altList = $("altList");
    altList.innerHTML = "";
    const validAlts = (r.alternatives || []).filter((a) => a !== "Acil Servis");
    if (validAlts.length) {
      altWrap.classList.remove("hidden");
      validAlts.forEach((altName) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "alt-chip";
        btn.textContent = altName;
        btn.addEventListener("click", () => {
          const found = Object.values(DOKTORUM_TRIAGE.specialties).find((s) =>
            normalizeTR(altName).includes(normalizeTR(s.name.split(" ")[0]))
          );
          if (found) {
            state.result = { ...state.result, specialty: found };
            renderResult();
          }
        });
        altList.appendChild(btn);
      });
    } else {
      altWrap.classList.add("hidden");
    }

    $("resultSection").classList.remove("hidden");
    renderHospitals();
    (r.isEmergency ? $("emergencyCard") : $("resultSection")).scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function fetchLiveTurkeyHospitals(loc, spec, instFilter) {
    if (!window.location.protocol.startsWith("http")) return null;
    try {
      const params = new URLSearchParams({
        city: loc.city || "",
        district: (loc.district || "").replace("(GPS)", "").trim(),
        specialty: spec.id,
        type: instFilter || "Tümü"
      });
      if (loc.lat && loc.lng) {
        params.set("lat", String(loc.lat));
        params.set("lng", String(loc.lng));
      }
      const resp = await fetch(`/api/hospitals?${params.toString()}`);
      if (!resp.ok) return null;
      const json = await resp.json();
      return Array.isArray(json.hospitals) && json.hospitals.length ? json.hospitals : null;
    } catch {
      return null;
    }
  }

  async function renderHospitals() {
    if (!state.result) return;
    if (!state.location) {
      $("hospitalsWrapper").classList.add("hidden");
      return;
    }

    $("hospitalsWrapper").classList.remove("hidden");

    const spec = state.result.specialty;
    const loc = state.location;

    $("hospitalsHeading").textContent = `${loc.district}, ${loc.city} Yakınındaki Hastaneler (${spec.name})`;
    $("hospitalsSub").textContent = `Vakıf üniversiteleri Özel kategorisinde listelenir`;

    const container = $("hospitalsList");

    const cacheKey = `${loc.city}|${loc.district}|${loc.lat}|${loc.lng}|${spec.id}|${state.instFilter}`;
    let liveList = null;
    if (window.location.protocol.startsWith("http")) {
      if (state.liveHospitalsCache && state.liveHospitalsCache.key === cacheKey) {
        liveList = state.liveHospitalsCache.data;
      } else {
        container.innerHTML = `<div class="card" style="text-align:center; color:#64748B;">${loc.district}, ${loc.city} için en yakın hastaneler getiriliyor...</div>`;
        liveList = await fetchLiveTurkeyHospitals(loc, spec, state.instFilter);
        state.liveHospitalsCache = { key: cacheKey, data: liveList };
      }
    }

    container.innerHTML = "";
    if (liveList && liveList.length > 0) {
      renderHospitalCards(container, liveList, spec, loc);
      return;
    }

    if (loc.hasExactCoords === false || !loc.lat || !loc.lng) {
      const qBase = `${loc.district} ${loc.city}`;
      const stateMap = `https://www.google.com/maps/search/${encodeURIComponent(qBase + " devlet hastanesi")}`;
      const uniMap = `https://www.google.com/maps/search/${encodeURIComponent(qBase + " üniversite hastanesi")}`;
      const privMap = `https://www.google.com/maps/search/${encodeURIComponent(qBase + " özel hastane " + spec.name)}`;
      container.innerHTML = `
        <article class="hospital-card">
          <div class="hosp-badges"><span class="inst-badge Devlet">Devlet Hastaneleri</span></div>
          <h4 class="hosp-name">${loc.district}, ${loc.city} — Devlet Hastaneleri (${spec.name})</h4>
          <div class="mhrs-note"><strong>Randevu İpucu:</strong> MHRS veya <strong>ALO 182</strong>'den <strong>"${spec.mhrsName}"</strong> polikliniğini seçin.</div>
          <div class="hosp-actions three">
            <a href="tel:182" class="btn-primary">ALO 182 Ara</a>
            <a href="https://www.mhrs.gov.tr/" target="_blank" rel="noopener" class="btn-secondary">MHRS'ye Git</a>
            <a href="${stateMap}" target="_blank" rel="noopener" class="btn-ghost map-btn">Haritada Gör ↗</a>
          </div>
        </article>
        <article class="hospital-card">
          <div class="hosp-badges"><span class="inst-badge Üniversite">Devlet Üniversitesi Hastaneleri</span></div>
          <h4 class="hosp-name">${loc.city} — En Yakın Üniversite Hastaneleri</h4>
          <p class="hosp-address">${loc.district} konumuna en yakın devlet üniversitesi hastanelerini haritada görüntüleyin.</p>
          <div class="hosp-actions">
            <a href="${uniMap}" target="_blank" rel="noopener" class="btn-primary">Üniversite Hastanelerini Gör ↗</a>
            <a href="https://www.mhrs.gov.tr/" target="_blank" rel="noopener" class="btn-secondary">MHRS Kontrol</a>
          </div>
        </article>
        <article class="hospital-card">
          <div class="hosp-badges"><span class="inst-badge Özel">Özel Hastaneler &amp; Vakıf Üniversiteleri</span></div>
          <h4 class="hosp-name">${loc.district}, ${loc.city} — Özel Hastaneler (${spec.name})</h4>
          <p class="hosp-address">${loc.district} çevresindeki özel hastaneleri, telefon numaralarını ve yol tariflerini canlı haritada görün.</p>
          <div class="hosp-actions">
            <a href="${privMap}" target="_blank" rel="noopener" class="btn-primary">En Yakın Özel Hastaneleri Gör ↗</a>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(qBase + " " + spec.name)}" target="_blank" rel="noopener" class="btn-secondary">Tüm ${spec.name} Klinikleri ↗</a>
          </div>
        </article>
      `;
      return;
    }

    let list = DOKTORUM_HOSPITALS.filter((h) => h.specialties.includes(spec.id)).map((h) => ({
      ...h,
      distanceKm: haversineKm(loc.lat, loc.lng, h.lat, h.lng),
      doctors: (h.doctorsBySpecialty && h.doctorsBySpecialty[spec.id]) || []
    }));

    const sameCity = list.filter((h) => h.city === loc.city);
    if (sameCity.length > 0) list = sameCity;
    if (state.instFilter !== "Tümü") list = list.filter((h) => h.type === state.instFilter);
    list.sort((a, b) => a.distanceKm - b.distanceKm);

    const nearby = list.filter((h) => h.distanceKm <= 15);
    const displayList = nearby.length >= 2 ? nearby.slice(0, 6) : list.slice(0, 5);

    if (displayList.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center; color:#64748B;">
          Bu bölgede <strong>${state.instFilter}</strong> filtresinde kayıtlı hastane bulunamadı. <strong>Tümü</strong> seçeneğine dokunabilirsiniz.
        </div>
      `;
      return;
    }

    renderHospitalCards(container, displayList, spec, loc);
  }

  function renderHospitalCards(container, displayList, spec, loc) {
    displayList.forEach((h) => {
      const card = document.createElement("article");
      const isExpanded = state.expandedHospitalId === h.id;
      card.className = "hospital-card" + (isExpanded ? " hosp-card-selected" : "");
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;
      const isState = h.type === "Devlet";
      const specDoctors = h.doctors || (h.doctorsBySpecialty && h.doctorsBySpecialty[spec.id]) || [];

      const mhrsHtml = isState
        ? `<div class="mhrs-note"><strong>Randevu İpucu:</strong> MHRS veya <strong>ALO 182</strong>'den <strong>"${spec.mhrsName}"</strong> polikliniğini seçin; güncel doktor günlerini hastanenin çalışma takviminden görebilirsiniz.</div>`
        : "";

      const actionsHtml = isState
        ? `
          <div class="hosp-actions three">
            <button type="button" class="btn-primary toggle-docs-btn">${isExpanded ? "Doktorları Gizle ▲" : `Doktorları Gör${specDoctors.length ? ` (${specDoctors.length})` : ""} ▼`}</button>
            <a href="tel:182" class="btn-secondary">ALO 182 / MHRS</a>
            <a href="${mapsUrl}" target="_blank" rel="noopener" class="btn-ghost map-btn">Yol Tarifi</a>
          </div>
        `
        : `
          <div class="hosp-actions three">
            <button type="button" class="btn-primary toggle-docs-btn">${isExpanded ? "Doktorları Gizle ▲" : `Doktorları Gör${specDoctors.length ? ` (${specDoctors.length})` : ""} ▼`}</button>
            ${h.appointmentPhone ? `<a href="tel:${h.appointmentPhone}" class="btn-secondary">Ara: ${h.appointmentLabel}</a>` : `<a href="${mapsUrl}" target="_blank" rel="noopener" class="btn-secondary">İletişim / Harita</a>`}
            <a href="${mapsUrl}" target="_blank" rel="noopener" class="btn-ghost map-btn">Yol Tarifi</a>
          </div>
        `;

      const doctorsRowsHtml = specDoctors.length
        ? `<div class="doctor-rows">
            ${specDoctors
              .map(
                (doc) => `
              <div class="doctor-row">
                <div>
                  <div class="doctor-row-name">${doc.name}</div>
                  <div class="doctor-row-focus">${doc.focus}</div>
                </div>
                ${
                  isState
                    ? `<a href="${h.mhrsUrl || "https://www.mhrs.gov.tr/"}" target="_blank" rel="noopener" class="doctor-row-action">MHRS Randevu</a>`
                    : h.appointmentPhone
                    ? `<a href="tel:${h.appointmentPhone}" class="doctor-row-action">Randevu Ara</a>`
                    : `<a href="${mapsUrl}" target="_blank" rel="noopener" class="doctor-row-action">Haritada Gör</a>`
                }
              </div>
            `
              )
              .join("")}
          </div>`
        : `<div class="doctor-empty-note">
            ${
              isState
                ? `<strong>${h.name}</strong> için <strong>${spec.name}</strong> güncel hekim kadrosu ve günlük poliklinik çalışma saatleri doğrudan hastanenin resmi çalışma cetvelinde yayınlanmaktadır.`
                : `<strong>${h.name}</strong> bünyesindeki <strong>${spec.name}</strong> hekim listesini hastanenin resmi doktorlar sayfasından veya çağrı merkezinden görebilirsiniz.`
            }
          </div>`;

      const drawerHtml = isExpanded
        ? `
          <div class="doctors-drawer">
            <div class="doctors-drawer-head">
              <h5 class="doctors-drawer-title">${spec.name} Hekimleri</h5>
              ${
                h.scheduleUrl
                  ? `<a href="${h.scheduleUrl}" target="_blank" rel="noopener" class="schedule-link-btn">${h.scheduleLabel || "Resmi Hekim Listesi"} ↗</a>`
                  : ""
              }
            </div>
            ${doctorsRowsHtml}
            <div class="doctor-disclaimer">
              ${isState ? `Çalışma takvimi ve nöbet/izin değişiklikleri için hastanenin resmi sitesini veya <a href="https://www.mhrs.gov.tr/" target="_blank" rel="noopener">mhrs.gov.tr</a>'yi kontrol edin.` : `Hekim kadrosu ve randevu saatleri dönemsel olarak güncellenebilir.`}
            </div>
          </div>
        `
        : "";

      const distLabel = typeof h.distanceKm === "number" ? `~${h.distanceKm.toFixed(1)} km · ` : "";

      card.innerHTML = `
        <div class="hosp-badges">
          <span class="inst-badge ${h.type}">${h.subTypeLabel || h.type}</span>
          <span class="dist-badge">${distLabel}${h.district}</span>
        </div>
        <h4 class="hosp-name">${h.name}</h4>
        <p class="hosp-address">${h.address}</p>
        <p class="hosp-phone-line">Santral / İletişim: <strong>${h.phoneDisplay}</strong></p>
        ${mhrsHtml}
        ${actionsHtml}
        ${drawerHtml}
      `;

      card.querySelector(".toggle-docs-btn").addEventListener("click", () => {
        state.expandedHospitalId = isExpanded ? null : h.id;
        renderHospitals();
      });

      container.appendChild(card);
    });

    const liveMapCard = document.createElement("div");
    liveMapCard.className = "card";
    liveMapCard.style.textAlign = "center";
    const liveMapUrl = loc.lat && loc.lng
      ? `https://www.google.com/maps/search/${encodeURIComponent(spec.name + " hastane")}/@${loc.lat},${loc.lng},13z`
      : `https://www.google.com/maps/search/${encodeURIComponent(loc.district + " " + loc.city + " " + spec.name + " hastane")}`;
    liveMapCard.innerHTML = `
      <p class="muted-text" style="margin-bottom:10px;">${loc.district} çevresindeki diğer tüm klinikleri ve hastaneleri canlı haritada görmek ister misiniz?</p>
      <a href="${liveMapUrl}" target="_blank" rel="noopener" class="btn-secondary full-width">Google Haritalar'da ${loc.district} Çevresini Gör ↗</a>
    `;
    container.appendChild(liveMapCard);
  }

  function renderLocationOptions() {
    const grid = $("locationGrid");
    grid.innerHTML = "";
    DOKTORUM_LOCATIONS.forEach((loc) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "loc-opt" + (state.location && state.location.id === loc.id ? " active" : "");
      btn.innerHTML = `<strong>${loc.district}</strong><span>${loc.city}</span>`;
      btn.addEventListener("click", () => {
        state.location = loc;
        updateLocationUI();
        $("locationModal").classList.add("hidden");
        showToast(`Konum güncellendi: ${loc.district}, ${loc.city}`);
      });
      grid.appendChild(btn);
    });
  }

  function openLegalModal(kind) {
    const titleEl = $("legalModalTitle");
    const bodyEl = $("legalModalBody");
    if (!titleEl || !bodyEl) return;

    if (kind === "kvkk") {
      titleEl.textContent = "KVKK & Gizlilik Aydınlatma Metni";
      bodyEl.innerHTML = `
        <p><strong>HangiBranş</strong>, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ilkelerine tam uyumlu ve gizlilik odaklı çalışır.</p>
        <h4>Kişisel Sağlık Verisi Saklanmaz</h4>
        <ul>
          <li>Uygulamayı kullanmak için üyelik, ad-soyad, T.C. Kimlik Numarası veya telefon bilgisi istenmez.</li>
          <li>Yazdığınız veya sesle aktardığınız şikayet ifadeleri herhangi bir veritabanında kayıt altına alınmaz; yalnızca anlık branş yönlendirmesi üretmek için işlenir.</li>
          <li>Sesle anlatım özelliği cihazınızın/tarayıcınızın kendi konuşma tanıma servisini kullanır; ses kaydı sunucularımıza aktarılmaz.</li>
        </ul>
        <h4>Konum Bilgisi</h4>
        <p>GPS izni verdiğinizde veya İl/İlçe seçtiğinizde konum bilginiz yalnızca size en yakın hastaneleri, eczaneleri ve nöbetçi eczaneleri listelemek amacıyla anlık kullanılır ve profil olarak saklanmaz.</p>
      `;
    } else if (kind === "disclaimer") {
      titleEl.textContent = "Tıbbi Sorumluluk Reddi & Kullanım Koşulları";
      bodyEl.innerHTML = `
        <p><strong>HangiBranş</strong>, hastaların hangi tıbbi polikliniğe başvuracaklarını ve çevrelerindeki sağlık kuruluşlarını kolayca bulmalarını sağlayan bir <strong>bilgilendirme ve yönlendirme</strong> platformudur.</p>
        <ul>
          <li>Platformda gösterilen "olası ön tanı" ve branş önerileri <strong>kesin hekim tanısı, tıbbi tedavi veya reçete yerine geçmez</strong>.</li>
          <li>Göğüs ağrısı, ani nefes darlığı, felç bulguları, şiddetli kanama, bilinç kaybı veya ani kötüleşme gibi acil durumlarda vakit kaybetmeden <strong>112 Acil Yardım</strong>'ı arayın veya en yakın Acil Servise başvurun.</li>
          <li>Hastane ve hekim kadroları kamuya açık resmi kaynaklardan düzenli güncellenmekle birlikte dönemsel değişiklik gösterebilir; randevu öncesi ilgili hastaneden veya <strong>MHRS / ALO 182</strong> üzerinden teyit ediniz.</li>
          <li>Uygulama, <em>Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Yönetmeliği</em> uyarınca reklam, hasta yorumu, puanlama veya ücret kıyaslaması içermez.</li>
        </ul>
      `;
    } else {
      titleEl.textContent = "HangiBranş'ı Telefonunuza Uygulama Gibi Ekleyin";
      bodyEl.innerHTML = `
        <p>HangiBranş'ı uygulama mağazası beklemeden tek dokunuşla telefonunuzun ana ekranına ekleyip tam ekran uygulama gibi kullanabilirsiniz:</p>
        <h4>Android (Chrome)</h4>
        <ul>
          <li>Üstteki <strong>"Uygulamayı Kur"</strong> butonuna dokunun veya tarayıcı menüsünden (⋮) <strong>"Ana ekrana ekle / Uygulamayı yükle"</strong> seçeneğini seçin.</li>
        </ul>
        <h4>iPhone / iPad (Safari)</h4>
        <ul>
          <li>Alt çubuktaki <strong>Paylaş (↑)</strong> simgesine dokunun.</li>
          <li>Aşağı kaydırıp <strong>"Ana Ekrana Ekle"</strong> seçeneğine dokunun ve <strong>Ekle</strong> deyin.</li>
        </ul>
      `;
    }
    $("legalModal").classList.remove("hidden");
  }

  function setupPwa() {
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const installBtn = $("installAppBtn");
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (installBtn) installBtn.classList.remove("hidden");
    });

    if (installBtn) {
      installBtn.addEventListener("click", async () => {
        if (!deferredInstallPrompt) {
          openLegalModal("pwa");
          return;
        }
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          showToast("HangiBranş ana ekranınıza eklendi.");
          installBtn.classList.add("hidden");
        }
        deferredInstallPrompt = null;
      });
    }

    window.addEventListener("appinstalled", () => {
      if (installBtn) installBtn.classList.add("hidden");
      deferredInstallPrompt = null;
    });
  }

  function setupVoice() {
    const voiceBtn = $("voiceBtn");
    const voiceBtnText = $("voiceBtnText");
    const voiceStatus = $("voiceStatus");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let listening = false;

    voiceBtn.addEventListener("click", () => {
      if (listening && recognition) {
        recognition.stop();
        return;
      }
      if (!SpeechRecognition) {
        simulateVoice();
        return;
      }
      try {
        recognition = new SpeechRecognition();
        recognition.lang = "tr-TR";
        recognition.interimResults = true;
        recognition.onstart = () => {
          listening = true;
          voiceBtn.classList.add("listening");
          voiceBtnText.textContent = "Dinleniyor...";
          voiceStatus.textContent = "Mikrofon açık — şikayetinizi Türkçe anlatabilirsiniz...";
          voiceStatus.classList.remove("hidden");
        };
        recognition.onresult = (e) => {
          let t = "";
          for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
          $("symptomInput").value = t;
        };
        recognition.onerror = () => {
          stopUI();
          simulateVoice();
        };
        recognition.onend = () => stopUI();
        recognition.start();
      } catch {
        stopUI();
        simulateVoice();
      }
    });

    function stopUI() {
      listening = false;
      voiceBtn.classList.remove("listening");
      voiceBtnText.textContent = "Sesle Anlat";
    }

    function simulateVoice() {
      const sample = "Esenyurt'ta yaşıyorum, karnım ağrıyor, hangi bölüme gitmeliyim?";
      voiceBtn.classList.add("listening");
      voiceBtnText.textContent = "Demo Dinleniyor...";
      voiceStatus.textContent = "Mikrofon izni/desteği bulunmadığı için örnek sesli şikayet simülasyonu çalıştırılıyor...";
      voiceStatus.classList.remove("hidden");
      $("symptomInput").value = "";
      let i = 0;
      const timer = setInterval(() => {
        i += 4;
        $("symptomInput").value = sample.slice(0, i);
        if (i >= sample.length) {
          clearInterval(timer);
          stopUI();
          voiceStatus.textContent = "Sesli giriş tamamlandı. Kısa sorular açılıyor...";
          startAssessment();
        }
      }, 40);
    }
  }

  function init() {
    const pills = $("examplePills");
    DOKTORUM_TRIAGE.quickExamples.forEach((ex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "example-pill";
      btn.textContent = ex.label;
      btn.addEventListener("click", () => {
        $("symptomInput").value = ex.text;
        startAssessment();
      });
      pills.appendChild(btn);
    });

    $("analyzeBtn").addEventListener("click", startAssessment);
    $("showResultBtn").addEventListener("click", submitQuestions);
    $("symptomInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        startAssessment();
      }
    });

    document.querySelectorAll("#instFilters .filter-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#instFilters .filter-pill").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.instFilter = btn.dataset.type;
        renderHospitals();
      });
    });

    const provSel = $("provinceSelect");
    const distSel = $("districtSelect");
    if (provSel && typeof TURKEY_IL_ILCE !== "undefined") {
      Object.keys(TURKEY_IL_ILCE).forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p;
        provSel.appendChild(opt);
      });
      provSel.addEventListener("change", () => {
        populateDistrictsForProvince(provSel.value, "");
        if (distSel && !distSel.disabled) distSel.focus();
      });
    }
    if (distSel) {
      distSel.addEventListener("change", () => {
        if (distSel.value) applyManualLocation();
      });
    }
    if ($("saveManualLocBtn")) $("saveManualLocBtn").addEventListener("click", applyManualLocation);

    $("locationBtn").addEventListener("click", () => $("locationModal").classList.remove("hidden"));
    if ($("bannerPickBtn")) $("bannerPickBtn").addEventListener("click", () => $("locationModal").classList.remove("hidden"));
    if ($("bannerGpsBtn")) $("bannerGpsBtn").addEventListener("click", requestGpsLocation);
    $("gpsBtn").addEventListener("click", requestGpsLocation);
    $("closeLocModal").addEventListener("click", () => $("locationModal").classList.add("hidden"));
    $("locationModal").addEventListener("click", (e) => {
      if (e.target.id === "locationModal") $("locationModal").classList.add("hidden");
    });

    if ($("kvkkBtn")) $("kvkkBtn").addEventListener("click", () => openLegalModal("kvkk"));
    if ($("disclaimerBtn")) $("disclaimerBtn").addEventListener("click", () => openLegalModal("disclaimer"));
    if ($("pwaHelpBtn")) $("pwaHelpBtn").addEventListener("click", () => openLegalModal("pwa"));
    if ($("closeLegalModal")) $("closeLegalModal").addEventListener("click", () => $("legalModal").classList.add("hidden"));
    if ($("okLegalBtn")) $("okLegalBtn").addEventListener("click", () => $("legalModal").classList.add("hidden"));
    if ($("legalModal")) {
      $("legalModal").addEventListener("click", (e) => {
        if (e.target.id === "legalModal") $("legalModal").classList.add("hidden");
      });
    }

    setupPwa();
    setupVoice();
    updateLocationUI();
    checkServerAiStatus();
  }

  document.addEventListener("DOMContentLoaded", init);
})();