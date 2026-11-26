(function () {
  const { $, $$, countUp, donutSVG, animateDonut, toast, store, esc } = window.NCUI;
  const { INGREDIENTS, MENU, HOME, METHODS, DV, compute, energySplit } = window.NC;
  const { r0, r1 } = window.NCRender;
  const KEY = "nc:calc2";
  const UNIT = { g: "g", kg: "kg", ml: "ml", tsp: "tsp", tbsp: "tbsp", piece: "piece", cup: "cup" };
  const TONE = {
    "Grains & breads": "#e09a2d", "Pulses": "#a2643a", "Eggs, meat & fish": "#cf4f33", "Dairy": "#6f93a8",
    "Vegetables & herbs": "#237a5b", "Fruit": "#e07a5f", "Oils & fats": "#c99a1e", "Nuts, seeds & spices": "#8c9f45",
  };
  const ALL = Object.values(INGREDIENTS);
  $("#ing-count").textContent = ALL.length;

  let state = { name: "", servings: 1, method: "curry", keep: 100, rows: [], preset: "" };

  /* ---------- presets ---------- */
  const starts = $("#starts");
  starts.innerHTML = `<span class="grp">Nutri Café dishes</span>` + MENU.map((m) => `<button type="button" data-p="${m.slug}">${m.name}</button>`).join("")
    + `<span class="grp">Home cooking</span>` + HOME.map((h) => `<button type="button" data-p="${h.id}">${h.name}</button>`).join("");
  starts.addEventListener("click", (e) => { const b = e.target.closest("button[data-p]"); if (b) loadPreset(b.dataset.p); });

  function loadPreset(p) {
    const m = MENU.find((x) => x.slug === p), h = HOME.find((x) => x.id === p);
    if (m) state = { name: m.name, servings: 1, method: "curry", keep: 100, rows: m.ingredients.map((r) => ({ ...r })), preset: p };
    else if (h) { const mt = METHODS.find((x) => x.id === h.method); state = { name: h.name, servings: h.servings, method: h.method, keep: mt.keep, rows: h.rows.map((r) => ({ ...r })), preset: p }; }
    else state = { name: "", servings: 1, method: "curry", keep: 100, rows: [], preset: "" };
    syncInputs(); renderRows(); update();
  }
  function markPreset() { $$("button", starts).forEach((b) => b.classList.toggle("on", b.dataset.p === state.preset)); }
  function dirty() { if (state.preset) { state.preset = ""; markPreset(); } }

  /* ---------- dish name & servings ---------- */
  $("#rname").addEventListener("input", (e) => { state.name = e.target.value; dirty(); save(); refreshLabel(); });
  const sv = $("#servings");
  sv.addEventListener("input", () => { state.servings = Math.min(50, Math.max(1, parseInt(sv.value) || 1)); update(); });
  sv.addEventListener("change", () => (sv.value = state.servings));
  $$("[data-sv]").forEach((b) => b.addEventListener("click", () => { state.servings = Math.min(50, Math.max(1, state.servings + +b.dataset.sv)); sv.value = state.servings; update(); }));
  $("#clear").addEventListener("click", () => { loadPreset(""); $("#q").focus(); });

  /* ---------- cooking method ---------- */
  const ICON = {
    boiled: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 14h20v8a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z"/><path d="M3 14h26M12 5c-1 2 1 3 0 5M17 4c-1 2 1 3 0 5M22 5c-1 2 1 3 0 5"/></svg>',
    curry: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 15h24a12 10 0 0 1-24 0z"/><path d="M11 21c2 1.5 8 1.5 10 0M10 6c-1 2 1 3 0 5M16 5c-1 2 1 3 0 5M22 6c-1 2 1 3 0 5"/></svg>',
    stirfry: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 16h20a10 8 0 0 1-20 0z"/><path d="M23 17l6-3M9 11l2-3M14 10l1-4M19 11l2-3"/></svg>',
    shallow: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 18h20v2a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M23 19h7"/><ellipse cx="13" cy="15" rx="6" ry="2"/></svg>',
    deep: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M16 4c-5 7-7 10-7 14a7 7 0 0 0 14 0c0-4-2-7-7-14z"/><path d="M13 19c0-2 1-4 2-5"/></svg>',
  };
  $("#methods").innerHTML = METHODS.map((m) => `<button type="button" class="method-btn" data-m="${m.id}">${ICON[m.id]}${m.name}<small>${m.keep}% kept</small></button>`).join("");
  $("#methods").addEventListener("click", (e) => {
    const b = e.target.closest(".method-btn"); if (!b) return;
    const m = METHODS.find((x) => x.id === b.dataset.m);
    state.method = m.id; state.keep = m.keep; dirty(); syncInputs(); update();
  });
  $("#keep").addEventListener("input", (e) => { state.keep = +e.target.value; dirty(); update(); });

  function syncInputs() {
    const a = document.activeElement;
    if (a !== $("#rname")) $("#rname").value = state.name;
    if (a !== sv) sv.value = state.servings;
    $("#keep").value = state.keep;
    $$(".method-btn").forEach((b) => b.classList.toggle("on", b.dataset.m === state.method));
    markPreset();
  }

  /* ---------- search ---------- */
  const q = $("#q"), results = $("#results");
  let hits = [], act = 0;
  const norm = (s) => s.toLowerCase();
  function search(text) {
    const t = norm(text.trim());
    if (!t) return ["rice_cooked", "masoor_cooked", "egg", "chicken_bonein", "rohu", "potato", "mixed_veg", "onion", "soybean_oil", "spice_mix"].map((id) => INGREDIENTS[id]);
    const scored = ALL.map((i) => {
      const n = norm(i.name), hay = n + " " + i.bn + " " + i.id.replace(/_/g, " ") + " " + norm(i.cat);
      // every typed word must appear somewhere (name, Bangla name, id or category), in any order
      const words = t.split(/[\s,()/]+/).filter(Boolean);
      const nameWords = n.split(/[\s(,/)-]+/);
      let s = -1;
      if (n.startsWith(t) || i.bn.startsWith(text.trim())) s = 3;
      else if (words.length && words.every((w) => nameWords.some((x) => x.startsWith(w)))) s = 2;
      else if (words.length && words.every((w) => hay.includes(w))) s = 1;
      return [s, i];
    }).filter(([s]) => s > 0);
    scored.sort((a, b) => b[0] - a[0] || a[1].name.length - b[1].name.length);
    return scored.slice(0, 12).map(([, i]) => i);
  }
  function showResults() {
    hits = search(q.value); act = 0;
    results.innerHTML = hits.length ? hits.map((i, k) => `<div class="r-item ${k === 0 ? "act" : ""}" role="option" data-id="${i.id}">
      <i style="background:${TONE[i.cat]}"></i><div><b>${esc(i.name)}</b><small>${i.bn} · ${i.cat} · ${i.fct ? "Bangladesh table" : "USDA"}</small></div><span class="k">${i.kcal} kcal/100 g</span></div>`).join("")
      : `<div class="r-empty">No match for “${esc(q.value)}”. Try another spelling or a Bangla name.</div>`;
    results.classList.add("open");
  }
  function closeResults() { results.classList.remove("open"); }
  q.addEventListener("focus", showResults);
  q.addEventListener("input", showResults);
  q.addEventListener("keydown", (e) => {
    const items = $$(".r-item", results);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      act = (act + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((x, k) => x.classList.toggle("act", k === act));
      items[act] && items[act].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") { e.preventDefault(); if (hits[act]) { add(hits[act].id); q.value = ""; showResults(); } }
    else if (e.key === "Escape") { closeResults(); q.blur(); }
  });
  results.addEventListener("mousedown", (e) => { const it = e.target.closest(".r-item"); if (it) { e.preventDefault(); add(it.dataset.id); q.value = ""; closeResults(); q.blur(); } });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) closeResults(); });
  document.addEventListener("keydown", (e) => { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); } });

  $("#quick").innerHTML = ["rice_cooked", "masoor_cooked", "egg", "chicken_bonein", "rohu", "mixed_veg", "potato", "onion", "soybean_oil", "mustard_oil", "spice_mix", "salt"]
    .map((id) => `<button type="button" data-add="${id}">+ ${INGREDIENTS[id].name.split(/[,(]/)[0].trim()}</button>`).join("");
  $("#quick").addEventListener("click", (e) => { const b = e.target.closest("[data-add]"); if (b) add(b.dataset.add); });

  /* ---------- rows ---------- */
  const rowsEl = $("#rows");
  function defaults(ing) {
    const u = Object.keys(ing.units);
    if (ing.id === "salt") return { amount: 0.5, unit: "tsp" };
    if (ing.oil && u.includes("tbsp")) return { amount: 1, unit: "tbsp" };
    if (ing.cat === "Nuts, seeds & spices" && u.includes("tsp")) return { amount: 1, unit: "tsp" };
    if (u[0] === "piece") return { amount: 1, unit: "piece" };
    return { amount: 100, unit: u.includes("g") ? "g" : u[0] };
  }
  function add(id) {
    const exist = state.rows.findIndex((r) => r.id === id);
    if (exist > -1) {
      const el = $$(".ing-item", rowsEl)[exist];
      el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      $("input", el).focus(); $("input", el).select();
      toast(`${INGREDIENTS[id].name.split(/[,(]/)[0]} is already in - adjust the amount`);
      return;
    }
    const r = { id, ...defaults(INGREDIENTS[id]) };
    state.rows.push(r); dirty();
    rowsEl.insertAdjacentHTML("beforeend", rowHTML(r));
    const el = rowsEl.lastElementChild;
    update();
    const inp = $("input", el); inp.focus({ preventScroll: true }); inp.select();
  }
  function rowHTML(r) {
    const ing = INGREDIENTS[r.id];
    const units = Object.keys(ing.units).map((u) => `<option value="${u}" ${u === r.unit ? "selected" : ""}>${UNIT[u]}</option>`).join("");
    return `<div class="ing-item">
      <span class="tone" style="background:${TONE[ing.cat]}"></span>
      <div class="nm"><b title="${esc(ing.name)}">${esc(ing.name)}</b><small>${ing.bn} · <span class="g"></span></small></div>
      <input type="number" min="0" step="any" value="${r.amount}" aria-label="Amount of ${esc(ing.name)}">
      <select aria-label="Unit">${units}</select>
      <span class="kc">0<small>kcal</small></span>
      <button class="rm" type="button" aria-label="Remove ${esc(ing.name)}"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>`;
  }
  function renderRows() {
    rowsEl.innerHTML = state.rows.map(rowHTML).join("");
    $$(".ing-item", rowsEl).forEach((el, i) => (el.style.animationDelay = i * 0.035 + "s"));
  }
  rowsEl.addEventListener("input", (e) => {
    const el = e.target.closest(".ing-item"); if (!el) return;
    const r = state.rows[$$(".ing-item", rowsEl).indexOf(el)];
    if (e.target.tagName === "INPUT") r.amount = Math.max(0, parseFloat(e.target.value) || 0);
    else r.unit = e.target.value;
    dirty(); update();
  });
  rowsEl.addEventListener("change", (e) => { if (e.target.tagName === "SELECT") rowsEl.dispatchEvent(new Event("input")); });
  rowsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".rm"); if (!b) return;
    const el = b.closest(".ing-item"), i = $$(".ing-item", rowsEl).indexOf(el);
    state.rows.splice(i, 1); dirty();
    el.classList.add("out");
    setTimeout(() => { el.remove(); update(); }, 360);
  });

  /* ---------- results ---------- */
  const tabs = $(".r-tabs"), tabPill = $(".pill", tabs);
  const movePill = () => { const b = $("button.on", tabs); tabPill.style.left = b.offsetLeft + "px"; tabPill.style.width = b.offsetWidth + "px"; };
  $$("button", tabs).forEach((b) => b.addEventListener("click", () => {
    $$("button", tabs).forEach((x) => x.classList.toggle("on", x === b)); movePill();
    $$(".r-pane").forEach((p) => p.classList.toggle("on", p.dataset.pane === b.dataset.tab));
  }));
  requestAnimationFrame(movePill); addEventListener("load", movePill); addEventListener("resize", movePill);

  let last = null, firstDonut = true;
  function update() {
    const keep = state.keep / 100;
    const m = METHODS.find((x) => x.id === state.method);
    $("#keep-val").textContent = state.keep + "%";
    $("#keep-hint").textContent = state.keep === m.keep
      ? { boiled: "Anything you add to boiled or steamed food is eaten.", curry: "Curries and bhuna keep almost all of their oil.", stirfry: "Stir-fries keep nearly all of their oil.", shallow: "Some oil stays behind in the pan.", deep: "Enter all the oil in the pan - food absorbs only part of it (typically 8–25% of its own weight)." }[m.id]
      : "Adjusted by hand. Pick a method above to reset it.";

    const per = state.rows.map((r) => ({ r, t: compute([r], { oilRetention: keep }) }));
    $$(".ing-item", rowsEl).forEach((el, i) => {
      const p = per[i]; if (!p) return;
      $(".kc", el).innerHTML = `${r0(p.t.kcal)}<small>kcal</small>`;
      const ing = INGREDIENTS[p.r.id];
      $(".g", el).textContent = (p.r.unit === "g" ? `${r0(ing.kcal)} kcal/100 g` : `= ${r0(p.t.grams)} g`) + (ing.fct ? " · BD table" : " · USDA");
    });

    const t = compute(state.rows, { oilRetention: keep });
    const n = state.servings || 1;
    const s = { kcal: t.kcal / n, p: t.p / n, c: t.c / n, f: t.f / n, fib: t.fib / n, sat: t.sat / n, na: t.na / n, sug: t.sug / n, g: t.grams / n };
    const sp = energySplit(t);
    last = { t, s, sp, per };

    $("#ing-total").textContent = state.rows.length ? `${state.rows.length} item${state.rows.length > 1 ? "s" : ""} · ${r0(t.grams)} g in the pot` : "";
    if (!state.rows.length) rowsEl.innerHTML = `<div class="ing-empty"><b>Nothing in the pot yet</b>Search above, tap a quick-add, or start from an example.</div>`;
    else { const em = $(".ing-empty", rowsEl); if (em) em.remove(); }

    countUp($("#r-kcal"), Math.round(s.kcal), { duration: 650 });
    const bk = $("#bar-kcal"); if (bk) { bk.textContent = `${r0(s.kcal)} kcal`; $("#bar-sub").textContent = `Per serving · ${r0(s.p)} g protein`; }
    $("#r-per").textContent = `${n} serving${n > 1 ? "s" : ""} · about ${r0(s.g)} g of ingredients each`;

    const has = t.kcal > 0;
    $("#r-donut").innerHTML = donutSVG([{ v: sp.p || 1e-4, color: "#5fbf95" }, { v: sp.c || 1e-4, color: "#e09a2d" }, { v: sp.f || 1e-4, color: "#f07a5a" }], 70, 16)
      + `<div class="center"><b>${has ? r0(s.p) + "g" : "–"}</b><span>protein</span></div>`;
    if (firstDonut) { firstDonut = false; setTimeout(() => animateDonut($("#r-donut")), 350); } else animateDonut($("#r-donut"));

    $("#r-macros").innerHTML = [["Protein", s.p, sp.p, "#5fbf95", 60], ["Carbs", s.c, sp.c, "#e09a2d", 120], ["Fat", s.f, sp.f, "#f07a5a", 45], ["Fibre", s.fib, null, "#b6c97c", 15]].map(([nm, g, sh, col, max]) =>
      `<div class="macro-item"><div class="top"><span><i style="background:${col}"></i>${nm}</span><span><b>${r1(g)} g</b>${sh != null && has ? `<small>${r0(sh * 100)}%</small>` : ""}</span></div>
       <div class="bar"><i style="width:${Math.min(100, (g / max) * 100).toFixed(1)}%;background:${col}"></i></div></div>`).join("");

    const top = per.filter((x) => x.t.kcal > 0).sort((a, b) => b.t.kcal - a.t.kcal).slice(0, 4);
    $("#r-drivers").innerHTML = top.length ? top.map((x) => `<div class="driver"><span>${esc(INGREDIENTS[x.r.id].name.split(/[,(]/)[0])}</span><span>${r0((x.t.kcal / t.kcal) * 100)}%</span>
      <div class="bar"><i style="width:${((x.t.kcal / t.kcal) * 100).toFixed(1)}%"></i></div></div>`).join("") : `<div class="driver"><span style="color:#a3bcaa">Add ingredients to see this.</span></div>`;

    const notes = [];
    if (!has) notes.push(["#a3bcaa", "Add ingredients to see an estimate."]);
    else {
      const pp = sp.p * 100, cp = sp.c * 100, fp = sp.f * 100;
      notes.push(pp < 10 ? ["#e09a2d", `Protein gives ${r0(pp)}% of energy - below the usual 10–35%. An egg, dal or fish would lift it.`] : ["#5fbf95", `Protein gives ${r0(pp)}% of energy - inside the usual 10–35% range.`]);
      notes.push(fp > 35 ? ["#f07a5a", `Fat gives ${r0(fp)}% of energy - above 35%. Each tablespoon of oil you remove saves about 120 kcal.`] : fp > 30 ? ["#e09a2d", `Fat gives ${r0(fp)}% of energy. WHO suggests under 30% across the whole day.`] : ["#5fbf95", `Fat gives ${r0(fp)}% of energy - within WHO's under-30% guidance.`]);
      if (cp > 65) notes.push(["#e09a2d", `Carbohydrate gives ${r0(cp)}% of energy. Swapping some rice for vegetables or dal balances it.`]);
      notes.push(s.fib >= 8 ? ["#5fbf95", `${r1(s.fib)} g fibre - a strong share of the 25–30 g daily target.`] : ["#e09a2d", `${r1(s.fib)} g fibre. Vegetables, dal, chola and shak add more.`]);
    }
    $("#r-balance").innerHTML = notes.map(([c, x]) => `<div><i style="background:${c}"></i><span>${x}</span></div>`).join("");

    $("#r-table").innerHTML = [["Energy", s.kcal, t.kcal, DV.kcal, "kcal", 0], ["Protein", s.p, t.p, DV.p, "g", 1], ["Carbohydrate", s.c, t.c, DV.c, "g", 1], ["Fat", s.f, t.f, DV.f, "g", 1], ["Saturated fat", s.sat, t.sat, DV.sat, "g", 1], ["Fibre", s.fib, t.fib, DV.fib, "g", 1], ["Sodium", s.na, t.na, DV.na, "mg", 0], ["Free sugars", s.sug, t.sug, DV.sug, "g", 1]]
      .map(([nm, a, b, dv, u, d]) => `<tr><td>${nm}</td><td class="r">${d ? r1(a) : r0(a)} ${u}</td><td class="r">${d ? r1(b) : r0(b)} ${u}</td><td class="r">${r0((a / dv) * 100)}%</td></tr>`).join("");

    // sanity warnings
    const w = [];
    if (s.g > 1500) w.push(`That's about ${r0(s.g)} g per serving - did you mean more servings?`);
    if (state.method === "deep" && !state.rows.some((r) => INGREDIENTS[r.id].oil)) w.push("Deep-fry is selected but no oil has been added. Add the oil in the pan to estimate what gets absorbed.");
    if (state.rows.some((r) => r.id === "rice_raw") && state.rows.some((r) => r.id === "rice_cooked")) w.push("Both raw and cooked rice are listed - count rice only once, either raw or cooked.");
    $("#warn").innerHTML = w.join("<br>"); $("#warn").classList.toggle("show", !!w.length);

    refreshLabel();
    if (window.NCHealth) window.NCHealth.render($("#health"), { s, rows: state.rows, ings: INGREDIENTS, method: state.method, keep: state.keep, servings: n });
    syncInputs();
    save();
    fitSticky();
  }

  /* smaller screens: a floating bar keeps the per-serving result in reach while editing */
  const bar = document.createElement("div");
  bar.className = "sticky-bar";
  bar.innerHTML = `<div><small id="bar-sub">Per serving</small><b id="bar-kcal">0 kcal</b></div><button class="btn light" type="button">See results <span class="arrow">↓</span></button>`;
  document.body.appendChild(bar);
  let cardVisible = false;
  const syncBar = () => {
    const show = matchMedia("(max-width: 1100px)").matches && !cardVisible && scrollY > 300;
    bar.classList.toggle("show", show); document.body.classList.toggle("has-bar", show);
  };
  new IntersectionObserver(([e]) => { cardVisible = e.isIntersecting; syncBar(); }, { threshold: 0.15 }).observe($(".result-card"));
  addEventListener("scroll", syncBar, { passive: true });
  $("button", bar).addEventListener("click", () => {
    const card = $(".result-card");
    if (window.__lenis) window.__lenis.scrollTo(card, { offset: -90, duration: 1 }); else card.scrollIntoView({ behavior: "smooth" });
  });

  // when the results card is taller than the window, pin it by its bottom edge so its buttons stay reachable
  function fitSticky() { const aside = $("aside.sticky"); aside.style.top = Math.min(110, innerHeight - aside.offsetHeight - 24) + "px"; }
  addEventListener("resize", fitSticky);
  $$(".r-tabs button").forEach((b) => b.addEventListener("click", () => setTimeout(fitSticky, 50)));

  function refreshLabel() {
    if (!last) return;
    const { s } = last;
    const row = (nm, v, dv, c) => `<div class="nl-row"><span class="sw" style="background:${c}"></span><span>${nm} <b>${r1(v)} g</b></span><span></span><span class="pct">${r0((v / dv) * 100)}%</span></div>`;
    $("#r-label").innerHTML = `<div class="nlabel">
      <div class="nl-brand"><span>Nutrition estimate</span><span>${METHODS.find((x) => x.id === state.method).name}</span></div>
      <div class="nl-title">${esc(state.name || "My dish")}</div>
      <div class="nl-sub">1 of ${state.servings} serving${state.servings > 1 ? "s" : ""} · about ${r0(s.g)} g of ingredients</div>
      <div class="nl-kcal"><span>Calories</span><b>${r0(s.kcal)}</b></div>
      <div class="nl-dv">% Daily value*</div>
      ${row("Protein", s.p, DV.p, "var(--protein)")}${row("Carbohydrate", s.c, DV.c, "var(--carb)")}${row("Total fat", s.f, DV.f, "var(--fat)")}${row("Dietary fibre", s.fib, DV.fib, "var(--fibre)")}
      <p class="nl-foot">*2,000 kcal adult reference diet. Calculated with the Nutri Café nutrition calculator; not a laboratory analysis.</p></div>`;
  }

  // Privacy: calculations live only in this page's memory. Nothing is stored, so closing or
  // leaving the page forgets them, and nothing ever leaves the visitor's browser.
  function save() {}
  try { localStorage.removeItem("nc:calc2"); localStorage.removeItem("nc:calc"); } catch (e) {} // clear drafts saved by older versions

  $("#copy").addEventListener("click", async () => {
    if (!last || !last.t.kcal) { toast("Add some ingredients first"); return; }
    const { s } = last;
    const txt = [
      `${state.name || "My dish"} - per serving (${state.servings} serving${state.servings > 1 ? "s" : ""}, ${METHODS.find((x) => x.id === state.method).name.toLowerCase()})`,
      `Energy ${r0(s.kcal)} kcal · Protein ${r1(s.p)} g · Carbs ${r1(s.c)} g · Fat ${r1(s.f)} g · Fibre ${r1(s.fib)} g`,
      "Ingredients: " + state.rows.map((r) => `${INGREDIENTS[r.id].name} ${r.amount} ${UNIT[r.unit]}`).join("; "),
      "Estimated with the Nutri Café nutrition calculator.",
    ].join("\n");
    try { await navigator.clipboard.writeText(txt); toast("Summary copied - paste it anywhere"); } catch (e) { toast("Copy isn't available in this browser"); }
  });

  /* ---------- start: ?dish= link → hand-off from home builder → saved draft → default ---------- */
  const qp = new URLSearchParams(location.search).get("dish");
  // one-time hand-off from the home page "Build a plate" button (read once, then deleted)
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem("nc:handoff") || "null"); sessionStorage.removeItem("nc:handoff"); } catch (e) {}
  if (qp && (MENU.some((m) => m.slug === qp) || HOME.some((h) => h.id === qp))) loadPreset(qp);
  // restore the visitor's own draft only if it has ingredients; an empty "Start blank" pot opens on the example instead
  else if (saved && Array.isArray(saved.rows) && saved.rows.length > 0 && saved.rows.every((r) => INGREDIENTS[r.id])) { state = Object.assign(state, saved); syncInputs(); renderRows(); update(); }
  else loadPreset("chicken-egg-salad");
})();
