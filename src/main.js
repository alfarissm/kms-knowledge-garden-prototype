import './styles.css';
import {
  apiAdminAccounts,
  apiAdminCondition,
  apiEntry,
  apiLibrary,
  apiLogout,
  apiMe,
  apiReport,
  apiSaveState,
} from './api.js';
import {
  advanceDemoDays,
  addDemoResource,
  applyActivity,
  applyCare,
  applyDemoBoost,
  applyDemoLevelBoost,
  applyDemoLevelDecrease,
  completeLearningModule,
  createInitialState,
  getFruitView,
  getNextLevelRequirement,
  getTreeCondition,
  rateLearningModule,
  simulateDemoTreeCondition,
  STAGES,
  submitSharingMaterial,
  tickState,
} from './gamification.js';
import { LEARNING_MODULES } from './learning-catalog.js';
import { getSharingVideo, saveSharingVideo } from './video-storage.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_VISIBLE_FRUIT = 7;
const elements = {
  authScreen: document.querySelector('#authScreen'),
  appShell: document.querySelector('.app-shell'),
  mainContent: document.querySelector('.main-content'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenuToggle: document.querySelector('#mobileMenuToggle'),
  sidebarCollapse: document.querySelector('#sidebarCollapse'),
  mobileMenuClose: document.querySelector('#mobileMenuClose'),
  mobileMenuBackdrop: document.querySelector('#mobileMenuBackdrop'),
  loginForm: document.querySelector('#loginForm'),
  authMessage: document.querySelector('#authMessage'),
  logoutButton: document.querySelector('#logoutButton'),
  currentUserName: document.querySelector('#currentUserName'),
  userAvatar: document.querySelector('#userAvatar'),
  currentPageLabel: document.querySelector('#currentPageLabel'),
  pageViews: [...document.querySelectorAll('[data-page-view]')],
  pageLinks: [...document.querySelectorAll('[data-page-link]')],
  treePanel: document.querySelector('#treePanel'),
  treeArt: document.querySelector('#treeArt'),
  treeCanvas: document.querySelector('#treeCanvas'),
  treeScene: document.querySelector('#treeScene'),
  careDragLayer: document.querySelector('#careDragLayer'),
  condition: document.querySelector('#sceneCondition'),
  conditionLabel: document.querySelector('#conditionLabel'),
  levelValue: document.querySelector('#levelValue'),
  stageTrack: document.querySelector('#stageTrack'),
  fruitOnTreeLabel: document.querySelector('#fruitOnTreeLabel'),
  careAirBalance: document.querySelector('#careAirBalance'),
  carePupukBalance: document.querySelector('#carePupukBalance'),
  careFruitBalance: document.querySelector('#careFruitBalance'),
  careAirButton: document.querySelector('[data-tree-care-resource="air"]'),
  careFertilizerButton: document.querySelector('[data-tree-care-resource="fertilizer"]'),
  careFruitButton: document.querySelector('[data-tree-care-resource="fruit"]'),
  careAnimation: document.querySelector('#careAnimation'),
  growthAirValue: document.querySelector('#growthAirValue'),
  growthAirTarget: document.querySelector('#growthAirTarget'),
  growthAirBar: document.querySelector('#growthAirBar'),
  growthAirTrack: document.querySelector('#growthAirTrack'),
  growthPupukValue: document.querySelector('#growthPupukValue'),
  growthPupukTarget: document.querySelector('#growthPupukTarget'),
  growthPupukBar: document.querySelector('#growthPupukBar'),
  growthPupukTrack: document.querySelector('#growthPupukTrack'),
  activityHistory: document.querySelector('#activityHistory'),
  historyCount: document.querySelector('#historyCount'),
  learningCatalog: document.querySelector('#learningCatalog'),
  learningProgressCount: document.querySelector('#learningProgressCount'),
  sharingForm: document.querySelector('#sharingForm'),
  sharingVideoFile: document.querySelector('#sharingMaterialVideo'),
  sharingVideoSelection: document.querySelector('#sharingVideoSelection'),
  sharingQueue: document.querySelector('#sharingQueue'),
  sharingQueueCount: document.querySelector('#sharingQueueCount'),
  contentStatusBody: document.querySelector('#contentStatusBody'),
  contentStatusCount: document.querySelector('#contentStatusCount'),
  adminReviewList: document.querySelector('#adminReviewList'),
  adminSummary: document.querySelector('#adminSummary'),
  libraryList: document.querySelector('#libraryList'),
  libraryCount: document.querySelector('#libraryCount'),
  learningDialog: document.querySelector('#learningDialog'),
  learningDialogTitle: document.querySelector('#learningDialogTitle'),
  learningLessonContent: document.querySelector('#learningLessonContent'),
  learningQuizForm: document.querySelector('#learningQuizForm'),
  learningQuiz: document.querySelector('#learningQuiz'),
  learningReadCheck: document.querySelector('#learningReadCheck'),
  learningFeedback: document.querySelector('#learningFeedback'),
  completeLearningButton: document.querySelector('#completeLearningButton'),
  learningDialogClose: document.querySelector('#learningDialogClose'),
  advanceWeekButton: document.querySelector('#advanceWeekButton'),
  boostLevelButton: document.querySelector('#boostLevelButton'),
  lowerLevelButton: document.querySelector('#lowerLevelButton'),
  healthyButton: document.querySelector('#healthyButton'),
  lastActivityLabel: document.querySelector('#lastActivityLabel'),
  nextDecayLabel: document.querySelector('#nextDecayLabel'),
  boostButton: document.querySelector('#boostButton'),
  testYellowButton: document.querySelector('#testYellowButton'),
  testDeadButton: document.querySelector('#testDeadButton'),
  resetButton: document.querySelector('#resetButton'),
  demoResourceForm: document.querySelector('#demoResourceForm'),
  demoResourceType: document.querySelector('#demoResourceType'),
  demoResourceAmount: document.querySelector('#demoResourceAmount'),
  toastRegion: document.querySelector('#toastRegion'),
};

const STAGE_SHORT_NAMES = ['Tanah', 'Bibit', 'Daun', 'Berbuah', 'Besar', 'Kiri', 'Kanan', 'Penuh'];
const CONDITION_LABELS = {
  healthy: { title: 'Healthy', detail: 'Air dan Pupuk tersedia', className: 'is-healthy' },
  thirsty: { title: 'Thirsty · Menguning', detail: 'Air habis · pohon perlu dipulihkan', className: 'is-thirsty' },
  dead: { title: 'Mati · Merah', detail: 'Pupuk habis · pohon perlu dipulihkan', className: 'is-dead' },
};
const PAGE_LABELS = {
  tree: 'Pohon',
  learning: 'Learning',
  sharing: 'Sharing',
  library: 'Perpustakaan',
  admin: 'Review Admin',
  history: 'Riwayat',
};
const SHARING_STATUS_INFO = {
  pending: { label: 'Menunggu review admin', dot: 'pending' },
  validated: { label: 'ACC · Relevan', dot: 'validated' },
  stale: { label: 'Basi', dot: 'stale' },
  rejected: { label: 'Tidak relevan', dot: 'rejected' },
  duplicate: { label: 'Duplikat', dot: 'duplicate' },
};
const SHARING_TYPE_LABELS = {
  video: 'Video',
  article: 'Artikel',
  document: 'Dokumen / panduan',
  podcast: 'Podcast',
  link: 'Tautan lainnya',
};

let currentAccount = null;
let state = null;
let activeLearningModule = null;
let sharingQueueRenderId = 0;
let adminReviewFilter = 'all';
const ADMIN_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'validated', label: 'ACC' },
  { key: 'stale', label: 'Basi' },
  { key: 'rejected', label: 'Tidak relevan' },
  { key: 'duplicate', label: 'Duplikat' },
];
const sharingVideoObjectUrls = new Map();
// Admin = peran tersendiri: hanya konsol Review Admin. User kebun tidak
// melihat/membuka halaman admin, dan admin tidak memakai kebun user.
const PAGE_ACCESS = {
  tree: ['user'],
  learning: ['user'],
  sharing: ['user'],
  library: ['user'],
  admin: ['admin'],
  history: ['user'],
};

function currentRole() {
  return currentAccount?.role ?? 'user';
}

function pageForRole(page) {
  const role = currentRole();
  const allowed = PAGE_ACCESS[page]?.includes(role);
  return allowed ? page : (role === 'admin' ? 'admin' : 'tree');
}

function applySidebarRole() {
  const role = currentRole();
  document.querySelectorAll('[data-admin-only]').forEach((element) => {
    element.hidden = role !== 'admin';
  });
  document.querySelectorAll('[data-user-only]').forEach((element) => {
    element.hidden = role === 'admin';
  });
}

function pageFromLocationHash() {
  const page = window.location.hash.slice(1);
  if (!Object.hasOwn(PAGE_LABELS, page)) {
    return currentRole() === 'admin' ? 'admin' : 'tree';
  }
  return page;
}

function navigateToPage(page, updateHistory = true) {
  if (!Object.hasOwn(PAGE_LABELS, page)) return;

  const allowedPage = pageForRole(page);
  if (allowedPage !== page) {
    showToast(currentRole() === 'admin'
      ? 'Halaman kebun khusus akun user; admin membuka Review Admin.'
      : 'Halaman ini khusus admin.', 'notice');
    page = allowedPage;
  }

  elements.pageViews.forEach((view) => {
    view.hidden = view.dataset.pageView !== page;
  });
  elements.pageLinks.forEach((link) => {
    const isActive = link.dataset.pageTarget === page;
    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
  elements.currentPageLabel.textContent = PAGE_LABELS[page];
  const menuWasOpen = elements.mobileMenuToggle.getAttribute('aria-expanded') === 'true';
  setMobileMenuOpen(false);

  if (updateHistory && window.location.hash !== `#${page}`) {
    window.history.pushState({ page }, '', `#${page}`);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (menuWasOpen && window.innerWidth <= 900) {
    const pageHeading = elements.pageViews.find((view) => view.dataset.pageView === page)?.querySelector('h1, h2');
    if (pageHeading) {
      pageHeading.tabIndex = -1;
      pageHeading.focus({ preventScroll: true });
    }
  }
}

function setMobileMenuOpen(isOpen) {
  const isMobile = window.innerWidth <= 900;
  const shouldOpen = isMobile && isOpen;
  const shouldHideSidebar = isMobile && !shouldOpen;
  elements.sidebar.classList.toggle('is-menu-open', shouldOpen);
  elements.sidebar.inert = shouldHideSidebar;
  elements.sidebar.setAttribute('aria-hidden', String(shouldHideSidebar));
  elements.mobileMenuBackdrop.hidden = !shouldOpen;
  elements.mainContent.inert = shouldOpen;
  document.body.classList.toggle('is-mobile-menu-open', shouldOpen);
  elements.mobileMenuToggle.setAttribute('aria-expanded', String(shouldOpen));
  elements.mobileMenuToggle.setAttribute('aria-label', shouldOpen ? 'Navigasi terbuka, tutup menu' : 'Buka navigasi');
}

setMobileMenuOpen(false);

function saveState() {
  if (!currentAccount || !state) return;

  // State disinkronkan ke backend; local state tetap sumber render.
  apiSaveState(state).catch((error) => {
    showToast(error?.message || 'Pohon gagal tersimpan ke server.', 'notice');
  });
}

function setAuthMessage(message, tone = 'notice') {
  elements.authMessage.textContent = message;
  elements.authMessage.className = `auth-message${message ? ` auth-message-${tone}` : ''}`;
}

function enterApp(account, treeState = null, awardLogin = false) {
  currentAccount = account;
  state = tickState(treeState ?? createInitialState());
  let loginRewarded = false;
  if (awardLogin) {
    const airBeforeLogin = state.air;
    state = applyActivity(state, 'access');
    loginRewarded = state.air > airBeforeLogin;
  }
  elements.currentUserName.textContent = account.name;
  elements.userAvatar.textContent = account.name.trim().charAt(0).toLocaleUpperCase('id-ID');
  applySidebarRole();
  elements.authScreen.hidden = true;
  elements.appShell.hidden = false;
  saveState();
  render();
  navigateToPage(pageFromLocationHash(), false);
  if (awardLogin) {
    showToast(loginRewarded
      ? 'Login valid: +1 Air masuk Storage. Gunakan Air pada pohon untuk menambah progres.'
      : 'Login valid. Reward +1 Air hari ini sudah diterima; tidak ada Air tambahan.');
  }
}

function leaveApp(message = '') {
  sharingQueueRenderId += 1;
  clearSharingVideoPreviews();
  apiLogout().catch(() => {
    // Sesi lokal sudah dibersihkan; kegagalan mencabut cookie localhost diabaikan.
  });
  currentAccount = null;
  state = null;
  if (elements.learningDialog.open) {
    elements.learningDialog.close();
  }
  activeLearningModule = null;
  elements.appShell.hidden = true;
  elements.authScreen.hidden = false;
  elements.loginForm.reset();
  setAuthMessage(message, 'success');
}

function formatPupuk(units) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(units / 2);
}

function updateDemoResourceAmountConstraints() {
  const allowsHalfUnits = elements.demoResourceType.value === 'fertilizer';
  elements.demoResourceAmount.min = allowsHalfUnits ? '0.5' : '1';
  elements.demoResourceAmount.step = allowsHalfUnits ? '0.5' : '1';

  const amount = Number(elements.demoResourceAmount.value);
  if (!allowsHalfUnits && !Number.isInteger(amount)) {
    elements.demoResourceAmount.value = '1';
  }
}

function formatDate(timestamp, options = {}) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(new Date(timestamp));
}

function makeTreeSvg(level, condition, fruitView) {
  const palettes = {
    healthy: { leaf: '#4ca947', leafDark: '#2d8b45', leafLight: '#86c342', trunk: '#a04b26', trunkLight: '#c16b35', branch: '#84391f' },
    thirsty: { leaf: '#d6bb55', leafDark: '#b89437', leafLight: '#ecd982', trunk: '#9b7049', trunkLight: '#bd9366', branch: '#916441' },
    dead: { leaf: '#b49a5c', leafDark: '#8d7546', leafLight: '#d0b36f', trunk: '#805c49', trunkLight: '#a57e5c', branch: '#805c49' },
  };
  const colors = palettes[condition];
  // Buah terikat konten: tampil per slot; basi rebah busuk di tanah.
  const boundTreeFruits = fruitView.tree;
  const fallenFruits = [...fruitView.ground].sort((a, b) => a.slot - b.slot);
  const fruitCount = boundTreeFruits.length;
  const svgStart = `<svg class="tree-svg stage-${level} ${condition}" viewBox="0 0 600 440" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Pohon Level ${level}, ${STAGES[level]}, kondisi ${condition}, ${fruitCount} Buah di pohon${fallenFruits.length ? `, ${fallenFruits.length} Buah busuk rebah di tanah` : ''}">`;
  // Three-blob crowns computed symmetrically, sides tucked against the center
  // like the reference (slight overlap ~0.8x, bumps stay visible via wobble).
  const blobTriplet = (cy, rCenter, spreadX, dySide, rSide) => [
    [200, cy, rCenter],
    [200 - spreadX, cy + dySide, rSide],
    [200 + spreadX, cy + dySide, rSide],
  ];
  const canopyByLevel = {
    2: blobTriplet(162, 26, 30, 20, 20),
    3: blobTriplet(160, 30, 34, 24, 23),
    4: blobTriplet(160, 34, 40, 26, 26),
  };

  if (level === 0) {
    return `${svgStart}</svg>`;
  }

  if (level === 1) {
    return `${svgStart}<path d="M300 446 C298 425 299 402 301 383" fill="none" stroke="${colors.trunk}" stroke-width="8" stroke-linecap="round"/><path class="seed-leaf" d="M301 401 C279 400 264 386 259 366 C283 366 299 381 301 401Z" fill="${colors.leaf}"/><path class="seed-leaf" d="M301 391 C306 368 324 356 345 357 C340 380 323 393 301 391Z" fill="${colors.leafLight}"/></svg>`;
  }

  // All stages share one bounded coordinate system and the same soil baseline.
  const topCanopyByLevel = {
    2: [300, 310, 1],
    3: [300, 235, 1.25],
    4: [300, 185, 1.55],
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
  const trunkWidthScaleByLevel = { 2: 0.6, 3: 0.8, 4: 1, 5: 1.15, 6: 1.3, 7: 1.45 };
  const trunkScale = trunkWidthScaleByLevel[level] ?? 1;
  const trunkX = (x) => 300 + (x - 300) * trunkScale;
  const trunkPath = `M${trunkX(270)} 446 C${trunkX(282)} ${446 - trunkHeight * .2} ${trunkX(288)} ${trunkTipY + trunkHeight * .45} ${trunkX(290)} ${trunkTipY + trunkHeight * .31} L${trunkX(294)} ${trunkTipY + 18} Q300 ${trunkTipY - 9} ${trunkX(306)} ${trunkTipY + 18} L${trunkX(310)} ${trunkTipY + trunkHeight * .31} C${trunkX(312)} ${trunkTipY + trunkHeight * .45} ${trunkX(318)} ${446 - trunkHeight * .2} ${trunkX(330)} 446Z`;
  const trunkHighlight = `M${trunkX(285)} 446 C${trunkX(294)} ${446 - trunkHeight * .2} ${trunkX(297)} ${trunkTipY + trunkHeight * .45} ${trunkX(297)} ${trunkTipY + trunkHeight * .31} L${trunkX(298)} ${trunkTipY + 18} Q300 ${trunkTipY + 12} ${trunkX(302)} ${trunkTipY + 18} L${trunkX(303)} ${trunkTipY + trunkHeight * .31} C${trunkX(303)} ${trunkTipY + trunkHeight * .45} ${trunkX(306)} ${446 - trunkHeight * .2} ${trunkX(315)} 446Z`;
  const trunk = `<path class="tree-trunk" d="${trunkPath}" fill="${colors.trunk}" stroke="${colors.branch}" stroke-width="2.5" stroke-linejoin="round"/><path d="${trunkHighlight}" fill="${colors.trunkLight}" opacity=".68"/>`;
  // Side branches rise diagonally from the lower trunk into the side canopies (V shape).
  const branches = sideCanopies.map(([x, y]) => {
    const bx = 300, by = y + 75;
    const tx = 300 + (x - 300) * 0.55, ty = y + 5;
    const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, wb = 11 * trunkScale, wt = 4.5 * trunkScale;
    const path = `M${(bx + nx * wb).toFixed(1)} ${(by + ny * wb).toFixed(1)} L${(tx + nx * wt).toFixed(1)} ${(ty + ny * wt).toFixed(1)} L${(tx - nx * wt).toFixed(1)} ${(ty - ny * wt).toFixed(1)} L${(bx - nx * wb).toFixed(1)} ${(by - ny * wb).toFixed(1)}Z`;
    return `<path class="tree-branch" d="${path}" fill="${colors.trunk}" stroke="${colors.branch}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }).join('');
  const canopy = canopyByLevel[level] ?? [];
  const visibleCanopy = condition === 'dead' ? canopy.filter((_, index) => index % 4 !== 3) : canopy;
  const canopyCenter = [200, 154];
  const canopyDistance = ([cx, cy]) => Math.hypot(cx - canopyCenter[0], cy - canopyCenter[1]);
  const farthestCanopyLeaf = Math.max(...visibleCanopy.map(canopyDistance), 1);
  const blobPath = ([cx, cy, radius]) => {
    const bumps = 10;
    const pts = [];
    for (let i = 0; i < bumps; i += 1) {
      const angle = (i / bumps) * Math.PI * 2 - Math.PI / 2;
      const wobble = radius * (i % 2 === 0 ? 1.1 : 0.92);
      pts.push([cx + Math.cos(angle) * wobble, cy + Math.sin(angle) * wobble]);
    }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let [mx, my] = mid(pts[bumps - 1], pts[0]);
    let d = `M${mx.toFixed(1)} ${my.toFixed(1)}`;
    for (let i = 0; i < bumps; i += 1) {
      const p = pts[i];
      const [qx, qy] = mid(p, pts[(i + 1) % bumps]);
      d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${qx.toFixed(1)} ${qy.toFixed(1)}`;
    }
    return `${d}Z`;
  };
  const leafClusterMarkup = [...visibleCanopy]
    .sort((a, b) => canopyDistance(b) - canopyDistance(a))
    .map(([cx, cy, radius]) => {
      const distanceRatio = canopyDistance([cx, cy]) / farthestCanopyLeaf;
      const fill = distanceRatio > .82 ? colors.leafDark : distanceRatio > .55 ? colors.leaf : colors.leafLight;
      return `<path class="leaf-cluster" d="${blobPath([cx, cy, radius])}" fill="${fill}"/>`;
    }).join('');
  // Small branchlets peeking through the foliage gaps (levels 3-4).
  const branchletsByLevel = {
    3: [[[196, 205], [172, 191]], [[197, 190], [178, 179]], [[204, 205], [228, 191]], [[203, 190], [222, 179]]],
    4: [[[195, 208], [170, 192]], [[196, 192], [172, 180]], [[205, 208], [230, 192]], [[204, 192], [228, 180]]],
  };
  const branchletMarkup = (branchletsByLevel[level] ?? []).map(([[ax, ay], [bx, by]]) =>
    `<path d="M${ax} ${ay}L${bx} ${by}" fill="none" stroke="${colors.trunk}" stroke-width="3" stroke-linecap="round"/>`).join('');
  const fullCanopy = `<path d="M200 55C223 55 242 69 250 88 276 72 306 83 314 109 341 111 355 134 345 157 366 179 354 208 331 221 328 248 300 261 274 247 258 267 228 273 204 259 181 275 151 269 137 248 109 260 82 244 79 218 54 205 51 177 70 158 59 132 77 106 104 104 108 79 135 65 164 79 174 63 186 55 200 55Z" fill="${colors.leafDark}"/><path d="M200 75C220 74 235 88 241 104 265 89 291 99 297 121 319 122 332 141 323 160 339 179 328 202 308 211 305 234 281 244 260 232 245 249 220 254 201 242 180 255 155 248 144 231 121 242 99 227 98 207 77 197 76 175 92 160 82 138 98 118 120 117 124 96 147 84 170 95 178 82 188 75 200 75Z" fill="${colors.leaf}"/><path d="M200 99C217 98 230 109 235 124 254 113 277 122 281 142 299 145 308 161 300 177 312 194 302 212 284 219 279 237 258 243 242 233 228 246 208 248 194 237 177 247 157 240 150 225 131 232 114 218 116 200 99 188 103 168 118 156 111 138 127 122 145 125 149 107 167 101 181 111 187 104 193 99 200 99Z" fill="${colors.leafLight}"/>`;
  const placeInCanopy = (markup, [x, y, scale], className = '') => `<g class="${className}" transform="translate(${x} ${y}) scale(${scale}) translate(-200 -154)">${markup}</g>`;
  const canopyMarkup = placeInCanopy(level >= 5 ? fullCanopy : branchletMarkup + leafClusterMarkup, topCanopy, 'canopy-crown');
  const canopyTips = sideCanopies.map((position) => placeInCanopy(fullCanopy, position, 'canopy-tip-copy')).join('');
  const fruitPositions = level === 3 || level === 4
    ? [[188, 157], [218, 151], [164, 184], [236, 184], [198, 190], [202, 145], [224, 198]]
    : [[178, 162], [223, 150], [154, 188], [242, 190], [196, 207], [211, 122], [171, 126]];
  // Slot > 7 tidak punya titik mahkota; selisihnya tampil sebagai penanda +n.
  const lyingPositions = [
    [92, 398, 68], [140, 394, -72], [208, 399, 64], [246, 402, -55],
    [352, 395, 70], [416, 394, -64], [472, 399, 55],
  ];
  const visibleTreeSlots = boundTreeFruits
    .filter((entry) => entry.slot >= 1 && entry.slot <= MAX_VISIBLE_FRUIT)
    .map((entry) => entry.slot);
  const overflowTreeCount = boundTreeFruits.length - visibleTreeSlots.length;
  const lyingVisible = fallenFruits.slice(0, MAX_VISIBLE_FRUIT);
  const overflowGroundCount = Math.max(0, fallenFruits.length - lyingVisible.length);
  // Realistic apple skin per admin-decided content condition: ripe red = ACC
  // (menggantung), rotten brown with spots = stale rebah di tanah. Buah yang
  // diangkat (tidak relevan / duplikat) tidak tergambar apa pun — slot kosong.
  const fruitScaleByLevel = { 3: 0.7, 4: 0.8, 5: 0.9, 6: 0.95, 7: 1 };
  const fruitScale = fruitScaleByLevel[level] ?? 1;
  const fruitStylesByStatus = {
    pending: { gradient: 'appleUnripe', stroke: '#4a6b28', stem: '#4a6b28', leaf: '#6f9c38', spots: false },
    validated: { gradient: 'appleRipe', stroke: '#7a150f', stem: '#3f7a3d', leaf: '#4ca947', spots: false },
    stale: { gradient: 'appleRotten', stroke: '#3a2312', stem: '#6b5230', leaf: '#8a6a3f', spots: true },
    rejected: { gradient: 'appleSallow', stroke: '#4f4630', stem: '#7a6d4a', leaf: '#9a8a5a', spots: false },
    duplicate: { gradient: 'appleDup', stroke: '#3d3833', stem: '#6f6558', leaf: '#8a8177', spots: false },
  };
  const fruitDefs = `<defs><linearGradient id="appleRipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2593d"/><stop offset=".5" stop-color="#cc3327"/><stop offset="1" stop-color="#8f1c13"/></linearGradient><linearGradient id="appleUnripe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cbe47f"/><stop offset=".55" stop-color="#97c24f"/><stop offset="1" stop-color="#5f8734"/></linearGradient><linearGradient id="appleRotten" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b08455"/><stop offset=".45" stop-color="#7c5430"/><stop offset="1" stop-color="#45280f"/></linearGradient><linearGradient id="appleSallow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9b57e"/><stop offset=".45" stop-color="#a08e57"/><stop offset="1" stop-color="#6b5c36"/></linearGradient><linearGradient id="appleDup" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a89c8c"/><stop offset=".45" stop-color="#837767"/><stop offset="1" stop-color="#565046"/></linearGradient></defs>`;
  const appleSpots = '<ellipse cx="-2.5" cy="1.5" rx="2" ry="1.4" fill="#5a3820" opacity=".55"/><ellipse cx="3" cy="3" rx="1.6" ry="1.1" fill="#4a2b12" opacity=".5"/>';
  const appleByStatus = (statusKey) => {
    const style = fruitStylesByStatus[statusKey] ?? fruitStylesByStatus.validated;
    return `<circle cx="0" cy="0" r="8.5" fill="url(#${style.gradient})" stroke="${style.stroke}" stroke-width="1.5"/><path d="M0 -8q1-7 7-8" fill="none" stroke="${style.stem}" stroke-width="2.5" stroke-linecap="round"/><path d="M7 -15q6-3 9 2q-5 4-9-2Z" fill="${style.leaf}"/><ellipse cx="-3" cy="-3.5" rx="2.4" ry="3.4" fill="#fff" opacity=".75" transform="rotate(-18 -3 -3.5)"/>${style.spots ? appleSpots : ''}`;
  };
  // Slot mengikuti urutannya; slot tanpa buah (belum dipindah/hilang) = celah.
  const fruitMarkup = visibleTreeSlots.map((slot) => {
    const [x, y] = fruitPositions[slot - 1];
    return `<g class="tree-fruit fruit-validated" style="--fruit-index:${slot - 1}" transform="translate(${x} ${y}) scale(${fruitScale})">${appleByStatus('validated')}</g>`;
  }).join('');
  const lyingMarkup = lyingVisible.map((entry, index) => {
    const [x, y, angle] = lyingPositions[index];
    return `<g class="tree-fruit fruit-ground-lying" transform="translate(${x} ${y}) rotate(${angle}) scale(${fruitScale * 0.95})">${appleByStatus('stale')}</g>`;
  }).join('');
  const fruitCounter = overflowTreeCount > 0 ? `<text x="286" y="149" class="extra-fruit-label">+${overflowTreeCount}</text>` : '';
  const groundCounter = overflowGroundCount > 0 ? `<text x="212" y="392" class="extra-fruit-label extra-fruit-ground-label">+${overflowGroundCount}</text>` : '';
  const fallingLeaves = condition === 'dead'
    ? '<ellipse class="falling-leaf fall-one" cx="134" cy="223" rx="7" ry="3" fill="#ca8d5d"/><ellipse class="falling-leaf fall-two" cx="263" cy="246" rx="7" ry="3" fill="#ca8d5d"/><ellipse class="falling-leaf fall-three" cx="156" cy="257" rx="6" ry="3" fill="#d7a66b"/>'
    : '';
  const leafDrops = level >= 2 && condition !== 'dead'
    ? `<ellipse class="leaf-drop drop-one" cx="150" cy="232" rx="6.5" ry="2.8" fill="${colors.leaf}"/><ellipse class="leaf-drop drop-two" cx="252" cy="238" rx="6" ry="2.6" fill="${colors.leafDark}"/>`
    : '';
  const hasVisibleFruit = visibleTreeSlots.length > 0 || overflowTreeCount > 0 || lyingVisible.length > 0;

  return `${svgStart}${hasVisibleFruit ? fruitDefs : ''}${branches}${grass}${trunk}<g class="canopy">${canopyMarkup}${canopyTips}</g>${placeInCanopy(fruitMarkup + fallingLeaves + leafDrops + fruitCounter, topCanopy)}${lyingMarkup}${groundCounter}</svg>`;
}

function renderStageTrack() {
  elements.stageTrack.replaceChildren();

  STAGES.forEach((stageName, index) => {
    const stage = document.createElement('div');
    stage.className = `stage-step${index < state.level ? ' is-reached' : ''}${index === state.level ? ' is-current' : ''}`;
    stage.setAttribute('aria-label', `Level ${index}: ${stageName}${index === state.level ? ', level saat ini' : ''}`);
    stage.title = `Level ${index} · ${stageName}`;
    stage.innerHTML = `<span class="stage-marker">${index < state.level ? '✓' : index}</span><span class="stage-name">${STAGE_SHORT_NAMES[index]}</span>`;
    elements.stageTrack.append(stage);
  });
}

function renderProgress() {
  const requirement = getNextLevelRequirement(state.level);
  const airTarget = requirement.air;
  const fertilizerTarget = requirement.fertilizerUnits / 2;
  const airProgress = Math.max(0, state.growthAir);
  const fertilizerProgress = Math.max(0, state.growthFertilizerUnits);
  const displayedAirProgress = Math.min(airProgress, airTarget);
  const displayedFertilizerProgress = Math.min(fertilizerProgress, requirement.fertilizerUnits);
  const airPercent = (displayedAirProgress / airTarget) * 100;
  const fertilizerPercent = (displayedFertilizerProgress / requirement.fertilizerUnits) * 100;

  elements.growthAirValue.textContent = String(displayedAirProgress);
  elements.growthAirTarget.textContent = ` / ${airTarget}`;
  elements.growthAirBar.style.width = `${airPercent}%`;
  elements.growthAirTrack.setAttribute('aria-valuemax', String(airTarget));
  elements.growthAirTrack.setAttribute('aria-valuenow', String(displayedAirProgress));
  elements.growthAirTrack.setAttribute('aria-valuetext', `${displayedAirProgress} dari ${airTarget} Air`);
  elements.growthPupukValue.textContent = formatPupuk(displayedFertilizerProgress);
  elements.growthPupukTarget.textContent = ` / ${fertilizerTarget}`;
  elements.growthPupukBar.style.width = `${fertilizerPercent}%`;
  elements.growthPupukTrack.setAttribute('aria-valuemax', String(fertilizerTarget));
  elements.growthPupukTrack.setAttribute('aria-valuenow', String(displayedFertilizerProgress / 2));
  elements.growthPupukTrack.setAttribute('aria-valuetext', `${formatPupuk(displayedFertilizerProgress)} dari ${fertilizerTarget} Pupuk`);

}

function renderResources() {
  elements.careAirBalance.textContent = String(state.air);
  elements.carePupukBalance.textContent = formatPupuk(state.fertilizerUnits);
  elements.careFruitBalance.textContent = String(state.fruitsInStorage);
  const requirement = getNextLevelRequirement(state.level);
  const airProgressFull = state.growthAir >= requirement.air && state.careAir > 0;
  const fertilizerProgressFull = state.growthFertilizerUnits >= requirement.fertilizerUnits && state.careFertilizerUnits > 0;
  elements.careAirButton.setAttribute('aria-disabled', String(airProgressFull));
  elements.careAirButton.classList.toggle('is-progress-full', airProgressFull);
  elements.careAirButton.setAttribute('aria-label', airProgressFull
    ? `Progres Air untuk level berikutnya penuh. ${state.air} Air tetap di Storage.`
    : state.growthAir >= requirement.air
      ? `Gunakan Air untuk memulihkan perawatan pohon; progres level penuh. Sisa ${state.air} Air di Storage.`
      : `Gunakan Air untuk merawat pohon dan mengisi progres. Sisa ${state.air} Air di Storage.`);
  elements.careAirButton.title = airProgressFull
    ? 'Progres Air penuh; saldo tetap di Storage sampai Pupuk juga terpenuhi.'
    : state.growthAir >= requirement.air
      ? 'Gunakan 1 Air untuk memulihkan perawatan pohon; progres level tetap penuh.'
      : 'Gunakan 1 Air dari Storage untuk merawat pohon dan mengisi progres.';
  elements.careFertilizerButton.setAttribute('aria-disabled', String(fertilizerProgressFull));
  elements.careFertilizerButton.classList.toggle('is-progress-full', fertilizerProgressFull);
  elements.careFertilizerButton.setAttribute('aria-label', fertilizerProgressFull
    ? `Progres Pupuk untuk level berikutnya penuh. ${formatPupuk(state.fertilizerUnits)} Pupuk tetap di Storage.`
    : state.growthFertilizerUnits >= requirement.fertilizerUnits
      ? `Gunakan Pupuk untuk memulihkan perawatan pohon; progres level penuh. Sisa ${formatPupuk(state.fertilizerUnits)} Pupuk di Storage.`
      : `Gunakan Pupuk untuk merawat pohon dan mengisi progres. Sisa ${formatPupuk(state.fertilizerUnits)} Pupuk di Storage.`);
  elements.careFertilizerButton.title = fertilizerProgressFull
    ? 'Progres Pupuk penuh; saldo tetap di Storage sampai Air juga terpenuhi.'
    : state.growthFertilizerUnits >= requirement.fertilizerUnits
      ? 'Gunakan 1 Pupuk untuk memulihkan perawatan pohon; progres level tetap penuh.'
      : 'Gunakan 1 Pupuk dari Storage untuk merawat pohon dan mengisi progres.';
  const fruitTreeReady = state.level >= 3 && getTreeCondition(state) === 'healthy';
  const fruitUnavailable = state.fruitsInStorage < 1 || !fruitTreeReady;
  elements.careFruitButton.setAttribute('aria-disabled', String(fruitUnavailable));
  elements.careFruitButton.classList.toggle('is-unavailable', fruitUnavailable);
  elements.careFruitButton.setAttribute('aria-label', state.fruitsInStorage < 1
    ? 'Tidak ada Buah di Storage untuk dipindahkan ke pohon.'
    : !fruitTreeReady
      ? `Pindahkan Buah setelah pohon sehat dan mencapai Level 3. Ada ${state.fruitsInStorage} Buah di Storage.`
      : `Pindahkan 1 Buah dari Storage ke pohon. Ada ${state.fruitsInStorage} Buah di Storage.`);
  elements.careFruitButton.title = state.fruitsInStorage < 1
    ? 'Belum ada Buah di Storage.'
    : !fruitTreeReady
      ? 'Buah dapat dipindahkan saat pohon sehat dan mencapai Level 3.'
      : 'Pindahkan 1 Buah dari Storage ke pohon.';
  elements.fruitOnTreeLabel.textContent = String(state.fruitsOnTree);
  elements.fruitOnTreeLabel.parentElement.setAttribute('aria-label', `${state.fruitsOnTree} buah di pohon`);
}

function renderHistory() {
  elements.historyCount.textContent = String(state.history.length);
  elements.activityHistory.replaceChildren();

  if (state.history.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-history';
    empty.innerHTML = '<span>✳</span><strong>Belum ada aktivitas</strong><small>Coba satu aksi untuk melihat riwayatnya.</small>';
    elements.activityHistory.append(empty);
    return;
  }

  state.history.slice(0, 6).forEach((entry) => {
    const row = document.createElement('div');
    row.className = `history-row history-${entry.type}`;
    const icon = entry.type === 'decay' ? '−' : (entry.type === 'activity' ? '✓' : (entry.type === 'fruit' ? '●' : '✳'));
    const time = formatDate(entry.at);
    row.innerHTML = `<span class="history-icon">${icon}</span><span class="history-copy"><strong></strong><small></small></span><span class="history-time"></span>`;
    row.querySelector('.history-copy strong').textContent = entry.title;
    row.querySelector('.history-copy small').textContent = entry.detail;
    row.querySelector('.history-time').textContent = time;
    elements.activityHistory.append(row);
  });
}

function makeElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeSvgIcon(symbolId, className = 'icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${symbolId}`);
  svg.append(use);
  return svg;
}

function renderLearningCatalog() {
  elements.learningProgressCount.textContent = `${state.completedLearningIds.length} / ${LEARNING_MODULES.length} selesai`;
  elements.learningProgressCount.setAttribute('aria-label', `${state.completedLearningIds.length} dari ${LEARNING_MODULES.length} modul tuntas`);
  elements.learningCatalog.replaceChildren();

  LEARNING_MODULES.forEach((module) => {
    const completed = state.completedLearningIds.includes(module.id);
    const rating = state.learningRatings[module.id];
    const card = makeElement('article', `learning-card${completed ? ' is-complete' : ''}`);
    const normalizedCategory = module.category.toLocaleLowerCase('id-ID');
    const iconName = normalizedCategory.includes('video')
      ? 'icon-play'
      : (normalizedCategory.includes('artikel') ? 'icon-book' : 'icon-sparkle');
    const cardTop = makeElement('div', 'learning-card-top');
    const iconTile = makeElement('span', `learning-card-icon learning-icon-${iconName.replace(/^icon-/, '')}`);
    iconTile.setAttribute('role', 'img');
    iconTile.setAttribute('aria-label', module.category);
    iconTile.title = module.category;
    iconTile.append(makeSvgIcon(iconName));
    const meta = makeElement('div', 'learning-card-meta');
    meta.append(makeElement('span', 'learning-category', module.category));
    const duration = makeElement('span', 'learning-duration');
    duration.setAttribute('role', 'img');
    duration.setAttribute('aria-label', `Durasi ${module.duration}`);
    duration.title = `Durasi ${module.duration}`;
    duration.append(makeSvgIcon('icon-clock'), makeElement('span', '', module.duration));
    meta.append(duration);
    cardTop.append(iconTile, meta);
    const heading = makeElement('h4', '', module.title);
    const description = makeElement('p', 'learning-card-description', module.description);
    card.append(cardTop, heading, description);

    if (completed) {
      const status = makeElement('span', 'learning-completed-badge');
      status.append(makeSvgIcon('icon-shield'), makeElement('span', '', 'Learning selesai'));
      card.append(status);

      if (rating) {
        const ratedNote = makeElement('div', 'learning-rated-note');
        ratedNote.append(makeElement('span', 'learning-rating-saved', 'Rating tersimpan'));
        const stars = makeElement('span', 'learning-star-display');
        stars.setAttribute('role', 'img');
        stars.setAttribute('aria-label', `Rating ${rating} dari 5 bintang`);
        stars.title = `Rating ${rating}/5`;
        for (let score = 1; score <= 5; score += 1) {
          stars.append(makeElement('span', score <= rating ? 'is-filled' : '', '★'));
        }
        const reward = makeElement('span', 'learning-rating-reward');
        reward.setAttribute('role', 'img');
        reward.setAttribute('aria-label', 'Tambah 1 Air ke Storage');
        reward.title = '+1 Air ke Storage';
        reward.append(makeSvgIcon('icon-water'), makeElement('b', '', '+1 Air'));
        ratedNote.append(stars, reward);
        card.append(ratedNote);
      } else {
        const ratingForm = makeElement('form', 'learning-rating-form');
        ratingForm.dataset.learningRating = module.id;
        ratingForm.append(makeElement('span', 'learning-rating-prompt', 'Beri rating'));
        const starPicker = makeElement('div', 'learning-star-picker');
        starPicker.setAttribute('role', 'radiogroup');
        starPicker.setAttribute('aria-label', `Rating ${module.title}`);
        for (let score = 1; score <= 5; score += 1) {
          const label = makeElement('label', 'learning-star-option');
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = 'rating';
          input.value = String(score);
          input.required = true;
          input.setAttribute('aria-label', `${score} bintang`);
          label.append(input, makeElement('span', '', '★'));
          starPicker.append(label);
        }
        const rateButton = makeElement('button', 'learning-rate-button');
        rateButton.type = 'submit';
        rateButton.setAttribute('aria-label', 'Kirim rating, tambah 1 Air ke Storage');
        rateButton.append(makeSvgIcon('icon-water'), makeElement('b', '', '+1 Air'));
        ratingForm.append(starPicker, rateButton);
        card.append(ratingForm);
      }
    } else {
      const startButton = makeElement('button', 'learning-start-button');
      startButton.type = 'button';
      startButton.dataset.learningModule = module.id;
      startButton.append(makeSvgIcon('icon-play'), makeElement('span', '', 'Pelajari materi'));
      card.append(startButton);
    }

    elements.learningCatalog.append(card);
  });
}

function renderSharingQueue() {
  clearSharingVideoPreviews();
  const renderId = ++sharingQueueRenderId;
  const pendingCount = state.sharingSubmissions.filter((submission) => submission.status === 'pending').length;
  elements.sharingQueueCount.textContent = String(pendingCount);
  elements.sharingQueue.replaceChildren();

  if (state.sharingSubmissions.length === 0) {
    const empty = makeElement('p', 'sharing-queue-empty', 'Belum ada materi. Kirim kontribusi; video dapat ditambahkan secara opsional.');
    elements.sharingQueue.append(empty);
    return;
  }

  state.sharingSubmissions.slice(0, 5).forEach((submission) => {
    const item = makeElement('article', `sharing-item status-${submission.status}`);
    const header = makeElement('div', 'sharing-item-header');
    const heading = makeElement('h5', '', submission.title);
    const statusInfo = SHARING_STATUS_INFO[submission.status];
    const status = makeElement('span', 'sharing-status-badge', statusInfo?.label ?? submission.status);
    header.append(heading, status);

    const meta = makeElement('div', 'sharing-item-meta', `${SHARING_TYPE_LABELS[submission.type] ?? submission.type} · dikirim ${formatDate(submission.submittedAt)}`);
    const summary = makeElement('p', 'sharing-item-summary', submission.summary);
    item.append(header, meta);

    if (submission.url) {
      const link = makeElement('a', 'sharing-material-link', submission.url);
      link.href = submission.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      item.append(link);
    } else if (submission.attachment?.name) {
      const attachment = makeElement('div', 'sharing-material-file');
      attachment.append(makeSvgIcon('icon-play'), makeElement('span', '', submission.attachment.name));
      const fileSize = formatFileSize(submission.attachment.size);
      if (fileSize) {
        attachment.append(makeElement('small', '', fileSize));
      }
      const videoPreview = makeElement('video', 'sharing-material-video');
      videoPreview.controls = true;
      videoPreview.preload = 'metadata';
      videoPreview.playsInline = true;
      videoPreview.dataset.sharingVideo = submission.id;
      videoPreview.setAttribute('aria-label', `Pratinjau video ${submission.title}`);
      const videoStatus = makeElement('small', 'sharing-video-status', 'Memuat video dari penyimpanan browser…');
      videoStatus.dataset.sharingVideoStatus = submission.id;
      attachment.append(videoPreview, videoStatus);
      item.append(attachment);
    } else {
      item.append(makeElement('span', 'sharing-no-attachment', 'Tanpa video pendukung'));
    }

    item.append(summary);

    elements.sharingQueue.append(item);
  });

  state.sharingSubmissions.slice(0, 5).forEach((submission) => {
    if (submission.attachment?.name) {
      void restoreSharingVideoPreview(submission, renderId);
    }
  });
}

function renderContentStatusTable() {
  const submissions = state.sharingSubmissions;
  elements.contentStatusCount.textContent = String(submissions.length);
  elements.contentStatusBody.replaceChildren();

  if (submissions.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'content-status-empty';
    emptyRow.innerHTML = '<td colspan="4">Belum ada konten Sharing. Kirim kontribusi di halaman Sharing; statusnya tampil di sini.</td>';
    elements.contentStatusBody.append(emptyRow);
    return;
  }

  submissions.forEach((submission) => {
    const statusInfo = SHARING_STATUS_INFO[submission.status];
    const row = document.createElement('tr');
    row.className = `content-status-row status-${submission.status}`;

    const material = document.createElement('td');
    material.className = 'content-status-material';
    material.append(makeElement('strong', '', submission.title));
    if (submission.summary) {
      material.append(makeElement('small', '', submission.summary));
    }

    const type = document.createElement('td');
    type.textContent = SHARING_TYPE_LABELS[submission.type] ?? submission.type;

    const sent = document.createElement('td');
    sent.textContent = formatDate(submission.submittedAt);

    const condition = document.createElement('td');
    condition.className = 'content-status-condition';
    const dot = makeElement('span', `fruit-dot ${statusInfo?.dot ?? submission.status}`);
    dot.setAttribute('aria-hidden', 'true');
    condition.append(dot);
    const conditionInfo = makeElement('span', 'content-status-label', statusInfo?.label ?? submission.status);
    conditionInfo.title = statusInfo?.note ?? '';
    condition.append(conditionInfo);
    const reportCount = Array.isArray(submission.reports) ? submission.reports.length : 0;
    if (reportCount > 0) {
      condition.append(makeElement('span', 'admin-report-badge', `${reportCount} laporan`));
    }

    row.append(material, type, sent, condition);
    elements.contentStatusBody.append(row);
  });
}

function makeAdminConditionButton(row, condition, label) {
  const button = makeElement('button', `admin-condition-button condition-${condition}`, label);
  button.type = 'button';
  button.dataset.adminEmail = row.account.email;
  button.dataset.submissionId = row.submission.id;
  button.dataset.adminCondition = condition;
  button.setAttribute('aria-label', `${label} konten "${row.submission.title}" dari ${row.account.name}`);
  button.disabled = row.submission.status === condition;
  return button;
}

let adminReviewRenderId = 0;

function renderAdminReview() {
  const renderId = ++adminReviewRenderId;
  apiAdminAccounts()
    .then((accounts) => {
      if (renderId === adminReviewRenderId) buildAdminReview(accounts);
    })
    .catch((error) => {
      if (renderId !== adminReviewRenderId) return;
      elements.adminSummary.replaceChildren();
      elements.adminReviewList.replaceChildren();
      elements.adminReviewList.append(makeElement('div', 'admin-review-empty', error?.message || 'Konsol admin gagal dimuat dari server.'));
    });
}

function buildAdminReview(accounts) {
  const rows = accounts.flatMap((account) => {
    const submissions = Array.isArray(account.treeState?.sharingSubmissions) ? account.treeState.sharingSubmissions : [];
    return submissions.map((submission) => ({ account, submission }));
  });

  // Satu chip = statistik sekaligus saringan: klik untuk memisahkan daftar.
  const counts = { all: rows.length };
  ADMIN_FILTERS.slice(1).forEach((filter) => {
    counts[filter.key] = rows.filter((row) => row.submission.status === filter.key).length;
  });
  elements.adminSummary.replaceChildren();
  ADMIN_FILTERS.forEach((filter) => {
    const chip = makeElement('button', `admin-summary-button condition-${filter.key}${adminReviewFilter === filter.key ? ' is-active' : ''}`, filter.label);
    chip.type = 'button';
    chip.dataset.adminFilter = filter.key;
    if (counts[filter.key] > 0) {
      chip.append(makeElement('span', 'chip-count', String(counts[filter.key])));
    }
    elements.adminSummary.append(chip);
  });

  const visibleRows = adminReviewFilter === 'all' ? rows : rows.filter((row) => row.submission.status === adminReviewFilter);
  elements.adminReviewList.replaceChildren();

  if (visibleRows.length === 0) {
    const emptyText = adminReviewFilter === 'all'
      ? 'Belum ada konten Sharing untuk direview. Materi dari halaman Sharing (akun mana pun di browser ini) tampil di sini.'
      : `Tidak ada konten berstatus ${SHARING_STATUS_INFO[adminReviewFilter]?.label ?? adminReviewFilter}.`;
    elements.adminReviewList.append(makeElement('div', 'admin-review-empty', emptyText));
    return;
  }

  visibleRows.forEach((row) => {
    const item = makeElement('article', `admin-submission status-${row.submission.status}`);
    const submissionReports = Array.isArray(row.submission.reports) ? row.submission.reports : [];
    const owner = makeElement('div', 'admin-owner');
    owner.append(makeElement('strong', '', row.account.name), makeElement('small', '', row.account.email));
    const statusInfo = SHARING_STATUS_INFO[row.submission.status];

    const header = makeElement('div', 'admin-item-header');
    header.append(owner, makeElement('span', 'sharing-status-badge', statusInfo?.label ?? row.submission.status));
    if (submissionReports.length > 0) {
      header.append(makeElement('span', 'admin-report-badge', `${submissionReports.length} laporan`));
    }
    item.append(header);

    item.append(makeElement('h5', '', row.submission.title));
    item.append(makeElement('div', 'sharing-item-meta', [
      `${SHARING_TYPE_LABELS[row.submission.type] ?? row.submission.type}`,
      `dikirim ${formatDate(row.submission.submittedAt)}`,
      row.submission.reviewedAt ? `diputus ${formatDate(row.submission.reviewedAt)}` : 'belum diputus',
      submissionReports.length ? `dilaporkan ${submissionReports.length}×` : '',
      row.submission.url ? 'tautan' : (row.submission.attachment ? 'video terlampir' : ''),
    ].filter(Boolean).join(' · ')));

    if (row.submission.url) {
      const link = makeElement('a', 'sharing-material-link', row.submission.url);
      link.href = row.submission.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      item.append(link);
    } else if (row.submission.attachment?.name) {
      item.append(makeElement('span', 'sharing-material-file', row.submission.attachment.name));
    }

    item.append(makeElement('p', 'sharing-item-summary', row.submission.summary));

    const actions = makeElement('div', 'admin-condition-actions');
    actions.append(makeAdminConditionButton(row, 'validated', 'ACC'));
    actions.append(makeAdminConditionButton(row, 'stale', 'Tandai Basi'));
    actions.append(makeAdminConditionButton(row, 'rejected', 'Tidak Relevan'));
    item.append(actions);

    elements.adminReviewList.append(item);
  });
}

async function applyAdminCondition(button) {
  const email = button.dataset.adminEmail;
  const submissionId = button.dataset.submissionId;
  const condition = button.dataset.adminCondition;
  // Keputusan dijalankan server: mesin gamifikasi juga hidup di backend.
  let result;
  try {
    result = await apiAdminCondition(submissionId, condition);
  } catch (error) {
    showToast(error?.message || 'Kondisi konten gagal diperbarui.', 'notice');
    return;
  }

  const owner = { name: result.owner?.name ?? email, email: result.owner?.email ?? email };

  renderAdminReview();

  const isCurrentAccount = currentAccount?.email === owner.email;
  if (isCurrentAccount) {
    state = result.ownerState ?? state;
    currentAccount.treeState = state;
    render(true);
  }

  const ownerLabel = isCurrentAccount ? 'akunmu' : `akun ${owner.name}`;
  const messages = {
    validated: result.rewarded
      ? `ACC: +3 Air, +2 Pupuk untuk ${ownerLabel}; buah konten ini muncul di Storage, slotnya sudah tercatat.`
      : `ACC ulang: buah konten ini kembali pada slot lamanya di pohon ${ownerLabel}.`,
    stale: `Basi: buah konten ini jatuh dan rebah busuk di bawah pohon ${ownerLabel}.`,
    rejected: `Tidak relevan: buah konten ini diangkat — hilang dari pohon ${ownerLabel}, slotnya kosong.`,
    duplicate: `Duplikat: buah duplikat diangkat; buah konten asli tetap ada.`,
  };
  showToast(result.applied ? (messages[condition] ?? 'Kondisi konten diperbarui.') : 'Kondisi konten sudah seperti itu.', condition === 'validated' ? 'success' : 'notice');
}

// Perpustakaan: konten relevan (ACC) lintas-akun dari server; pengguna lain
// dapat melaporkan konten yang menurutnya tidak relevan. Satu akun satu
// laporan per konten; keputusan tetap di tangan admin.
let libraryRenderId = 0;

function renderLibrary() {
  const renderId = ++libraryRenderId;
  apiLibrary()
    .then((rows) => {
      if (renderId === libraryRenderId) buildLibrary(rows);
    })
    .catch((error) => {
      if (renderId !== libraryRenderId) return;
      elements.libraryCount.textContent = '–';
      elements.libraryList.replaceChildren();
      elements.libraryList.append(makeElement('div', 'library-empty', error?.message || 'Perpustakaan gagal dimuat dari server.'));
    });
}

function buildLibrary(rows) {
  elements.libraryCount.textContent = String(rows.length);
  elements.libraryList.replaceChildren();

  if (rows.length === 0) {
    elements.libraryList.append(makeElement('div', 'library-empty', 'Belum ada konten relevan yang di-ACC. Konten yang lulus review admin dari akun mana pun akan tampil di sini.'));
    return;
  }

  rows.forEach((row) => {
    const item = makeElement('article', 'library-item');
    const reports = Array.isArray(row.submission.reports) ? row.submission.reports : [];
    const isOwn = currentAccount?.email === row.account.email;
    const alreadyReported = reports.some((report) => report?.by === currentAccount?.email);

    const header = makeElement('div', 'library-item-header');
    header.append(makeElement('span', 'library-owner', row.account.name));
    header.append(makeElement('span', 'sharing-status-badge', 'ACC · relevan'));
    item.append(header);

    item.append(makeElement('h5', '', row.submission.title));
    item.append(makeElement('div', 'sharing-item-meta', [
      `${SHARING_TYPE_LABELS[row.submission.type] ?? row.submission.type}`,
      `dikirim ${formatDate(row.submission.submittedAt)}`,
      reports.length ? `${reports.length} laporan menunggu keputusan admin` : '',
    ].filter(Boolean).join(' · ')));

    if (row.submission.url) {
      const link = makeElement('a', 'sharing-material-link', row.submission.url);
      link.href = row.submission.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      item.append(link);
    }
    if (row.submission.summary) {
      item.append(makeElement('p', 'sharing-item-summary', row.submission.summary));
    }

    const reportButton = makeElement('button', 'library-report-button', isOwn ? 'Konten milikmu' : (alreadyReported ? 'Sudah kamu laporkan' : 'Laporkan tidak relevan'));
    reportButton.type = 'button';
    reportButton.disabled = isOwn || alreadyReported || !currentAccount;
    if (isOwn) {
      reportButton.title = 'Tidak bisa melaporkan kontenmu sendiri.';
    } else if (alreadyReported) {
      reportButton.title = 'Satu akun satu laporan per konten.';
    } else if (currentAccount) {
      reportButton.dataset.libraryEmail = row.account.email;
      reportButton.dataset.submissionId = row.submission.id;
      reportButton.title = 'Laporanmu tampil untuk admin; admin yang memutuskan kondisinya.';
    }
    item.append(reportButton);
    elements.libraryList.append(item);
  });
}

async function applyLibraryReport(button) {
  const submissionId = button.dataset.submissionId;
  if (!submissionId || !currentAccount) return;

  let result;
  try {
    result = await apiReport(submissionId);
  } catch (error) {
    showToast(error?.message || 'Laporan gagal dikirim.', 'notice');
    return;
  }

  if (result.added) {
    showToast(`Laporan tersimpan di server (total ${result.reports}). Admin yang memutuskan kondisinya.`, 'success');
  } else {
    showToast('Kamu sudah pernah melaporkan konten ini.', 'notice');
  }

  renderAdminReview();
  renderLibrary();
}

function clearSharingVideoPreviews() {
  sharingVideoObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  sharingVideoObjectUrls.clear();
}

async function restoreSharingVideoPreview(submission, renderId) {
  let storedVideo = null;
  try {
    storedVideo = await getSharingVideo(currentAccount.email, submission.id);
  } catch {
    // The queue remains usable if this browser cannot read local video storage.
  }

  if (renderId !== sharingQueueRenderId) return;

  const videoPreview = [...elements.sharingQueue.querySelectorAll('[data-sharing-video]')]
    .find((video) => video.dataset.sharingVideo === submission.id);
  const videoStatus = [...elements.sharingQueue.querySelectorAll('[data-sharing-video-status]')]
    .find((status) => status.dataset.sharingVideoStatus === submission.id);
  if (!videoPreview || !videoStatus) return;

  if (!storedVideo?.blob) {
    videoStatus.textContent = 'Video tidak ditemukan di penyimpanan browser ini.';
    return;
  }

  const objectUrl = URL.createObjectURL(storedVideo.blob);
  sharingVideoObjectUrls.set(submission.id, objectUrl);
  videoPreview.src = objectUrl;
  videoStatus.hidden = true;
}

function formatFileSize(bytes) {
  const fileSize = Number(bytes);
  if (!Number.isFinite(fileSize) || fileSize <= 0) return '';
  if (fileSize < 1024 * 1024) return `${Math.ceil(fileSize / 1024)} KB`;
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

function renderSelectedVideo() {
  const file = elements.sharingVideoFile.files?.[0];
  elements.sharingVideoSelection.hidden = !file;
  elements.sharingVideoSelection.textContent = file
    ? `${file.name}${formatFileSize(file.size) ? ` · ${formatFileSize(file.size)}` : ''}`
    : '';
}

function renderActivities() {
  renderLearningCatalog();
  renderSharingQueue();
  renderContentStatusTable();
  renderAdminReview();
  renderLibrary();
}

function renderTree(animate = false, previousLevel = state.level, previousCondition = getTreeCondition(state)) {
  const condition = getTreeCondition(state);
  const conditionInfo = CONDITION_LABELS[condition];
  const sceneClass = conditionInfo.className;
  const levelChanged = previousLevel !== state.level;
  const conditionChanged = previousCondition !== condition;

  const levelValue = String(state.level);
  // Buah terikat konten: tiap buah memegang slot tetapnya. Slot kosong =
  // buah belum dipindah dari Storage atau sudah diangkat; buah basi rebah
  // di tanah. Buah lain tidak pernah bergeser mengisi celah.
  const fruitView = getFruitView(state);
  const fruitValue = [
    fruitView.maxSlot,
    `T${fruitView.tree.map((entry) => entry.slot).join(',')}`,
    `G${fruitView.ground.map((entry) => entry.slot).join(',')}`,
  ].join('|');
  const visualChanged = elements.treeCanvas.dataset.level !== levelValue
    || elements.treeCanvas.dataset.condition !== condition
    || elements.treeCanvas.dataset.fruits !== fruitValue;

  if (visualChanged) {
    elements.treeCanvas.innerHTML = makeTreeSvg(state.level, condition, fruitView);
    elements.treeCanvas.dataset.level = levelValue;
    elements.treeCanvas.dataset.condition = condition;
    elements.treeCanvas.dataset.fruits = fruitValue;
  }
  elements.treeCanvas.setAttribute('aria-label', `Pohon Level ${state.level}, ${STAGES[state.level]}, ${state.fruitsOnTree} Buah di pohon${fruitView.ground.length ? `, ${fruitView.ground.length} buah busuk rebah di tanah` : ''}, kondisi ${conditionInfo.title}`);
  elements.treePanel.classList.remove('is-healthy', 'is-thirsty', 'is-dead');
  elements.treePanel.classList.add(sceneClass);
  elements.treeScene.classList.toggle('is-advanced-stage', state.level >= 7 && condition === 'healthy');
  elements.condition.className = `scene-condition ${sceneClass}`;
  elements.conditionLabel.textContent = conditionInfo.title;
  elements.levelValue.textContent = String(state.level);
  renderStageTrack();

  if (!animate) {
    elements.treeArt.classList.remove('tree-state-change');
  }

  if (animate && visualChanged && conditionChanged && !levelChanged) {
    elements.treeArt.classList.remove('tree-state-change');
    void elements.treeArt.offsetWidth;
    elements.treeArt.classList.add('tree-state-change');
    window.setTimeout(() => elements.treeArt.classList.remove('tree-state-change'), 850);
  }
}

function renderClock() {
  const nextDecayAt = state.lastDecayAt + WEEK_MS;
  const remaining = Math.max(0, nextDecayAt - state.clockMs);
  const totalHours = Math.ceil(remaining / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const elapsedSinceReset = Math.max(0, state.clockMs - state.lastDecayResetAt);
  const daysSinceReset = Math.floor(elapsedSinceReset / (24 * 60 * 60 * 1000));
  elements.lastActivityLabel.textContent = daysSinceReset === 0
    ? 'Aktivitas/perawatan terakhir: hari ini'
    : `Aktivitas/perawatan terakhir: ${daysSinceReset} hari lalu`;
  elements.nextDecayLabel.textContent = remaining === 0
    ? 'Decay akan diterapkan pada pemeriksaan berikutnya'
    : `Decay berikutnya dalam ${days} hari ${hours} jam`;
  elements.advanceWeekButton.setAttribute('aria-label', `Simulasikan 7 hari. Decay berikutnya dalam ${days} hari ${hours} jam.`);
  elements.advanceWeekButton.title = `Decay berikutnya dalam ${days} hari ${hours} jam`;
}

function render(animate = false, previousLevel = state.level, previousCondition = getTreeCondition(state)) {
  renderTree(animate, previousLevel, previousCondition);
  renderResources();
  renderProgress();
  renderHistory();
  renderActivities();
  renderClock();
}

let toastTimer;
function showToast(message, tone = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  elements.toastRegion.replaceChildren(toast);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.remove(), 3200);
}

function updateWith(nextState, message, tone = 'success', { animateTree = true } = {}) {
  const previousLevel = state.level;
  const previousCondition = getTreeCondition(state);
  state = nextState;
  saveState();
  render(animateTree, previousLevel, previousCondition);
  if (message) showToast(message, tone);
}

function updateLearningQuizState() {
  if (!activeLearningModule) return;

  const selectedAnswer = elements.learningQuiz.querySelector('input[name="learningAnswer"]:checked');
  const answerIsCorrect = Number(selectedAnswer?.value) === activeLearningModule.quiz.correctAnswer;
  const materialWasRead = elements.learningReadCheck.checked;
  elements.completeLearningButton.disabled = !answerIsCorrect || !materialWasRead;

  if (selectedAnswer && !answerIsCorrect) {
    elements.learningFeedback.textContent = 'Jawaban belum tepat. Tinjau materi, lalu coba lagi.';
    elements.learningFeedback.className = 'learning-feedback is-error';
  } else if (answerIsCorrect && materialWasRead) {
    elements.learningFeedback.textContent = 'Benar. Materi siap diselesaikan.';
    elements.learningFeedback.className = 'learning-feedback is-success';
  } else if (answerIsCorrect) {
    elements.learningFeedback.textContent = 'Tandai bahwa kamu sudah mempelajari materi untuk melanjutkan.';
    elements.learningFeedback.className = 'learning-feedback';
  } else {
    elements.learningFeedback.textContent = 'Pilih jawaban kuis dan konfirmasi materi untuk menyelesaikan Learning.';
    elements.learningFeedback.className = 'learning-feedback';
  }
}

function openLearningModule(moduleId) {
  const module = LEARNING_MODULES.find((entry) => entry.id === moduleId);
  if (!module || state.completedLearningIds.includes(moduleId)) return;

  activeLearningModule = module;
  elements.learningDialogTitle.textContent = module.title;
  elements.learningLessonContent.replaceChildren();
  elements.learningLessonContent.append(makeElement('p', 'learning-lesson-intro', module.description));

  module.sections.forEach((section) => {
    const article = makeElement('section', 'learning-lesson-section');
    article.append(makeElement('h3', '', section.heading));
    section.paragraphs.forEach((paragraph) => article.append(makeElement('p', '', paragraph)));
    elements.learningLessonContent.append(article);
  });

  const resource = document.createElement('a');
  resource.className = 'learning-resource-link';
  resource.href = module.resourceUrl;
  resource.target = '_blank';
  resource.rel = 'noreferrer';
  resource.textContent = module.resourceLabel;
  elements.learningLessonContent.append(resource);

  elements.learningQuiz.replaceChildren();
  elements.learningQuiz.append(makeElement('legend', '', module.quiz.prompt));
  module.quiz.answers.forEach((answer, index) => {
    const answerId = `learning-answer-${module.id}-${index}`;
    const label = makeElement('label', 'learning-answer');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'learningAnswer';
    input.value = String(index);
    input.id = answerId;
    label.htmlFor = answerId;
    label.append(input, makeElement('span', '', answer));
    elements.learningQuiz.append(label);
  });

  elements.learningReadCheck.checked = false;
  elements.completeLearningButton.disabled = true;
  elements.learningFeedback.textContent = 'Pilih jawaban kuis dan konfirmasi materi untuk menyelesaikan Learning.';
  elements.learningFeedback.className = 'learning-feedback';
  elements.learningDialog.showModal();
}

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.loginForm);

  try {
    const { account, treeState } = await apiEntry({
      name: String(formData.get('name')),
      email: String(formData.get('email')),
      password: String(formData.get('password')),
    });
    elements.loginForm.reset();
    const isNew = account.isNew === true;
    enterApp(account, treeState, true);
    if (isNew) {
      showToast('Kebun baru dibuat di server. Selamat menanam! +1 Air masuk Storage.', 'success');
    }
  } catch (error) {
    setAuthMessage(error.message, 'error');
  }
});

elements.logoutButton.addEventListener('click', () => {
  leaveApp('Kamu sudah keluar dari akun demo.');
});

elements.pageLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    navigateToPage(link.dataset.pageTarget);
  });
});

elements.mobileMenuToggle.addEventListener('click', () => {
  const isOpen = elements.mobileMenuToggle.getAttribute('aria-expanded') === 'true';
  setMobileMenuOpen(!isOpen);
  if (!isOpen) {
    elements.pageLinks[0]?.focus();
  }
});

elements.sidebarCollapse.addEventListener('click', () => {
  const collapsed = document.body.classList.toggle('is-sidebar-collapsed');
  elements.sidebarCollapse.setAttribute('aria-expanded', String(!collapsed));
  elements.sidebarCollapse.setAttribute('aria-label', collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar');
});

elements.mobileMenuClose.addEventListener('click', () => {
  setMobileMenuOpen(false);
  elements.mobileMenuToggle.focus();
});

elements.mobileMenuBackdrop.addEventListener('click', () => {
  setMobileMenuOpen(false);
  elements.mobileMenuToggle.focus();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && elements.sidebar.classList.contains('is-menu-open')) {
    setMobileMenuOpen(false);
    elements.mobileMenuToggle.focus();
  } else if (event.key === 'Tab' && elements.sidebar.classList.contains('is-menu-open')) {
    const focusableItems = [...elements.sidebar.querySelectorAll('a[href], button:not(:disabled)')];
    const firstItem = focusableItems[0];
    const lastItem = focusableItems.at(-1);

    if (event.shiftKey && document.activeElement === firstItem) {
      event.preventDefault();
      lastItem?.focus();
    } else if (!event.shiftKey && document.activeElement === lastItem) {
      event.preventDefault();
      firstItem?.focus();
    }
  }
});

window.addEventListener('resize', () => setMobileMenuOpen(false));

window.addEventListener('popstate', () => navigateToPage(pageFromLocationHash(), false));

elements.learningCatalog.addEventListener('click', (event) => {
  const startButton = event.target.closest('[data-learning-module]');
  if (startButton) {
    openLearningModule(startButton.dataset.learningModule);
  }
});

elements.learningCatalog.addEventListener('change', (event) => {
  const ratingInput = event.target.closest('input[name="rating"]');
  if (!ratingInput) return;

  const selectedRating = Number(ratingInput.value);
  ratingInput.closest('.learning-star-picker').querySelectorAll('.learning-star-option').forEach((star, index) => {
    star.classList.toggle('is-selected', index < selectedRating);
  });
});

elements.learningQuizForm.addEventListener('change', updateLearningQuizState);
elements.learningReadCheck.addEventListener('change', updateLearningQuizState);
elements.learningQuizForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!activeLearningModule || elements.completeLearningButton.disabled) return;

  const result = completeLearningModule(state, activeLearningModule.id, { title: activeLearningModule.title });
  if (result.awarded) {
    updateWith(result.state, `Learning selesai: ${activeLearningModule.title}. +1 Pupuk masuk Storage; gunakan pada pohon untuk menambah progres.`);
  }
  elements.learningDialog.close();
  activeLearningModule = null;
});

elements.learningCatalog.addEventListener('submit', (event) => {
  const ratingForm = event.target.closest('form[data-learning-rating]');
  if (!ratingForm) return;
  event.preventDefault();

  const module = LEARNING_MODULES.find((entry) => entry.id === ratingForm.dataset.learningRating);
  if (!module) return;
  const rating = Number(new FormData(ratingForm).get('rating'));
  const result = rateLearningModule(state, module.id, rating, { title: module.title });
  if (!result.awarded) {
    showToast('Learning harus selesai sebelum diberi rating.', 'notice');
    return;
  }

  updateWith(result.state, `Rating ${rating}/5 tersimpan. +1 Air masuk Storage; gunakan pada pohon untuk menambah progres.`);
});

elements.sharingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.sharingForm);
  const videoFile = elements.sharingVideoFile.files?.[0];

  try {
    const result = submitSharingMaterial(state, {
      title: String(formData.get('title')),
      type: String(formData.get('type')),
      attachment: videoFile ? { name: videoFile.name, type: videoFile.type, size: videoFile.size } : null,
      summary: String(formData.get('summary')),
    });
    if (videoFile) {
      await saveSharingVideo(currentAccount.email, result.submission.id, videoFile);
    }
    elements.sharingForm.reset();
    renderSelectedVideo();
    const message = result.submission.status === 'duplicate'
      ? 'Materi ini sudah pernah dikirim. Sharing ditandai duplikat tanpa reward.'
      : 'Materi Sharing masuk antrean validasi demo.';
    updateWith(result.state, message, result.submission.status === 'duplicate' ? 'notice' : 'success');
  } catch (error) {
    const message = error?.name === 'QuotaExceededError'
      ? 'Penyimpanan browser penuh. Hapus video lama atau pilih video yang lebih kecil.'
      : error?.message || 'Video gagal disimpan di browser ini. Coba lagi dengan video yang lebih kecil.';
    showToast(message, 'notice');
  }
});

elements.sharingVideoFile.addEventListener('change', () => {
  const file = elements.sharingVideoFile.files?.[0];
  const isVideo = file && (file.type.toLocaleLowerCase('id-ID').startsWith('video/') || /\.(mp4|m4v|mov|webm|ogv|avi|mkv)$/i.test(file.name));
  if (file && !isVideo) {
    elements.sharingVideoFile.value = '';
    renderSelectedVideo();
    showToast('Pilih file video untuk lampiran opsional.', 'notice');
    return;
  }

  renderSelectedVideo();
});

elements.adminSummary.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-admin-filter]');
  if (!chip) return;

  adminReviewFilter = chip.dataset.adminFilter;
  renderAdminReview();
});

elements.adminReviewList.addEventListener('click', (event) => {
  const conditionButton = event.target.closest('[data-admin-condition]');
  if (!conditionButton) return;

  applyAdminCondition(conditionButton);
});

elements.libraryList.addEventListener('click', (event) => {
  const reportButton = event.target.closest('[data-library-email][data-submission-id]');
  if (!reportButton) return;

  applyLibraryReport(reportButton);
});

elements.learningDialogClose.addEventListener('click', () => elements.learningDialog.close());
elements.learningDialog.addEventListener('close', () => {
  activeLearningModule = null;
});
elements.learningDialog.addEventListener('click', (event) => {
  if (event.target === elements.learningDialog) {
    elements.learningDialog.close();
  }
});

let careAnimationTimer;
function playCareAnimation(resourceType) {
  const effect = elements.careAnimation;
  const isWatering = resourceType === 'air';
  const particleClass = isWatering ? 'water-particle' : 'fertilizer-particle';
  const particleCount = isWatering ? 7 : 9;
  // Horizontal slot of each fertilizer grain, synced to the mascot flyby below.
  const fertilizerLefts = [14, 23, 32, 41, 50, 59, 68, 77, 86];
  const mascotFlybyMs = 3000;

  window.clearTimeout(careAnimationTimer);
  effect.className = 'care-animation';
  effect.replaceChildren();

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement('span');
    particle.className = `care-particle ${particleClass}`;
    particle.style.setProperty('--particle-index', String(index));
    if (!isWatering) {
      const flybyDelay = ((fertilizerLefts[index] + 18) / 122) * mascotFlybyMs;
      particle.style.setProperty('--drop-delay', `${Math.round(flybyDelay)}ms`);
    }
    effect.append(particle);
  }

  if (isWatering) {
    for (let cloudIndex = 0; cloudIndex < 3; cloudIndex += 1) {
      const cloud = document.createElement('span');
      cloud.className = `care-cloud cloud-pos-${cloudIndex + 1}`;
      cloud.setAttribute('aria-hidden', 'true');
      cloud.style.setProperty('--cloud-index', String(cloudIndex));
      effect.append(cloud);
    }
  }

  if (!isWatering) {
    const mascot = document.createElement('span');
    mascot.className = 'care-mascot';
    mascot.setAttribute('aria-hidden', 'true');
    const mascotImg = document.createElement('img');
    mascotImg.src = 'mascot.png';
    mascotImg.alt = '';
    mascotImg.draggable = false;
    mascotImg.addEventListener('error', () => mascot.remove(), { once: true });
    mascot.append(mascotImg);
    effect.append(mascot);
  }

  void effect.offsetWidth;
  effect.classList.add(isWatering ? 'is-watering' : 'is-fertilizing');
  careAnimationTimer = window.setTimeout(() => {
    effect.className = 'care-animation';
    effect.replaceChildren();
  }, isWatering ? 1500 : 4000);
}

function careForTree(resourceType) {
  const result = applyCare(state, resourceType);
  const resourceName = { air: 'Air', fertilizer: 'Pupuk', fruit: 'Buah' }[resourceType];

  if (result.applied) {
    if (resourceType === 'fruit') {
      updateWith(result.state, '1 Buah dipindahkan dari Storage ke pohon — menggantung di slot kontennya. Progres dan perawatan tidak berubah.', 'success', { animateTree: false });
      return;
    }

    const levelChanged = result.state.level !== state.level;
    const effect = result.progressApplied
      ? 'Progres dan perawatan pohon bertambah.'
      : 'Perawatan pulih; progres level sudah penuh.';
    updateWith(result.state, `Pohon menerima 1 ${resourceName} dari Storage. ${effect}`, 'success', { animateTree: levelChanged });
    playCareAnimation(resourceType);
    return;
  }

  if (result.reason === 'progress-full') {
    updateWith(result.state, `Progres ${resourceName} sudah penuh. Saldo ${resourceName} tetap di Storage hingga progres pasangannya terpenuhi.`, 'notice', { animateTree: false });
    return;
  }

  if (result.reason === 'tree-not-ready') {
    updateWith(result.state, 'Buah hanya dapat dipindahkan ke pohon yang sehat mulai Level 3. Buah tetap di Storage.', 'notice', { animateTree: false });
    return;
  }

  updateWith(result.state, `Saldo ${resourceName} di Storage tidak cukup.`, 'notice', { animateTree: false });
}

let careDragButton = null;
let careDragPointerId = null;
let careDragStartX = 0;
let careDragStartY = 0;
let isCareDragActive = false;
let suppressCareClickButton = null;

function cancelCareDrag() {
  careDragButton?.classList.remove('is-dragging');
  elements.treeScene.classList.remove('is-care-drop-ready', 'is-drop-target');
  elements.careDragLayer.hidden = true;
  elements.careDragLayer.replaceChildren();
  document.body.classList.remove('is-care-dragging');
  careDragButton = null;
  careDragPointerId = null;
  isCareDragActive = false;
}

function updateCareDragGhost(clientX, clientY) {
  const ghost = elements.careDragLayer.firstElementChild;
  if (!ghost) return;
  ghost.style.left = `${clientX}px`;
  ghost.style.top = `${clientY}px`;
}

function isPointerOverTree(clientX, clientY) {
  const target = document.elementFromPoint(clientX, clientY);
  return Boolean(target && (target === elements.treeScene || elements.treeScene.contains(target)));
}

function updateCareDropTarget(clientX, clientY) {
  updateCareDragGhost(clientX, clientY);
  const isOverTree = isPointerOverTree(clientX, clientY);
  elements.treeScene.classList.toggle('is-drop-target', isOverTree);
}

function beginCareGesture(button, event) {
  if (event.button !== 0 || !event.isPrimary) {
    return;
  }

  cancelCareDrag();
  careDragButton = button;
  careDragPointerId = event.pointerId;
  careDragStartX = event.clientX;
  careDragStartY = event.clientY;
}

function activateCareDrag() {
  if (!careDragButton) return;

  isCareDragActive = true;
  const button = careDragButton;
  button.classList.add('is-dragging');
  elements.treeScene.classList.add('is-care-drop-ready');
  document.body.classList.add('is-care-dragging');

  const ghost = document.createElement('div');
  ghost.className = `care-drag-ghost ghost-${button.dataset.treeCareResource}`;
  ghost.append(button.querySelector('.care-quick-icon').cloneNode(true));
  const balance = document.createElement('strong');
  balance.textContent = button.querySelector('strong').textContent;
  ghost.append(balance);
  elements.careDragLayer.replaceChildren(ghost);
  elements.careDragLayer.hidden = false;
}

function handleCarePointerMove(event) {
  if (!careDragButton || event.pointerId !== careDragPointerId) return;

  if (!isCareDragActive && Math.hypot(event.clientX - careDragStartX, event.clientY - careDragStartY) < 7) {
    return;
  }

  if (!isCareDragActive) {
    activateCareDrag();
  }
  updateCareDropTarget(event.clientX, event.clientY);
}

function finishCareDrag(event) {
  if (!careDragButton || event.pointerId !== careDragPointerId) return;

  const button = careDragButton;
  const resourceType = button.dataset.treeCareResource;
  const droppedOnTree = isCareDragActive && isPointerOverTree(event.clientX, event.clientY);
  const wasDrag = isCareDragActive;
  cancelCareDrag();

  if (droppedOnTree) {
    careForTree(resourceType);
  }

  if (wasDrag) {
    suppressCareClickButton = button;
    window.setTimeout(() => {
      if (suppressCareClickButton === button) {
        suppressCareClickButton = null;
      }
    }, 0);
  }
}

document.querySelectorAll('[data-tree-care-resource]').forEach((button) => {
  button.addEventListener('pointerdown', (event) => beginCareGesture(button, event));
  button.addEventListener('click', (event) => {
    if (suppressCareClickButton === button) {
      event.preventDefault();
      suppressCareClickButton = null;
      return;
    }

    careForTree(button.dataset.treeCareResource);
  });
  button.addEventListener('contextmenu', (event) => event.preventDefault());
});

window.addEventListener('pointermove', handleCarePointerMove);
window.addEventListener('pointerup', finishCareDrag);
window.addEventListener('pointercancel', cancelCareDrag);
window.addEventListener('blur', cancelCareDrag);

elements.advanceWeekButton.addEventListener('click', () => {
  const previousLevel = state.level;
  const previousCondition = getTreeCondition(state);
  const previousGrowthAir = state.growthAir;
  const previousGrowthFertilizerUnits = state.growthFertilizerUnits;
  const previousDecayAt = state.lastDecayAt;
  const nextState = advanceDemoDays(state, 7);
  const decayApplied = nextState.lastDecayAt > previousDecayAt;
  const lostGrowthAir = Math.max(0, previousGrowthAir - nextState.growthAir);
  const lostGrowthFertilizer = Math.max(0, previousGrowthFertilizerUnits - nextState.growthFertilizerUnits);
  const progressChanges = [];
  if (lostGrowthAir > 0) progressChanges.push(`Air −${lostGrowthAir}`);
  if (lostGrowthFertilizer > 0) progressChanges.push(`Pupuk −${formatPupuk(lostGrowthFertilizer)}`);
  const previousConditionLabel = CONDITION_LABELS[previousCondition].title;
  const nextConditionLabel = CONDITION_LABELS[getTreeCondition(nextState)].title;
  state = nextState;
  saveState();
  render(true, previousLevel, previousCondition);
  const message = decayApplied
    ? `Simulasi +7 hari: progres ${progressChanges.length ? progressChanges.join(' · ') : 'sudah minimum'}; ${previousConditionLabel} → ${nextConditionLabel}. Storage dan level tetap.`
    : 'Simulasi maju 7 hari; decay belum diterapkan.';
  showToast(message, 'notice');
});

elements.testYellowButton.addEventListener('click', () => {
  const nextState = simulateDemoTreeCondition(state, 'thirsty');
  updateWith(nextState, 'Uji demo: kondisi pohon menguning diterapkan.', 'notice');
});

elements.testDeadButton.addEventListener('click', () => {
  const nextState = simulateDemoTreeCondition(state, 'dead');
  updateWith(nextState, 'Uji demo: kondisi pohon mati diterapkan.', 'notice');
});

elements.boostButton.addEventListener('click', () => {
  const nextState = applyDemoBoost(state);
  updateWith(nextState, 'Boost demo: resource ditambahkan ke Storage; gunakan Air/Pupuk pada pohon untuk mengisi progres.', 'notice');
});

elements.boostLevelButton.addEventListener('click', () => {
  const previousLevel = state.level;
  const nextState = applyDemoLevelBoost(state);
  updateWith(
    nextState,
    nextState.level > previousLevel
      ? `Boost level: pohon naik ke Level ${nextState.level}.`
      : 'Boost level: pohon sudah maksimal; perawatan dipulihkan.',
    'notice',
  );
});

elements.lowerLevelButton.addEventListener('click', () => {
  const previousLevel = state.level;
  const nextState = applyDemoLevelDecrease(state);
  updateWith(
    nextState,
    nextState.level < previousLevel
      ? `Turun level: pohon kembali ke Level ${nextState.level}.`
      : 'Turun level: pohon sudah paling awal.',
    'notice',
  );
});

elements.healthyButton.addEventListener('click', () => {
  const wasHealthy = getTreeCondition(state) === 'healthy';
  const nextState = simulateDemoTreeCondition(state, 'healthy');
  updateWith(
    nextState,
    wasHealthy ? 'Pohon sudah sehat; perawatan dipulihkan.' : 'Demo: pohon dipulihkan menjadi sehat.',
    'notice',
  );
});

elements.demoResourceType.addEventListener('change', updateDemoResourceAmountConstraints);
updateDemoResourceAmountConstraints();
elements.demoResourceForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const resourceType = elements.demoResourceType.value;
  const amount = Number(elements.demoResourceAmount.value);

  try {
    const nextState = addDemoResource(state, resourceType, amount);
    const amountLabel = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(amount);
    const resourceLabel = { air: 'Air', fertilizer: 'Pupuk', fruit: 'Buah' }[resourceType];
    const fruitMovedToTree = resourceType === 'fruit' && nextState.fruitsOnTree > state.fruitsOnTree;
    const message = fruitMovedToTree
      ? `Demo: +${amountLabel} Buah ditambahkan dan ditampilkan di pohon sehat.`
      : `Demo: +${amountLabel} ${resourceLabel} ditambahkan ke Storage.`;
    updateWith(nextState, message, 'notice');
  } catch (error) {
    showToast(error.message, 'notice');
  }
});

elements.resetButton.addEventListener('click', () => {
  const reset = window.confirm('Reset pohon dan seluruh riwayat demo?');
  if (!reset) return;

  state = createInitialState();
  saveState();
  render(true);
  showToast('Pohon demo kembali ke Level 0.', 'notice');
});

function initialize() {
  // Sesi tersimpan di server (cookie HttpOnly); pulihkan akun + pohnnya.
  apiMe()
    .then(({ account, treeState }) => enterApp(account, treeState, false))
    .catch(() => {
      // Tanpa sesi: layar masuk tetap tampil.
    });
}

initialize();
window.setInterval(() => {
  if (!currentAccount || !state) return;

  const previousCondition = getTreeCondition(state);
  const nextState = tickState(state);
  if (nextState.clockMs !== state.clockMs || getTreeCondition(nextState) !== previousCondition) {
    const previousLevel = state.level;
    state = nextState;
    saveState();
    render(true, previousLevel, previousCondition);
  }
}, 60_000);
