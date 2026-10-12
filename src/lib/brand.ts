function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(n: number) {
  return (n % 1000) / 1000;
}

export function avatarSvg(seed: string) {
  const h = hash(seed || "neuralpad");
  const nodes = Array.from({ length: 7 }, (_, i) => {
    const x = 18 + unit(h >> i) * 64 + (i % 3) * 8;
    const y = 16 + unit(h >> (i + 3)) * 68;
    return { x: Math.round(x), y: Math.round(y), r: i === 3 ? 4.5 : 2.6 };
  });
  const lines = nodes
    .slice(1)
    .map((node, i) => `<line x1="${nodes[i].x}" y1="${nodes[i].y}" x2="${node.x}" y2="${node.y}" />`)
    .join("");
  const dots = nodes
    .map(
      (node, i) =>
        `<circle cx="${node.x}" cy="${node.y}" r="${node.r}" class="${i === 3 ? "accent" : "node"}" />`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="Agent avatar">
  <rect width="96" height="96" rx="22" fill="#10151f"/>
  <g fill="none" stroke="#3ee0ff" stroke-opacity="0.55" stroke-width="1.2">${lines}</g>
  <style>.node{fill:#d7f7ff}.accent{fill:#8d7cff}</style>
  ${dots}
</svg>`;
}

export function tokenMarkSvg(name: string, symbol: string) {
  const h = hash(`${name}:${symbol}`);
  const hueA = h % 40;
  const letter = (symbol || name || "N").slice(0, 2).toUpperCase();
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${letter} token mark">
  <rect width="256" height="256" rx="48" fill="#090d14"/>
  <circle cx="128" cy="128" r="${70 + (h % 18)}" fill="none" stroke="hsl(${180 + hueA} 100% 70%)" stroke-width="3" opacity="0.85"/>
  <circle cx="${80 + (h % 30)}" cy="${78 + (h % 20)}" r="7" fill="#3ee0ff"/>
  <circle cx="${150 + (h % 24)}" cy="${92 + (h % 16)}" r="5" fill="#8d7cff"/>
  <circle cx="${120 + (h % 20)}" cy="${160 + (h % 12)}" r="6" fill="#e7edf4"/>
  <path d="M${70 + (h % 10)} ${150 - (h % 8)} L128 64 L${186 - (h % 10)} ${150 - (h % 8)}" fill="none" stroke="#3ee0ff" stroke-width="2"/>
  <text x="128" y="138" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-size="42" fill="#e7edf4" font-weight="650">${letter}</text>
</svg>`;
}

export function bannerSvg(name: string) {
  const safe = name.replace(/[<>&"]/g, "").slice(0, 32);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" role="img" aria-label="${safe} banner">
  <rect width="1200" height="400" fill="#07090f"/>
  <g fill="none" stroke="#3ee0ff" stroke-opacity="0.35" stroke-width="1.4">
    <path d="M80 260 C 220 80, 380 320, 560 160 S 900 80, 1120 220"/>
    <path d="M60 180 C 240 40, 420 300, 640 140 S 980 240, 1140 120"/>
  </g>
  <circle cx="220" cy="150" r="6" fill="#3ee0ff"/>
  <circle cx="560" cy="160" r="8" fill="#8d7cff"/>
  <circle cx="900" cy="130" r="5" fill="#e7edf4"/>
  <text x="72" y="330" fill="#e7edf4" font-family="ui-sans-serif, system-ui" font-size="54" font-weight="650">${safe}</text>
</svg>`;
}

export function logoSvg(compact = false) {
  if (compact) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#10151f"/>
      <path d="M8 23 V9 H11.2 L16 16.2 L20.8 9 H24 V23 H21.2 V14.2 L16.8 20.6 H15.2 L10.8 14.2 V23 H8Z" fill="#E7EDF4"/>
      <circle cx="8" cy="9" r="1.4" fill="#3EE0FF"/>
      <circle cx="24" cy="9" r="1.4" fill="#8D7CFF"/>
      <circle cx="16" cy="23.2" r="1.5" fill="#3EE0FF"/>
    </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 36" fill="none">
    <rect width="36" height="36" rx="9" fill="#10151f"/>
    <path d="M9 26 V10 H12.4 L17.6 17.6 L22.8 10 H26.2 V26 H23.2 V15.4 L18.5 22.2 H16.7 L12 15.4 V26 H9Z" fill="#E7EDF4"/>
    <circle cx="9" cy="10" r="1.5" fill="#3EE0FF"/>
    <circle cx="26.2" cy="10" r="1.5" fill="#8D7CFF"/>
    <circle cx="17.6" cy="26.4" r="1.6" fill="#3EE0FF"/>
    <text x="46" y="24" fill="#E7EDF4" font-family="ui-sans-serif, system-ui" font-size="16" font-weight="680" letter-spacing="1.8">NEURALPAD</text>
  </svg>`;
}
