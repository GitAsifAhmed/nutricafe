(function () {
  const { $, $$, toast, store, fmt } = window.NCUI;
  const { MENU } = window.NC;
  const MIN_BOXES = 10;          // smallest group order - change here
  const PATHAO_FEE = 100;        // flat Pathao delivery charge, BDT
  const LEAD_DAYS = 2;           // earliest event date = today + LEAD_DAYS
  const tk = (n) => "৳" + fmt(n);

  $("#min-n").textContent = MIN_BOXES; $(".min-n2").textContent = MIN_BOXES;
  const qty = {};
  MENU.forEach((m) => (qty[m.slug] = 0));
  const pre = new URLSearchParams(location.search).get("add");
  if (pre && pre in qty) qty[pre] = MIN_BOXES;

  $("#qty").innerHTML = MENU.map((m) => `<div class="qty-item" data-slug="${m.slug}">
    <img src="assets/img/${m.img}" alt="">
    <div class="nm">${m.name}<small>${m.meal} · ${Math.round(m.nutrition.kcal)} kcal · ${Math.round(m.nutrition.p)} g protein</small></div>
    <span class="pr">৳${m.price}</span>
    <div class="stepper"><button type="button" data-d="-1" aria-label="One less">−</button><input type="number" min="0" max="999" value="${qty[m.slug]}" aria-label="Quantity of ${m.name}"><button type="button" data-d="1" aria-label="One more">+</button></div>
  </div>`).join("");

  $("#qty").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-d]"); if (!b) return;
    const row = b.closest(".qty-item"), s = row.dataset.slug;
    // first tap on + jumps straight to the smallest group order
    const step = +b.dataset.d;
    qty[s] = Math.max(0, Math.min(999, qty[s] === 0 && step > 0 && totalBoxes() === 0 ? MIN_BOXES : qty[s] + step));
    $("input", row).value = qty[s];
    update();
  });
  $("#qty").addEventListener("input", (e) => {
    if (e.target.tagName !== "INPUT") return;
    const s = e.target.closest(".qty-item").dataset.slug;
    qty[s] = Math.max(0, Math.min(999, parseInt(e.target.value) || 0));
    update();
  });
  $("#qty").addEventListener("change", (e) => { if (e.target.tagName === "INPUT") e.target.value = qty[e.target.closest(".qty-item").dataset.slug]; });

  const delivery = () => $('input[name="delivery"]:checked').value;
  const pay = () => $('input[name="pay"]:checked').value;
  const totalBoxes = () => Object.values(qty).reduce((a, b) => a + b, 0);

  $$('input[name="delivery"]').forEach((r) => r.addEventListener("change", () => { $("#addr-box").classList.toggle("open", delivery() === "pathao"); update(); }));
  $("#guests").addEventListener("input", () => update());
  $$('input[name="pay"]').forEach((r) => r.addEventListener("change", () => { $("#pay-bkash").hidden = pay() !== "bkash"; $("#pay-bank").hidden = pay() !== "bank"; }));

  // earliest allowed date
  const minDate = new Date(); minDate.setDate(minDate.getDate() + LEAD_DAYS);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  $("#date").min = iso(minDate);

  /* smaller screens: floating total bar while filling the long form */
  const bar = document.createElement("div");
  bar.className = "sticky-bar";
  bar.innerHTML = `<div><small id="bar-boxes">0 boxes</small><b id="bar-total">৳0</b></div><button class="btn light" type="button">Review order <span class="arrow">↓</span></button>`;
  document.body.appendChild(bar);
  let sumVisible = false;
  const syncBar = () => {
    const show = matchMedia("(max-width: 1100px)").matches && !sumVisible && totalBoxes() > 0;
    bar.classList.toggle("show", show); document.body.classList.toggle("has-bar", show);
  };
  new IntersectionObserver(([e]) => { sumVisible = e.isIntersecting; syncBar(); }, { threshold: 0.1 }).observe($(".summary"));
  $("button", bar).addEventListener("click", () => {
    const s = $(".summary");
    if (window.__lenis) window.__lenis.scrollTo(s, { offset: -90, duration: 1 }); else s.scrollIntoView({ behavior: "smooth" });
  });

  let lastTotal = 0;
  function calc() {
    const lines = MENU.filter((m) => qty[m.slug] > 0).map((m) => ({ m, q: qty[m.slug], sum: qty[m.slug] * m.price }));
    const sub = lines.reduce((a, l) => a + l.sum, 0);
    const del = delivery() === "pathao" && lines.length ? PATHAO_FEE : 0;
    return { lines, sub, del, total: sub + del, boxes: totalBoxes() };
  }

  function update() {
    const c = calc();
    $$(".qty-item").forEach((r) => r.classList.toggle("has", qty[r.dataset.slug] > 0));
    $("#lines").innerHTML = c.lines.length
      ? c.lines.map((l) => `<li><span>${l.q} × ${l.m.name}</span><span>${tk(l.sum)}</span></li>`).join("")
      : `<li class="empty">No dishes yet - add some on the left.</li>`;
    $("#boxes").textContent = c.boxes;
    $("#sub").textContent = tk(c.sub);
    $("#del").textContent = delivery() === "pathao" ? (c.lines.length ? tk(PATHAO_FEE) + " · Pathao" : "৳100 once you add food") : "Free · takeaway";
    const tot = $("#total");
    tot.textContent = tk(c.total);
    if (c.total !== lastTotal) { tot.classList.remove("bump"); void tot.offsetWidth; tot.classList.add("bump"); lastTotal = c.total; }
    $$("[data-total]").forEach((el) => (el.textContent = tk(c.total)));
    $("#bar-total").textContent = tk(c.total);
    $("#bar-boxes").textContent = `${c.boxes} box${c.boxes === 1 ? "" : "es"}${c.boxes < MIN_BOXES ? ` · ${MIN_BOXES - c.boxes} more to order` : ""}`;
    syncBar();
    const guests = parseInt($("#guests").value) || 0;
    $("#per-head").textContent = c.total && guests ? `≈ ${tk(Math.ceil(c.total / guests))} per guest (${guests} guests)` : c.boxes ? `≈ ${tk(Math.round(c.total / c.boxes))} per box` : "";
    // mark the food step done once the minimum is met
    $("#qty").closest(".step-card").classList.toggle("done", c.boxes >= MIN_BOXES);
    const ok = c.boxes >= MIN_BOXES;
    $("#prog").classList.toggle("ok", ok);
    $("#prog i").style.width = Math.min(100, (c.boxes / MIN_BOXES) * 100) + "%";
    const note = $("#min-note");
    note.classList.toggle("ok", ok);
    note.textContent = ok ? `✓ Ready to order (${c.boxes} boxes)` : `${MIN_BOXES - c.boxes} more box${MIN_BOXES - c.boxes === 1 ? "" : "es"} to reach the ${MIN_BOXES}-box minimum`;
    if (ok) $("#f-items").classList.remove("err");
  }
  update();

  /* validation */
  function check(id, cond) { const f = $("#" + id); f.classList.toggle("err", !cond); return cond; }
  const phoneOk = (v) => /^(?:\+?88)?01[3-9]\d{8}$/.test(v.replace(/[\s-]/g, ""));
  $$("#order input, #order textarea, #order select").forEach((el) => el.addEventListener("input", () => { const f = el.closest(".field"); if (f) f.classList.remove("err"); }));

  $("#order").addEventListener("submit", (e) => {
    e.preventDefault();
    const c = calc();
    const v = (id) => $("#" + id).value.trim();
    const results = [
      check("f-items", c.boxes >= MIN_BOXES),
      check("f-name", v("name").length > 1),
      check("f-phone", phoneOk(v("phone"))),
      check("f-email", !v("email") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))),
      check("f-date", !!v("date") && v("date") >= iso(minDate)),
      check("f-time", !!v("time")),
      delivery() === "pathao" ? check("f-addr", v("addr").length > 5) : true,
      pay() === "bkash" ? check("f-bnum", phoneOk(v("bnum"))) : true,
      pay() === "bkash" ? check("f-trx", v("trx").length >= 6) : true,
      pay() === "bank" ? check("f-bref", v("bref").length >= 4) : true,
    ];
    if (results.includes(false)) {
      const first = $(".field.err");
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      const inp = $("input, textarea, select", first); if (inp) setTimeout(() => inp.focus({ preventScroll: true }), 400);
      toast("Please check the highlighted fields");
      return;
    }
    const d = new Date();
    const id = `NC-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const order = {
      id, createdAt: d.toISOString(),
      customer: { name: v("name"), phone: v("phone"), email: v("email"), org: v("org") },
      event: { type: v("etype"), date: v("date"), time: v("time"), guests: v("guests"), notes: v("notes") },
      delivery: delivery() === "pathao" ? { method: "Pathao", fee: PATHAO_FEE, address: v("addr"), area: v("area"), landmark: v("landmark") } : { method: "Takeaway (ULAB counter)", fee: 0 },
      items: c.lines.map((l) => ({ dish: l.m.name, qty: l.q, unit: l.m.price, sum: l.sum })),
      subtotal: c.sub, total: c.total,
      payment: pay() === "bkash" ? { method: "bKash", from: v("bnum"), trxId: v("trx").toUpperCase() } : { method: "Bank transfer", reference: v("bref"), bank: v("bname") },
    };
    // personal details are not stored in the browser; they will go straight to the order system once it exists
    showDone(order);
  });

  function summaryText(o) {
    return [
      `Nutri Café group order ${o.id}`,
      `${o.customer.name} · ${o.customer.phone}${o.customer.org ? " · " + o.customer.org : ""}`,
      `${o.event.type} on ${o.event.date}, ${o.event.time}`,
      ...o.items.map((i) => `${i.qty} × ${i.dish} @ ৳${i.unit} = ৳${i.sum}`),
      `Delivery: ${o.delivery.method}${o.delivery.fee ? " (৳" + o.delivery.fee + ")" : ""}${o.delivery.address ? " - " + o.delivery.address : ""}`,
      `Total: ৳${o.total}`,
      `Paid via ${o.payment.method}${o.payment.trxId ? " · TrxID " + o.payment.trxId : o.payment.reference ? " · Ref " + o.payment.reference : ""}`,
    ].join("\n");
  }

  const modal = $("#done");
  function showDone(o) {
    $("#done-id").textContent = o.id;
    $("#done-phone").textContent = o.customer.phone;
    $("#done-lines").innerHTML = o.items.map((i) => `<li><span>${i.qty} × ${i.dish}</span><span>${tk(i.sum)}</span></li>`).join("") + (o.delivery.fee ? `<li><span>Pathao delivery</span><span>${tk(o.delivery.fee)}</span></li>` : "");
    $("#done-total").textContent = tk(o.total);
    modal.classList.add("open");
    $("#done-copy").onclick = async () => { try { await navigator.clipboard.writeText(summaryText(o)); toast("Order details copied"); } catch (e) { toast("Copy isn't available here"); } };
  }
  $(".modal-close", modal).addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.classList.remove("open"); });
})();
