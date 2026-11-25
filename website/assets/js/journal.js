(function () {
  const { $, $$ } = window.NCUI;
  const { POSTS, covers } = window.NCPosts;
  const R = window.NCUI.ROOT;

  // journal index
  const feat = $("#feature");
  if (feat) {
    const [f, ...rest] = POSTS;
    feat.innerHTML = `<a class="post-cover" href="journal/${f.slug}.html" data-reveal="scale">${covers[f.cover]()}</a>
      <div><div class="post-meta" data-reveal><span>${f.tag}</span><span>${f.date}</span><span>${f.read}</span></div>
        <h2 data-reveal><a href="journal/${f.slug}.html">${f.title}</a></h2>
        <p class="lede" data-reveal>${f.excerpt}</p>
        <a class="btn" href="journal/${f.slug}.html" data-reveal style="margin-top:12px">Read the article <span class="arrow">→</span></a></div>`;
    $("#post-grid").innerHTML = rest.map((p, i) => `<a class="post-card" href="journal/${p.slug}.html" data-reveal style="--d:${i * 0.08}s">
      <div class="post-cover">${covers[p.cover]()}</div>
      <div class="post-meta"><span>${p.tag}</span><span>${p.date}</span><span>${p.read}</span></div>
      <h3>${p.title}</h3><p>${p.excerpt}</p></a>`).join("") + `
      <div class="post-card" data-reveal style="--d:.16s;justify-content:center;padding:36px;border-radius:var(--r-lg);border:1.5px dashed var(--line-2)">
        <span class="eyebrow">Coming next</span><h3>Ilish, rui or pangas: which fish gives you what?</h3>
        <p>New articles on food, ingredients and the human body every couple of weeks.</p></div>`;
  }

  // article page
  const art = document.body.dataset.post;
  if (art) {
    const p = POSTS.find((x) => x.slug === art);
    // wide banner: show the whole illustration and extend its background colour to the edges
    const cov = $("#cover");
    cov.innerHTML = covers[p.cover]();
    const svg = $("svg", cov);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    cov.style.background = $("rect", svg).getAttribute("fill");
    $$("[data-meta]").forEach((el) => (el.innerHTML = `<span>${p.tag}</span><span>${p.date}</span><span>${p.read}</span>`));

    // table of contents
    const heads = $$(".prose h2");
    heads.forEach((h, i) => (h.id = h.id || "s" + (i + 1)));
    $("#toc").innerHTML = heads.map((h) => `<li><a href="#${h.id}">${h.textContent}</a></li>`).join("");
    const links = $$("#toc a");
    const spy = new IntersectionObserver((ens) => {
      ens.forEach((en) => { if (en.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id)); });
    }, { rootMargin: "-20% 0px -70% 0px" });
    heads.forEach((h) => spy.observe(h));

    // reading progress
    const bar = $(".read-progress"), prose = $(".prose");
    addEventListener("scroll", () => {
      const r = prose.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight * 0.6)));
      bar.style.width = pct * 100 + "%";
    }, { passive: true });

    // next reads
    const next = $("#next");
    if (next) next.innerHTML = POSTS.filter((x) => x.slug !== art).map((x, i) => `<a class="post-card" href="${R}journal/${x.slug}.html" data-reveal style="--d:${i * 0.08}s">
      <div class="post-cover" style="aspect-ratio:16/9">${covers[x.cover]()}</div>
      <div class="post-meta"><span>${x.tag}</span><span>${x.read}</span></div><h3>${x.title}</h3></a>`).join("");
  }
})();
