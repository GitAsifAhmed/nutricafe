(function () {
  const { $, $$, countUp, donutSVG, animateDonut, ROOT } = window.NCUI;
  const { MENU, INGREDIENTS, compute } = window.NC;
  const { nlabel, plateClass, r0, r1 } = window.NCRender;
  const slug = document.body.dataset.dish;
  const m = MENU.find((x) => x.slug === slug);
  if (!m) return;
  const n = m.nutrition, s = m.split;
  const main = $("#dish");

  const rows = m.ingredients.map((r) => {
    const ing = INGREDIENTS[r.id];
    const t = compute([r]);
    const unitLabel = r.unit === "g" ? "g" : r.unit;
    const grams = r.unit === "g" ? "" : ` <span class="muted">(${r0(t.grams)} g)</span>`;
    return `<tr><td>${ing.name}<span class="bn">${ing.bn}</span></td>
      <td class="r num">${r.amount} ${unitLabel}${grams}</td>
      <td class="r num">${r0(t.kcal)}</td><td class="r num">${r1(t.p)}</td><td class="r num">${r1(t.c)}</td><td class="r num">${r1(t.f)}</td></tr>`;
  }).join("");

  const others = MENU.filter((x) => x.slug !== slug);

  main.innerHTML = `
  <section class="dish-hero">
    <div class="wrap dish-hero-grid">
      <div class="dish-photo" data-reveal="scale"><img src="${ROOT}assets/img/${m.img}" alt="${m.name}"><span class="placeholder-note">Placeholder photo</span></div>
      <div class="dish-info">
        <div class="crumbs" data-reveal><a href="${ROOT}index.html">Home</a><span>/</span><a href="${ROOT}menu.html">Menu</a><span>/</span><span>${m.meal}</span></div>
        <div style="display:flex;gap:8px;margin-top:22px" data-reveal><span class="chip ${plateClass(m.plate)}"><span class="dot"></span>${m.plate} plate</span><span class="chip">${m.meal}</span></div>
        <h1 data-split>${m.name}</h1>
        <div class="bn" data-reveal>${m.bn}</div>
        <p class="story" data-reveal>${m.story}</p>
        <div class="macro-strip" data-reveal style="border-top:0;padding-top:0">
          <div><b class="cu" data-to="${r0(n.kcal)}">0</b>kcal</div><div><b class="cu" data-to="${r0(n.p)}" data-s="g">0</b>protein</div>
          <div><b class="cu" data-to="${r0(n.c)}" data-s="g">0</b>carbs</div><div><b class="cu" data-to="${r0(n.f)}" data-s="g">0</b>fat</div>
        </div>
        <div class="price-row" data-reveal>
          <div class="price">৳${m.price}<small>per box</small></div>
          <span style="flex:1"></span>
          <div class="share" data-share data-title="${m.name} at Nutri Café - ${r0(n.kcal)} kcal, ${r0(n.p)} g protein, ৳${m.price}"></div>
          <a class="btn small" href="${ROOT}group-order.html?add=${m.slug}">Order for a group <span class="arrow">→</span></a>
        </div>
        <div class="allergen" data-reveal><b style="color:var(--ink-2)">Contains:</b>${m.allergens.length ? m.allergens.map((a) => `<span class="chip">${a}</span>`).join("") : '<span class="chip">No major allergens listed</span>'}
          <span>· Cooked in a kitchen that also handles egg, fish and mustard.</span></div>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:60px">
    <div class="wrap dish-detail">
      <div>
        <div class="panel" data-reveal>
          <h3>Where the energy comes from</h3>
          <div class="donut-wrap">
            <div class="donut" id="donut">${donutSVG([{ v: s.p, color: "var(--protein)" }, { v: s.c, color: "var(--carb)" }, { v: s.f, color: "var(--fat)" }])}
              <div class="center"><b>${r0(n.kcal)}</b><span>kcal per box</span></div></div>
            <div class="macro-list">
              ${[["Protein", n.p, s.p, "var(--protein)", 60], ["Carbohydrate", n.c, s.c, "var(--carb)", 120], ["Fat", n.f, s.f, "var(--fat)", 40], ["Fibre", n.fib, null, "var(--fibre)", 15]].map(([nm, g, sh, col, max]) => `
              <div class="macro-item"><div class="top"><span><i style="background:${col}"></i>${nm}</span><span><b>${r1(g)} g</b>${sh != null ? `<small>${r0(sh * 100)}% of energy</small>` : ""}</span></div>
                <div class="bar"><i data-w="${Math.min(100, (g / max) * 100).toFixed(1)}" style="background:${col}"></i></div></div>`).join("")}
            </div>
          </div>
          <p class="note" style="margin-top:22px">Energy split uses 4 kcal/g for protein and carbohydrate and 9 kcal/g for fat. For most adults, guidelines suggest roughly 10–35% of energy from protein, 45–65% from carbohydrate and 20–35% from fat.</p>
        </div>

        <div class="panel" data-reveal>
          <h3>Ingredients, per box</h3>
          <div style="overflow-x:auto"><table class="ing-table dish-ing">
            <thead><tr><th>Ingredient</th><th class="r">Amount</th><th class="r">kcal</th><th class="r">Protein g</th><th class="r">Carbs g</th><th class="r">Fat g</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr style="font-weight:700"><td style="padding-top:14px">Total</td><td class="r num" style="padding-top:14px">${r0(n.grams)} g</td><td class="r num" style="padding-top:14px">${r0(n.kcal)}</td><td class="r num" style="padding-top:14px">${r1(n.p)}</td><td class="r num" style="padding-top:14px">${r1(n.c)}</td><td class="r num" style="padding-top:14px">${r1(n.f)}</td></tr></tfoot>
          </table></div>
          <p class="note" style="margin-top:16px">Bone-in chicken and fish are listed at purchase weight; their nutrition is calculated on the edible portion. Rice is weighed after cooking. Salt is used to taste and adds no energy.</p>
        </div>

        <div class="panel" data-reveal>
          <h3>How it's made</h3>
          <ol class="method">${m.steps.map((st) => `<li>${st}</li>`).join("")}</ol>
        </div>
      </div>

      <aside class="sticky">
        <div class="label-stage" data-reveal="scale" style="padding-top:0">${nlabel(m)}</div>
        <div style="display:grid;gap:10px;margin-top:28px" data-reveal>
          <a class="btn" href="${ROOT}calculator.html?dish=${m.slug}">Open this recipe in the calculator <span class="arrow">→</span></a>
          <p class="note center">Change the oil, portion or ingredients and see how the numbers move.</p>
        </div>
      </aside>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="wrap"><div data-comments data-key="dish-${m.slug}" data-kind="dish"></div></div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="section-head" style="margin-bottom:28px"><div><span class="eyebrow" data-reveal>Keep browsing</span><h2 data-split style="font-size:clamp(30px,3vw,42px)">More from the <em>menu</em></h2></div>
        <a class="link-arrow" href="${ROOT}menu.html" data-reveal>Full menu →</a></div>
      <div class="more-dishes">${others.map((o, i) => `<a class="mini-dish" href="${ROOT}menu/${o.slug}.html" data-reveal style="--d:${i * 0.06}s"><div class="img"><img src="${ROOT}assets/img/${o.img}" alt="" loading="lazy"></div><div class="t">${o.name}<span>৳${o.price}</span></div></a>`).join("")}</div>
    </div>
  </section>`;

  // re-split newly rendered headings
  $$("[data-split]", main).forEach((el) => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines.map((l, i) => `<span class="split-line"><span style="--d:${(i * 0.09).toFixed(2)}s">${l.trim()}</span></span>`).join("");
  });

  const donutPanel = $("#donut").closest("[data-reveal]");
  donutPanel.addEventListener("reveal", () => {
    animateDonut($("#donut"));
    $$(".macro-item .bar i", donutPanel).forEach((b) => (b.style.width = b.dataset.w + "%"));
  });
  setTimeout(() => $$(".cu").forEach((el) => countUp(el, +el.dataset.to, { suffix: el.dataset.s || "" })), 400);
})();
