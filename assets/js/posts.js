/* Journal metadata + generated cover art (shared by home, journal index and articles) */
(function () {
  const covers = {
    oil: () => `<svg viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="500" height="400" fill="#f3e2bd"/>
      <g fill="none" stroke="#e2a03a" stroke-opacity=".35">${[60, 100, 140, 180, 220].map((r) => `<ellipse cx="250" cy="318" rx="${r * 1.5}" ry="${r * 0.32}"/>`).join("")}</g>
      <path d="M250 70c-52 78-86 126-86 172a86 86 0 0 0 172 0c0-46-34-94-86-172z" fill="#e2a03a"/>
      <path d="M250 70c-52 78-86 126-86 172a86 86 0 0 0 86 86V70z" fill="#d48f27"/>
      <path d="M212 236c0-22 12-44 26-62" stroke="#fff6df" stroke-width="10" stroke-linecap="round" fill="none" opacity=".85"/>
      <circle cx="208" cy="266" r="6" fill="#fff6df" opacity=".85"/>
      <text x="36" y="56" font-family="JetBrains Mono, monospace" font-size="15" fill="#8a5a0d" letter-spacing="1.5">1 TBSP OIL</text>
      <text x="36" y="80" font-family="JetBrains Mono, monospace" font-size="15" fill="#8a5a0d" letter-spacing="1.5">≈ 120 KCAL</text>
    </svg>`,
    protein: () => `<svg viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="500" height="400" fill="#0e4732"/>
      <circle cx="380" cy="80" r="140" fill="#17614a"/>
      <ellipse cx="200" cy="215" rx="72" ry="92" fill="#f6f1e7"/>
      <circle cx="200" cy="232" r="38" fill="#e2a03a"/>
      <circle cx="188" cy="220" r="9" fill="#f5c46d"/>
      ${[[330, 250, -20], [370, 290, 15], [318, 305, 40], [365, 230, -50], [400, 262, 5]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="20" ry="13" transform="rotate(${r} ${x} ${y})" fill="#d65a3c"/>`).join("")}
      ${[[120, 330], [150, 350], [95, 352]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#c9a66b"/>`).join("")}
      <text x="36" y="56" font-family="JetBrains Mono, monospace" font-size="15" fill="#a9c4a4" letter-spacing="1.5">0.8 G PROTEIN</text>
      <text x="36" y="80" font-family="JetBrains Mono, monospace" font-size="15" fill="#a9c4a4" letter-spacing="1.5">PER KG BODY WEIGHT</text>
    </svg>`,
    slump: () => `<svg viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="500" height="400" fill="#f1ddd3"/>
      <circle cx="320" cy="180" r="118" fill="#fffdf8"/>
      <circle cx="320" cy="180" r="118" fill="none" stroke="#d65a3c" stroke-width="3"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180; return `<line x1="${320 + Math.sin(a) * 100}" y1="${180 - Math.cos(a) * 100}" x2="${320 + Math.sin(a) * 108}" y2="${180 - Math.cos(a) * 108}" stroke="#15261f" stroke-width="${i % 3 ? 2 : 4}" stroke-linecap="round"/>`; }).join("")}
      <line x1="320" y1="180" x2="320" y2="110" stroke="#15261f" stroke-width="6" stroke-linecap="round"/>
      <line x1="320" y1="180" x2="380" y2="180" stroke="#15261f" stroke-width="6" stroke-linecap="round"/>
      <circle cx="320" cy="180" r="8" fill="#d65a3c"/>
      <path d="M0 330 C 60 330, 80 250, 130 250 S 190 360, 250 345 S 330 310, 500 318" fill="none" stroke="#0e4732" stroke-width="5" stroke-linecap="round"/>
      <circle cx="130" cy="250" r="8" fill="#0e4732"/>
      <text x="36" y="56" font-family="JetBrains Mono, monospace" font-size="15" fill="#a63b22" letter-spacing="1.5">BLOOD GLUCOSE</text>
      <text x="36" y="80" font-family="JetBrains Mono, monospace" font-size="15" fill="#a63b22" letter-spacing="1.5">AFTER LUNCH →</text>
    </svg>`,
  };

  const POSTS = [
    {
      slug: "hidden-oil-in-everyday-food",
      title: "The hidden oil in everyday food",
      tag: "Ingredients",
      date: "18 Nov 2026",
      read: "6 min read",
      cover: "oil",
      excerpt: "A single tablespoon of oil carries about 120 kcal, and a plate of bhuna can hide four of them. Here is where the oil goes, what reused oil does, and simple ways to cut it without losing flavour.",
    },
    {
      slug: "how-much-protein-do-students-need",
      title: "How much protein does a student actually need?",
      tag: "Nutrition",
      date: "11 Nov 2026",
      read: "7 min read",
      cover: "protein",
      excerpt: "Less than the gym forums say, and more than many hostel diets deliver. Here is the 0.8 g/kg rule, why rice and dal work as a team, and how to spread protein across the day.",
    },
    {
      slug: "the-afternoon-slump",
      title: "The 3 pm slump: what your lunch has to do with it",
      tag: "Human body",
      date: "4 Nov 2026",
      read: "6 min read",
      cover: "slump",
      excerpt: "Your brain burns about a fifth of your resting energy. Part of the afternoon dip is your body clock, and part of it is your plate. Here is what the research says you can change.",
    },
  ];

  window.NCPosts = { POSTS, covers };
})();
