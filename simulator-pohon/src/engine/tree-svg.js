// Snapshot of the original Kebunku SVG renderer. No application/API imports.
import { STAGES } from './gamification.js';
const MAX_VISIBLE_FRUIT = 7;
export function makeTreeSvg(level, condition, fruitView) {
  const palettes = {
    healthy: { leaf: '#4ca947', leafDark: '#2d8b45', leafLight: '#86c342', trunk: '#a04b26', trunkLight: '#c16b35', branch: '#84391f' },
    thirsty: { leaf: '#d9b93f', leafDark: '#a87f22', leafLight: '#f3e078', trunk: '#9b7049', trunkLight: '#bd9366', branch: '#916441' },
    dead: { leaf: '#c0a86e', leafDark: '#947f45', leafLight: '#dcc98a', trunk: '#8a7361', trunkLight: '#ab9271', branch: '#6f5d4d' },
  };
  const colors = palettes[condition];
  // Buah terikat konten: tampil per slot; basi rebah busuk di tanah.
  const boundTreeFruits = level >= 3 ? fruitView.tree : [];
  const fallenFruits = level >= 3 ? [...fruitView.ground].sort((a, b) => a.slot - b.slot) : [];
  const fruitCount = boundTreeFruits.length;
  const svgStart = `<svg class="tree-svg stage-${level} ${condition}" viewBox="0 0 600 440" preserveAspectRatio="xMidYMax meet" role="group" aria-label="Pohon Level ${level}, ${STAGES[level]}, kondisi ${condition}, ${fruitCount} Buah di pohon${fallenFruits.length ? `, ${fallenFruits.length} Buah busuk rebah di tanah` : ''}">`;
  // Decorative shedding uses shared SVG coordinates, independent of canopy
  // transforms and content-bound fruit. Healthy trees shed one leaf sparsely;
  // unhealthy trees shed more leaves continuously.
  const sheddingY = [440, 387, 290, 214, 173, 150, 120, 95][level] ?? 290;
  const sheddingWidth = [0, 25, 45, 52, 62, 80, 94, 115][level] ?? 45;
  const fallingLeaves = level >= 2
    ? `<g class="falling-leaves" aria-hidden="true">${[-.8, .15, .75, -.35, .5, -.65].slice(0, condition === 'dead' ? 6 : condition === 'thirsty' ? 3 : 1).map((offset, index) => {
      const x = 300 + offset * sheddingWidth;
      const y = sheddingY + (index % 3) * 12;
      const drift = (index % 2 ? 1 : -1) * (22 + index * 7);
      return `<g transform="translate(${x} ${y})"><g class="falling-leaf" style="--leaf-dx:${drift}px;--leaf-dy:${430 - y}px;--leaf-spin:${index % 2 ? 210 : -180}deg;--leaf-delay:${-index * 760}ms"><path d="M0 0Q-12-1-15-12Q-3-14 0 0Z" fill="${index % 2 ? colors.leaf : colors.leafDark}"/><path d="M-1-1L-10-9" stroke="${colors.branch}" stroke-width=".8"/></g></g>`;
    }).join('')}</g>`
    : '';

  if (level === 0) {
    return `${svgStart}</svg>`;
  }

  if (level === 1) {
    return `${svgStart}<path class="seed-stem" d="M300 446 C298 425 299 402 301 383" fill="none" stroke="${colors.trunk}" stroke-width="8" stroke-linecap="round"/><path class="seed-leaf seed-leaf-left" d="M301 401 C279 400 264 386 259 366 C283 366 299 381 301 401Z" fill="${colors.leaf}"/><path class="seed-leaf seed-leaf-right" d="M301 391 C306 368 324 356 345 357 C340 380 323 393 301 391Z" fill="${colors.leafLight}"/>${fallingLeaves}</svg>`;
  }

  // All stages share one bounded coordinate system and the same soil baseline.
  const topCanopyByLevel = {
    2: [300, 310, 1],
    3: [300, 235, 1.25],
    // Level 4 memakai fullCanopy (gaya level 5+) pada skala lebih muda.
    4: [300, 185, 0.65],
    5: [300, 164, 0.78],
    6: [300, 133, 0.83],
    7: [300, 105, 0.89],
  };
  const sideCanopiesByLevel = {
    5: [[179, 246, 0.56]],
    6: [[160, 235, 0.62], [440, 235, 0.62]],
    7: [[134, 258, 0.74], [466, 258, 0.74]],
  };
  const topCanopy = topCanopyByLevel[level];
  const sideCanopies = sideCanopiesByLevel[level] ?? [];
  const trunkTipY = topCanopy[1];
  const trunkHeight = 446 - trunkTipY;
  const grassTuft = ([x, s, flip, color]) => `<g class="grass-tuft" transform="translate(${x} 443) scale(${flip ? -s : s} ${s})" stroke="${color}" stroke-width="3.5" stroke-linecap="round" fill="none"><path d="M0 0C-3-8-8-12-13-14"/><path d="M0 0C-1-10 0-17 2-23"/><path d="M0 0C3-8 8-12 13-13"/></g>`;
  const grassByLevel = {
    3: [[150, 1, false, colors.leaf], [450, 1.1, true, colors.leafDark]],
    4: [[130, 1, false, colors.leafDark], [230, 0.9, true, colors.leaf], [470, 1.05, false, colors.leafDark]],
    5: [[110, 1, false, colors.leaf], [210, 0.85, true, colors.leafDark], [390, 0.9, false, colors.leaf], [490, 1.1, true, colors.leafDark]],
    6: [[85, 1, false, colors.leafDark], [170, 0.9, true, colors.leaf], [250, 1, false, colors.leafDark], [420, 0.95, true, colors.leaf], [495, 1.1, false, colors.leafDark]],
    7: [[70, 1, true, colors.leaf], [145, 0.9, false, colors.leafDark], [220, 1.05, true, colors.leaf], [380, 0.9, false, colors.leafDark], [455, 1.1, true, colors.leaf], [530, 1, false, colors.leafDark]],
  };
  const grass = (grassByLevel[level] ?? []).map(grassTuft).join('');
  // Ground flowers share the grass anchors, so each tuft becomes a little
  // planted patch. Stable varieties: daisy, bell and a small flowering sprig.
  // Decorative only: no additional fruit slots or rewards.
  const gardenFlowers = condition === 'healthy' && level >= 3
    ? (grassByLevel[level] ?? []).map(([x, scale, flip], index) => {
      const type = index % 3;
      const tone = ['#f3b7d0', '#c2b1ef', '#fff2c9', '#f3c16b'][(index + level - 3) % 4];
      const petals = type === 0
        ? `<g fill="${tone}"><circle cx="-4" cy="-22" r="4"/><circle cx="4" cy="-22" r="4"/><circle cy="-27" r="4"/><circle cy="-17" r="4"/></g><circle cy="-22" r="3" fill="#dca343"/>`
        : type === 1
          ? `<path d="M-6-18Q-6-31 0-29Q6-31 6-18L2-20 0-17-2-20Z" fill="${tone}"/><path d="M0-20v3" stroke="#e2b64b" stroke-width="2"/>`
          : `<path d="M0-12l-4-5M0-21l4-5" stroke="${colors.leafDark}" stroke-width="1.5"/><g fill="${tone}"><circle cx="-4" cy="-18" r="3.5"/><circle cx="4" cy="-27" r="3.5"/><circle cy="-32" r="3.5"/></g>`;
      return `<g class="garden-flower" data-flower-variety="${type}" transform="translate(${x + (flip ? -10 : 10)} 442) scale(${scale})" aria-hidden="true"><path d="M0 0Q2-12 0-${type === 2 ? 31 : 22}" fill="none" stroke="${colors.leafDark}" stroke-width="1.8"/><path d="M0-8Q-9-8-9-14Q-2-14 0-8M0-12Q8-12 8-18Q2-18 0-12" fill="${colors.leaf}"/>${petals}</g>`;
    }).join('')
    : '';
  const trunkWidthScaleByLevel = { 2: 0.6, 3: 0.8, 4: 1, 5: 1.15, 6: 1.3, 7: 1.45 };
  const trunkScale = trunkWidthScaleByLevel[level] ?? 1;
  const trunkX = (x) => 300 + (x - 300) * trunkScale;
  const trunkPath = `M${trunkX(270)} 446 C${trunkX(282)} ${446 - trunkHeight * .2} ${trunkX(288)} ${trunkTipY + trunkHeight * .45} ${trunkX(290)} ${trunkTipY + trunkHeight * .31} L${trunkX(294)} ${trunkTipY + 18} Q300 ${trunkTipY - 9} ${trunkX(306)} ${trunkTipY + 18} L${trunkX(310)} ${trunkTipY + trunkHeight * .31} C${trunkX(312)} ${trunkTipY + trunkHeight * .45} ${trunkX(318)} ${446 - trunkHeight * .2} ${trunkX(330)} 446Z`;
  const trunkHighlight = `M${trunkX(285)} 446 C${trunkX(294)} ${446 - trunkHeight * .2} ${trunkX(297)} ${trunkTipY + trunkHeight * .45} ${trunkX(297)} ${trunkTipY + trunkHeight * .31} L${trunkX(298)} ${trunkTipY + 18} Q300 ${trunkTipY + 12} ${trunkX(302)} ${trunkTipY + 18} L${trunkX(303)} ${trunkTipY + trunkHeight * .31} C${trunkX(303)} ${trunkTipY + trunkHeight * .45} ${trunkX(306)} ${446 - trunkHeight * .2} ${trunkX(315)} 446Z`;
  // The young apple tree has a slim, slightly tapered stem. Reusing the
  // mature tree's flared trunk made the seedling look like a palm/corn stalk.
  const youngTrunk = level <= 3
    ? `<path class="tree-trunk" d="M${level === 2 ? 294 : 290} 446 Q${level === 2 ? 297 : 295} 366 297 ${trunkTipY + 9} Q300 ${trunkTipY - 8} 303 ${trunkTipY + 9} Q${level === 2 ? 303 : 305} 366 ${level === 2 ? 306 : 310} 446Z" fill="${colors.trunk}" stroke="${level === 2 ? colors.trunk : colors.branch}" stroke-width="1.8"/>${level === 2 ? '' : `<path d="M299 443 Q300 350 299 ${trunkTipY + 13}" fill="none" stroke="${colors.trunkLight}" stroke-width="2" opacity=".6"/>`}`
    : `<path class="tree-trunk" d="${trunkPath}" fill="${colors.trunk}" stroke="${colors.branch}" stroke-width="2.5" stroke-linejoin="round"/><path d="${trunkHighlight}" fill="${colors.trunkLight}" opacity=".68"/>`;
  const trunk = `<g class="trunk-lift">${youngTrunk}</g>`;
  // Side branches rise diagonally from the lower trunk into the side canopies (V shape).
  const branches = sideCanopies.map(([x, y]) => {
    const bx = 300, by = y + 75;
    const tx = 300 + (x - 300) * 0.55, ty = y + 5;
    const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, wb = 11 * trunkScale, wt = 4.5 * trunkScale;
    const path = `M${(bx + nx * wb).toFixed(1)} ${(by + ny * wb).toFixed(1)} L${(tx + nx * wt).toFixed(1)} ${(ty + ny * wt).toFixed(1)} L${(tx - nx * wt).toFixed(1)} ${(ty - ny * wt).toFixed(1)} L${(bx - nx * wb).toFixed(1)} ${(by - ny * wb).toFixed(1)}Z`;
    return `<path class="tree-branch" d="${path}" fill="${colors.trunk}" stroke="${colors.branch}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }).join('');
  const fullCanopy = `<path d="M200 55C223 55 242 69 250 88 276 72 306 83 314 109 341 111 355 134 345 157 366 179 354 208 331 221 328 248 300 261 274 247 258 267 228 273 204 259 181 275 151 269 137 248 109 260 82 244 79 218 54 205 51 177 70 158 59 132 77 106 104 104 108 79 135 65 164 79 174 63 186 55 200 55Z" fill="${colors.leafDark}"/><path d="M200 75C220 74 235 88 241 104 265 89 291 99 297 121 319 122 332 141 323 160 339 179 328 202 308 211 305 234 281 244 260 232 245 249 220 254 201 242 180 255 155 248 144 231 121 242 99 227 98 207 77 197 76 175 92 160 82 138 98 118 120 117 124 96 147 84 170 95 178 82 188 75 200 75Z" fill="${colors.leaf}"/><path d="M200 99C217 98 230 109 235 124 254 113 277 122 281 142 299 145 308 161 300 177 312 194 302 212 284 219 279 237 258 243 242 233 228 246 208 248 194 237 177 247 157 240 150 225 131 232 114 218 116 200 99 188 103 168 118 156 111 138 127 122 145 125 149 107 167 101 181 111 187 104 193 99 200 99Z" fill="${colors.leafLight}"/>`;
  const placeInCanopy = (markup, [x, y, scale], className = '') => `<g class="${className}" transform="translate(${x} ${y}) scale(${scale}) translate(-200 -154)">${markup}</g>`;
  // Level 2: a Y-shaped scaffold with a third, upright leader growing through
  // its middle. All three stems share the brown of the trunk at the ground.
  const saplingLeader = `<path d="M200 222 Q200 165 200 112" fill="none" stroke="${colors.trunk}" stroke-width="5" stroke-linecap="round"/>`
    + `<path d="M200 171 Q181 145 150 135 M200 171 Q219 145 250 135" fill="none" stroke="${colors.trunk}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  // The same pointed leaf shape as level 1. Two leaves at each fork tip and
  // three at the central tip, all attached directly to the Y-shaped stem.
  const saplingBlade = 'M0 0 C-22 -1 -37 -15 -42 -35 C-18 -35 -2 -20 0 0Z';
  const saplingLeaf = (x, y, scale, angle, mirrored, tone) =>
    `<path class="sapling-leaf" d="${saplingBlade}" transform="translate(${x} ${y}) ${mirrored ? 'scale(-1 1)' : ''} rotate(${angle}) scale(${scale})" fill="${colors[tone]}"/>`;
  const saplingLeaves = [
    saplingLeaf(150, 135, .72, -25, false, 'leaf'),
    saplingLeaf(150, 135, .67, -18, true, 'leafLight'),
    saplingLeaf(200, 112, .72, -25, false, 'leaf'),
    saplingLeaf(200, 112, .65, 50, false, 'leafLight'),
    saplingLeaf(200, 112, .72, -25, true, 'leaf'),
    saplingLeaf(250, 135, .67, -18, false, 'leafLight'),
    saplingLeaf(250, 135, .72, -25, true, 'leaf'),
  ].join('');
  // Level 3 continues level 2's symmetric Y and straight central leader.
  // Fork lower down so the spreading arms remain visible below the crown.
  const juvenileBranches = `<path d="M200 225 Q200 171 200 115" fill="none" stroke="${colors.trunk}" stroke-width="6" stroke-linecap="round"/>`
    + `<path d="M200 225 Q181 185 150 160 M200 225 Q219 185 250 160" fill="none" stroke="${colors.trunk}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const juvenileCrown = [
    [169, 172, .24], [231, 170, .24], [195, 136, .29],
  ].map((position) => placeInCanopy(fullCanopy, position, 'mini-canopy')).join('');
  const youngCanopyMarkup = level === 2
    ? saplingLeader + saplingLeaves
    : juvenileBranches + juvenileCrown;
  const canopyMarkup = placeInCanopy(level >= 4 ? fullCanopy : youngCanopyMarkup, topCanopy, 'canopy-crown');
  const canopyTips = sideCanopies.map((position) => placeInCanopy(fullCanopy, position, 'canopy-tip-copy')).join('');
  // Fixed fruit slots follow the young crown, then the mature crown.
  const fruitPositions = level === 3
    ? [[191, 149], [213, 145], [200, 171], [165, 174], [233, 172], [179, 189], [220, 187]]
    : [[178, 162], [223, 150], [154, 188], [242, 190], [196, 207], [211, 122], [171, 126]];
  // Slot > 7 tidak punya titik mahkota; selisihnya tampil sebagai penanda +n.
  // Titik rebah: x + sudut per spot; tinggi apel mengikuti skala sehingga
  // bagian bawahnya selalu menempel garis tanah (tidak melayang).
  // Fallen fruit gathers beside the trunk (x=300), nearest spots first,
  // alternating left/right instead of starting at the far edge of the scene.
  const lyingSpots = [[246, 68], [354, -72], [220, 64], [380, -55], [194, 70], [406, -64], [168, 55]];
  const visibleTreeSlots = boundTreeFruits
    .filter((entry) => entry.slot >= 1 && entry.slot <= MAX_VISIBLE_FRUIT)
    .map((entry) => entry.slot);
  const overflowTreeCount = boundTreeFruits.length - visibleTreeSlots.length;
  const lyingVisible = fallenFruits.slice(0, MAX_VISIBLE_FRUIT);
  const overflowGroundCount = Math.max(0, fallenFruits.length - lyingVisible.length);
  // Realistic apple skin per admin-decided content condition: ripe red = ACC
  // (menggantung), rotten brown with spots = stale rebah di tanah. Buah yang
  // diangkat (tidak relevan / duplikat) tidak tergambar apa pun — slot kosong.
  // Define visible fruit size in the shared SVG space, not canopy-local
  // coordinates. Cancel the parent scale to avoid a size spike at level 4.
  const fruitDisplayScaleByLevel = { 3: .9, 4: 1, 5: 1.1, 6: 1.2, 7: 1.3 };
  const fruitDisplayScale = fruitDisplayScaleByLevel[level] ?? .8;
  const fruitScale = fruitDisplayScale / topCanopy[2];
  const fruitStylesByStatus = {
    pending: { gradient: 'appleUnripe', stroke: '#4a6b28', stem: '#4a6b28', leaf: '#6f9c38', spots: false },
    validated: { gradient: 'appleRipe', stroke: '#7a150f', stem: '#3f7a3d', leaf: '#4ca947', spots: false },
    stale: { gradient: 'appleRotten', stroke: '#3a2312', stem: '#6b5230', leaf: '#8a6a3f', spots: true },
    rejected: { gradient: 'appleSallow', stroke: '#4f4630', stem: '#7a6d4a', leaf: '#9a8a5a', spots: false },
    duplicate: { gradient: 'appleDup', stroke: '#3d3833', stem: '#6f6558', leaf: '#8a8177', spots: false },
  };
  const fruitDefs = `<defs><linearGradient id="appleRipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2593d"/><stop offset=".5" stop-color="#cc3327"/><stop offset="1" stop-color="#8f1c13"/></linearGradient><linearGradient id="appleUnripe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cbe47f"/><stop offset=".55" stop-color="#97c24f"/><stop offset="1" stop-color="#5f8734"/></linearGradient><linearGradient id="appleRotten" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b08455"/><stop offset=".45" stop-color="#7c5430"/><stop offset="1" stop-color="#45280f"/></linearGradient><linearGradient id="appleSallow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9b57e"/><stop offset=".45" stop-color="#a08e57"/><stop offset="1" stop-color="#6b5c36"/></linearGradient><linearGradient id="appleDup" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a89c8c"/><stop offset=".45" stop-color="#837767"/><stop offset="1" stop-color="#565046"/></linearGradient></defs>`;
  const appleSpots = '<ellipse cx="-2.5" cy="1.5" rx="2" ry="1.4" fill="#5a3820" opacity=".55"/><ellipse cx="3" cy="3" rx="1.6" ry="1.1" fill="#4a2b12" opacity=".5"/>';
  const appleBody = 'M0 -5.2C-1.6 -7.8 -4.6 -8.6 -6.8 -7.4C-9.6 -5.8 -10.1 -1.9 -8.2 1.7C-6.6 4.9 -3.6 7.6 -1 7.9C-0.4 8 0.4 8 1 7.9C3.6 7.6 6.6 4.9 8.2 1.7C10.1 -1.9 9.6 -5.8 6.8 -7.4C4.6 -8.6 1.6 -7.8 0 -5.2Z';
  const appleByStatus = (statusKey, { lying = false } = {}) => {
    const style = fruitStylesByStatus[statusKey] ?? fruitStylesByStatus.validated;
    // Apel rebah: tangkai patah pendek menempel badan, tanpa daun — sulur
    // panjang dengan daun menjuntai terbaca sebagai benda melayang terpisah.
    const stemMarkup = lying
      ? `<path d="M0 -5.2q2.6 -.8 5 -1.4" fill="none" stroke="${style.stem}" stroke-width="2.2" stroke-linecap="round"/>`
      : `<g transform="translate(0 2.6)"><path d="M0 -8q1-7 7-8" fill="none" stroke="${style.stem}" stroke-width="2.5" stroke-linecap="round"/><path d="M7 -15q6-3 9 2q-5 4-9-2Z" fill="${style.leaf}"/></g>`;
    // Bentuk apel sejati: bahu lebar, cekungan di tangkai, lekukan kecil bawah.
    // fruit-core = target animasi pop; grup .tree-fruit di luarnya memegang
    // transform posisi dan tidak boleh disentuh animasi CSS.
    return `<g class="fruit-core"><path d="${appleBody}" fill="url(#${style.gradient})" stroke="${style.stroke}" stroke-width="1.5" stroke-linejoin="round"/>${stemMarkup}<ellipse cx="-3.4" cy="-2.8" rx="2.4" ry="3.4" fill="#fff" opacity=".72" transform="rotate(-18 -3.4 -2.8)"/>${style.spots ? appleSpots : ''}</g>`;
  };
  // Slot mengikuti urutannya; slot tanpa buah (belum dipindah/hilang) = celah.
  const fruitMarkup = visibleTreeSlots.map((slot) => {
    const [x, y] = fruitPositions[slot - 1];
    return `<g class="tree-fruit fruit-validated" data-fruit-slot="${slot}" role="button" tabindex="0" aria-label="Lihat konten buah ${slot}" style="--fruit-index:${slot - 1}" transform="translate(${x} ${y}) scale(${fruitScale})"><circle class="fruit-hit-area" r="15" fill="transparent"/>${appleByStatus('validated')}</g>`;
  }).join('');
  const lyingMarkup = lyingVisible.map((entry, index) => {
    const [x, angle] = lyingSpots[index];
    const s = fruitDisplayScale * 0.95;
    // Garis tanah visual ≈ y 429–446; jangkar 14 unit per skala menjaga
    // bagian bawah apel menempel rumput pada semua level.
    const y = 436 - 14 * s;
    return `<g class="tree-fruit fruit-ground-lying" data-fruit-slot="${entry.slot}" role="button" tabindex="0" aria-label="Lihat konten buah basi ${entry.slot}" style="--fruit-index:${index}" transform="translate(${x} ${y.toFixed(1)}) rotate(${angle}) scale(${s})"><circle class="fruit-hit-area" r="15" fill="transparent"/>${appleByStatus('stale', { lying: true })}</g>`;
  }).join('');
  // Penanda +n ditempatkan di samping kanopi sesuai lebar tiap level.
  const counterSpot = level === 2 ? [272, 146] : level === 3 ? [290, 150] : [286, 149];
  const fruitCounter = overflowTreeCount > 0 ? `<text x="${counterSpot[0]}" y="${counterSpot[1]}" class="extra-fruit-label">+${overflowTreeCount}</text>` : '';
  const groundCounter = overflowGroundCount > 0 ? `<text x="212" y="384" class="extra-fruit-label extra-fruit-ground-label">+${overflowGroundCount}</text>` : '';
  const hasVisibleFruit = visibleTreeSlots.length > 0 || overflowTreeCount > 0 || lyingVisible.length > 0;

  return `${svgStart}${hasVisibleFruit ? fruitDefs : ''}${branches}${grass}${gardenFlowers}${trunk}<g class="canopy">${canopyMarkup}${canopyTips}</g>${placeInCanopy(fruitMarkup + fruitCounter, topCanopy)}${lyingMarkup}${groundCounter}${fallingLeaves}</svg>`;
}
