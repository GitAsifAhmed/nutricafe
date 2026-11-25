/* Nutri Café - "How this dish affects your body".
   Turns one serving's numbers into plain-language notes per body system.
   Thresholds come from WHO guidance for healthy adults, scaled to one of three
   main meals in a 2,000 kcal day. General information, not medical advice. */
(function () {
  const r0 = (n) => Math.round(n), r1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const MEAL = {
    na: 2000 / 3,        // WHO: < 2,000 mg sodium per day (< 5 g salt)
    sug: 50 / 3,         // WHO: free sugars < 10% of energy (≈ 50 g/day); ideally < 5%
    fib: 25 / 3,         // WHO: at least 25 g dietary fibre per day for adults
    kcal: 2000 / 3,
    prot: 20,            // ~20-30 g of protein per meal supports muscle maintenance
  };
  const HIGH_NA = ["salt", "bread", "noodles_dry", "cheese", "butter", "muri", "ketchup", "mayonnaise", "paneer", "ruti", "paratha"];
  const OILY_FISH = ["hilsa"]; // pangas is fattier but low in omega-3
  const FISH = ["hilsa", "pangas", "rohu", "rohu_steak", "tilapia", "shrimp"];

  const ICON = {
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    liver: '<path d="M4 9c0-3 3-4 7-4s9 1 9 4-4 9-9 9c-3 0-7-3-7-9z"/><path d="M11 5v6"/>',
    kidney: '<path d="M9 4c-3 0-5 3-5 7s2 9 5 9 3-3 3-5-2-2-2-4 2-2 2-4-1-3-3-3z"/><path d="M15 4c3 0 5 3 5 7s-2 9-5 9"/>',
    gut: '<path d="M7 4h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6"/>',
    sugar: '<path d="M12 3c-3 4-5 6.5-5 9.5a5 5 0 0 0 10 0C17 9.5 15 7 12 3z"/><path d="M10 14h4"/>',
    muscle: '<path d="M5 15c2-6 5-9 9-9 2 0 3 1 3 3 0 3-3 3-4 5"/><path d="M5 15c3 2 8 3 13 0"/>',
    lungs: '<path d="M12 4v8M12 12c-1 0-2-1-3-3-2-1-4 2-4 6s1 5 3 5 4-2 4-5M12 12c1 0 2-1 3-3 2-1 4 2 4 6s-1 5-3 5-4-2-4-5"/>',
  };
  const LBL = { good: "Looks good", watch: "Worth watching", caution: "Take care", info: "Good to know" };

  function assess(ctx) {
    const { s, rows, ings, method, keep } = ctx;
    const ids = new Set(rows.map((r) => r.id));
    const has = (list) => list.some((id) => ids.has(id));
    const kcal = s.kcal || 0;
    const pct = (g, f) => (kcal ? (g * f / kcal) * 100 : 0);
    const satPct = pct(s.sat, 9), fatPct = pct(s.f, 9), sugPct = pct(s.sug, 4);
    const saltKnown = has(HIGH_NA);
    const fried = method === "deep" || method === "shallow";
    const usesDalda = rows.some((r) => ings[r.id] && ings[r.id].trans);
    const oilG = rows.reduce((a, r) => { const i = ings[r.id]; if (!i || !i.oil) return a; return a + (parseFloat(r.amount) || 0) * (i.units[r.unit] || 1) * (keep / 100); }, 0) / (ctx.servings || 1);
    const cards = [];

    // Heart & blood vessels
    {
      const notes = [];
      let lvl = "good";
      notes.push(`Saturated fat: <b>${r1(s.sat)} g</b> (${r0(satPct)}% of this dish's energy). WHO advises keeping it under 10% of energy, because it raises LDL ("bad") cholesterol.`);
      if (satPct > 10) lvl = "caution";
      if (fatPct > 35) { notes.push(`Total fat gives ${r0(fatPct)}% of energy, above the 30% WHO suggests across a day.`); if (lvl === "good") lvl = "watch"; }
      if (saltKnown) {
        notes.push(`Sodium: <b>${r0(s.na)} mg</b> per serving. A meal share of WHO's daily limit is about ${r0(MEAL.na)} mg; extra sodium raises blood pressure.`);
        if (s.na > MEAL.na * 1.5) lvl = "caution"; else if (s.na > MEAL.na && lvl === "good") lvl = "watch";
      } else notes.push(`No salt is listed. Add the salt you use to check sodium: one teaspoon (about 6 g) holds about 2,360 mg, more than WHO's limit for a whole day (2,000 mg).`);
      if (usesDalda) { notes.push("Vegetable ghee (dalda) can contain trans fat, the fat most strongly linked to heart disease."); lvl = "caution"; }
      if (has(FISH)) notes.push(has(OILY_FISH) ? "Ilish is an oily fish rich in omega-3 fats, which support heart health." : "Fish is a heart-friendly protein, lower in saturated fat than red meat.");
      if (s.fib >= MEAL.fib) notes.push("Its fibre helps lower blood cholesterol.");
      cards.push({ key: "heart", name: "Heart & blood vessels", lvl, notes });
    }

    // Liver
    {
      const notes = []; let lvl = "good";
      notes.push(`Free sugars: <b>${r1(s.sug)} g</b>. WHO advises under about ${r0(MEAL.sug)} g per meal (10% of energy), ideally half that.`);
      if (s.sug > MEAL.sug) lvl = "caution"; else if (s.sug > MEAL.sug / 2) lvl = "watch";
      if (kcal > MEAL.kcal * 1.35) { notes.push(`At ${r0(kcal)} kcal, this is a large serving. Eating more energy than you use, day after day, is the main cause of fatty liver.`); if (lvl === "good") lvl = "watch"; }
      if (fried) notes.push("Fried food adds a lot of fat for the liver to process; enjoy it occasionally rather than daily.");
      if (lvl === "good") notes.push("Nothing here puts unusual load on the liver.");
      cards.push({ key: "liver", name: "Liver", lvl, notes });
    }

    // Kidneys
    {
      const notes = []; let lvl = "good";
      if (saltKnown) {
        notes.push(`Sodium <b>${r0(s.na)} mg</b>. High salt raises blood pressure, which over years strains the kidneys.`);
        if (s.na > MEAL.na * 1.5) lvl = "caution"; else if (s.na > MEAL.na) lvl = "watch";
      } else { notes.push("Salt not listed, so sodium can't be judged. Keeping salt low is the best everyday habit for kidney health."); lvl = "info"; }
      notes.push(`Protein ${r0(s.p)} g is fine for healthy kidneys. People with kidney disease should follow their doctor's protein advice.`);
      cards.push({ key: "kidney", name: "Kidneys", lvl, notes });
    }

    // Gut & digestion
    {
      const notes = []; let lvl;
      notes.push(`Dietary fibre: <b>${r1(s.fib)} g</b>. Aim for at least ${r0(MEAL.fib)} g per meal (25 g+ per day) for regular digestion and healthy gut bacteria.`);
      lvl = s.fib >= MEAL.fib ? "good" : s.fib >= MEAL.fib / 2 ? "watch" : "caution";
      if (lvl !== "good") notes.push("Add shak, vegetables, dal, chola or swap to red rice or atta ruti for more fibre.");
      if (fried && oilG > 15) notes.push("Very oily, fried meals can cause heartburn and indigestion.");
      cards.push({ key: "gut", name: "Gut & digestion", lvl, notes });
    }

    // Blood sugar
    {
      const notes = []; let lvl = "good";
      const ratio = s.c ? s.fib / s.c : 0;
      notes.push(`Available carbohydrate: <b>${r0(s.c)} g</b>, with ${r1(s.fib)} g fibre and ${r0(s.p)} g protein to slow how fast it reaches the blood.`);
      if (s.c > 90 && ratio < 0.08) { lvl = "watch"; notes.push("A large, low-fibre carbohydrate portion can spike blood sugar and leave you sleepy later. A smaller rice portion with more vegetables helps."); }
      if (s.sug > MEAL.sug) { lvl = "caution"; notes.push("The added sugar is digested fastest of all."); }
      if (lvl === "good") notes.push("Carbohydrate is balanced by fibre and protein, which gives steadier energy.");
      cards.push({ key: "sugar", name: "Blood sugar & energy", lvl, notes });
    }

    // Muscles
    {
      const notes = [];
      const lvl = s.p >= MEAL.prot ? "good" : s.p >= 12 ? "watch" : "caution";
      notes.push(`Protein: <b>${r0(s.p)} g</b>. About 20-30 g per meal helps maintain and repair muscle.`);
      if (lvl !== "good") notes.push("An egg, thick dal, chola, fish or chicken would lift it.");
      cards.push({ key: "muscle", name: "Muscles", lvl, notes });
    }

    // Lungs (honest: food has a small direct effect; the kitchen matters more)
    {
      const notes = [];
      const lvl = fried ? "watch" : "info";
      notes.push("Food itself has only a small, indirect effect on the lungs. Diets rich in vegetables and fruit are linked with better lung function.");
      notes.push(fried ? "Frying at high heat releases cooking fumes and fine particles. Cook with a window open or an exhaust fan, and don't let oil smoke." : "Boiling and curry-style cooking release far fewer fumes than frying.");
      cards.push({ key: "lungs", name: "Lungs", lvl, notes });
    }
    return { cards, saltKnown, satPct, fatPct };
  }

  function render(el, ctx) {
    if (!ctx.s || !ctx.s.kcal) {
      el.innerHTML = `<div class="ing-empty"><b>Add ingredients to see how this dish affects your body</b>Each body system is checked against WHO guidelines for one meal.</div>`;
      return;
    }
    const { cards } = assess(ctx);
    const count = (l) => cards.filter((c) => c.lvl === l).length;
    el.innerHTML = `
      <div class="hc-summary">
        <span class="hc-pill good">${count("good")} look good</span>
        <span class="hc-pill watch">${count("watch")} worth watching</span>
        <span class="hc-pill caution">${count("caution")} need care</span>
        <span class="muted" style="font-size:13px">Per serving, compared with one meal's share of WHO daily guidance.</span>
      </div>
      <div class="hc-grid">${cards.map((c) => `
        <article class="hc-card ${c.lvl}">
          <header><span class="hc-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[c.key]}</svg></span>
            <div><h4>${c.name}</h4><span class="hc-lvl">${LBL[c.lvl]}</span></div></header>
          <ul>${c.notes.map((n) => `<li>${n}</li>`).join("")}</ul>
        </article>`).join("")}
      </div>`;
  }

  window.NCHealth = { assess, render };
})();
