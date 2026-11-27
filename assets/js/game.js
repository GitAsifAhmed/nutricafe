/* Thali Catch - the Nutri Café game.
   Catch healthy food, dodge junk, fill your thali with a protein + a grain + a
   vegetable/fruit for a balanced-plate bonus. Infinite rounds that speed up.
   7-day monthly challenge: the best round of each day is added up. */
(function () {
  "use strict";
  const CFG = window.NC_GAME_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n).toLocaleString("en-US");

  /* ================= challenge calendar (Dhaka time, UTC+6) ================= */
  const START = CFG.challengeStartDay || 1, DAYS = CFG.challengeDays || 7;
  const pad = (n) => String(n).padStart(2, "0");
  function dhakaParts(d = new Date()) { const t = new Date(d.getTime() + 6 * 3600e3); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() }; }
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateLabel = (y, m, d) => `${d} ${MONTHS[m]}`;
  function challenge(now = new Date()) {
    const p = dhakaParts(now), end = START + DAYS - 1;
    const season = `${p.y}-${pad(p.m + 1)}`;
    const active = p.d >= START && p.d <= end;
    let ny = p.y, nm = p.m;
    if (p.d > end) { nm += 1; if (nm > 11) { nm = 0; ny += 1; } }
    return {
      season, active, day: active ? p.d - START + 1 : null, y: p.y, m: p.m,
      startLabel: dateLabel(p.y, p.m, START), endLabel: dateLabel(p.y, p.m, end),
      nextLabel: dateLabel(ny, nm, START), nextSeason: `${ny}-${pad(nm + 1)}`, finished: p.d > end,
    };
  }

  /* ================= scores: shared leaderboard (Supabase) or this device ================= */
  const API = {
    on: !!(CFG.supabaseUrl && CFG.supabaseAnonKey),
    async rpc(fn, body) {
      const r = await fetch(`${CFG.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { apikey: CFG.supabaseAnonKey, Authorization: `Bearer ${CFG.supabaseAnonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.text()) || r.statusText);
      return r.json();
    },
  };
  const LOCAL_KEY = "nc:game:scores";
  function localWeek(season) { return (store.get(LOCAL_KEY, {})[season]) || {}; }
  function saveLocal(season, day, score) {
    const all = store.get(LOCAL_KEY, {});
    for (const s of Object.keys(all)) if (s !== season) delete all[s]; // keep only the current challenge
    const w = all[season] || (all[season] = {});
    w[day] = Math.max(w[day] || 0, score);
    store.set(LOCAL_KEY, all);
    return w;
  }
  const weekTotal = (w) => Object.values(w).reduce((a, b) => a + b, 0);

  async function submitScore(score, durationMs) {
    const ch = challenge();
    const player = store.get("nc:game:player", null);
    if (!ch.active) return { counted: false, practice: true };
    const w = saveLocal(ch.season, ch.day, score); // always keep a copy on this device
    if (!API.on || !player) return { counted: true, local: true, day: ch.day, best: w[ch.day], total: weekTotal(w) };
    try {
      const res = await API.rpc("submit_score", { p_email: player.email, p_name: player.name, p_score: score, p_duration_ms: Math.round(durationMs) });
      return Object.assign({ shared: true }, res);
    } catch (e) {
      // offline or rejected: keep it on the device and try again with the next round
      const q = store.get("nc:game:pending", []); q.push({ score, durationMs, at: Date.now() }); store.set("nc:game:pending", q.slice(-20));
      return { counted: true, local: true, offline: true, day: ch.day, best: w[ch.day], total: weekTotal(w) };
    }
  }
  async function flushPending() {
    if (!API.on) return;
    const player = store.get("nc:game:player", null), q = store.get("nc:game:pending", []);
    if (!player || !q.length) return;
    const today = challenge();
    const keep = [];
    for (const p of q) {
      const ch = challenge(new Date(p.at));
      if (ch.season !== today.season || ch.day !== today.day) continue; // the server only accepts today's rounds
      try { await API.rpc("submit_score", { p_email: player.email, p_name: player.name, p_score: p.score, p_duration_ms: Math.round(p.durationMs) }); }
      catch (e) { keep.push(p); }
    }
    store.set("nc:game:pending", keep);
  }
  async function getWeek() {
    const ch = challenge(), player = store.get("nc:game:player", null);
    const w = Object.assign({}, localWeek(ch.season));
    if (API.on && player) {
      try {
        const rows = await API.rpc("get_my_week", { p_email: player.email, p_season: ch.season });
        (rows || []).forEach((r) => { w[r.day] = Math.max(w[r.day] || 0, r.best); });
      } catch (e) {}
    }
    return w;
  }

  /* ================= foods ================= */
  const GROUPS = { p: { label: "Protein", color: "#2f9a72" }, c: { label: "Grain", color: "#e09a2d" }, v: { label: "Veg & fruit", color: "#8cb34a" } };
  const HEALTHY = [
    { e: "🥚", n: "Egg", g: "p" }, { e: "🐟", n: "Fish", g: "p" }, { e: "🍗", n: "Chicken", g: "p" }, { e: "🥛", n: "Milk", g: "p" }, { e: "🥜", n: "Nuts", g: "p" },
    { e: "🍚", n: "Rice", g: "c" }, { e: "🌽", n: "Corn", g: "c" }, { e: "🍠", n: "Sweet potato", g: "c" }, { e: "🥔", n: "Potato", g: "c" },
    { e: "🥬", n: "Shak", g: "v" }, { e: "🥕", n: "Carrot", g: "v" }, { e: "🍅", n: "Tomato", g: "v" }, { e: "🥒", n: "Cucumber", g: "v" },
    { e: "🍌", n: "Banana", g: "v" }, { e: "🥭", n: "Mango", g: "v" }, { e: "🍎", n: "Apple", g: "v" }, { e: "🍆", n: "Brinjal", g: "v" },
  ];
  const JUNK = [
    { e: "🥤", n: "Soft drink", f: "A 250 ml soft drink holds about 6 teaspoons of sugar." },
    { e: "🍟", n: "Fries", f: "Deep-fried snacks soak up oil. One tablespoon of oil is about 120 kcal." },
    { e: "🍩", n: "Doughnut", f: "Fried and sugary: a double hit for your heart and blood sugar." },
    { e: "🍔", n: "Fast-food burger", f: "Fast food is often very high in salt. WHO advises under 5 g of salt a day." },
    { e: "🍭", n: "Candy", f: "Sugar gives a quick rush, then a crash. Pair carbs with protein for steady energy." },
    { e: "🧁", n: "Cupcake", f: "WHO suggests keeping added sugars under 10% of the day's energy." },
    { e: "🍕", n: "Greasy pizza", f: "Cheese and processed meat are high in saturated fat, which raises LDL cholesterol." },
  ];
  const WATER = { e: "💧", n: "Water" };
  const FACTS = [
    "A farm egg has about 7 g of protein, more than a plate of rice.",
    "Rice and dal eaten together give a more complete protein than either alone.",
    "Adults need at least 25 g of fibre a day. Shak, dal and chola are great sources.",
    "Ilish is an oily fish rich in omega-3 fats, which support heart health.",
    "One teaspoon of salt holds about 2,300 mg of sodium, more than a whole day's limit.",
    "Even mild dehydration can make it harder to focus. Keep water nearby in class.",
    "A short walk after lunch helps lower the rise in blood sugar.",
    "Filling half your plate with vegetables adds fibre and vitamins for very few calories.",
    "Around 20 to 30 g of protein per meal helps keep muscles strong.",
    "Red lal shak and palong shak are rich in iron and folate.",
    "Guava has more vitamin C than an orange.",
    "Deep-fried food absorbs oil while it cooks, so the snack ends up far richer than it looks.",
    "Eating vegetables and protein before rice can soften the blood sugar spike.",
    "A banana is a great pre-class snack: quick energy plus fibre and potassium.",
    "WHO advises keeping saturated fat under 10% of your daily energy.",
    "Breakfast with protein (egg, dal, chola) keeps you full longer than sweets.",
  ];

  /* ================= sound (tiny synth, no files) ================= */
  let actx = null, soundOn = store.get("nc:game:sound", true);
  function tone(freq, dur = 0.09, type = "sine", vol = 0.08, slide = 0) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  const sfx = {
    catch: (m) => tone(520 + m * 70, 0.08, "triangle", 0.07),
    plate: () => { tone(660, 0.12, "triangle", 0.07); setTimeout(() => tone(880, 0.12, "triangle", 0.07), 90); setTimeout(() => tone(1100, 0.18, "triangle", 0.07), 180); },
    junk: () => tone(180, 0.25, "sawtooth", 0.06, -90),
    water: () => tone(900, 0.25, "sine", 0.06, -500),
    over: () => { tone(400, 0.2, "triangle", 0.06); setTimeout(() => tone(300, 0.3, "triangle", 0.06), 180); },
  };
  const btnSound = $("btn-sound");
  const paintSound = () => { btnSound.classList.toggle("muted", !soundOn); btnSound.setAttribute("aria-label", soundOn ? "Sound on" : "Sound off"); };
  btnSound.addEventListener("click", () => { soundOn = !soundOn; store.set("nc:game:sound", soundOn); paintSound(); });
  paintSound();

  /* ================= canvas ================= */
  const stage = $("stage"), canvas = $("canvas"), ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1, U = 1; // U: size unit relative to the play area
  function resize() {
    const r = stage.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; U = Math.min(W, H * 0.62) / 400;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (G) { G.p.y = H - 70 * U - 10; G.p.w = 92 * U; G.p.x = Math.min(Math.max(G.p.x, G.p.w / 2), W - G.p.w / 2); }
    if (!G || !G.running) drawIdle();
  }
  addEventListener("resize", resize);

  /* ================= game state ================= */
  let G = null, raf = 0, last = 0, idleT = 0;
  function newGame() {
    return {
      running: true, paused: false, t: 0, score: 0, hearts: 3, streak: 0, mult: 1, maxMult: 1,
      slots: { p: null, c: null, v: null }, plates: 0, caught: 0, junkHit: 0, slowUntil: 0, spawnIn: 0.6, shake: 0,
      items: [], parts: [], floats: [], seen: {},
      p: { x: W / 2, tx: W / 2, y: H - 70 * U - 10, w: 92 * U, bump: 0 },
    };
  }
  const multFor = (streak) => Math.min(5, 1 + Math.floor(streak / 4));

  function spawn() {
    const t = G.t, r = Math.random();
    const junkP = Math.min(0.4, 0.2 + t * 0.0035), waterP = 0.045;
    let kind, def;
    if (r < waterP) { kind = "water"; def = WATER; }
    else if (r < waterP + junkP) { kind = "junk"; def = JUNK[(Math.random() * JUNK.length) | 0]; }
    else {
      kind = "good";
      // gently favour the groups the plate is still missing, so balanced plates stay reachable
      const missing = Object.keys(G.slots).filter((g) => !G.slots[g]);
      const pool = missing.length && Math.random() < 0.55 ? HEALTHY.filter((h) => missing.includes(h.g)) : HEALTHY;
      def = pool[(Math.random() * pool.length) | 0];
    }
    const size = 25 * U;
    const speed = (130 + Math.min(330, t * 3.4)) * U * (0.85 + Math.random() * 0.3);
    G.items.push({ kind, def, x: size + Math.random() * (W - size * 2), y: -size, vy: speed, size, rot: (Math.random() - 0.5) * 0.4, vr: (Math.random() - 0.5) * 1.2 });
  }

  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (60 + Math.random() * 160) * U;
      G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60 * U, life: 0.6 + Math.random() * 0.3, t: 0, color, r: (2 + Math.random() * 3) * U });
    }
  }
  function float(text, x, y, color, big) { G.floats.push({ text, x, y, color, t: 0, life: big ? 1.3 : 0.9, big }); }

  /* ---------- HUD ---------- */
  const hudScore = $("hud-score"), hudMult = $("hud-mult"), hudHearts = $("hud-hearts"), toastEl = $("toast");
  let toastTimer = 0;
  function toast(html, ms = 2400) { toastEl.innerHTML = html; toastEl.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms); }
  function paintHud() {
    hudScore.textContent = fmt(G.score);
    if (hudMult.textContent !== "x" + G.mult) { hudMult.textContent = "x" + G.mult; hudMult.classList.add("pop"); setTimeout(() => hudMult.classList.remove("pop"), 200); }
    hudHearts.innerHTML = [0, 1, 2].map((i) => `<span class="${i < G.hearts ? "" : "lost"}">❤️</span>`).join("");
  }

  /* ---------- update ---------- */
  function update(dt) {
    const g = G;
    g.t += dt;
    const slow = g.t < g.slowUntil ? 0.55 : 1;
    const sdt = dt * slow;

    // player follows the finger / mouse / keys smoothly
    if (keys.left) g.p.tx -= 620 * U * dt;
    if (keys.right) g.p.tx += 620 * U * dt;
    g.p.tx = Math.min(Math.max(g.p.tx, g.p.w / 2), W - g.p.w / 2);
    g.p.x += (g.p.tx - g.p.x) * Math.min(1, dt * 20);
    g.p.bump = Math.max(0, g.p.bump - dt * 4);

    g.spawnIn -= sdt;
    if (g.spawnIn <= 0) { spawn(); g.spawnIn = Math.max(0.36, 0.92 - g.t * 0.011) * (0.8 + Math.random() * 0.4); }

    const catchTop = g.p.y - 22 * U, catchBot = g.p.y + 14 * U;
    for (let i = g.items.length - 1; i >= 0; i--) {
      const it = g.items[i];
      it.y += it.vy * sdt; it.rot += it.vr * sdt;
      const inX = Math.abs(it.x - g.p.x) < g.p.w / 2 + it.size * 0.25;
      if (inX && it.y + it.size * 0.4 > catchTop && it.y - it.size * 0.4 < catchBot) { g.items.splice(i, 1); onCatch(it); continue; }
      if (it.y - it.size > H) g.items.splice(i, 1);
    }
    for (let i = g.parts.length - 1; i >= 0; i--) { const p = g.parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * U * dt; if (p.t > p.life) g.parts.splice(i, 1); }
    for (let i = g.floats.length - 1; i >= 0; i--) { const f = g.floats[i]; f.t += dt; f.y -= 46 * U * dt; if (f.t > f.life) g.floats.splice(i, 1); }
    g.shake = Math.max(0, g.shake - dt * 3);
  }

  function onCatch(it) {
    const g = G, x = it.x, y = g.p.y - 30 * U;
    g.p.bump = 1;
    if (it.kind === "junk") {
      g.hearts -= 1; g.junkHit += 1; g.streak = 0; g.mult = 1; g.shake = 1;
      burst(x, y, "#cf4f33", 14); float("-1 ❤️", x, y, "#cf4f33");
      sfx.junk(); if (navigator.vibrate) navigator.vibrate(40);
      toast(`<b>${esc(it.def.n)}</b>: ${esc(it.def.f)}`, 3200);
      paintHud();
      if (g.hearts <= 0) endGame();
      return;
    }
    if (it.kind === "water") {
      g.slowUntil = g.t + 4; burst(x, y, "#5aa9e6", 14); float("Hydrated! Slow-mo", x, y, "#2f7fbf", true); sfx.water();
      return;
    }
    // healthy food
    g.caught += 1; g.streak += 1; g.mult = multFor(g.streak); g.maxMult = Math.max(g.maxMult, g.mult);
    const pts = 10 * g.mult;
    g.score += pts;
    const grp = GROUPS[it.def.g];
    float(`+${pts} ${grp.label}`, x, y, grp.color);
    burst(x, y, grp.color, 8); sfx.catch(g.mult);
    if (!g.seen[it.def.n] && g.caught <= 12) g.seen[it.def.n] = 1;
    g.slots[it.def.g] = it.def.e;
    if (g.slots.p && g.slots.c && g.slots.v) {
      const bonus = 30 * g.mult;
      g.score += bonus; g.plates += 1;
      float(`Balanced plate! +${bonus}`, g.p.x, g.p.y - 70 * U, "#0c3f2d", true);
      burst(g.p.x, g.p.y - 20 * U, "#e09a2d", 24); sfx.plate();
      g.slots = { p: null, c: null, v: null };
      if (g.plates % 3 === 0 && g.hearts < 3) { g.hearts += 1; float("+1 ❤️", g.p.x, g.p.y - 100 * U, "#cf4f33", true); }
    }
    paintHud();
  }

  /* ---------- draw ---------- */
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
  function drawBg(t) {
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#fbf6ec"); grd.addColorStop(1, "#efe5d3");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    // slow drifting dots for depth
    ctx.fillStyle = "rgba(22,92,68,0.06)";
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97 + t * 8 * ((i % 3) + 1)) % (W + 40)) - 20, y = ((i * 151) % (H * 0.8)) + 30;
      ctx.beginPath(); ctx.arc(x, y, (4 + (i % 4) * 3) * U, 0, Math.PI * 2); ctx.fill();
    }
    // table edge
    ctx.fillStyle = "#e4d5ba"; ctx.fillRect(0, H - 26 * U, W, 26 * U);
    ctx.fillStyle = "#d6c3a1"; ctx.fillRect(0, H - 26 * U, W, 3 * U);
  }
  function drawThali(x, y, w, bump, slots) {
    const h = w * 0.3, by = y + bump * 4 * U;
    ctx.save();
    // shadow
    ctx.fillStyle = "rgba(19,42,32,0.18)"; ctx.beginPath(); ctx.ellipse(x, by + h * 0.75, w * 0.48, h * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // brass rim
    const rim = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    rim.addColorStop(0, "#b8862e"); rim.addColorStop(0.5, "#f1cf7a"); rim.addColorStop(1, "#a97a26");
    ctx.fillStyle = rim; ctx.beginPath(); ctx.ellipse(x, by, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fffaf0"; ctx.beginPath(); ctx.ellipse(x, by - h * 0.04, w * 0.41, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    // the three compartments: protein, grain, veg
    const keys2 = ["p", "c", "v"];
    keys2.forEach((k, i) => {
      const sx = x + (i - 1) * w * 0.27, sy = by - h * 0.05, r = w * 0.11;
      ctx.fillStyle = slots[k] ? GROUPS[k].color + "33" : "rgba(19,42,32,0.06)";
      ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = GROUPS[k].color; ctx.lineWidth = 1.5 * U; ctx.globalAlpha = slots[k] ? 1 : 0.45; ctx.stroke(); ctx.globalAlpha = 1;
      if (slots[k]) { ctx.font = `${r * 1.25}px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(slots[k], sx, sy - r * 0.15); }
    });
    ctx.restore();
  }
  function drawItem(it) {
    ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
    if (it.kind === "junk") { // a faint warning halo helps new players learn what to dodge
      ctx.strokeStyle = "rgba(207,79,51,0.45)"; ctx.lineWidth = 2.2 * U; ctx.setLineDash([4 * U, 4 * U]);
      ctx.beginPath(); ctx.arc(0, 0, it.size * 0.78, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    } else if (it.kind === "water") {
      ctx.fillStyle = "rgba(90,169,230,0.18)"; ctx.beginPath(); ctx.arc(0, 0, it.size * 0.78, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = `${it.size * 1.25}px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(it.def.e, 0, it.size * 0.05);
    ctx.restore();
  }
  function draw() {
    const g = G;
    ctx.save();
    if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * g.shake * U, (Math.random() - 0.5) * 6 * g.shake * U);
    drawBg(g.t);
    if (g.t < g.slowUntil) { ctx.fillStyle = "rgba(90,169,230,0.10)"; ctx.fillRect(0, 0, W, H); }
    g.items.forEach(drawItem);
    drawThali(g.p.x, g.p.y, g.p.w, g.p.bump, g.slots);
    g.parts.forEach((p) => { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    g.floats.forEach((f) => {
      ctx.globalAlpha = Math.min(1, 2.2 * (1 - f.t / f.life));
      ctx.font = `${f.big ? 700 : 600} ${(f.big ? 21 : 15) * U}px Figtree, system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    });
    ctx.restore();
  }
  // gentle animated scene behind the menus
  const demo = { items: [] };
  function drawIdle() {
    if (!W) return;
    drawBg(idleT);
    if (demo.items.length < 7 && Math.random() < 0.04) {
      const pool = Math.random() < 0.3 ? JUNK : HEALTHY, d = pool[(Math.random() * pool.length) | 0];
      demo.items.push({ kind: pool === JUNK ? "junk" : "good", def: d, x: 30 + Math.random() * (W - 60), y: -30, vy: (40 + Math.random() * 40) * U, size: 24 * U, rot: 0, vr: (Math.random() - 0.5) * 0.6 });
    }
    demo.items.forEach((it) => { it.y += it.vy / 60; it.rot += it.vr / 60; drawItem(it); });
    demo.items = demo.items.filter((it) => it.y < H + 40);
    drawThali(W / 2, H - 70 * U - 10, 92 * U, 0, { p: "🥚", c: "🍚", v: "🥬" });
  }

  /* ---------- loop ---------- */
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (G && G.running && !G.paused) { update(dt); if (G && G.running) draw(); }
    else { idleT += dt; drawIdle(); }
    raf = requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  const keys = { left: false, right: false };
  function pointer(e) { if (!G || !G.running || G.paused) return; const r = stage.getBoundingClientRect(); G.p.tx = e.clientX - r.left; }
  stage.addEventListener("pointerdown", (e) => { pointer(e); stage.setPointerCapture && stage.setPointerCapture(e.pointerId); });
  stage.addEventListener("pointermove", pointer);
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") { keys.left = true; e.preventDefault(); }
    if (e.key === "ArrowRight" || e.key === "d") { keys.right = true; e.preventDefault(); }
    if ((e.key === "Escape" || e.key === "p") && G && G.running) togglePause();
    if (e.key === " " && !$("screen-start").hidden && !$("btn-play").hidden) { e.preventDefault(); startGame(); }
  });
  addEventListener("keyup", (e) => { if (e.key === "ArrowLeft" || e.key === "a") keys.left = false; if (e.key === "ArrowRight" || e.key === "d") keys.right = false; });
  document.addEventListener("visibilitychange", () => { if (document.hidden && G && G.running && !G.paused) togglePause(); });

  /* ================= screens ================= */
  const screens = ["screen-start", "screen-over", "screen-board", "screen-pause"];
  function show(id) { screens.forEach((s) => ($(s).hidden = s !== id)); }

  function renderChallenge() {
    const ch = challenge();
    const prize = `Top ${CFG.winners || 3} win <b>${esc(CFG.discount || "10% off")}</b>.`;
    let html;
    if (ch.active) html = `<span class="pill">Challenge · day ${ch.day} of ${DAYS}</span><br>Play any time ${ch.startLabel}–${ch.endLabel}. Your best round each day is added up. ${prize}`;
    else html = `<span class="pill">Practice mode</span><br>The next 7-day challenge starts on <b>${ch.nextLabel}</b>. Practise now; scores count from then. ${prize}`;
    if (!API.on) html += `<br><span style="opacity:.75;font-size:12.5px">Scores are saved on this device until the online leaderboard is switched on.</span>`;
    $("challenge-box").innerHTML = html;
  }
  function renderStart() {
    renderChallenge();
    const player = store.get("nc:game:player", null);
    $("reg").hidden = !!player;
    $("who").hidden = !player;
    $("btn-play").hidden = !player;
    if (player) $("who-name").textContent = player.name;
    show("screen-start");
  }

  $("reg").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("reg-name").value.trim().replace(/\s+/g, " "), email = $("reg-email").value.trim().toLowerCase();
    const err = $("reg-err");
    if (name.length < 2) { err.textContent = "Please enter your name."; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) { err.textContent = "Please enter a valid email address so we can reach you if you win."; return; }
    if (!$("reg-consent").checked) { err.textContent = "Please tick the box to agree, so we can save your scores."; return; }
    err.textContent = "";
    store.set("nc:game:player", { name, email });
    renderStart();
    startGame();
  });
  $("btn-change").addEventListener("click", () => {
    store.del("nc:game:player"); store.del(LOCAL_KEY); store.del("nc:game:pending");
    $("reg-name").value = ""; $("reg-email").value = ""; $("reg-consent").checked = false;
    renderStart();
  });

  function startGame() {
    resize();
    G = newGame();
    show(null);
    $("hud").hidden = false; $("btn-pause").hidden = false;
    paintHud();
    if (actx && actx.state === "suspended") actx.resume();
    toast("Catch healthy food · dodge the junk · fill all 3 compartments", 2600);
  }
  $("btn-play").addEventListener("click", startGame);
  $("btn-again").addEventListener("click", startGame);

  function togglePause() {
    if (!G || !G.running) return;
    G.paused = !G.paused;
    if (G.paused) show("screen-pause"); else { show(null); last = performance.now(); }
  }
  $("btn-pause").addEventListener("click", togglePause);
  $("btn-resume").addEventListener("click", togglePause);
  $("btn-quit").addEventListener("click", () => { G.paused = false; endGame(); });

  function weekHTML(w, ch) {
    if (!ch.active && !Object.keys(w).length) return "";
    const cells = [];
    for (let d = 1; d <= DAYS; d++) {
      const cls = [w[d] ? "done" : "", ch.active && d === ch.day ? "today" : "", ch.active && d > ch.day ? "future" : ""].join(" ");
      cells.push(`<div class="day ${cls}">Day ${d}<b>${w[d] ? fmt(w[d]) : ch.active && d > ch.day ? "·" : "–"}</b></div>`);
    }
    const played = Object.values(w).filter((v) => v > 0).length;
    return `<div class="wk-title"><span>Your 7-day challenge · ${played}/${DAYS} days</span><span>Total <b>${fmt(weekTotal(w))}</b></span></div><div class="days">${cells.join("")}</div>`;
  }

  let factIdx = store.get("nc:game:fact", Math.floor(Math.random() * FACTS.length));
  async function endGame() {
    const g = G;
    g.running = false;
    $("hud").hidden = true; $("btn-pause").hidden = true; toastEl.classList.remove("show");
    sfx.over();
    const dur = g.t * 1000;
    const pb = store.get("nc:game:best", 0), isPB = g.score > pb;
    if (isPB) store.set("nc:game:best", g.score);

    $("over-score").textContent = fmt(g.score);
    $("over-stats").innerHTML = [
      isPB && g.score > 0 ? `<span class="best">New personal best!</span>` : `<span>Best ${fmt(Math.max(pb, g.score))}</span>`,
      `<span>${g.plates} balanced plate${g.plates === 1 ? "" : "s"}</span>`,
      `<span>${g.caught} healthy catches</span>`,
      `<span>Top multiplier x${g.maxMult}</span>`,
    ].join("");
    factIdx = (factIdx + 1) % FACTS.length; store.set("nc:game:fact", factIdx);
    $("over-fact").innerHTML = `<b>Did you know?</b>${esc(FACTS[factIdx])}`;
    $("over-saved").textContent = "Saving your score…";
    $("over-week").innerHTML = "";
    show("screen-over");

    await flushPending();
    const res = await submitScore(g.score, dur);
    const ch = challenge();
    if (res.practice) $("over-saved").textContent = `Practice round. The challenge starts on ${ch.nextLabel}.`;
    else if (res.counted === false) $("over-saved").textContent = "This round was played outside the challenge days.";
    else if (res.offline) $("over-saved").textContent = `Saved on this device. We'll upload it when you're back online. Today's best: ${fmt(res.best)}.`;
    else $("over-saved").textContent = `Day ${res.day} best: ${fmt(res.best)} · challenge total: ${fmt(res.total)}.`;
    $("over-week").innerHTML = weekHTML(await getWeek(), ch);
  }

  /* ---------- leaderboard ---------- */
  async function openBoard() {
    const back = G && G.running ? null : $("screen-over").hidden ? "screen-start" : "screen-over";
    if (G && G.running && !G.paused) togglePause();
    show("screen-board");
    $("btn-close-board").onclick = () => { if (G && G.running) show("screen-pause"); else show(back || "screen-start"); };
    const ch = challenge(), season = ch.active || ch.finished ? ch.season : null;
    const player = store.get("nc:game:player", null);
    const list = $("board");
    $("board-sub").textContent = ch.active ? `${ch.startLabel}–${ch.endLabel} challenge · day ${ch.day} of ${DAYS}` : ch.finished ? `Final results · ${ch.startLabel}–${ch.endLabel}` : `Next challenge starts ${ch.nextLabel}`;
    list.innerHTML = `<li class="empty">Loading…</li>`;
    const medal = ["🥇", "🥈", "🥉"];
    const week = await getWeek();
    $("board-week").innerHTML = weekHTML(week, ch);
    if (!API.on || !season) {
      const total = weekTotal(week);
      list.innerHTML = total && player ? `<li class="me"><span class="rk">–</span><span>${esc(player.name)} (you)</span><span class="sc">${fmt(total)}</span></li>` : `<li class="empty">No challenge scores yet.</li>`;
      $("board-note").textContent = !API.on ? "The shared leaderboard isn't switched on yet, so only your own scores on this device are shown." : "The leaderboard opens when the challenge starts.";
      return;
    }
    try {
      const data = await API.rpc("get_leaderboard", { p_season: season, p_email: player ? player.email : null });
      const rows = data.top || [];
      list.innerHTML = rows.length ? rows.map((r) => `<li class="${r.rank <= (CFG.winners || 3) ? "top" : ""}"><span class="rk">${r.rank <= 3 ? medal[r.rank - 1] : "#" + r.rank}</span><span>${esc(r.name)}${r.rank <= (CFG.winners || 3) ? `<span class="tag">On track for 10% off</span>` : ""}</span><span class="sc">${fmt(r.total)}</span></li>`).join("")
        : `<li class="empty">No scores yet. Be the first!</li>`;
      if (data.me && !rows.some((r) => r.is_me)) list.insertAdjacentHTML("beforeend", `<li class="me"><span class="rk">#${data.me.rank}</span><span>You · ${data.me.days} day${data.me.days === 1 ? "" : "s"}</span><span class="sc">${fmt(data.me.total)}</span></li>`);
      $("board-note").textContent = `${fmt(data.players || 0)} players · totals add each day's best round. The top ${CFG.winners || 3} after day ${DAYS} are emailed and get ${CFG.discount || "10% off"}.`;
    } catch (e) {
      list.innerHTML = `<li class="empty">Couldn't load the leaderboard. Check your connection and try again.</li>`;
    }
  }
  $("btn-board").addEventListener("click", openBoard);
  $("btn-board2").addEventListener("click", openBoard);

  /* ---------- go ---------- */
  resize();
  renderStart();
  flushPending();
  raf = requestAnimationFrame(loop);
})();
