import sharp from 'sharp';

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#5eead4" stroke-opacity=".055" stroke-width="1"/>
    </pattern>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#5eead4" stop-opacity=".16"/>
      <stop offset="100%" stop-color="#5eead4" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#06090c"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <circle cx="160" cy="80" r="430" fill="url(#glow)"/>
  <rect x="44" y="44" width="1112" height="542" fill="none" stroke="#1c2a2e"/>

  <text x="80" y="104" fill="#5eead4" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="6">RI</text>
  <text x="145" y="103" fill="#8aa09e" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="5">RISINGINSIGHT / ENGINEERING LOG</text>
  <text x="1120" y="103" fill="#637777" font-family="Arial, Helvetica, sans-serif" font-size="13" text-anchor="end" letter-spacing="4">BUILD 2026.10</text>

  <text x="80" y="300" fill="#e8f2f1" font-family="Arial, Helvetica, sans-serif" font-size="104" font-weight="700" letter-spacing="-6">Build<tspan fill="#5eead4">.</tspan> Break<tspan fill="#5eead4">.</tspan></text>
  <text x="80" y="410" fill="#e8f2f1" font-family="Arial, Helvetica, sans-serif" font-size="104" font-weight="700" letter-spacing="-6">Document<tspan fill="#5eead4">.</tspan></text>

  <text x="82" y="476" fill="#8aa09e" font-family="Arial, Helvetica, sans-serif" font-size="21" letter-spacing="1">Generative systems / Diffusion / Build in public</text>

  <line x1="80" y1="520" x2="1120" y2="520" stroke="#1c2a2e"/>
  <text x="80" y="555" fill="#637777" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="3">RISINGINSIGHT.GITHUB.IO</text>
  <text x="1120" y="555" fill="#5eead4" font-family="Arial, Helvetica, sans-serif" font-size="13" text-anchor="end" letter-spacing="3">ASTRO / GITHUB PAGES</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og-default.png');
console.log('Wrote public/og-default.png');
