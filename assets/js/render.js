/* Reusable render helpers for dishes and labels */
(function () {
  const { MENU, DV } = window.NC;
  const R = window.NCUI.ROOT;
  const r0 = (n) => Math.round(n);
  const r1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const plateClass = (p) => (p === "Light" ? "light" : p === "Balanced" ? "balanced" : "protein");

  function macroBar(m) {
    const s = m.split;
    return `<div class="macro-bar" aria-hidden="true"><i style="width:${(s.p * 100).toFixed(1)}%;background:var(--protein)"></i><i style="width:${(s.c * 100).toFixed(1)}%;background:var(--carb)"></i><i style="width:${(s.f * 100).toFixed(1)}%;background:var(--fat)"></i></div>`;
  }

  function dishCard(m, i = 0) {
    const n = m.nutrition;
    return `<article class="dish" data-meal="${m.meal}" data-reveal style="--d:${(i % 3) * 0.08}s">
      <div class="dish-media"><img src="${R}assets/img/${m.img}" alt="${m.name}" loading="lazy">
        <span class="chip ${plateClass(m.plate)}"><span class="dot"></span>${m.plate} plate</span>
        <span class="dish-price">৳${m.price}</span></div>
      <div class="dish-body">
        <span class="dish-meal">${m.meal}</span>
        <h3>${m.name}</h3><span class="bn">${m.bn}</span>
        <p class="blurb">${m.blurb}</p>
        <div class="macro-strip">
          <div><b>${r0(n.kcal)}</b>kcal</div><div><b>${r0(n.p)}g</b>protein</div><div><b>${r0(n.c)}g</b>carbs</div><div><b>${r0(n.f)}g</b>fat</div>
        </div>
        ${macroBar(m)}
        <span class="view">Ingredients &amp; full label <span>→</span></span>
      </div>
      <a class="go" href="${R}menu/${m.slug}.html" aria-label="${m.name} - ingredients and nutrition"></a>
    </article>`;
  }

  // decorative QR-like block (placeholder until real QR codes are generated)
  function qr(seed = 7) {
    let s = seed, cells = "";
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
      const finder = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
      if (finder) continue;
      if (rnd() > 0.52) cells += `<rect x="${x * 4}" y="${y * 4}" width="4" height="4"/>`;
    }
    const f = (x, y) => `<rect x="${x}" y="${y}" width="12" height="12" fill="none" stroke="#15261f" stroke-width="2.4" transform="translate(1.2 1.2) scale(.8)"/><rect x="${x + 3.5}" y="${y + 3.5}" width="5" height="5"/>`;
    return `<svg class="qr" viewBox="0 0 44 44" fill="#15261f" aria-hidden="true">${cells}${f(0, 0)}${f(32, 0)}${f(0, 32)}</svg>`;
  }

  function nlabel(m) {
    const n = m.nutrition;
    const row = (name, v, dv, color) => `<div class="nl-row"><span class="sw" style="background:${color}"></span><span>${name} <b>${r1(v)} g</b></span><span></span><span class="pct">${r0((v / dv) * 100)}%</span></div>`;
    return `<div class="nlabel">
      <div class="nl-brand"><span>Nutri Café · Label</span><span>${m.meal}</span></div>
      <div class="nl-title">${m.name}</div>
      <div class="nl-sub">1 box · about ${r0(n.grams)} g as served · ৳${m.price}</div>
      <div class="nl-kcal"><span>Calories</span><b>${r0(n.kcal)}</b></div>
      <div class="nl-dv">% Daily value*</div>
      ${row("Protein", n.p, DV.p, "var(--protein)")}
      ${row("Carbohydrate", n.c, DV.c, "var(--carb)")}
      ${row("Total fat", n.f, DV.f, "var(--fat)")}
      ${row("Dietary fibre", n.fib, DV.fib, "var(--fibre)")}
      <p class="nl-foot">*Based on a 2,000 kcal adult reference diet. Calculated from weighed recipes with the Food Composition Table for Bangladesh; not a laboratory analysis.</p>
      <div class="nl-qr">${qr(m.price)}<span>Scan at the counter for the full recipe, ingredients and allergens.</span></div>
    </div>`;
  }

  window.NCRender = { dishCard, nlabel, macroBar, plateClass, qr, r0, r1 };
})();
