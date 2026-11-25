/* Nutri Café - shared layout + interaction layer */
(function () {
  const body = document.body;
  const ROOT = body.dataset.root || "";
  const PAGE = body.dataset.page || "";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------- logo ---------- */
  function logoMark(light) {
    const c = 2 * Math.PI * 19, g = 6;
    const seg = (frac, start, color) =>
      `<circle cx="24" cy="24" r="19" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round"
        stroke-dasharray="${(frac * c - g).toFixed(2)} ${c}" stroke-dashoffset="${(-start * c).toFixed(2)}"/>`;
    const leaf = light ? "#f6f1e7" : "#0e4732";
    const vein = light ? "#0e4732" : "#f6f1e7";
    return `<svg class="mark" viewBox="0 0 48 48" aria-hidden="true"><g transform="rotate(-90 24 24)">
      ${seg(0.36, 0, "#1f7a5c")}${seg(0.4, 0.36, "#e2a03a")}${seg(0.24, 0.76, "#d65a3c")}</g>
      <path d="M24 13.5c-6.2 4.2-8.4 10.4-6.3 16 1.4 3.3 3.9 4.9 6.3 4.9s4.9-1.6 6.3-4.9c2.1-5.6-.1-11.8-6.3-16z" fill="${leaf}"/>
      <path d="M24 18.5v15.6M24 25l-3-2.6M24 29l3.2-2.6" stroke="${vein}" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>`;
  }
  const logo = (light) => `<a class="logo" href="${ROOT}index.html" aria-label="Nutri Café home">${logoMark(light)}<span class="word">Nutri <i>Café</i></span></a>`;

  const NAV = [
    ["home", "index.html", "Home"],
    ["menu", "menu.html", "Menu"],
    ["calculator", "calculator.html", "Nutrition calculator"],
    ["journal", "journal.html", "Journal"],
  ];

  const header = $("#site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `<div class="wrap"><nav class="nav-shell" aria-label="Main">
      ${logo(false)}
      <ul class="nav-links" id="nav-links">${NAV.map(([k, href, label], i) => `<li style="--i:${i}"><a href="${ROOT}${href}" class="${PAGE === k ? "active" : ""}">${label}</a></li>`).join("")}
        <li class="only-mobile" style="--i:${NAV.length}"><a href="${ROOT}group-order.html" class="${PAGE === "order" ? "active" : ""}">Group orders</a></li></ul>
      <a class="btn small" href="${ROOT}group-order.html">Group orders <span class="arrow">→</span></a>
      <button class="nav-toggle" aria-label="Open menu"><span></span><span></span><span></span></button>
    </nav></div>`;
    const toggle = $(".nav-toggle", header);
    toggle.addEventListener("click", () => {
      const open = body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open);
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    $$(".nav-links a", header).forEach((a) => a.addEventListener("click", () => body.classList.remove("nav-open")));
    document.addEventListener("click", (e) => { if (body.classList.contains("nav-open") && !e.target.closest(".nav-shell")) body.classList.remove("nav-open"); });

    // hover indicator that glides between links
    const links = $(".nav-links", header);
    const ind = document.createElement("span");
    ind.className = "nav-ind";
    links.prepend(ind);
    const moveInd = (a) => { if (!a) { ind.style.opacity = 0; return; } ind.style.left = a.offsetLeft + "px"; ind.style.width = a.offsetWidth + "px"; ind.style.opacity = 1; };
    $$("a", links).forEach((a) => a.addEventListener("mouseenter", () => moveInd(a)));
    links.addEventListener("mouseleave", () => moveInd(null));

    // the bar stays fixed; it only tightens once the page scrolls
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- back to top (bottom-left, with scroll progress ring) ---------- */
  const top = document.createElement("button");
  top.className = "to-top";
  top.type = "button";
  top.setAttribute("aria-label", "Back to top");
  const RC = 2 * Math.PI * 27;
  top.innerHTML = `<svg class="ring" viewBox="0 0 58 58"><circle class="bg" cx="29" cy="29" r="27"/><circle class="fg" cx="29" cy="29" r="27" stroke-dasharray="${RC}" stroke-dashoffset="${RC}"/></svg>
    <svg class="ar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>`;
  body.appendChild(top);
  const ringFg = top.querySelector(".fg");
  const onTopScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    top.classList.toggle("show", scrollY > 500);
    ringFg.style.strokeDashoffset = RC * (1 - p);
  };
  addEventListener("scroll", onTopScroll, { passive: true });
  onTopScroll();
  top.addEventListener("click", () => (window.__lenis ? window.__lenis.scrollTo(0, { duration: 1.0 }) : window.scrollTo({ top: 0, behavior: "smooth" })));

  const footer = $("#site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML = `<div class="wrap">
      <div class="footer-top">
        <div>${logo(true)}<p class="footer-tag">Nutrition you can <em>read</em> before you eat.</p></div>
        <div><h5>Eat</h5><ul>
          <li><a href="${ROOT}menu.html">Full menu</a></li>
          <li><a href="${ROOT}menu.html#breakfast">Breakfast</a></li>
          <li><a href="${ROOT}menu.html#lunch">Lunch</a></li>
          <li><a href="${ROOT}group-order.html">Group &amp; event orders</a></li></ul></div>
        <div><h5>Learn</h5><ul>
          <li><a href="${ROOT}calculator.html">Nutrition calculator</a></li>
          <li><a href="${ROOT}journal.html">Journal</a></li>
          <li><a href="${ROOT}index.html#how">How we label food</a></li></ul></div>
        <div><h5>Find us</h5><ul>
          <li>Nutri Café outlet<br>University of Liberal Arts Bangladesh (ULAB)</li>
          <li>Mohammadpur, Dhaka</li>
          <li><a href="${ROOT}index.html#visit">Directions &amp; details →</a></li></ul></div>
      </div>
      <div class="footer-bottom"><span>© ${new Date().getFullYear()} Nutri Café</span>
        <span>Nutrition values are calculated estimates, not laboratory analysis.</span></div>
    </div><div class="footer-giant">nutri café</div>`;
  }

  /* ---------- page transitions: a forest-green curtain carries you between pages ---------- */
  const curtain = document.createElement("div");
  curtain.className = "curtain";
  curtain.innerHTML = `<div class="c-logo">${logoMark(true)}<span>Nutri <i>Café</i></span></div>`;
  body.appendChild(curtain);
  let arrived = false;
  try { arrived = sessionStorage.getItem("nc:curtain") === "1"; sessionStorage.removeItem("nc:curtain"); } catch (e) {}
  if (arrived) {
    // start covered, then lift away once the new page has painted
    curtain.classList.add("cover");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      curtain.classList.add("anim", "gone");
      curtain.classList.remove("cover");
      setTimeout(() => curtain.classList.remove("anim", "gone"), 520);
    }));
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || a.target === "_blank" || /^(https?:|mailto:|tel:)/.test(href) || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    try { sessionStorage.setItem("nc:curtain", "1"); } catch (err) {}
    curtain.classList.remove("gone");
    curtain.classList.add("anim");
    requestAnimationFrame(() => curtain.classList.add("cover"));
    setTimeout(() => { location.href = a.href; }, 380);
  });
  window.addEventListener("pageshow", (e) => { if (e.persisted) curtain.classList.remove("cover", "anim"); });

  /* ---------- images fade in when loaded ---------- */
  document.documentElement.classList.add("js");
  function fadeImages(root = document) {
    $$("main img:not(.fade)", root).forEach((img) => {
      if (img.closest(".plate-img")) return;
      img.classList.add("fade");
      const done = () => img.classList.add("loaded");
      if (img.complete && img.naturalWidth) done(); else { img.addEventListener("load", done); img.addEventListener("error", done); }
    });
  }


  /* ---------- reveal on scroll ---------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        const el = en.target;
        el.classList.add("in");
        el.dispatchEvent(new CustomEvent("reveal"));
        io.unobserve(el);
        // once the entrance has played, drop its long, delayed transition so the element's
        // own hover transitions (buttons, cards) apply immediately and identically everywhere
        if (el.hasAttribute("data-reveal")) {
          const delay = parseFloat(getComputedStyle(el).getPropertyValue("--d")) || 0;
          setTimeout(() => { el.removeAttribute("data-reveal"); el.style.removeProperty("--d"); }, 1000 + delay * 1000);
        }
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }) : null;

  function observe(root = document) {
    $$("[data-reveal]:not(.in), [data-split]:not(.in)", root).forEach((el) => {
      if (io) io.observe(el); else el.classList.add("in");
    });
  }

  // split headings into lines for a staggered rise
  $$("[data-split]").forEach((el) => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines.map((l, i) => `<span class="split-line"><span style="--d:${(i * 0.06 + (parseFloat(el.dataset.delay) || 0)).toFixed(2)}s">${l.trim()}</span></span>`).join("");
  });

  /* ---------- helpers ---------- */
  const fmt = (n, d = 0) => Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

  function countUp(el, to, opts = {}) {
    const d = opts.decimals || 0, dur = opts.duration || 1100, prefix = opts.prefix || "", suffix = opts.suffix || "";
    const from = parseFloat(el.dataset.current || 0);
    el.dataset.current = to;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + fmt(from + (to - from) * e, d) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; body.appendChild(t); }
    t.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a9c4a4" stroke-width="3" stroke-linecap="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>${msg}`;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 2600);
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const store = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };

  /* ---------- macro donut ---------- */
  // values: [{v, color}] ; returns svg markup
  function donutSVG(values, r = 70, sw = 18) {
    const c = 2 * Math.PI * r, total = values.reduce((a, b) => a + b.v, 0) || 1, gap = 3;
    let acc = 0;
    const segs = values.map((s) => {
      const len = Math.max(0, (s.v / total) * c - gap);
      const out = `<circle cx="90" cy="90" r="${r}" stroke="${s.color}" stroke-width="${sw}" stroke-linecap="butt"
        data-len="${len.toFixed(2)}" stroke-dasharray="0 ${c.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"/>`;
      acc += (s.v / total) * c;
      return out;
    }).join("");
    return `<svg viewBox="0 0 180 180"><circle class="bg" cx="90" cy="90" r="${r}" stroke="rgba(21,38,31,.06)" stroke-width="${sw}"/>${segs}</svg>`;
  }
  function animateDonut(el) {
    const c = el.querySelector("circle.bg");
    const circ = 2 * Math.PI * parseFloat(c.getAttribute("r"));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$("circle[data-len]", el).forEach((s) => s.setAttribute("stroke-dasharray", `${s.dataset.len} ${circ.toFixed(2)}`));
    }));
  }

  /* ---------- share ---------- */
  const ICONS = {
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2H7.5v3.6h2.8V22H14v-9.9h2.8l.4-3.6H14z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
    in: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3V9.5zm7 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6.1V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9.5z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    share: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  };

  function mountShare(el) {
    const title = el.dataset.title || document.title;
    const url = location.href.split("#")[0];
    const u = encodeURIComponent(url), t = encodeURIComponent(title);
    el.innerHTML = `<button class="btn ${el.dataset.style || "ghost"} small" type="button" aria-haspopup="true" aria-expanded="false">${ICONS.share} ${el.dataset.label || "Share"}</button>
      <div class="share-pop" role="menu">
        <button type="button" data-copy><span class="ico" style="background:#15261f">${ICONS.link}</span>Copy link</button>
        <a target="_blank" rel="noopener" href="https://wa.me/?text=${t}%20${u}"><span class="ico" style="background:#25d366">${ICONS.wa}</span>WhatsApp</a>
        <a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${u}"><span class="ico" style="background:#1877f2">${ICONS.fb}</span>Facebook</a>
        <a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${t}&url=${u}"><span class="ico" style="background:#111">${ICONS.x}</span>X (Twitter)</a>
        <a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${u}"><span class="ico" style="background:#0a66c2">${ICONS.in}</span>LinkedIn</a>
        <a href="mailto:?subject=${t}&body=${t}%0A${u}"><span class="ico" style="background:#e2a03a">${ICONS.mail}</span>Email</a>
      </div>`;
    const btn = el.querySelector(".btn");
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      // phones: use the native share sheet when available
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        try { await navigator.share({ title, url }); return; } catch (err) { /* fall through */ }
      }
      const open = !el.classList.contains("open");
      const r = el.getBoundingClientRect();
      el.classList.toggle("up", r.bottom + 360 > innerHeight && r.top > 360);
      el.classList.toggle("left", r.right < 280);
      $$(".share.open").forEach((s) => s.classList.remove("open"));
      el.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open);
    });
    el.querySelector("[data-copy]").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(url); }
      catch (e) { const ta = document.createElement("textarea"); ta.value = url; body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
      el.classList.remove("open");
      toast("Link copied - paste it anywhere");
    });
  }
  document.addEventListener("click", (e) => { if (!e.target.closest(".share")) $$(".share.open").forEach((s) => s.classList.remove("open")); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { $$(".share.open").forEach((s) => s.classList.remove("open")); body.classList.remove("nav-open"); } });

  /* ---------- comments (no login; saved in this browser until a server exists) ---------- */
  const STAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>';
  const AV_COLORS = ["#1f7a5c", "#e2a03a", "#d65a3c", "#17614a", "#8aa14f", "#a2643a", "#3d6f8c"];

  function timeAgo(ts) {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`;
    const d = Math.round(h / 24); if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function mountComments(el) {
    const key = "nc:comments:" + el.dataset.key;
    const kind = el.dataset.kind || "post"; // dish | post
    const types = kind === "dish" ? ["Review", "Recommendation", "Thought"] : ["Thought", "Question", "Tip"];
    let type = types[0], rating = 0;
    const helpfulKey = "nc:helpful";

    el.classList.add("comments");
    el.innerHTML = `
      <div class="comments-head">
        <div><span class="eyebrow">${kind === "dish" ? "Reviews & recommendations" : "Discussion"}</span>
          <h2 style="margin-top:12px">${kind === "dish" ? "What people think" : "Share your thoughts"}</h2></div>
        <div class="c-summary"></div>
      </div>
      <form class="c-form" novalidate>
        <div class="c-types" role="radiogroup" aria-label="Comment type">${types.map((t, i) => `<button type="button" role="radio" aria-checked="${i === 0}" class="${i === 0 ? "on" : ""}" data-type="${t}">${t}</button>`).join("")}</div>
        ${kind === "dish" ? `<div class="c-rate"><span>Your rating</span><div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} star${n > 1 ? "s" : ""}">${STAR}</button>`).join("")}</div></div>` : ""}
        <div class="c-row">
          <div class="field c-name"><label for="${key}-name">Your name</label><input id="${key}-name" maxlength="40" required placeholder="e.g. Nabila, CSE '26" autocomplete="name"><span class="msg">Please add your name so others know who's recommending.</span></div>
          <div class="field"><label for="${key}-text">${kind === "dish" ? "Your review, suggestion or thought" : "Your comment"}</label>
            <textarea id="${key}-text" maxlength="1200" placeholder="${kind === "dish" ? "How was it? Would you change the portion, spice or price?" : "What did you learn, or what would you add?"}"></textarea>
            <span class="msg">Please write a few words before posting.</span></div>
        </div>
        <div class="c-actions"><span class="note">No account needed. For now, comments are saved in this browser only - they go public when our server launches.</span>
          <button class="btn" type="submit">Post <span class="arrow">→</span></button></div>
      </form>
      <ul class="c-list" aria-live="polite"></ul>`;

    const form = $("form", el), list = $(".c-list", el), summary = $(".c-summary", el);
    const rateRow = $(".c-rate", el);

    $$(".c-types button", el).forEach((b) => b.addEventListener("click", () => {
      $$(".c-types button", el).forEach((x) => { x.classList.remove("on"); x.setAttribute("aria-checked", "false"); });
      b.classList.add("on"); b.setAttribute("aria-checked", "true");
      type = b.dataset.type;
      if (rateRow) rateRow.classList.toggle("off", type !== "Review");
    }));
    $$(".stars button", el).forEach((b) => {
      b.addEventListener("click", () => { rating = +b.dataset.star; paintStars(rating); });
      b.addEventListener("mouseenter", () => paintStars(+b.dataset.star));
    });
    if (rateRow) $(".stars", el).addEventListener("mouseleave", () => paintStars(rating));
    function paintStars(n) { $$(".stars button", el).forEach((b) => b.classList.toggle("on", +b.dataset.star <= n)); }

    function render(newId) {
      const items = store.get(key, []);
      const mine = store.get(helpfulKey, {});
      const rated = items.filter((c) => c.rating);
      const avg = rated.length ? rated.reduce((a, c) => a + c.rating, 0) / rated.length : 0;
      summary.innerHTML = items.length
        ? (rated.length ? `<span style="color:var(--turmeric)">${STAR.replace("<svg", '<svg width="20" height="20"')}</span><b>${avg.toFixed(1)}</b><span>· ${items.length} comment${items.length > 1 ? "s" : ""}</span>` : `<b>${items.length}</b><span>comment${items.length > 1 ? "s" : ""}</span>`)
        : "";
      if (!items.length) {
        list.innerHTML = `<li class="c-empty"><svg viewBox="0 0 72 72" fill="none"><circle cx="36" cy="36" r="34" fill="#efe7d8"/><path d="M22 26h28a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H34l-8 6v-6h-4a4 4 0 0 1-4-4V30a4 4 0 0 1 4-4z" fill="#fffdf8" stroke="#0e4732" stroke-width="2"/><circle cx="29" cy="37" r="2" fill="#e2a03a"/><circle cx="36" cy="37" r="2" fill="#d65a3c"/><circle cx="43" cy="37" r="2" fill="#1f7a5c"/></svg>
          <b>No ${kind === "dish" ? "reviews" : "comments"} yet</b>Be the first to ${kind === "dish" ? "tell us how it tasted" : "start the conversation"}.</li>`;
        return;
      }
      list.innerHTML = items.slice().reverse().map((c) => {
        const initial = (c.name || "G").trim().charAt(0).toUpperCase();
        const color = AV_COLORS[(c.name || "G").length % AV_COLORS.length];
        const on = !!mine[c.id];
        return `<li class="c-item" ${c.id === newId ? "" : 'style="animation:none"'}>
          <div class="avatar" style="background:${color}">${esc(initial)}</div>
          <div><div class="c-meta"><strong>${esc(c.name || "Guest")}</strong><span class="type">${esc(c.type)}</span>
            ${c.rating ? `<span class="stars" style="color:var(--turmeric)">${STAR.replace("<svg", '<svg width="14" height="14"').repeat(c.rating)}</span>` : ""}
            <span>· ${timeAgo(c.ts)}</span></div>
            <p class="c-body">${esc(c.text)}</p>
            <button class="c-helpful ${on ? "on" : ""}" data-id="${c.id}" type="button"><svg width="15" height="15" viewBox="0 0 24 24" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M7 11v9H4v-9h3zm0 0l4-8c1.7 0 2.5 1.2 2.2 2.8L12.6 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7"/></svg>Helpful${c.helpful ? ` · ${c.helpful}` : ""}</button>
          </div></li>`;
      }).join("");
    }

    list.addEventListener("click", (e) => {
      const b = e.target.closest(".c-helpful"); if (!b) return;
      const items = store.get(key, []), mine = store.get(helpfulKey, {});
      const c = items.find((x) => x.id === b.dataset.id); if (!c) return;
      if (mine[c.id]) { delete mine[c.id]; c.helpful = Math.max(0, (c.helpful || 0) - 1); }
      else { mine[c.id] = 1; c.helpful = (c.helpful || 0) + 1; }
      store.set(key, items); store.set(helpfulKey, mine); render();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const ta = $("textarea", form), f = ta.closest(".field");
      const nameIn = $(".c-name input", form), nf = nameIn.closest(".field");
      const text = ta.value.trim(), name = nameIn.value.trim();
      const shake = (fl) => { fl.classList.remove("err"); void fl.offsetWidth; fl.classList.add("err"); };
      const badName = name.length < 2, badText = text.length < 3;
      if (badName) shake(nf); else nf.classList.remove("err");
      if (badText) shake(f); else f.classList.remove("err");
      if (badName || badText) { (badName ? nameIn : ta).focus(); return; }
      const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name.slice(0, 40), type, rating: type === "Review" ? rating : 0, text: text.slice(0, 1200), ts: Date.now(), helpful: 0 };
      const items = store.get(key, []); items.push(item);
      if (!store.set(key, items)) { toast("Couldn't save - storage is blocked in this browser"); return; }
      ta.value = ""; rating = 0; paintStars(0);
      render(item.id);
      toast("Thanks - your comment is posted");
    });
    $$("textarea, input", form).forEach((x) => x.addEventListener("input", (e) => e.target.closest(".field").classList.remove("err")));
    render();
  }

  /* ==========================================================================
     MOTION LAYER
     ========================================================================== */
  const fine = matchMedia("(pointer: fine)").matches;

  /* inertial smooth scrolling (Lenis); native scrolling if the library didn't load */
  if (window.Lenis) {
    const lenis = new window.Lenis({ lerp: 0.16, smoothWheel: true, wheelMultiplier: 1 });
    window.__lenis = lenis;
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      const id = a.getAttribute("href"); if (id.length < 2) return;
      const el = document.querySelector(id); if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -100, duration: 1.0 });
    });
  }

  /* gentle 3D tilt on cards: eased every frame, so it never stalls or jumps */
  function tilt(root = document) {
    if (!fine) return;
    $$(".dish, .plate-card, .mini-dish, .label-stage .nlabel, .how-calc > div", root).forEach((el) => {
      if (el.dataset.tilt) return;
      el.dataset.tilt = "1";
      const isLabel = el.classList.contains("nlabel");
      const max = isLabel ? 6 : 3.5;
      const lift = isLabel ? 8 : el.classList.contains("dish") ? 10 : 6;
      const base = isLabel ? 2.5 : 0; // the label rests slightly rotated
      const cur = { x: 0, y: 0, l: 0, r: base }, tgt = { x: 0, y: 0, l: 0, r: base };
      let raf = 0;
      const step = () => {
        let moving = false;
        for (const k in cur) { const d = tgt[k] - cur[k]; cur[k] += d * 0.2; if (Math.abs(d) > 0.01) moving = true; }
        el.style.transform = `perspective(1000px) translateY(${(-cur.l).toFixed(2)}px) rotate(${cur.r.toFixed(2)}deg) rotateX(${cur.x.toFixed(2)}deg) rotateY(${cur.y.toFixed(2)}deg)`;
        raf = moving ? requestAnimationFrame(step) : 0;
        if (!moving && !el.matches(":hover")) { el.style.transform = ""; el.classList.remove("tilting"); }
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
      el.addEventListener("mouseenter", () => { el.classList.add("tilting"); tgt.l = lift; tgt.r = 0; kick(); });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        tgt.y = ((e.clientX - r.left) / r.width - 0.5) * max;
        tgt.x = -((e.clientY - r.top) / r.height - 0.5) * max;
        kick();
      });
      el.addEventListener("mouseleave", () => { tgt.x = 0; tgt.y = 0; tgt.l = 0; tgt.r = base; kick(); });
    });
  }

  /* parallax: background glows and big footer word drift with scroll */
  const para = () => $$(".blob, .footer-giant, [data-parallax]");
  let paraEls = [];
  function parallax() {
    const vh = innerHeight;
    paraEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      const k = parseFloat(el.dataset.parallax || (el.classList.contains("footer-giant") ? -0.12 : 0.18));
      const off = (r.top + r.height / 2 - vh / 2) * k;
      el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
    });
  }

  /* marquee: always gliding right-to-left, speeding up with scroll velocity */
  function marquee() {
    const track = $(".marquee-track"); if (!track) return;
    let x = 0, half = 1, boost = 0, lastY = scrollY, slow = false;
    const measure = () => (half = track.scrollWidth / 2 || 1);
    measure(); addEventListener("resize", measure); addEventListener("load", measure);
    if (document.fonts) document.fonts.ready.then(measure);
    track.parentElement.addEventListener("mouseenter", () => (slow = true));
    track.parentElement.addEventListener("mouseleave", () => (slow = false));
    let speed = 0.7;
    const tick = () => {
      const dy = Math.abs(scrollY - lastY); lastY = scrollY;
      boost += (Math.min(dy, 80) * 0.08 - boost) * 0.1;
      speed += ((slow ? 0.18 : 0.7) - speed) * 0.05;
      x -= speed + boost;
      if (x <= -half) x += half;
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      requestAnimationFrame(tick);
    };
    tick();
  }

  addEventListener("scroll", () => requestAnimationFrame(parallax), { passive: true });
  window.addEventListener("DOMContentLoaded", () => {
    paraEls = para(); parallax(); marquee(); tilt();
  });

  window.NCUI = { $, $$, fmt, tilt, countUp, toast, esc, store, donutSVG, animateDonut, observe, mountShare, mountComments, logoMark, ROOT, ICONS, fadeImages };

  // auto-mount after page scripts have had a chance to render
  window.addEventListener("DOMContentLoaded", () => {
    $$("[data-share]").forEach(mountShare);
    $$("[data-comments]").forEach(mountComments);
    const begin = () => { if (begin.done) return; begin.done = true; document.documentElement.classList.add("fonts-in"); observe(); };
    if (document.fonts && document.fonts.status !== "loaded") { document.fonts.ready.then(begin); setTimeout(begin, 600); } else begin();
    fadeImages();
  });
})();
