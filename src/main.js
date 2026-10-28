import './styles.css';
import {
  apiAdminAccounts,
  apiAdminActivity,
  apiAdminCondition,
  apiAdminCreateLearning,
  apiAdminDeleteContent,
  apiAdminDeleteLearning,
  apiAdminResetAccount,
  apiAdminSaveSettings,
  apiAdminUpdateAccount,
  apiAdminUpdateLearning,
  apiEntry,
  apiLearning,
  apiLibrary,
  apiLogout,
  apiMe,
  apiReport,
  apiSaveState,
} from './api.js';
import {
  DEFAULT_GAMIFICATION_SETTINGS,
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
  getGamificationSettings,
  getNextLevelRequirement,
  getTreeCondition,
  rateLearningModule,
  setGamificationSettings,
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
  adminStats: document.querySelector('#adminStats'),
  adminCharts: document.querySelector('#adminCharts'),
  adminAccountsBody: document.querySelector('#adminAccountsBody'),
  adminAccountSearch: document.querySelector('#adminAccountSearch'),
  adminAccountCount: document.querySelector('#adminAccountCount'),
  adminActivityList: document.querySelector('#adminActivityList'),
  adminActivitySearch: document.querySelector('#adminActivitySearch'),
  adminActivityUsers: document.querySelector('#adminActivityUsers'),
  adminActivityType: document.querySelector('#adminActivityType'),
  adminActivityPeriod: document.querySelector('#adminActivityPeriod'),
  adminActivityClear: document.querySelector('#adminActivityClear'),
  adminActivityCount: document.querySelector('#adminActivityCount'),
  adminActivityPagination: document.querySelector('#adminActivityPagination'),
  libraryList: document.querySelector('#libraryList'),
  libraryCount: document.querySelector('#libraryCount'),
  learningModuleCount: document.querySelector('#learningModuleCount'),
  learningPageDescription: document.querySelector('#learningPageDescription'),
  learningRewardComplete: document.querySelector('#learningRewardComplete'),
  learningRewardRating: document.querySelector('#learningRewardRating'),
  sharingRewardPill: document.querySelector('#sharingRewardPill'),
  notifyToggle: document.querySelector('#notifyToggle'),
  notifyBadge: document.querySelector('#notifyBadge'),
  notifyPanel: document.querySelector('#notifyPanel'),
  notifyList: document.querySelector('#notifyList'),
  levelKeyList: document.querySelector('.level-key-list'),
  learnAdminBody: document.querySelector('#learnAdminBody'),
  addLearningModuleButton: document.querySelector('#addLearningModuleButton'),
  learningAdminDialog: document.querySelector('#learningAdminDialog'),
  learnAdminDialogTitle: document.querySelector('#learnAdminDialogTitle'),
  learnAdminDialogClose: document.querySelector('#learnAdminDialogClose'),
  learningModuleForm: document.querySelector('#learningModuleForm'),
  learnFieldTitle: document.querySelector('#learnFieldTitle'),
  learnFieldCategory: document.querySelector('#learnFieldCategory'),
  learnFieldDuration: document.querySelector('#learnFieldDuration'),
  learnFieldDescription: document.querySelector('#learnFieldDescription'),
  learnFieldResourceLabel: document.querySelector('#learnFieldResourceLabel'),
  learnFieldResourceUrl: document.querySelector('#learnFieldResourceUrl'),
  learnFieldSections: document.querySelector('#learnFieldSections'),
  learnFieldQuiz: document.querySelector('#learnFieldQuiz'),
  learnFieldActive: document.querySelector('#learnFieldActive'),
  learnFormFeedback: document.querySelector('#learnFormFeedback'),
  learnFormSubmit: document.querySelector('#learnFormSubmit'),
  learnFormCancel: document.querySelector('#learnFormCancel'),
  adminConfirmDialog: document.querySelector('#adminConfirmDialog'),
  adminConfirmTitle: document.querySelector('#adminConfirmTitle'),
  adminConfirmDetail: document.querySelector('#adminConfirmDetail'),
  adminConfirmCancel: document.querySelector('#adminConfirmCancel'),
  adminConfirmSubmit: document.querySelector('#adminConfirmSubmit'),
  gAccAir: document.querySelector('#gAccAir'),
  gAccPupuk: document.querySelector('#gAccPupuk'),
  gAccessAir: document.querySelector('#gAccessAir'),
  gReviewAir: document.querySelector('#gReviewAir'),
  gLearnPupuk: document.querySelector('#gLearnPupuk'),
  gRatingAir: document.querySelector('#gRatingAir'),
  gDecayDays: document.querySelector('#gDecayDays'),
  gDecayGAir: document.querySelector('#gDecayGAir'),
  gDecayGPupuk: document.querySelector('#gDecayGPupuk'),
  gDecayCAir: document.querySelector('#gDecayCAir'),
  gDecayCPupuk: document.querySelector('#gDecayCPupuk'),
  gLevelBody: document.querySelector('#gLevelBody'),
  gSaveButton: document.querySelector('#gSaveButton'),
  gDefaultButton: document.querySelector('#gDefaultButton'),
  gFeedback: document.querySelector('#gFeedback'),
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
  admin: 'Pusat Admin',
  review: 'Review Konten',
  activity: 'Log Aktivitas',
  learnadm: 'Kelola Learning',
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
// Katalog Learning: awal dari katalog statis, diganti data server saat masuk.
let learningModules = LEARNING_MODULES.map((entry) => ({ ...entry }));
let learningAdminDialogMode = 'create';
let learningAdminEditingId = null;
let sharingQueueRenderId = 0;
let adminReviewFilter = 'all';

// Pupuk tersimpan dalam unit mesin (2 unit = 1 tampilan).
function formatPupukDisplay(units) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(units / 2);
}
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
  review: ['admin'],
  activity: ['admin'],
  learnadm: ['admin'],
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
      ? 'Halaman kebumu tertangani di akun user; admin membuka Pusat Admin & Review Konten.'
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
  if (page === 'activity') loadAdminActivity();
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

// Terapkan parameter dari server ke mesin SEBELUM state diolah; urutan ini
// penting bila admin mengubah ambang level (progress lama ikut diukur ulang).
function applyServerSettings(settings) {
  const normalized = setGamificationSettings(settings ?? null);
  fillGamificationSettingsForm();
  return normalized;
}

function enterApp(account, treeState = null, awardLogin = false, settings = null) {
  currentAccount = account;
  applyServerSettings(settings);
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
  refreshLearningCatalog();
  if (awardLogin) {
    const accessAir = getGamificationSettings().activityRewards.access;
    showToast(loginRewarded
      ? `Login valid: +${accessAir} Air masuk Storage. Gunakan Air pada pohon untuk menambah progres.`
      : 'Login valid. Reward Air hari ini sudah diterima; tidak ada Air tambahan.');
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

// Katalog Learning dari server: modul terkelola memenangkan katalog statis.
// Admin melihat juga modul draft; pengguna hanya modul aktif.
function refreshLearningCatalog() {
  apiLearning()
    .then((modules) => {
      if (Array.isArray(modules) && modules.length > 0) {
        learningModules = modules;
      }
      renderRewardLabels();
      renderLearningCatalog();
      buildLearnAdmin(latestAdminAccounts);
    })
    .catch(() => {
      // Katalog statis tetap dipakai bila server gagal.
    });
}

function renderLearningCatalog() {
  elements.learningProgressCount.textContent = `${state.completedLearningIds.length} / ${learningModules.length} selesai`;
  elements.learningProgressCount.setAttribute('aria-label', `${state.completedLearningIds.length} dari ${learningModules.length} modul tuntas`);
  elements.learningModuleCount.textContent = `${learningModules.length} materi`;
  elements.learningCatalog.replaceChildren();

  learningModules.forEach((module) => {
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
        reward.setAttribute('aria-label', `Tambah ${getGamificationSettings().learningRatingAir} Air ke Storage`);
        reward.title = `+${getGamificationSettings().learningRatingAir} Air ke Storage`;
        reward.append(makeSvgIcon('icon-water'), makeElement('b', '', `+${getGamificationSettings().learningRatingAir} Air`));
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
        rateButton.setAttribute('aria-label', `Kirim rating, tambah ${getGamificationSettings().learningRatingAir} Air ke Storage`);
        rateButton.append(makeSvgIcon('icon-water'), makeElement('b', '', `+${getGamificationSettings().learningRatingAir} Air`));
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
  elements.contentStatusCount.textContent = `${submissions.length} konten`;
  elements.contentStatusBody.replaceChildren();

  if (submissions.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'content-status-empty';
    emptyRow.innerHTML = '<td colspan="3"><strong>Belum ada konten Sharing.</strong>Kirim kontribusi di halaman Sharing — buah statusnya tampil di sini.</td>';
    elements.contentStatusBody.append(emptyRow);
    return;
  }

  submissions.forEach((submission) => {
    const statusInfo = SHARING_STATUS_INFO[submission.status];
    const row = document.createElement('tr');
    row.className = `content-status-row status-${submission.status}`;

    // Materi: judul + chip jenis + ringkasan dalam satu sel.
    const material = document.createElement('td');
    material.className = 'content-status-material';
    material.append(makeElement('strong', '', submission.title));
    material.append(makeElement('span', 'content-status-type', SHARING_TYPE_LABELS[submission.type] ?? submission.type));
    if (submission.summary) {
      material.append(makeElement('small', '', submission.summary));
    }

    // Dikirim: tanggal di atas, jam kecil di bawahnya.
    const sent = document.createElement('td');
    sent.className = 'content-status-sent';
    sent.append(makeElement('strong', '', formatDate(submission.submittedAt, { hour: undefined, minute: undefined })));
    sent.append(makeElement('small', '', formatDate(submission.submittedAt, { day: undefined, month: undefined })));

    // Kondisi: pill berwarna per status (+ hitungan laporan bila ada).
    const condition = document.createElement('td');
    condition.className = 'content-status-condition';
    const pill = makeElement('span', `content-status-pill pill-${statusInfo?.dot ?? submission.status}`);
    const dot = makeElement('span', `fruit-dot ${statusInfo?.dot ?? submission.status}`);
    dot.setAttribute('aria-hidden', 'true');
    pill.append(dot, makeElement('span', '', statusInfo?.label ?? submission.status));
    condition.append(pill);
    const reportCount = Array.isArray(submission.reports) ? submission.reports.length : 0;
    if (reportCount > 0) {
      condition.append(makeElement('span', 'admin-report-badge', `${reportCount} laporan`));
    }

    row.append(material, sent, condition);
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
let latestAdminAccounts = [];
let latestActivityWeek = [];
let adminActivityPage = 1;
let adminActivityRequestId = 0;
let adminActivitySearchTimer;

const ADMIN_HISTORY_TYPE_LABELS = {
  activity: 'Aktivitas',
  sharing: 'Sharing',
  care: 'Perawatan',
  fruit: 'Buah',
  decay: 'Penyusutan',
  report: 'Laporan',
  demo: 'Demo',
};
const TREE_CONDITION_LABELS = { healthy: 'Sehat', thirsty: 'Menguning', dead: 'Mati' };

function formatPupukUnits(units) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format((units ?? 0) / 2);
}

function formatRelative(timestamp) {
  if (!Number.isFinite(timestamp)) return '–';
  const elapsed = Date.now() - timestamp;
  if (elapsed < 60_000) return 'baru saja';
  if (elapsed < 3_600_000) {
    return `${new Intl.NumberFormat('id-ID').format(Math.floor(elapsed / 60_000))} mnt lalu`;
  }
  if (elapsed < 86_400_000) {
    return `${new Intl.NumberFormat('id-ID').format(Math.floor(elapsed / 3_600_000))} jam lalu`;
  }
  if (elapsed < 7 * 86_400_000) {
    return `${new Intl.NumberFormat('id-ID').format(Math.floor(elapsed / 86_400_000))} hari lalu`;
  }
  return formatDate(timestamp, { hour: undefined, minute: undefined });
}

function collectAdminTotals(accounts) {
  const totals = {
    users: 0,
    admins: 0,
    contents: 0,
    pending: 0,
    validated: 0,
    stale: 0,
    removed: 0,
    reports: 0,
    fruitsOnTree: 0,
    fruitsInStorage: 0,
    fruitsGround: 0,
    fruitsGone: 0,
  };
  accounts.forEach((account) => {
    if (account.role === 'admin') totals.admins += 1;
    else totals.users += 1;
    const submissions = Array.isArray(account.treeState?.sharingSubmissions) ? account.treeState.sharingSubmissions : [];
    totals.contents += submissions.length;
    submissions.forEach((submission) => {
      if (submission.status === 'pending') totals.pending += 1;
      else if (submission.status === 'validated') totals.validated += 1;
      else if (submission.status === 'stale') totals.stale += 1;
      else totals.removed += 1;
      totals.reports += Array.isArray(submission.reports) ? submission.reports.length : 0;
    });
    (Array.isArray(account.treeState?.fruitLedger) ? account.treeState.fruitLedger : []).forEach((fruit) => {
      if (fruit.placement === 'tree') totals.fruitsOnTree += 1;
      else if (fruit.placement === 'storage') totals.fruitsInStorage += 1;
      else if (fruit.placement === 'ground') totals.fruitsGround += 1;
      else totals.fruitsGone += 1;
    });
  });
  return totals;
}

function buildAdminStats(accounts) {
  const totals = collectAdminTotals(accounts);
  const cards = [
    {
      label: 'Akun',
      value: `${formatRelativeNumber(totals.users + totals.admins)}`,
      sub: `${totals.users} user · ${totals.admins} admin`,
    },
    {
      label: 'Konten Sharing',
      value: `${formatRelativeNumber(totals.contents)}`,
      sub: `${totals.pending} menunggu · ${totals.validated} ACC`,
    },
    {
      label: 'Laporan user',
      value: `${formatRelativeNumber(totals.reports)}`,
      sub: totals.reports > 0 ? 'tercatat pada konten Sharing' : 'belum ada laporan',
    },
    {
      label: 'Buah pengetahuan',
      value: `${formatRelativeNumber(totals.fruitsOnTree + totals.fruitsInStorage + totals.fruitsGround + totals.fruitsGone)}`,
      sub: `${totals.fruitsOnTree} pohon · ${totals.fruitsInStorage} Storage · ${totals.fruitsGround} rebah · ${totals.fruitsGone} diangkat`,
    },
  ];

  const grid = document.createElement('div');
  grid.className = 'admin-stats-grid';
  cards.forEach((card) => {
    const cardElement = makeElement('div', 'admin-stat-card');
    cardElement.append(
      makeElement('small', 'admin-stat-label', card.label),
      makeElement('strong', 'admin-stat-value', card.value),
      makeElement('small', 'admin-stat-sub', card.sub),
    );
    grid.append(cardElement);
  });
  elements.adminStats.replaceChildren(grid);
}

function formatRelativeNumber(value) {
  return new Intl.NumberFormat('id-ID').format(value ?? 0);
}

function buildAdminCharts(accounts) {
  const grid = document.createElement('div');
  grid.className = 'admin-charts-grid';
  grid.append(
    buildContentConditionChart(accounts),
    buildFruitChart(accounts),
    buildActivityWeekChart(latestActivityWeek),
    buildLevelDistributionChart(accounts),
  );
  elements.adminCharts.replaceChildren(grid);
}

function makeAdminChartCard(title, sub, body, theme, explanation) {
  const card = makeElement('div', 'admin-chart-card');
  card.dataset.chartTheme = theme;
  const head = document.createElement('div');
  head.className = 'admin-chart-head';
  head.append(makeElement('strong', 'admin-chart-title', title));
  if (sub) head.append(makeElement('small', 'admin-chart-sub', sub));
  card.append(head);
  if (explanation) card.append(makeElement('p', 'admin-chart-description', explanation));
  card.append(body);
  return card;
}

function makeAdminChartEmpty(icon, title, detail) {
  const empty = makeElement('div', 'admin-chart-empty');
  empty.append(
    makeElement('span', 'admin-chart-empty-icon', icon),
    makeElement('strong', '', title),
    makeElement('p', '', detail),
  );
  return empty;
}

function buildContentConditionChart(accounts) {
  const totals = collectAdminTotals(accounts);
  const segments = [
    { key: 'pending', label: 'Menunggu', count: totals.pending, cls: 'seg-pending' },
    { key: 'validated', label: 'ACC', count: totals.validated, cls: 'seg-validated' },
    { key: 'stale', label: 'Basi', count: totals.stale, cls: 'seg-stale' },
    { key: 'removed', label: 'Diangkat', count: totals.removed, cls: 'seg-removed' },
  ];

  const body = document.createElement('div');
  body.className = 'admin-chart-body';

  if (totals.contents === 0) {
    body.append(makeAdminChartEmpty('✳', 'Belum ada konten Sharing', 'Status menunggu, ACC, dan hasil review akan muncul setelah pengguna mengirim konten.'));
    return makeAdminChartCard('Status konten', '0 konten', body, 'content', 'Sudah berapa konten ditinjau admin?');
  }

  const bar = makeElement('div', 'admin-stack-bar');
  bar.setAttribute('role', 'img');
  bar.setAttribute('aria-label', segments.map((segment) => `${segment.label}: ${segment.count}`).join(', '));
  segments.filter((segment) => segment.count > 0).forEach((segment) => {
    const width = (segment.count / totals.contents) * 100;
    const fill = makeElement('span', `admin-stack-seg ${segment.cls}`);
    fill.style.width = `${width}%`;
    fill.title = `${segment.label}: ${segment.count}`;
    bar.append(fill);
  });
  body.append(bar);

  const legend = makeElement('div', 'admin-stack-legend');
  segments.forEach((segment) => {
    const chip = makeElement('span', `seg-chip ${segment.cls}`,
      `${segment.label} · ${formatRelativeNumber(segment.count)}`);
    legend.append(chip);
  });
  body.append(legend);

  return makeAdminChartCard('Status konten', `${formatRelativeNumber(totals.contents)} konten`, body, 'content', 'Warna menunjukkan hasil review setiap konten Sharing.');
}

function buildFruitChart(accounts) {
  const totals = collectAdminTotals(accounts);
  const bars = [
    { label: 'Di pohon', count: totals.fruitsOnTree, cls: 'hbar-tree' },
    { label: 'Di storage', count: totals.fruitsInStorage, cls: 'hbar-storage' },
    { label: 'Rebah basi', count: totals.fruitsGround, cls: 'hbar-ground' },
    { label: 'Hilang (diangkat)', count: totals.fruitsGone, cls: 'hbar-gone' },
  ];
  const max = Math.max(...bars.map((bar) => bar.count));

  const body = document.createElement('div');
  body.className = 'admin-chart-body';
  if (max === 0) {
    body.append(makeAdminChartEmpty('♧', 'Belum ada buah pengetahuan', 'Buah muncul setelah konten Sharing pertama kali di-ACC admin.'));
    return makeAdminChartCard('Posisi buah', '0 buah', body, 'fruit', 'Buah dari konten Sharing yang sudah diputus.');
  }
  const totalFruits = bars.reduce((sum, bar) => sum + bar.count, 0);
  bars.forEach((bar) => body.append(makeHbarRow(bar.label, bar.count, totalFruits, bar.cls)));
  return makeAdminChartCard('Posisi buah', `${formatRelativeNumber(totalFruits)} buah`, body, 'fruit', 'Batang menunjukkan bagian dari total buah yang tercatat.');
}

function makeHbarRow(label, value, max, className, valueLabel = formatRelativeNumber(value)) {
  const row = makeElement('div', 'admin-hbar-row');
  row.append(makeElement('span', 'admin-hbar-label', label));
  const track = makeElement('span', 'admin-hbar-track');
  const fill = makeElement('span', `admin-hbar-fill ${className ?? 'hbar-neutral'}`);
  fill.style.width = `${max > 0 ? Math.round((value / max) * 100) : 0}%`;
  track.append(fill);
  row.append(track, makeElement('span', 'admin-hbar-value', valueLabel));
  return row;
}

function buildActivityWeekChart(activityWeek) {
  const buckets = [];
  const now = new Date();
  const shortWeekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });
  for (let offset = 6; offset >= 0; offset -= 1) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - offset);
    buckets.push({
      startMs: start.getTime(),
      label: shortWeekday.format(start),
      count: 0,
    });
  }

  let total = 0;
  activityWeek.forEach(({ dayIndex, count }) => {
    if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= buckets.length) return;
    buckets[dayIndex].count = count;
    total += count;
  });
  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);

  const body = document.createElement('div');
  body.className = 'admin-chart-body';
  if (total === 0) {
    body.append(makeAdminChartEmpty('↗', 'Belum ada aktivitas minggu ini', 'Aktivitas pengguna selama 7 hari terakhir akan ditampilkan per hari di sini.'));
    return makeAdminChartCard('Aktivitas 7 hari', '0 aktivitas', body, 'activity', 'Simulasi dan penyusutan otomatis tidak dihitung.');
  }
  const columns = makeElement('div', 'admin-vchart');
  buckets.forEach((bucket, index) => {
    const column = makeElement('div', `admin-vcol${index === 6 ? ' is-today' : ''}${bucket.count === 0 ? ' is-empty' : ''}`);
    const fill = makeElement('span', 'admin-vcol-fill');
    fill.style.height = `${Math.round((bucket.count / max) * 100)}%`;
    fill.title = `${bucket.label}: ${bucket.count} aktivitas`;
    column.setAttribute('aria-label', `${bucket.label}: ${bucket.count} aktivitas`);
    column.append(makeElement('span', 'admin-vcol-count', formatRelativeNumber(bucket.count)), fill, makeElement('span', 'admin-vcol-label', bucket.label));
    columns.append(column);
  });
  body.append(columns);
  return makeAdminChartCard('Aktivitas 7 hari', `${formatRelativeNumber(total)} aktivitas`, body, 'activity', 'Berapa aktivitas tercatat setiap hari? Simulasi dan penyusutan tidak dihitung.');
}

function buildLevelDistributionChart(accounts) {
  const counts = new Array(8).fill(0);
  const users = accounts.filter((account) => account.role !== 'admin');
  users.forEach((account) => {
    const level = Math.min(Math.max(Math.floor(account.treeState?.level ?? 0), 0), 7);
    counts[level] += 1;
  });
  const totalAccounts = users.length;

  const body = document.createElement('div');
  body.className = 'admin-chart-body';
  if (totalAccounts === 0) {
    body.append(makeAdminChartEmpty('♧', 'Belum ada akun pengguna', 'Sebaran level akan terlihat setelah akun pengguna terdaftar.'));
    return makeAdminChartCard('Level pohon pengguna', '0 pengguna', body, 'level', 'Hanya akun pengguna yang mempunyai pohon; admin tidak dihitung.');
  }
  for (let level = 0; level <= 7; level += 1) {
    if (counts[level] === 0) continue;
    body.append(makeHbarRow(`L${level} · ${STAGE_SHORT_NAMES[level]}`, counts[level], totalAccounts, `hbar-level-${level}`, `${formatRelativeNumber(counts[level])} · ${Math.round(counts[level] / totalAccounts * 100)}%`));
  }
  return makeAdminChartCard('Level pohon pengguna', `${formatRelativeNumber(totalAccounts)} pengguna`, body, 'level', 'Persentase dari seluruh akun pengguna. Level tanpa akun disembunyikan.');
}

function renderAdminTab() {
  buildAdminReview(latestAdminAccounts);
  buildAdminAccounts(latestAdminAccounts);
  populateAdminActivityUsers(latestAdminAccounts);
  buildLearnAdmin(latestAdminAccounts);
  fillGamificationSettingsForm();
}

function renderAdminReview() {
  const renderId = ++adminReviewRenderId;
  apiAdminAccounts()
    .then(({ accounts, activityWeek }) => {
      if (renderId !== adminReviewRenderId) return;
      latestAdminAccounts = accounts;
      latestActivityWeek = activityWeek ?? [];
      buildAdminStats(accounts);
      buildAdminCharts(accounts);
      renderAdminTab();
    })
    .catch((error) => {
      if (renderId !== adminReviewRenderId) return;
      adminActivityRequestId += 1;
      latestAdminAccounts = [];
      latestActivityWeek = [];
      buildAdminStats([]);
      elements.adminCharts.replaceChildren(buildAdminChartsError(error));
      elements.adminSummary.replaceChildren();
      elements.adminReviewList.replaceChildren();
      elements.adminAccountsBody.replaceChildren();
      elements.adminActivityList.replaceChildren();
      elements.adminActivityCount.textContent = 'Aktivitas gagal dimuat.';
      elements.adminActivityPagination.hidden = true;
      elements.adminReviewList.append(makeElement('div', 'admin-review-empty', error?.message || 'Konsol admin gagal dimuat dari server.'));
      elements.adminActivityList.append(makeElement('li', 'admin-review-empty', error?.message || 'Konsol admin gagal dimuat dari server.'));
    });
}

// --- Kelola modul Learning (#8) ---

// Agregat lintas-akun: berapa akun menuntaskan tiap modul & rata-rata ratingnya.
function computeLearningAdminStats(accounts) {
  const stats = new Map();
  learningModules.forEach((module) => {
    stats.set(module.id, { completed: 0, ratings: [] });
  });
  accounts.forEach((account) => {
    const completed = account.treeState?.completedLearningIds;
    const ratings = account.treeState?.learningRatings;
    if (Array.isArray(completed)) {
      completed.forEach((moduleId) => {
        const entry = stats.get(moduleId);
        if (entry) entry.completed += 1;
      });
    }
    if (ratings && typeof ratings === 'object') {
      Object.entries(ratings).forEach(([moduleId, rating]) => {
        const entry = stats.get(moduleId);
        if (entry && Number.isFinite(Number(rating))) entry.ratings.push(Number(rating));
      });
    }
  });
  return stats;
}

function buildLearnAdmin(accounts) {
  if (!elements.learnAdminBody) return;
  const stats = computeLearningAdminStats(accounts);
  elements.learnAdminBody.replaceChildren();

  if (learningModules.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'admin-accounts-empty';
    emptyRow.innerHTML = '<td colspan="6">Katalog Learning kosong. Gunakan "Tambah modul" untuk membuat modul pertama.</td>';
    elements.learnAdminBody.append(emptyRow);
    return;
  }

  learningModules.forEach((module) => {
    const moduleStats = stats.get(module.id) ?? { completed: 0, ratings: [] };
    const row = document.createElement('tr');

    const titleCell = document.createElement('td');
    titleCell.className = 'admin-account-cell';
    const titleLine = document.createElement('span');
    titleLine.className = 'admin-account-line';
    titleLine.append(
      makeElement('span', 'learn-module-avatar', module.category ? module.category.charAt(0).toLocaleUpperCase('id-ID') : 'L'),
      makeElement('div', 'admin-account-info', [makeElement('strong', '', module.title), makeElement('small', '', module.id)]),
    );
    titleCell.append(titleLine);

    const categoryCell = document.createElement('td');
    categoryCell.className = 'admin-active-cell';
    categoryCell.textContent = module.category || '—';

    const statusCell = document.createElement('td');
    statusCell.className = 'admin-active-cell';
    const statusChip = makeElement('span', `learn-status-chip ${module.active ? 'is-active' : 'is-draft'}`, module.active ? 'Aktif' : 'Draft');
    statusCell.append(statusChip);

    const completedCell = document.createElement('td');
    completedCell.className = 'admin-active-cell';
    completedCell.textContent = `${moduleStats.completed} akun`;

    const ratingCell = document.createElement('td');
    ratingCell.className = 'admin-active-cell';
    const ratingCount = moduleStats.ratings.length;
    if (ratingCount > 0) {
      const average = moduleStats.ratings.reduce((sum, value) => sum + value, 0) / ratingCount;
      ratingCell.textContent = `${(new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(average))} / 5 · ${ratingCount} penilai`;
    } else {
      ratingCell.textContent = '—';
    }

    const actionsCell = document.createElement('td');
    actionsCell.className = 'admin-account-actions';
    const editButton = makeElement('button', 'admin-row-action action-role', 'Edit');
    editButton.dataset.learnAction = 'edit';
    editButton.dataset.moduleId = module.id;
    const toggleButton = makeElement('button', `admin-row-action ${module.active ? 'action-delete' : 'action-role'}`, module.active ? 'Draft' : 'Aktifkan');
    toggleButton.dataset.learnAction = 'toggle';
    toggleButton.dataset.moduleId = module.id;
    const deleteButton = makeElement('button', 'admin-row-action action-delete', 'Hapus');
    deleteButton.dataset.learnAction = 'delete';
    deleteButton.dataset.moduleId = module.id;
    actionsCell.append(editButton, toggleButton, deleteButton);

    row.append(titleCell, categoryCell, statusCell, completedCell, ratingCell, actionsCell);
    elements.learnAdminBody.append(row);
  });
}

function openLearningAdminDialog(mode, moduleId = null) {
  learningAdminDialogMode = mode;
  learningAdminEditingId = moduleId;
  elements.learnFormFeedback.textContent = '';
  elements.learnFormFeedback.className = 'learning-form-feedback';
  if (mode === 'edit') {
    const module = learningModules.find((entry) => entry.id === moduleId);
    if (!module) {
      showToast('Modul tidak ditemukan.', 'notice');
      return;
    }
    elements.learnAdminDialogTitle.textContent = `Edit modul: ${module.title}`;
    elements.learnFormSubmit.textContent = 'Simpan perubahan';
    elements.learnFieldTitle.value = module.title;
    elements.learnFieldCategory.value = module.category ?? '';
    elements.learnFieldDuration.value = module.duration ?? '';
    elements.learnFieldDescription.value = module.description ?? '';
    elements.learnFieldResourceLabel.value = module.resourceLabel ?? '';
    elements.learnFieldResourceUrl.value = module.resourceUrl ?? '';
    elements.learnFieldSections.value = (module.sections ?? [])
      .map((section) => [section.heading, ...(section.paragraphs ?? [])].filter(Boolean).join(' | '))
      .join('\n');
    elements.learnFieldQuiz.value = (module.quiz ?? []).map((item) => {
      const lines = [item.prompt];
      (item.answers ?? []).forEach((answer, index) => {
        lines.push(`${Number(item.correctAnswer) === index ? '*' : '-'} ${answer}`);
      });
      return lines.join('\n');
    }).join('\n\n');
    elements.learnFieldActive.checked = module.active !== false;
  } else {
    elements.learnAdminDialogTitle.textContent = 'Form modul Learning';
    elements.learnFormSubmit.textContent = 'Simpan modul';
    elements.learningModuleForm.reset();
    elements.learnFieldActive.checked = true;
  }
  elements.learningAdminDialog.showModal();
  elements.learnFieldTitle.focus();
}

function closeLearningAdminDialog() {
  elements.learningAdminDialog.close();
}

// Parsa textarea section: satu baris = satu section "Heading | Paragraf | ...".
function parseLearningSections(text) {
  return String(text ?? '').split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim()).filter(Boolean);
      const [heading = '', ...paragraphs] = parts;
      return { heading, paragraphs };
    })
    .filter((section) => section.heading || section.paragraphs.length > 0);
}

// Parsa textarea kuis: blok dipisah baris kosong; '*' menandai jawaban benar.
function parseLearningQuiz(text) {
  return String(text ?? '').split(/\n\s*\n/)
    .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length >= 2)
    .map((lines) => {
      const [prompt, ...optionLines] = lines;
      const answers = [];
      let correctAnswer = 0;
      optionLines.forEach((line) => {
        if (line.startsWith('*')) {
          answers.push(line.replace(/^\*\s*/, '').trim());
          correctAnswer = answers.length - 1;
        } else {
          answers.push(line.replace(/^[-•]\s*/, '').trim());
        }
      });
      return { prompt, answers: answers.filter(Boolean), correctAnswer };
    })
    .filter((item) => item.prompt && item.answers.length >= 2);
}

// Satu popup konfirmasi untuk seluruh perubahan admin. Tombol Batal maupun
// Escape menutup tanpa memanggil API; pesan sukses/gagal tetap lewat toast.
function confirmAdminAction({ title, detail, confirmLabel, destructive = false }) {
  const dialog = elements.adminConfirmDialog;
  if (dialog.open) return Promise.resolve(false);
  elements.adminConfirmTitle.textContent = title;
  elements.adminConfirmDetail.textContent = detail;
  elements.adminConfirmSubmit.textContent = confirmLabel;
  elements.adminConfirmSubmit.classList.toggle('is-destructive', destructive);
  dialog.returnValue = '';

  return new Promise((resolve) => {
    const confirm = () => dialog.close('confirm');
    const cancel = () => dialog.close('cancel');
    const finish = () => {
      elements.adminConfirmSubmit.removeEventListener('click', confirm);
      elements.adminConfirmCancel.removeEventListener('click', cancel);
      dialog.removeEventListener('close', finish);
      resolve(dialog.returnValue === 'confirm');
    };
    elements.adminConfirmSubmit.addEventListener('click', confirm);
    elements.adminConfirmCancel.addEventListener('click', cancel);
    dialog.addEventListener('close', finish);
    dialog.showModal();
    elements.adminConfirmCancel.focus();
  });
}

elements.learningModuleForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = elements.learnFieldTitle.value.trim();
  if (title.length < 3) {
    elements.learnFormFeedback.textContent = 'Judul modul minimal 3 karakter.';
    elements.learnFormFeedback.className = 'learning-form-feedback is-error';
    return;
  }

  const payload = {
    id: learningAdminDialogMode === 'edit' ? learningAdminEditingId : undefined,
    title,
    category: elements.learnFieldCategory.value.trim(),
    duration: elements.learnFieldDuration.value.trim(),
    description: elements.learnFieldDescription.value.trim(),
    resourceLabel: elements.learnFieldResourceLabel.value.trim(),
    resourceUrl: elements.learnFieldResourceUrl.value.trim(),
    sections: parseLearningSections(elements.learnFieldSections.value),
    quiz: parseLearningQuiz(elements.learnFieldQuiz.value),
    active: elements.learnFieldActive.checked,
  };

  if (!(await confirmAdminAction({
    title: learningAdminDialogMode === 'edit' ? 'Simpan perubahan modul?' : 'Tambahkan modul Learning?',
    detail: `Modul "${title}" akan ${learningAdminDialogMode === 'edit' ? 'diperbarui' : 'ditambahkan'} di server dan ${payload.active ? 'ditampilkan kepada pengguna' : 'disimpan sebagai draft'}.`,
    confirmLabel: learningAdminDialogMode === 'edit' ? 'Simpan perubahan' : 'Tambah modul',
  }))) return;

  elements.learnFormSubmit.disabled = true;
  try {
    const savedModule = learningAdminDialogMode === 'edit'
      ? await apiAdminUpdateLearning(payload)
      : await apiAdminCreateLearning(payload);
    const index = learningModules.findIndex((entry) => entry.id === savedModule.id);
    if (index >= 0) {
      learningModules[index] = savedModule;
    } else {
      learningModules.push(savedModule);
    }
    buildLearnAdmin(latestAdminAccounts);
    renderLearningCatalog();
    closeLearningAdminDialog();
    showToast(learningAdminDialogMode === 'edit' ? `Modul "${savedModule.title}" diperbarui di server.` : `Modul "${savedModule.title}" tersimpan di server.`, 'success');
  } catch (error) {
    elements.learnFormFeedback.textContent = error?.message || 'Modul gagal tersimpan.';
    elements.learnFormFeedback.className = 'learning-form-feedback is-error';
  } finally {
    elements.learnFormSubmit.disabled = false;
  }
});

elements.learnFormCancel.addEventListener('click', () => closeLearningAdminDialog());
elements.learnAdminDialogClose.addEventListener('click', () => closeLearningAdminDialog());

elements.learnAdminBody.addEventListener('click', async (event) => {
  const actionButton = event.target.closest('[data-learn-action]');
  if (!actionButton) return;
  const moduleId = actionButton.dataset.moduleId;
  const action = actionButton.dataset.learnAction;
  const module = learningModules.find((entry) => entry.id === moduleId);
  if (!module) return;

  if (action === 'edit') {
    openLearningAdminDialog('edit', moduleId);
    return;
  }

  if (action === 'toggle') {
    if (!(await confirmAdminAction({
      title: module.active ? 'Sembunyikan modul?' : 'Aktifkan modul?',
      detail: `Modul "${module.title}" akan ${module.active ? 'menjadi draft dan tidak terlihat oleh pengguna' : 'tampil dalam katalog Learning pengguna'}.`,
      confirmLabel: module.active ? 'Jadikan draft' : 'Aktifkan modul',
    }))) return;
    try {
      const updated = await apiAdminUpdateLearning({ id: moduleId, active: !module.active });
      const index = learningModules.findIndex((entry) => entry.id === moduleId);
      if (index >= 0) learningModules[index] = updated;
      buildLearnAdmin(latestAdminAccounts);
      renderLearningCatalog();
      showToast(`Modul "${updated.title}" sekarang ${updated.active ? 'aktif untuk semua akun' : 'draft (disembunyikan)'}.`, 'success');
    } catch (error) {
      showToast(error?.message || 'Status modul gagal diubah.', 'notice');
    }
    return;
  }

  if (action === 'delete') {
    if (!(await confirmAdminAction({
      title: 'Hapus modul Learning?',
      detail: `Modul "${module.title}" akan dihapus permanen dari katalog server. Riwayat penyelesaian pengguna tidak dihapus.`,
      confirmLabel: 'Hapus modul',
      destructive: true,
    }))) return;
    try {
      await apiAdminDeleteLearning(moduleId);
      learningModules = learningModules.filter((entry) => entry.id !== moduleId);
      buildLearnAdmin(latestAdminAccounts);
      renderLearningCatalog();
      showToast(`Modul "${module.title}" dihapus dari server.`, 'success');
    } catch (error) {
      showToast(error?.message || 'Hapus modul gagal.', 'notice');
    }
  }
});

elements.addLearningModuleButton.addEventListener('click', () => openLearningAdminDialog('create'));

function buildAdminChartsError(error) {
  const fallback = makeElement('div', 'admin-review-empty', error?.message || 'Grafik admin gagal dimuat dari server.');
  const wrapper = document.createElement('div');
  wrapper.className = 'admin-charts-grid';
  wrapper.append(fallback);
  return wrapper;
}

function buildAdminAccounts(accounts) {
  elements.adminAccountsBody.replaceChildren();
  const query = elements.adminAccountSearch.value.trim().toLocaleLowerCase('id-ID');
  const visibleAccounts = query
    ? accounts.filter((account) => `${account.name ?? ''} ${account.email ?? ''}`.toLocaleLowerCase('id-ID').includes(query))
    : accounts;
  elements.adminAccountCount.textContent = query
    ? `${formatRelativeNumber(visibleAccounts.length)} dari ${formatRelativeNumber(accounts.length)} akun ditemukan`
    : `${formatRelativeNumber(accounts.length)} akun terdaftar`;

  if (visibleAccounts.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'admin-accounts-empty';
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = query ? 'Tidak ada akun yang cocok. Coba nama atau email lain.' : 'Belum ada akun terdaftar di server.';
    emptyRow.append(cell);
    elements.adminAccountsBody.append(emptyRow);
    return;
  }

  visibleAccounts.forEach((account) => {
    const treeState = account.treeState ?? {};
    const submissions = Array.isArray(treeState.sharingSubmissions) ? treeState.sharingSubmissions : [];
    const accCount = submissions.filter((s) => s.status === 'validated').length;
    const pendingCount = submissions.filter((s) => s.status === 'pending').length;
    const receivedReports = submissions.reduce((n, s) => n + (Array.isArray(s.reports) ? s.reports.length : 0), 0);
    const condition = TREE_CONDITION_LABELS[getTreeCondition(treeState)] ?? 'Sehat';
    const treeLedger = (Array.isArray(treeState.fruitLedger) ? treeState.fruitLedger : []);
    const grounding = treeLedger.filter((f) => f.placement === 'ground').length;
    const gone = treeLedger.filter((f) => f.placement === 'gone').length;
    const isAdmin = account.role === 'admin';

    const row = document.createElement('tr');

    const accountCell = document.createElement('td');
    accountCell.className = 'admin-account-cell';
    const avatar = makeElement('span', 'admin-account-avatar', (account.name ?? '?').trim().charAt(0).toLocaleUpperCase('id-ID'));
    const accountInfo = document.createElement('span');
    accountInfo.className = 'admin-account-info';
    accountInfo.append(
      makeElement('strong', '', account.name ?? ''),
      makeElement('small', '', account.email ?? ''),
    );
    const roleBadge = makeElement('span', `admin-role-badge ${isAdmin ? 'role-admin' : 'role-user'}`, isAdmin ? 'admin' : 'user');
    const accountWrap = document.createElement('span');
    accountWrap.className = 'admin-account-line';
    accountWrap.append(avatar, accountInfo, roleBadge);
    accountCell.append(accountWrap);
    if (receivedReports > 0) {
      accountCell.append(makeElement('span', 'admin-report-badge', `${receivedReports} laporan diterima`));
    }

    const treeCell = document.createElement('td');
    treeCell.append(makeElement('strong', '', `L${treeState.level ?? 0}`));
    treeCell.append(makeElement('small', '', `${STAGES[treeState.level ?? 0]} · ${condition}`));
    treeCell.classList.add(isAdmin ? 'admin-tree-idle' : `admin-tree-${getTreeCondition(treeState)}`);

    const storageCell = document.createElement('td');
    storageCell.append(makeElement('strong', '', `${formatRelativeNumber(treeState.air ?? 0)} air · ${formatPupukUnits(treeState.fertilizerUnits)} pupuk`));
    storageCell.append(makeElement('small', '', `progres ${formatRelativeNumber(treeState.growthAir ?? 0)} / ${formatPupukUnits(treeState.growthFertilizerUnits)}`));

    const fruitsCell = document.createElement('td');
    fruitsCell.append(makeElement('strong', '', `${formatRelativeNumber(treeState.fruitsOnTree ?? 0)} pohon · ${formatRelativeNumber(treeState.fruitsInStorage ?? 0)} storage`));
    fruitsCell.append(makeElement('small', '', `${grounding} rebah · ${gone} hilang`));

    const contentsCell = document.createElement('td');
    contentsCell.append(makeElement('strong', '', `${submissions.length} konten`));
    contentsCell.append(makeElement('small', '', `${accCount} ACC · ${pendingCount} menunggu`));

    const activeCell = document.createElement('td');
    activeCell.className = 'admin-active-cell';
    activeCell.textContent = formatRelative(treeState.lastValidActivityAt);

    const isSelf = currentAccount?.email === account.email;
    const actionsCell = document.createElement('td');
    actionsCell.className = 'admin-account-actions';
    [makeAdminRowActionButton('reset', 'Reset pohon', account, isSelf),
     makeAdminRowActionButton('role', isAdmin ? 'Jadikan user' : 'Jadikan admin', account, isSelf),
     makeAdminRowActionButton('delete', 'Hapus', account, isSelf)].filter(Boolean).forEach((button) => actionsCell.append(button));

    row.append(accountCell, treeCell, storageCell, fruitsCell, contentsCell, activeCell, actionsCell);
    elements.adminAccountsBody.append(row);
  });
}

function makeAdminRowActionButton(action, label, account, isSelf) {
  if (action === 'delete' && isSelf) return null; // tidak menghapus akun yang sedang dipakai
  const button = makeElement('button', `admin-row-action action-${action}`, label);
  button.type = 'button';
  button.dataset.adminAction = action;
  button.dataset.userId = String(account.id);
  button.dataset.accountEmail = account.email;
  if (isSelf) button.title = 'Aksi ini pada akunmu sendiri setelahnya dimuat ulang.';
  return button;
}

async function applyAdminAccountAction(button) {
  const action = button.dataset.adminAction;
  const userId = Number(button.dataset.userId);
  const email = button.dataset.accountEmail;
  const isSelf = currentAccount?.email === email;

  if (action === 'reset') {
    if (!(await confirmAdminAction({
      title: 'Reset pohon akun?',
      detail: `Pohon dan seluruh riwayat akun ${email} akan kembali ke Level 0. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Reset pohon',
      destructive: true,
    }))) return;
    try {
      await apiAdminResetAccount(userId);
    } catch (error) {
      showToast(error?.message || 'Reset pohon gagal.', 'notice');
      return;
    }
    if (isSelf) {
      const fresh = await apiMe().catch(() => null);
      applyServerSettings(fresh?.settings);
      state = tickState(fresh?.treeState ?? createInitialState());
      render(true);
    }
    showToast(`Pohon akun ${email} kembali ke Level 0 di server.`, 'success');
    renderAdminReview();
    return;
  }

  if (action === 'role') {
    const targetRole = button.textContent.includes('Jadikan admin') ? 'admin' : 'user';
    if (!(await confirmAdminAction({
      title: 'Ubah peran akun?',
      detail: `Akun ${email} akan menjadi ${targetRole}. ${targetRole === 'admin' ? 'Akun ini akan mendapat akses ke semua halaman admin.' : 'Akun ini tidak lagi dapat membuka halaman admin.'}`,
      confirmLabel: `Jadikan ${targetRole}`,
    }))) return;
    try {
      await apiAdminUpdateAccount(userId, targetRole);
    } catch (error) {
      showToast(error?.message || 'Peran akun gagal diubah.', 'notice');
      return;
    }
    if (isSelf) {
      currentAccount.role = targetRole;
      applySidebarRole();
      navigateToPage(pageForRole(pageFromLocationHash()), false);
    }
    showToast(`Peran akun ${email} sekarang ${targetRole}.`, 'success');
    renderAdminReview();
    return;
  }

  if (action === 'delete') {
    if (!(await confirmAdminAction({
      title: 'Hapus akun permanen?',
      detail: `Akun ${email}, pohon, konten, dan semua sesinya akan dihapus dari server. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus akun',
      destructive: true,
    }))) return;
    try {
      await apiAdminDeleteAccount(userId);
    } catch (error) {
      showToast(error?.message || 'Hapus akun gagal.', 'notice');
      return;
    }
    if (isSelf) {
      leaveApp('Akunmu telah dihapus dari server.');
    } else {
      showToast(`Akun ${email} dihapus dari server.`, 'success');
      renderAdminReview();
    }
  }
}

function populateAdminActivityUsers(accounts) {
  elements.adminActivityUsers.replaceChildren();
  accounts.forEach((account) => {
    const option = document.createElement('option');
    option.value = account.email;
    option.label = account.name;
    elements.adminActivityUsers.append(option);
  });
}

function renderAdminActivityPage({ items, page, pageSize, total, totalPages }) {
  elements.adminActivityList.replaceChildren();
  adminActivityPage = page;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  elements.adminActivityCount.textContent = total === 0
    ? 'Tidak ada aktivitas sesuai filter.'
    : `Aktivitas ${formatRelativeNumber(start)}–${formatRelativeNumber(end)} dari ${formatRelativeNumber(total)} tersimpan · halaman ${formatRelativeNumber(page)} dari ${formatRelativeNumber(totalPages)}`;
  renderAdminActivityPagination(page, totalPages);

  if (items.length === 0) {
    elements.adminActivityList.append(makeElement('li', 'admin-review-empty',
      'Tidak ada hasil. Coba pengguna, jenis aktivitas, atau periode lain.'));
    return;
  }

  let previousDay = null;
  items.forEach(({ account, entry }) => {
    const date = Number.isFinite(entry.at) ? new Date(entry.at) : null;
    const day = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : 'unknown';
    if (day !== previousDay) {
      const heading = makeElement('li', 'admin-activity-day');
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
      const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
      heading.textContent = day === todayKey ? 'Hari ini' : day === yesterdayKey ? 'Kemarin'
        : date ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
          : 'Waktu tidak tercatat';
      elements.adminActivityList.append(heading);
      previousDay = day;
    }
    const item = document.createElement('li');
    item.className = 'admin-activity-row';

    const avatar = makeElement('span', 'admin-account-avatar', (account.name ?? '?').trim().charAt(0).toLocaleUpperCase('id-ID'));

    const body = document.createElement('div');
    body.className = 'admin-activity-body';
    const who = makeElement('strong', '', account.name ?? account.email);
    const email = makeElement('span', 'admin-activity-email', account.email ?? '');
    const typeChip = makeElement('span', 'admin-activity-type', ADMIN_HISTORY_TYPE_LABELS[entry.type] ?? entry.type);
    const meta = document.createElement('span');
    meta.className = 'admin-activity-meta';
    meta.append(who, email, typeChip);
    body.append(meta);
    body.append(makeElement('p', 'admin-activity-title', entry.title ?? ''));
    if (entry.detail) {
      body.append(makeElement('small', '', entry.detail));
    }

    const deltas = document.createElement('div');
    deltas.className = 'admin-activity-deltas';
    appendDeltaChip(deltas, 'air', entry.airDelta);
    appendDeltaChip(deltas, 'pupuk', entry.fertilizerDeltaUnits, 0.5);
    appendDeltaChip(deltas, 'buah', entry.fruitDelta);
    if (deltas.childElementCount > 0) body.append(deltas);

    const when = makeElement('time', 'admin-activity-when', formatRelative(entry.at));
    if (date) {
      when.dateTime = date.toISOString();
      when.title = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(date);
    }

    item.append(avatar, body, when);
    elements.adminActivityList.append(item);
  });
}

function renderAdminActivityPagination(page, totalPages) {
  const nav = elements.adminActivityPagination;
  nav.replaceChildren();
  nav.hidden = totalPages <= 1;
  if (totalPages <= 1) return;

  const addButton = (label, targetPage, disabled = false, current = false) => {
    const button = makeElement('button', `admin-activity-page-button${current ? ' is-current' : ''}`, label);
    button.type = 'button';
    button.dataset.activityPage = String(targetPage);
    button.disabled = disabled;
    if (current) button.setAttribute('aria-current', 'page');
    button.setAttribute('aria-label', label === 'Sebelumnya' || label === 'Berikutnya' ? label : `Halaman ${label}`);
    nav.append(button);
  };
  addButton('Sebelumnya', page - 1, page === 1);
  const pages = [...new Set([1, totalPages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= totalPages))].sort((a, b) => a - b);
  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) nav.append(makeElement('span', 'admin-activity-page-gap', '…'));
    addButton(String(value), value, false, value === page);
  });
  addButton('Berikutnya', page + 1, page === totalPages);
}

function loadAdminActivity() {
  const requestId = ++adminActivityRequestId;
  elements.adminActivityCount.textContent = 'Memuat aktivitas…';
  elements.adminActivityList.replaceChildren(makeElement('li', 'admin-review-empty', 'Memuat aktivitas…'));
  elements.adminActivityPagination.hidden = true;
  apiAdminActivity({
    page: adminActivityPage,
    search: elements.adminActivitySearch.value.trim(),
    type: elements.adminActivityType.value,
    period: elements.adminActivityPeriod.value,
  }).then((data) => {
    if (requestId !== adminActivityRequestId || currentRole() !== 'admin') return;
    renderAdminActivityPage(data);
  }).catch((error) => {
    if (requestId !== adminActivityRequestId) return;
    elements.adminActivityCount.textContent = 'Aktivitas gagal dimuat.';
    elements.adminActivityPagination.hidden = true;
    elements.adminActivityList.replaceChildren(makeElement('li', 'admin-review-empty', error?.message || 'Coba muat ulang halaman.'));
  });
}

Object.entries(ADMIN_HISTORY_TYPE_LABELS).forEach(([value, label]) => {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  elements.adminActivityType.append(option);
});

function resetAdminActivityPage() {
  adminActivityPage = 1;
  loadAdminActivity();
}

elements.adminActivitySearch.addEventListener('input', () => {
  adminActivityRequestId += 1;
  window.clearTimeout(adminActivitySearchTimer);
  adminActivitySearchTimer = window.setTimeout(resetAdminActivityPage, 250);
});
elements.adminActivityType.addEventListener('change', resetAdminActivityPage);
elements.adminActivityPeriod.addEventListener('change', resetAdminActivityPage);
elements.adminActivityClear.addEventListener('click', () => {
  window.clearTimeout(adminActivitySearchTimer);
  elements.adminActivitySearch.value = '';
  elements.adminActivityType.value = 'all';
  elements.adminActivityPeriod.value = 'all';
  resetAdminActivityPage();
  elements.adminActivitySearch.focus();
});
elements.adminActivityPagination.addEventListener('click', (event) => {
  const button = event.target.closest('[data-activity-page]');
  if (!button || button.disabled || button.getAttribute('aria-current') === 'page') return;
  adminActivityPage = Number(button.dataset.activityPage);
  loadAdminActivity();
});

function appendDeltaChip(container, unit, delta, scale = 1) {
  const value = Number(delta ?? 0);
  if (!Number.isFinite(value) || value === 0) return;
  const magnitude = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(Math.abs(value) * scale);
  const direction = value > 0 ? '+' : '−';
  const chipClass = value > 0 ? 'delta-plus' : 'delta-minus';
  container.append(makeElement('span', `admin-delta ${chipClass}`, `${direction}${magnitude} ${unit}`));
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
    actions.append(makeAdminConditionButton(row, 'duplicate', 'Duplikat'));
    const deleteContentButton = makeElement('button', 'admin-content-delete', 'Hapus konten');
    deleteContentButton.type = 'button';
    deleteContentButton.dataset.adminDeleteContent = row.submission.id;
    deleteContentButton.dataset.accountEmail = row.account.email;
    deleteContentButton.title = 'Hapus konten beserta buahnya secara permanen (slot dikosongkan).';
    actions.append(deleteContentButton);
    item.append(actions);

    elements.adminReviewList.append(item);
  });
}

async function applyAdminCondition(button) {
  const email = button.dataset.adminEmail;
  const submissionId = button.dataset.submissionId;
  const condition = button.dataset.adminCondition;
  const label = { validated: 'ACC', stale: 'Basi', rejected: 'Tidak Relevan', duplicate: 'Duplikat' }[condition];
  if (!label) return;
  const title = button.closest('.admin-submission')?.querySelector('h5')?.textContent ?? 'konten ini';
  if (!(await confirmAdminAction({
    title: `Tetapkan status ${label}?`,
    detail: `Konten "${title}" milik ${email} akan berstatus ${label}. Pemilik akan mendapat pemberitahuan dan kondisi buahnya ikut berubah.`,
    confirmLabel: `Tetapkan ${label}`,
  }))) return;
  // Keputusan dijalankan server: mesin gamifikasi juga hidup di backend.
  let result;
  try {
    result = await apiAdminCondition(submissionId, condition);
  } catch (error) {
    showToast(error?.message || 'Kondisi konten gagal diperbarui.', 'notice');
    return;
  }

  const owner = { name: result.owner?.name ?? email, email: result.owner?.email ?? email };

  // Admin yang memutuskan kontennya sendiri: tampilkan pemberitahuannya segera.
  if (result.ownerState && result.owner?.email === currentAccount?.email) {
    state = tickState(result.ownerState);
    saveState();
  }

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
      ? `ACC: +${getGamificationSettings().accReward.air} Air, +${formatPupukDisplay(getGamificationSettings().accReward.fertilizerUnits)} Pupuk untuk ${ownerLabel}; buah konten ini muncul di Storage, slotnya sudah tercatat.`
      : `ACC ulang: buah konten ini kembali pada slot lamanya di pohon ${ownerLabel}.`,
    stale: `Basi: buah konten ini jatuh dan rebah busuk di bawah pohon ${ownerLabel}.`,
    rejected: `Tidak relevan: buah konten ini diangkat — hilang dari pohon ${ownerLabel}, slotnya kosong.`,
    duplicate: `Duplikat: buah duplikat diangkat; buah konten asli tetap ada.`,
  };
  showToast(result.applied ? (messages[condition] ?? 'Kondisi konten diperbarui.') : 'Kondisi konten sudah seperti itu.', condition === 'validated' ? 'success' : 'notice');
}

async function applyAdminDeleteContent(button) {
  const submissionId = button.dataset.adminDeleteContent;
  const email = button.dataset.accountEmail;
  const title = button.closest('.admin-submission')?.querySelector('h5')?.textContent ?? 'konten ini';
  if (!(await confirmAdminAction({
    title: 'Hapus konten permanen?',
    detail: `Konten "${title}" milik ${email} beserta buahnya akan dihapus. Slotnya dikosongkan dan tindakan ini tidak dapat dibatalkan.`,
    confirmLabel: 'Hapus konten',
    destructive: true,
  }))) return;

  try {
    const result = await apiAdminDeleteContent(submissionId);
    showToast(`Konten milik ${result.owner?.name ?? email} dihapus dari server; buahnya ikut diangkat.`, 'success');
  } catch (error) {
    showToast(error?.message || 'Hapus konten gagal.', 'notice');
  }
  renderAdminReview();
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
  const decayIntervalMs = Math.max(24 * 60 * 60 * 1000, getGamificationSettings().decayIntervalDays * 24 * 60 * 60 * 1000);
  const nextDecayAt = state.lastDecayAt + decayIntervalMs;
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
  renderNotifications();
  renderRewardLabels();
}

// Pemberitahuan review konten: lonceng di topbar + panel daftar; membuka
// panel menandai semua pemberitahuan terbaca (tersimpan ke server).
function renderNotifications() {
  if (!state) return;
  const notifications = Array.isArray(state.notifications) ? state.notifications : [];
  const unread = notifications.filter((entry) => !entry.read).length;
  elements.notifyBadge.hidden = unread === 0;
  elements.notifyBadge.textContent = unread > 9 ? '9+' : String(unread);
  elements.notifyPanel.classList.toggle('has-items', notifications.length > 0);

  elements.notifyList.replaceChildren();
  if (notifications.length === 0) {
    elements.notifyList.append(makeElement('li', 'notify-empty', 'Belum ada pemberitahuan. Hasil review admin kontenmu akan muncul di sini.'));
    return;
  }
  notifications.slice(0, 12).forEach((entry) => {
    const item = makeElement('li', `notify-item${entry.read ? '' : ' is-unread'}`);
    const head = makeElement('div', 'notify-item-head');
    head.append(
      makeElement('strong', 'notify-item-title', entry.title ?? 'Pemberitahuan'),
      makeElement('time', 'notify-item-time', formatRelative(entry.at)),
    );
    item.append(head, makeElement('p', 'notify-item-detail', entry.detail ?? ''));
    elements.notifyList.append(item);
  });
}

function toggleNotifyPanel(open) {
  const shouldOpen = open ?? elements.notifyPanel.hidden;
  elements.notifyPanel.hidden = !shouldOpen;
  elements.notifyToggle.setAttribute('aria-expanded', String(shouldOpen));
  if (shouldOpen && state) {
    const notifications = state.notifications ?? [];
    if (notifications.some((entry) => !entry.read)) {
      state.notifications = notifications.map((entry) => ({ ...entry, read: true }));
      saveState();
      renderNotifications();
    }
  }
}

// Label reward yang mengikuti parameter admin (halaman Learning/Sharing,
// tombol selesaikan Learning) dirender ulang saat pengaturan berubah.
function renderRewardLabels() {
  const settings = getGamificationSettings();
  const pupuk = (units) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(units / 2);
  const f = (num) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(num);

  if (elements.learningRewardComplete) {
    const units = settings.learningRewardFertilizerUnits;
    elements.learningRewardComplete.textContent = `Tuntas · +${pupuk(units)} Pupuk`;
  }
  if (elements.learningPageDescription) {
    elements.learningPageDescription.textContent = `Materi tuntas memberi +${pupuk(settings.learningRewardFertilizerUnits)} Pupuk ke Storage; rating valid memberi +${f(settings.learningRatingAir)} Air ke Storage.`;
  }
  if (elements.learningRewardRating) {
    const air = settings.learningRatingAir;
    elements.learningRewardRating.textContent = `Rating · +${f(air)} Air`;
  }
  if (elements.sharingRewardPill) {
    const acc = settings.accReward;
    elements.sharingRewardPill.textContent = `Tervalidasi · +1 Buah · +${f(acc.air)} Air · +${pupuk(acc.fertilizerUnits)} Pupuk ke Storage`;
  }
  elements.completeLearningButton.textContent = `Selesaikan Learning · +${pupuk(settings.learningRewardFertilizerUnits)} Pupuk ke Storage`;
  renderLevelKey();
}

// Daftar kebutuhan level ikut parameter aktif; dibangun ulang tiap render —
// bila admin mengubah ambang, semua akun melihat angka yang baru.
function renderLevelKey() {
  if (!elements.levelKeyList) return;
  const settings = getGamificationSettings();
  const f = (num) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(num);
  elements.levelKeyList.replaceChildren();
  settings.levels.forEach((requirement) => {
    const item = makeElement('div', 'level-key-item');
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-label', `Level ${requirement.level}, ${requirement.name}: ${requirement.air} Air, ${f(requirement.fertilizerUnits / 2)} Pupuk`);
    const airCell = makeElement('span', '');
    airCell.append(makeSvgIcon('icon-water'), document.createTextNode(String(requirement.air)));
    const pupukCell = makeElement('span', '');
    pupukCell.append(makeSvgIcon('icon-sprout'), document.createTextNode(f(requirement.fertilizerUnits / 2)));
    item.append(makeElement('strong', '', `L${requirement.level}`), airCell, pupukCell);
    elements.levelKeyList.append(item);
  });
}

// --- Parameter gamifikasi (#9): form admin tersimpan di server ---

function readNumberInput(input) {
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : NaN;
}

function fillGamificationSettingsForm() {
  if (!elements.gSaveButton || !currentAccount || currentRole() !== 'admin') return;
  const settings = getGamificationSettings();
  const f = (num) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(num);
  elements.gAccAir.value = String(settings.accReward.air);
  elements.gAccPupuk.value = f(settings.accReward.fertilizerUnits / 2);
  elements.gAccessAir.value = String(settings.activityRewards.access);
  elements.gReviewAir.value = String(settings.activityRewards.review);
  elements.gLearnPupuk.value = f(settings.learningRewardFertilizerUnits / 2);
  elements.gRatingAir.value = f(settings.learningRatingAir);
  elements.gDecayDays.value = String(settings.decayIntervalDays);
  elements.gDecayGAir.value = String(settings.decayPerPeriod.growthAir);
  elements.gDecayGPupuk.value = f(settings.decayPerPeriod.growthFertilizerUnits / 2);
  elements.gDecayCAir.value = f(settings.decayPerPeriod.careAir);
  elements.gDecayCPupuk.value = f(settings.decayPerPeriod.careFertilizerUnits / 2);

  elements.gLevelBody.replaceChildren();
  settings.levels.forEach((requirement) => {
    const row = document.createElement('tr');
    const levelCell = document.createElement('td');
    levelCell.className = 'settings-level-name';
    levelCell.textContent = `L${requirement.level} · ${requirement.name}`;
    const airCell = document.createElement('td');
    const airInput = document.createElement('input');
    airInput.type = 'number';
    airInput.min = '0';
    airInput.step = '1';
    airInput.value = String(requirement.air);
    airInput.dataset.levelAir = String(requirement.level);
    airCell.append(airInput);
    const pupukCell = document.createElement('td');
    const pupukInput = document.createElement('input');
    pupukInput.type = 'number';
    pupukInput.min = '0';
    pupukInput.step = '0.5';
    pupukInput.value = f(requirement.fertilizerUnits / 2);
    pupukInput.dataset.levelPupuk = String(requirement.level);
    pupukCell.append(pupukInput);
    row.append(levelCell, airCell, pupukCell);
    elements.gLevelBody.append(row);
  });
}

function collectGamificationSettings() {
  const levels = [];
  let previousAir = -1;
  let previousUnits = -1;
  for (let level = 1; level <= 7; level += 1) {
    const air = readNumberInput(elements.gLevelBody.querySelector(`input[data-level-air="${level}"]`));
    const pupuk = readNumberInput(elements.gLevelBody.querySelector(`input[data-level-pupuk="${level}"]`));
    if (!Number.isFinite(air) || !Number.isFinite(pupuk) || air < 0 || pupuk < 0) {
      return { error: `Ambang Level ${level} tidak valid (angka minimal 0).` };
    }
    const units = Math.round(pupuk * 2);
    if (air < previousAir || units < previousUnits) {
      return { error: `Ambang level harus tidak menurun: Level ${level} lebih rendah dari level sebelumnya.` };
    }
    if (level === 1 && air < 1) {
      return { error: 'Ambang Level 1 minimal 1 Air.' };
    }
    levels.push({ level, air, fertilizerUnits: units });
    previousAir = air;
    previousUnits = units;
  }

  const accAir = readNumberInput(elements.gAccAir);
  const accPupuk = readNumberInput(elements.gAccPupuk);
  const accessAir = readNumberInput(elements.gAccessAir);
  const reviewAir = readNumberInput(elements.gReviewAir);
  const learnPupuk = readNumberInput(elements.gLearnPupuk);
  const ratingAir = readNumberInput(elements.gRatingAir);
  const decayDays = readNumberInput(elements.gDecayDays);
  const decayGAir = readNumberInput(elements.gDecayGAir);
  const decayGPupuk = readNumberInput(elements.gDecayGPupuk);
  const decayCAir = readNumberInput(elements.gDecayCAir);
  const decayCPupuk = readNumberInput(elements.gDecayCPupuk);
  const decayGPupukUnits = decayGPupuk * 2;
  const decayCPupukUnits = decayCPupuk * 2;

  if ([accAir, accPupuk, accessAir, reviewAir, learnPupuk, ratingAir, decayDays, decayGAir, decayGPupuk, decayCAir, decayCPupuk]
    .some((value) => !Number.isFinite(value) || value < 0)) {
    return { error: 'Semua parameter harus angka dan tidak boleh negatif.' };
  }
  if (decayDays < 1) return { error: 'Interval decay minimal 1 hari.' };

  return {
    settings: {
      accReward: { air: Math.round(accAir), fertilizerUnits: Math.round(accPupuk * 2) },
      activityRewards: { access: Math.round(accessAir), review: Math.round(reviewAir) },
      learningRewardFertilizerUnits: Math.round(learnPupuk * 2),
      learningRatingAir: Math.round(ratingAir),
      decayIntervalDays: Math.round(decayDays),
      decayPerPeriod: {
        growthAir: Math.round(decayGAir),
        growthFertilizerUnits: Math.round(decayGPupukUnits),
        careAir: Math.round(decayCAir),
        careFertilizerUnits: Math.round(decayCPupukUnits),
      },
      levels,
    },
  };
}

elements.gSaveButton.addEventListener('click', async () => {
  const collected = collectGamificationSettings();
  if (collected.error) {
    elements.gFeedback.textContent = collected.error;
    elements.gFeedback.className = 'settings-feedback is-error';
    return;
  }

  if (!(await confirmAdminAction({
    title: 'Simpan parameter gamifikasi?',
    detail: 'Reward, decay, dan ambang level yang baru akan disimpan di server serta berlaku untuk seluruh akun.',
    confirmLabel: 'Simpan parameter',
  }))) return;

  elements.gSaveButton.disabled = true;
  try {
    const settings = await apiAdminSaveSettings(collected.settings);
    applyServerSettings(settings);
    elements.gFeedback.textContent = 'Parameter tersimpan dan langsung dipakai mesin untuk semua akun.';
    elements.gFeedback.className = 'settings-feedback is-ok';
    showToast('Parameter gamifikasi tersimpan di server.', 'success');
  } catch (error) {
    elements.gFeedback.textContent = error?.message || 'Parameter gagal tersimpan.';
    elements.gFeedback.className = 'settings-feedback is-error';
  } finally {
    elements.gSaveButton.disabled = false;
  }
});

elements.gDefaultButton.addEventListener('click', async () => {
  if (!(await confirmAdminAction({
    title: 'Kembalikan parameter bawaan?',
    detail: 'Semua pengaturan reward, decay, dan ambang level untuk seluruh akun akan kembali ke nilai bawaan prototipe.',
    confirmLabel: 'Kembalikan bawaan',
    destructive: true,
  }))) return;
  elements.gDefaultButton.disabled = true;
  try {
    const settings = await apiAdminSaveSettings(DEFAULT_GAMIFICATION_SETTINGS);
    applyServerSettings(settings);
    elements.gFeedback.textContent = 'Parameter kembali ke nilai bawaan prototipe.';
    elements.gFeedback.className = 'settings-feedback is-ok';
    showToast('Parameter dikembalikan ke bawaan.', 'success');
  } catch (error) {
    elements.gFeedback.textContent = error?.message || 'Parameter gagal tersimpan.';
    elements.gFeedback.className = 'settings-feedback is-error';
  } finally {
    elements.gDefaultButton.disabled = false;
  }
});

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
  const module = learningModules.find((entry) => entry.id === moduleId);
  if (!module) {
    showToast('Modul tidak ditemukan pada katalog saat ini.', 'notice');
    return;
  }
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
    const { account, treeState, settings } = await apiEntry({
      name: String(formData.get('name')),
      email: String(formData.get('email')),
      password: String(formData.get('password')),
    });
    elements.loginForm.reset();
    const isNew = account.isNew === true;
    enterApp(account, treeState, true, settings);
    if (isNew) {
      showToast('Kebun baru dibuat di server. Selamat menanam!', 'success');
    }
  } catch (error) {
    setAuthMessage(error.message, 'error');
  }
});

elements.logoutButton.addEventListener('click', () => {
  leaveApp('Kamu sudah keluar dari akun demo.');
});

elements.notifyToggle.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleNotifyPanel();
});

document.addEventListener('click', (event) => {
  if (elements.notifyPanel.hidden) return;
  if (event.target.closest('#notifyPanel') || event.target.closest('#notifyToggle')) return;
  toggleNotifyPanel(false);
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
    updateWith(result.state, `Learning selesai: ${activeLearningModule.title}. +${formatPupukDisplay(getGamificationSettings().learningRewardFertilizerUnits)} Pupuk masuk Storage; gunakan pada pohon untuk menambah progres.`);
  }
  elements.learningDialog.close();
  activeLearningModule = null;
});

elements.learningCatalog.addEventListener('submit', (event) => {
  const ratingForm = event.target.closest('form[data-learning-rating]');
  if (!ratingForm) return;
  event.preventDefault();

  const module = learningModules.find((entry) => entry.id === ratingForm.dataset.learningRating);
  if (!module) return;
  const rating = Number(new FormData(ratingForm).get('rating'));
  const result = rateLearningModule(state, module.id, rating, { title: module.title });
  if (!result.awarded) {
    showToast('Learning harus selesai sebelum diberi rating.', 'notice');
    return;
  }

  updateWith(result.state, `Rating ${rating}/5 tersimpan. +${getGamificationSettings().learningRatingAir} Air masuk Storage; gunakan pada pohon untuk menambah progres.`);
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
  if (conditionButton) {
    applyAdminCondition(conditionButton);
    return;
  }

  const deleteButton = event.target.closest('[data-admin-delete-content]');
  if (deleteButton) {
    applyAdminDeleteContent(deleteButton);
  }
});

elements.adminAccountSearch.addEventListener('input', () => buildAdminAccounts(latestAdminAccounts));

elements.adminAccountsBody.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-admin-action]');
  if (!actionButton) return;

  applyAdminAccountAction(actionButton);
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
    .then(({ account, treeState, settings }) => enterApp(account, treeState, false, settings))
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
