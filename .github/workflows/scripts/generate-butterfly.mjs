import fs from "fs";
import path from "path";

const GH_TOKEN = process.env.GH_TOKEN;
const GH_USER = process.env.GH_USER;

if (!GH_TOKEN || !GH_USER) {
  console.error("Missing GH_TOKEN or GH_USER env var.");
  process.exit(1);
}

const query = `
query($login:String!) {
  user(login:$login) {
    contributionsCollection {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`;

const resp = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${GH_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query, variables: { login: GH_USER } }),
});

const data = await resp.json();
if (data.errors) {
  console.error(data.errors);
  process.exit(1);
}

const days =
  data.data.user.contributionsCollection.contributionCalendar.weeks.flatMap(
    (w) => w.contributionDays
  );

const CELL = 12;
const GAP = 3;
const WEEKS = 53;
const ROWS = 7;

const gridWidth = WEEKS * (CELL + GAP) + GAP;
const gridHeight = ROWS * (CELL + GAP) + GAP;

function colorFor(count) {
  if (count === 0) return "#130016";
  if (count <= 2) return "#ffb3ff";
  if (count <= 5) return "#ff69ff";
  if (count <= 10) return "#ff1493";
  return "#a21caf";
}

let rects = "";
let i = 0;

for (let x = 0; x < WEEKS; x++) {
  for (let y = 0; y < ROWS; y++) {
    const d = days[i++];
    const fill = d ? colorFor(d.contributionCount) : "#130016";
    const rx = GAP + x * (CELL + GAP);
    const ry = GAP + y * (CELL + GAP);
    const title = d ? `${d.date}: ${d.contributionCount} contributions` : "";
    rects += `
      <rect x="${rx}" y="${ry}" width="${CELL}" height="${CELL}" rx="3" fill="${fill}">
        <title>${title}</title>
      </rect>`;
  }
}

const pathD = `
M ${GAP} ${gridHeight * 0.40}
C ${gridWidth * 0.20} ${gridHeight * 0.10},
  ${gridWidth * 0.45} ${gridHeight * 0.95},
  ${gridWidth * 0.65} ${gridHeight * 0.35}
S ${gridWidth * 0.90} ${gridHeight * 0.15},
  ${gridWidth - GAP} ${gridHeight * 0.60}
`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${gridWidth}" height="${gridHeight}" viewBox="0 0 ${gridWidth} ${gridHeight}"
     xmlns="http://www.w3.org/2000/svg">

  <defs>
    <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur1"/>
      <feGaussianBlur stdDeviation="7" result="blur2"/>
      <feColorMatrix in="blur2" type="matrix"
        values="
          1 0 0 0 0
          0 0.2 0 0 0
          0 0 1 0 0
          0 0 0 1 0" result="pinkGlow"/>
      <feMerge>
        <feMergeNode in="pinkGlow"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect x="0" y="0" width="${gridWidth}" height="${gridHeight}" rx="12" fill="#080010"/>

  <g filter="url(#neonGlow)">
    ${rects}
  </g>

  <path id="flyPath" d="${pathD.trim()}" fill="none" stroke="none"/>

  <g filter="url(#neonGlow)">
    <g>
      <animateMotion dur="8s" repeatCount="indefinite" rotate="auto">
        <mpath href="#flyPath"/>
      </animateMotion>

      <circle cx="0" cy="0" r="3" fill="#ffffff" opacity="0.95"/>
      <path d="M0,2 L0,12" stroke="#ffffff" stroke-width="1.6" opacity="0.95"/>

      <path d="M0,0 C-9,-9 -20,-7 -16,10 C-12,22 -4,14 0,5 Z"
            fill="#ff69ff" opacity="0.95"/>

      <path d="M0,0 C9,-9 20,-7 16,10 C12,22 4,14 0,5 Z"
            fill="#ff1493" opacity="0.95"/>
    </g>
  </g>

</svg>
`;

const outDir = path.join(process.cwd(), "dist");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "github-contribution-grid-butterfly.svg"),
  svg,
  "utf8"
);

console.log("Generated dist/github-contribution-grid-butterfly.svg");
