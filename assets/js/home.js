(function () {
  const { $, $$, countUp, store } = window.NCUI;
  const { MENU, compute, energySplit } = window.NC;
  const { dishCard, nlabel, r0, r1 } = window.NCRender;
  const { POSTS, covers } = window.NCPosts;

  /* ---------- the readable plate ---------- */
  const stage = $("#plate");
  const C = 2 * Math.PI * 96;
  const img = $(".plate-img img", stage);
  const dots = $(".plate-dots", stage);
  const nameEl = $('[data-v="name"]', stage);
  let idx = MENU.findIndex((m) => m.slug === "egg-chicken-veggie-rice");
  let timer;
  dots.innerHTML = MENU.map((m, i) => `<button aria-label="Show ${m.name}" data-i="${i}"></button>`).join("");
  MENU.forEach((m) => { const p = new Image(); p.src = `assets/img/${m.img}`; }); // preload for smooth swaps

  function showPlate(i, first) {
    idx = i;
    const m = MENU[i], n = m.nutrition, s = m.split, gap = 6;
    let acc = 0;
    ["p", "c", "f"].forEach((k) => {
      const seg = $(`.seg[data-k="${k}"]`, stage);
      seg.style.strokeDasharray = `${Math.max(0, s[k] * C - gap)} ${C}`;
      seg.style.strokeDashoffset = -acc;
      acc += s[k] * C;
    });
    if (!first) {
      img.classList.add("swap"); nameEl.classList.add("swap");
      setTimeout(() => { img.src = `assets/img/${m.img}`; img.alt = m.name; nameEl.innerHTML = `${m.name}<small>৳${m.price}</small>`; img.classList.remove("swap"); nameEl.classList.remove("swap"); }, 450);
    } else nameEl.innerHTML = `${m.name}<small>৳${m.price}</small>`;
    countUp($('[data-v="kcal"]', stage), Math.round(n.kcal));
    countUp($('[data-v="p"]', stage), Math.round(n.p), { suffix: "g" });
    countUp($('[data-v="c"]', stage), Math.round(n.c), { suffix: "g" });
    countUp($('[data-v="f"]', stage), Math.round(n.f), { suffix: "g" });
    $$("button", dots).forEach((b, j) => b.classList.toggle("on", j === i));
  }
  const auto = () => { clearInterval(timer); timer = setInterval(() => showPlate((idx + 1) % MENU.length), 5500); };
  $$(".seg", stage).forEach((s) => (s.style.strokeDasharray = `0 ${C}`));
  dots.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b && +b.dataset.i !== idx) { showPlate(+b.dataset.i); auto(); } });
  stage.addEventListener("mouseenter", () => clearInterval(timer));
  stage.addEventListener("mouseleave", auto);
  setTimeout(() => { showPlate(idx, true); auto(); }, 250);

  /* ---------- healthier swap: same recipe, only the oil changes ---------- */
  const cr = MENU.find((m) => m.slug === "egg-chicken-veggie-rice");
  const heavyRows = cr.ingredients.map((r) => (r.id === "soybean_oil" ? { id: "soybean_oil", amount: 3, unit: "tbsp" } : r));
  const heavy = compute(heavyRows), light = cr.nutrition;
  const sc = $("#swap-card"), sv = (k) => $(`[data-s="${k}"]`, sc);
  sv("heavy-f").textContent = `${r0(heavy.f)} g fat · ${r0((heavy.f * 9 / heavy.kcal) * 100)}% of energy from fat`;
  sv("light-f").textContent = `${r0(light.f)} g fat · ${r0((light.f * 9 / light.kcal) * 100)}% of energy from fat`;
  sc.addEventListener("reveal", () => {
    countUp(sv("heavy-k"), Math.round(heavy.kcal), { suffix: " kcal", duration: 1300 });
    countUp(sv("light-k"), Math.round(light.kcal), { suffix: " kcal", duration: 1300 });
    countUp(sv("save"), Math.round(heavy.kcal - light.kcal), { prefix: "−", suffix: " kcal", duration: 1500 });
    setTimeout(() => { sv("heavy-bar").style.width = "100%"; sv("light-bar").style.width = (light.kcal / heavy.kcal) * 100 + "%"; }, 200);
  });

  /* ---------- how-it-works label ---------- */
  $("#how-label").innerHTML = nlabel(MENU.find((m) => m.slug === "egg-chicken-veggie-rice"));

  /* ---------- stats ---------- */
  $$(".count").forEach((el) => el.closest("[data-reveal]").addEventListener("reveal", () => countUp(el, parseFloat(el.dataset.to), { decimals: +el.dataset.dec, duration: 1700 })));

  /* ---------- menu carousel: one row that slides right to left, one card at a time ---------- */
  const grid = $("#home-menu");
  grid.innerHTML = MENU.map(dishCard).join("");
  const cards = $$(".dish", grid);
  // the carousel reveals as a whole; images load up front so a card never slides in blank
  cards.forEach((el) => { el.removeAttribute("data-reveal"); el.style.removeProperty("--d"); $("img", el).loading = "eager"; });

  const car = $("#dish-carousel");
  const SLIDE_MS = 700, WAIT_MS = 3500;
  let moving = false, hovering = false, focused = false, onScreen = false, timerId = 0, current = "all";
  const shown = () => $$(".dish:not(.hidden)", grid);
  const step = () => { const v = shown(); return v.length ? v[0].offsetWidth + parseFloat(getComputedStyle(grid).columnGap || 0) : 0; };
  const canSlide = () => { const v = shown(); return v.length > 1 && v.length * step() > $(".car-view", car).clientWidth; };

  function settle(fn) { // run fn when the slide finishes (with a fallback if the event never fires)
    let done = false;
    const end = (e) => { if (done || (e && e.target !== grid)) return; done = true; grid.removeEventListener("transitionend", end); fn(); };
    grid.addEventListener("transitionend", end);
    setTimeout(end, SLIDE_MS + 120);
  }
  const place = (x, animate) => { grid.style.transition = animate ? "" : "none"; grid.style.transform = x ? `translate3d(${x}px,0,0)` : ""; };

  function next() {
    if (moving || !canSlide()) return;
    moving = true;
    place(-step(), true);
    settle(() => { grid.appendChild(shown()[0]); place(0, false); void grid.offsetWidth; grid.style.transition = ""; moving = false; });
  }
  function prev() {
    if (moving || !canSlide()) return;
    moving = true;
    const v = shown();
    grid.prepend(v[v.length - 1]);
    place(-step(), false); void grid.offsetWidth;
    place(0, true);
    settle(() => { moving = false; });
  }

  function schedule() {
    clearTimeout(timerId);
    if (hovering || focused || !onScreen || document.hidden || !canSlide()) return;
    timerId = setTimeout(() => { next(); schedule(); }, WAIT_MS);
  }
  function refresh() { car.classList.toggle("static", !canSlide()); schedule(); }

  $(".car-btn.next", car).addEventListener("click", () => { next(); schedule(); });
  $(".car-btn.prev", car).addEventListener("click", () => { prev(); schedule(); });
  car.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hovering = true; schedule(); } });
  car.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hovering = false; schedule(); } });
  car.addEventListener("focusin", (e) => {
    if (!e.target.matches(":focus-visible")) return;
    focused = true;
    const card = e.target.closest(".dish");
    if (card) { // keyboard users: bring the focused card to the front
      place(0, false);
      while (shown()[0] !== card) grid.appendChild(shown()[0]);
    }
    schedule();
  });
  car.addEventListener("focusout", () => { focused = false; schedule(); });
  /* touch screens: the row follows the finger, then settles on the nearest dish */
  const view = $(".car-view", car);
  let drag = null;
  view.addEventListener("touchstart", (e) => {
    if (moving || e.touches.length > 1 || !canSlide()) return;
    drag = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, axis: null, w: 0 };
    clearTimeout(timerId);
  }, { passive: true });
  view.addEventListener("touchmove", (e) => {
    if (!drag) return;
    const dx = e.touches[0].clientX - drag.x, dy = e.touches[0].clientY - drag.y;
    if (!drag.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (drag.axis === "x") { // keep one dish ready on the left so both directions work
        moving = true;
        const v = shown();
        grid.prepend(v[v.length - 1]);
        drag.w = step();
      }
    }
    if (drag.axis !== "x") return; // vertical gesture: let the page scroll
    drag.dx = Math.max(-drag.w, Math.min(drag.w, dx));
    place(-drag.w + drag.dx, false);
  }, { passive: true });
  function release(cancelled) {
    const d = drag;
    drag = null;
    if (!d) return;
    if (d.axis !== "x") { schedule(); return; }
    const dir = cancelled || Math.abs(d.dx) < 40 ? 0 : d.dx < 0 ? 1 : -1;
    grid.style.transition = "transform 0.4s cubic-bezier(0.25, 0.6, 0.3, 1)";
    grid.style.transform = `translate3d(${-d.w * (1 + dir)}px,0,0)`;
    settle(() => {
      for (let i = 0; i <= dir; i++) grid.appendChild(shown()[0]); // dir 1 → move two, 0 → one, -1 → none
      place(0, false); void grid.offsetWidth; grid.style.transition = ""; moving = false;
      schedule();
    });
  }
  view.addEventListener("touchend", () => release(false), { passive: true });
  view.addEventListener("touchcancel", () => release(true), { passive: true });
  document.addEventListener("visibilitychange", schedule);
  addEventListener("resize", () => { if (!moving) place(0, false); refresh(); });
  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; schedule(); }, { threshold: 0.25 }).observe(car);

  const bar = $(".filter-bar"), pill = $(".pill", bar);
  const movePill = (btn) => { pill.style.left = btn.offsetLeft + "px"; pill.style.width = btn.offsetWidth + "px"; };
  function filter(f) {
    if (f === current) return;
    current = f;
    clearTimeout(timerId);
    car.classList.add("swapping");
    setTimeout(() => {
      place(0, false);
      cards.forEach((el) => { grid.appendChild(el); el.classList.toggle("hidden", !(f === "all" || el.dataset.meal === f)); });
      moving = false;
      car.classList.remove("swapping");
      refresh();
    }, 300);
  }
  $$("button", bar).forEach((b) => b.addEventListener("click", () => { $$("button", bar).forEach((x) => x.classList.remove("on")); b.classList.add("on"); movePill(b); filter(b.dataset.f); }));
  const syncPill = () => movePill($("button.on", bar));
  requestAnimationFrame(syncPill); addEventListener("load", syncPill); addEventListener("resize", syncPill);
  if (document.fonts) document.fonts.ready.then(syncPill);
  refresh();
  addEventListener("load", refresh);

  /* ---------- plates ---------- */
  const PLATES = [
    { name: "Light", tone: "var(--carb)", split: [0.22, 0.56, 0.22], text: "Lower in energy and high in fibre and freshness. For mornings and lighter appetites.", who: "Good before an exam or a long seminar." },
    { name: "Balanced", tone: "var(--protein)", split: [0.25, 0.5, 0.25], text: "Rice or potato, a measured protein and vegetables in sensible proportions.", who: "Your everyday plate between classes." },
    { name: "High-Protein", tone: "var(--fat)", split: [0.3, 0.45, 0.25], text: "Two protein sources, or a bigger portion of fish or chicken, with rice and vegetables.", who: "For long lab days, sport or training." },
  ];
  const ring = (sp) => {
    const c = 2 * Math.PI * 34, cols = ["var(--protein)", "var(--carb)", "var(--fat)"];
    let acc = 0;
    return `<svg class="ring-ico" viewBox="0 0 84 84"><g transform="rotate(-90 42 42)">${sp.map((v, i) => { const s = `<circle cx="42" cy="42" r="34" fill="none" stroke="${cols[i]}" stroke-width="9" stroke-dasharray="${v * c - 3} ${c}" stroke-dashoffset="${-acc}"/>`; acc += v * c; return s; }).join("")}</g></svg>`;
  };
  $("#plates").innerHTML = PLATES.map((p, i) => `<div class="plate-card" style="--tone:${p.tone};--d:${i * 0.08}s" data-reveal>${ring(p.split)}
      <h3>${p.name}</h3><p>${p.text}</p><p class="who">${p.who}</p>
      <div class="dl">${MENU.filter((m) => m.plate === p.name).map((d) => `<a href="menu/${d.slug}.html">${d.name}<span>৳${d.price}</span></a>`).join("")}</div></div>`).join("");

  /* ---------- plate builder ---------- */
  const B = { rice: 200, prot: "chicken", veg: 100, oil: 2 };
  const PROT = {
    none: { rows: [], label: "none" },
    egg: { rows: [{ id: "egg", amount: 1, unit: "piece" }], label: "1 egg" },
    chicken: { rows: [{ id: "chicken_bonein", amount: 125, unit: "g" }], label: "125 g, bone-in" },
    rohu: { rows: [{ id: "rohu_steak", amount: 150, unit: "g" }], label: "150 g steak" },
    dal: { rows: [{ id: "masoor_cooked", amount: 200, unit: "g" }], label: "1 cup, cooked" },
    chola: { rows: [{ id: "chickpea_boiled", amount: 100, unit: "g" }], label: "100 g, boiled" },
  };
  const spoons = $("#spoons");
  const SPOON = '<svg viewBox="0 0 26 26"><ellipse class="bowl" cx="9" cy="9" rx="6" ry="4.6" transform="rotate(-45 9 9)"/><path class="handle" d="M13 13l9 9" stroke-linecap="round"/></svg>';
  spoons.innerHTML = Array.from({ length: 6 }, (_, i) => `<button type="button" class="spoon" data-n="${i + 1}" aria-label="${i + 1} teaspoon${i ? "s" : ""} of oil">${SPOON}</button>`).join("");
  spoons.addEventListener("click", (e) => {
    const b = e.target.closest(".spoon"); if (!b) return;
    const n = +b.dataset.n;
    B.oil = B.oil === n ? n - 1 : n;
    b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
    buildPlate();
  });
  $$(".seg[data-g]").forEach((g) => g.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("button", g).forEach((x) => x.classList.toggle("on", x === b));
    const k = g.dataset.g;
    B[k] = k === "prot" ? b.dataset.v : +b.dataset.v;
    buildPlate();
  }));

  function plateRows() {
    const rows = [];
    if (B.rice) rows.push({ id: "rice_cooked", amount: B.rice, unit: "g" });
    rows.push(...PROT[B.prot].rows);
    if (B.veg) rows.push({ id: "mixed_veg", amount: B.veg, unit: "g" });
    if (B.prot !== "none" || B.veg) rows.push({ id: "onion", amount: 20, unit: "g" }, { id: "spice_mix", amount: 3, unit: "g" });
    if (B.oil) rows.push({ id: "soybean_oil", amount: B.oil, unit: "tsp" });
    return rows;
  }
  const out = (k) => $(`[data-o="${k}"]`);
  function buildPlate() {
    const rows = plateRows(), t = compute(rows), sp = energySplit(t);
    const oilK = compute([{ id: "soybean_oil", amount: B.oil, unit: "tsp" }]).kcal;
    $$(".spoon", spoons).forEach((s) => s.classList.toggle("on", +s.dataset.n <= B.oil));
    out("rice-l").textContent = B.rice ? `${B.rice} g cooked` : "none";
    out("prot-l").textContent = PROT[B.prot].label;
    out("veg-l").textContent = B.veg ? `${B.veg} g` : "none";
    out("oil-l").textContent = `${B.oil} tsp · ${r0(oilK)} kcal`;
    countUp(out("kcal"), Math.round(t.kcal), { duration: 600 });
    countUp(out("p"), Math.round(t.p), { suffix: " g", duration: 600 });
    countUp(out("c"), Math.round(t.c), { suffix: " g", duration: 600 });
    countUp(out("f"), Math.round(t.f), { suffix: " g", duration: 600 });
    countUp(out("fib"), Math.round(t.fib), { suffix: " g", duration: 600 });
    out("sp").style.flexGrow = sp.p || 0.001; out("sc").style.flexGrow = sp.c || 0.001; out("sf").style.flexGrow = sp.f || 0.001;

    let msg;
    const oilShare = t.kcal ? oilK / t.kcal : 0;
    if (!t.kcal) msg = "An empty plate! Choose some rice, a protein or vegetables.";
    else if (oilShare >= 0.3) msg = `Oil is <b>${r0(oilShare * 100)}%</b> of this plate's energy. ${B.oil} teaspoons add ${r0(oilK)} kcal - about the same as ${r0(oilK / 1.09)} g of cooked rice.`;
    else if (t.p < 15) msg = `Only <b>${r0(t.p)} g of protein</b>. Adding an egg, thick dal or a piece of fish would make this plate keep you full for longer.`;
    else if (B.rice >= 300) msg = `A heaped plate of rice adds about <b>${r0(compute([{ id: "rice_cooked", amount: 100, unit: "g" }]).kcal)} kcal</b> over a standard one. Vegetables are a cheaper way to fill up.`;
    else if (t.fib < 5) msg = `Just <b>${r1(t.fib)} g of fibre</b>. A side of vegetables, dal or chola would add more.`;
    else msg = `A well-balanced plate: <b>${r0(sp.p * 100)}%</b> of its energy from protein and <b>${r0(sp.f * 100)}%</b> from fat. Each extra teaspoon of oil adds about 40 kcal.`;
    const ins = out("insight");
    ins.style.opacity = 0;
    setTimeout(() => { ins.innerHTML = msg; ins.style.opacity = 1; }, 180);
  }
  buildPlate();
  $("#to-calc").addEventListener("click", () => {
    try { sessionStorage.setItem("nc:handoff", JSON.stringify({ name: "My campus plate", servings: 1, method: "curry", keep: 100, rows: plateRows(), preset: "" })); } catch (e) {}
  });

  /* ---------- posts ---------- */
  $("#home-posts").innerHTML = POSTS.map((p, i) => `<a class="post-card" href="journal/${p.slug}.html" data-reveal style="--d:${i * 0.08}s">
    <div class="post-cover">${covers[p.cover]()}</div>
    <div class="post-meta"><span>${p.tag}</span><span>${p.read}</span></div>
    <h3>${p.title}</h3><p>${p.excerpt}</p></a>`).join("");

  /* ---------- FAQ accordion (one open at a time) ---------- */
  $("#faq").addEventListener("click", (e) => {
    const b = e.target.closest(".faq-item > button"); if (!b) return;
    const item = b.parentElement, open = !item.classList.contains("open");
    $$(".faq-item", $("#faq")).forEach((x) => { x.classList.remove("open"); $("button", x).setAttribute("aria-expanded", "false"); });
    if (open) { item.classList.add("open"); b.setAttribute("aria-expanded", "true"); }
  });
})();
