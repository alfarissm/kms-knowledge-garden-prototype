import './styles.css';
import { normalizeLearningQuiz, safeResourceUrl } from './learning-model.js';
import { createActionQueue } from './state-sync.js';
import {
  apiAction,
  apiAdminAccounts,
  apiAdminActivity,
  apiAdminCondition,
  apiAdminCreateLearning,
  apiAdminDeleteAccount,
  apiAdminDeleteContent,
  apiAdminDeleteLearning,
  apiAdminResetAccount,
  apiAdminSaveSettings,
  apiAdminUpdateAccount,
  apiAdminUpdateLearning,
  apiLogin,
  apiRegister,
  apiLearning,
  apiLearningReviews,
  apiLibrary,
  apiLogout,
  apiMe,
  apiReport,
} from './api.js';
import {
  DEFAULT_GAMIFICATION_SETTINGS,
  advanceDemoDays,
  addDemoResource,
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
  SHARING_REPORT_REASONS,
  submitSharingMaterial,
  tickState,
} from './gamification.js';
import { LEARNING_MODULES } from './learning-catalog.js';
import { getSharingVideo, saveSharingVideo } from './video-storage.js';
import { positionReviewMenu } from './menu-position.js';

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
  adminAccountsScroll: document.querySelector('.admin-accounts-scroll'),
  adminAccountsPagination: document.querySelector('#adminAccountsPagination'),
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
const learningReviewDrafts = new Map();
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

let serverActionQueue = null;
let demoToolsEnabled = false;

function saveState(action = { type: 'sync' }) {
  if (!currentAccount || !state || !serverActionQueue) return Promise.resolve(null);
  return serverActionQueue.enqueue(action);
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

function enterApp(account, treeState = null, awardLogin = false, settings = null, demoEnabled = false) {
  serverActionQueue?.cancel();
  currentAccount = account;
  learningReviewDrafts.clear();
  demoToolsEnabled = demoEnabled === true;
  document.querySelectorAll('.demo-details, #advanceWeekButton, #boostLevelButton, #lowerLevelButton, #healthyButton').forEach((element) => { element.hidden = !demoToolsEnabled; });
  applyServerSettings(settings);
  state = tickState(treeState ?? createInitialState());
  let loginRewarded = false;
  serverActionQueue = createActionQueue({
    send: apiAction,
    apply: (result) => {
      const previousLevel = state.level;
      const previousCondition = getTreeCondition(state);
      if (result.settings) applyServerSettings(result.settings);
      state = tickState(result.treeState);
      render(true, previousLevel, previousCondition);
    },
    onError: (error) => showToast(error?.message || 'Tindakan belum tersimpan. Coba lagi.', 'notice'),
  });
  elements.currentUserName.textContent = account.name;
  elements.userAvatar.textContent = account.name.trim().charAt(0).toLocaleUpperCase('id-ID');
  applySidebarRole();
  elements.authScreen.hidden = true;
  elements.appShell.hidden = false;
  saveState({ type: awardLogin ? 'access' : 'sync' }).then((saved) => {
    if (!saved || !awardLogin) return;
    loginRewarded = saved.rewarded === true;
    showToast(loginRewarded ? `Login valid: +${getGamificationSettings().activityRewards.access} Air masuk Storage.` : 'Login valid. Reward Air hari ini sudah diterima.');
  });
  render();
  navigateToPage(pageFromLocationHash(), false);
  refreshLearningCatalog();
}

function leaveApp(message = '') {
  serverActionQueue?.cancel();
  serverActionQueue = null;
  sharingQueueRenderId += 1;
  clearSharingVideoPreviews();
  apiLogout().catch(() => {
    // Sesi lokal sudah dibersihkan; kegagalan mencabut cookie localhost diabaikan.
  });
  currentAccount = null;
  state = null;
  learningReviewDrafts.clear();
  learningReviewsRequestId += 1;
  delete document.querySelector('#learningReviewsSection').dataset.moduleId;
  document.querySelector('#learningReviewsSection').hidden = true;
  document.querySelector('#learningReviewsTitle').textContent = 'Ulasan pengguna';
  setLearningReviewScore(null);
  document.querySelector('#learningReviewsList').replaceChildren();
  document.querySelector('#learningReviewsModule').replaceChildren();
  if (elements.learningDialog.open) {
    elements.learningDialog.close();
  }
  activeLearningModule = null;
  elements.appShell.hidden = true;
  elements.authScreen.hidden = false;
  elements.loginForm.reset();
  document.querySelector('#registerForm').reset();
  setAuthMode(false);
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
  const displayedFruitCount = state.level >= 3 ? state.fruitsOnTree : 0;
  elements.fruitOnTreeLabel.textContent = String(displayedFruitCount);
  elements.fruitOnTreeLabel.parentElement.setAttribute('aria-label', `${displayedFruitCount} buah di pohon`);
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
  const account = currentAccount;
  const role = currentRole();
  apiLearning()
    .then((modules) => {
      if (currentAccount !== account || currentRole() !== role) return;
      if (Array.isArray(modules)) {
        learningModules = modules;
      }
      renderRewardLabels();
      renderLearningCatalog();
      buildLearnAdmin(latestAdminAccounts);
      syncLearningReviewsSection();
    })
    .catch(() => {
      // Katalog statis tetap dipakai bila server gagal.
      if (currentAccount === account && currentRole() === role) syncLearningReviewsSection();
    });
}

function renderLearningCatalog() {
  const completedCount = learningModules.filter((module) => state.completedLearningIds.includes(module.id)).length;
  elements.learningProgressCount.textContent = `${completedCount} / ${learningModules.length} selesai`;
  elements.learningProgressCount.setAttribute('aria-label', `${completedCount} dari ${learningModules.length} modul tuntas`);
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
        ratedNote.append(makeElement('span', 'learning-rating-saved', state.learningComments?.[module.id] ? 'Ulasan tersimpan' : 'Rating tersimpan'));
        ratedNote.append(makeElement('strong', 'learning-review-author', `${currentAccount.name} (Anda)`));
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
        const comment = state.learningComments?.[module.id];
        if (comment) ratedNote.append(makeElement('p', 'learning-saved-comment', comment));
        card.append(ratedNote);
      } else {
        const ratingForm = makeElement('form', 'learning-rating-form');
        const draft = learningReviewDrafts.get(module.id) ?? {};
        ratingForm.dataset.learningRating = module.id;
        ratingForm.append(makeElement('span', 'learning-rating-prompt', `Bintang + komentar · total +${getGamificationSettings().learningRatingAir} Air, sekali per materi`));
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
          input.checked = Number(draft.rating) === score;
          if (Number(draft.rating) >= score) label.classList.add('is-selected');
          input.setAttribute('aria-label', `${score} bintang`);
          label.append(input, makeElement('span', '', '★'));
          starPicker.append(label);
        }
        const rateButton = makeElement('button', 'learning-rate-button');
        rateButton.type = 'submit';
        rateButton.setAttribute('aria-label', `Kirim bintang dan komentar, tambah ${getGamificationSettings().learningRatingAir} Air ke Storage`);
        rateButton.append(makeSvgIcon('icon-water'), makeElement('b', '', `Kirim ulasan · +${getGamificationSettings().learningRatingAir} Air`));
        const commentLabel = makeElement('label', 'learning-comment-label', 'Komentar (wajib, maksimal 500 karakter)');
        const commentField = makeElement('textarea', 'learning-comment-input');
        commentField.name = 'comment';
        commentField.rows = 3;
        commentField.maxLength = 500;
        commentField.required = true;
        commentField.value = draft.comment ?? '';
        commentField.placeholder = 'Apa yang kamu pelajari? Bagikan kesan atau masukanmu.';
        commentLabel.append(commentField);
        ratingForm.append(starPicker, commentLabel, rateButton);
        card.append(ratingForm);
      }
    } else {
      const startButton = makeElement('button', 'learning-start-button');
      startButton.type = 'button';
      startButton.dataset.learningModule = module.id;
      startButton.append(makeSvgIcon('icon-play'), makeElement('span', '', 'Pelajari materi'));
      card.append(startButton);
    }

    const reviewsButton = makeElement('button', 'learning-reviews-button', 'Lihat ulasan pengguna');
    reviewsButton.type = 'button';
    reviewsButton.dataset.learningReviews = module.id;
    reviewsButton.setAttribute('aria-label', `Lihat ulasan untuk ${module.title}`);
    reviewsButton.setAttribute('aria-controls', 'learningReviewsSection');
    card.append(reviewsButton);
    elements.learningCatalog.append(card);
  });
}

let learningReviewsRequestId = 0;

function buildLearningReviews(items) {
  const list = document.querySelector('#learningReviewsList');
  list.replaceChildren();
  if (!items.length) {
    list.append(makeElement('li', 'learning-review-empty', 'Belum ada ulasan untuk materi ini.'));
    return;
  }
  items.forEach((review) => {
    const item = makeElement('li', 'learning-review-item');
    const header = makeElement('div', 'learning-review-header');
    const avatar = makeElement('span', 'learning-review-avatar', (review.name.trim().charAt(0) || '?').toLocaleUpperCase('id-ID'));
    avatar.setAttribute('aria-hidden', 'true');
    const identity = makeElement('div', 'learning-review-identity');
    identity.append(makeElement('strong', 'learning-review-author', review.name));
    if (review.isOwn) identity.append(makeElement('span', 'learning-review-self', 'Anda'));
    header.append(avatar, identity);
    const stars = makeElement('span', 'learning-star-display');
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', `${review.rating} dari 5 bintang`);
    stars.title = `${review.rating}/5`;
    for (let value = 1; value <= 5; value += 1) stars.append(makeElement('span', value <= review.rating ? 'is-filled' : '', '★'));
    const comment = makeElement('p', review.comment.trim() ? 'learning-review-comment' : 'learning-review-legacy', review.comment.trim() || 'Belum ada komentar (rating lama).');
    item.append(header, stars, comment);
    list.append(item);
  });
}

async function loadLearningReviews(moduleId, page = 1) {
  const section = document.querySelector('#learningReviewsSection');
  const summary = document.querySelector('#learningReviewsSummary');
  const list = document.querySelector('#learningReviewsList');
  const pagination = document.querySelector('#learningReviewsPagination');
  const retry = document.querySelector('#learningReviewsRetry');
  const requestId = ++learningReviewsRequestId;
  section.dataset.page = String(page);
  setLearningReviewScore(null);
  summary.textContent = 'Memuat ulasan…';
  list.setAttribute('aria-busy', 'true');
  list.replaceChildren(makeElement('li', 'learning-review-empty', 'Mengambil ulasan pengguna…'));
  retry.hidden = true;
  pagination.hidden = true;
  try {
    const data = await apiLearningReviews(moduleId, page);
    if (requestId !== learningReviewsRequestId || !currentAccount || section.dataset.moduleId !== moduleId) return;
    section.dataset.page = String(data.page);
    setLearningReviewScore(data.average);
    summary.textContent = data.total
      ? `${data.total} ulasan pengguna`
      : 'Belum ada ulasan';
    buildLearningReviews(data.items);
    renderTablePagination(pagination, 'reviewPage', data.page, data.totalPages);
  } catch (error) {
    if (requestId !== learningReviewsRequestId || !currentAccount || section.dataset.moduleId !== moduleId) return;
    summary.textContent = error?.message || 'Ulasan belum dapat dimuat.';
    list.replaceChildren();
    retry.hidden = false;
  } finally {
    if (requestId === learningReviewsRequestId) list.setAttribute('aria-busy', 'false');
  }
}

function setLearningReviewScore(average) {
  const score = document.querySelector('#learningReviewsScore');
  const stars = document.querySelector('#learningReviewsStars');
  const hasRating = Number.isFinite(average) && average >= 1 && average <= 5;
  const formatted = hasRating ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(average) : '—';
  score.textContent = formatted;
  stars.setAttribute('aria-label', hasRating ? `${formatted} dari 5 bintang` : 'Belum ada rating');
  stars.replaceChildren();
  for (let value = 1; value <= 5; value += 1) {
    const star = makeElement('span', '', '★');
    star.setAttribute('aria-hidden', 'true');
    star.style.setProperty('--star-fill', `${hasRating ? Math.max(0, Math.min(1, average - value + 1)) * 100 : 0}%`);
    stars.append(star);
  }
}

function syncLearningReviewsSection() {
  if (!currentAccount) return;
  const section = document.querySelector('#learningReviewsSection');
  const host = document.querySelector(currentRole() === 'admin' ? '#learnAdminReviewsHost' : '#learningReviewsHost');
  if (section.parentElement !== host) host.append(section);
  const select = document.querySelector('#learningReviewsModule');
  select.replaceChildren();
  learningModules.forEach((module) => {
    const option = makeElement('option', '', module.title);
    option.value = module.id;
    select.append(option);
  });
  section.hidden = learningModules.length === 0;
  if (!learningModules.length) {
    learningReviewsRequestId += 1;
    delete section.dataset.moduleId;
    document.querySelector('#learningReviewsList').replaceChildren();
    return;
  }
  const selected = learningModules.find((module) => module.id === section.dataset.moduleId);
  select.value = selected?.id ?? learningModules[0].id;
  if (selected) document.querySelector('#learningReviewsTitle').textContent = `Ulasan: ${selected.title}`;
  if (!selected) openLearningReviews(select.value, false);
}

function openLearningReviews(moduleId, scroll = true) {
  const module = learningModules.find((item) => item.id === moduleId);
  if (!module) return;
  const section = document.querySelector('#learningReviewsSection');
  const host = document.querySelector(currentRole() === 'admin' ? '#learnAdminReviewsHost' : '#learningReviewsHost');
  if (section.parentElement !== host) host.append(section);
  section.hidden = false;
  document.querySelector('#learningReviewsTitle').textContent = `Ulasan: ${module.title}`;
  section.dataset.moduleId = moduleId;
  document.querySelector('#learningReviewsModule').value = moduleId;
  loadLearningReviews(moduleId);
  if (scroll) {
    section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    document.querySelector('#learningReviewsTitle').focus({ preventScroll: true });
  }
}

document.querySelector('#learningReviewsModule').addEventListener('change', (event) => {
  openLearningReviews(event.target.value, false);
});
document.querySelector('#learningReviewsRetry').addEventListener('click', () => {
  const section = document.querySelector('#learningReviewsSection');
  loadLearningReviews(section.dataset.moduleId, Number(section.dataset.page));
});
document.querySelector('#learningReviewsPagination').addEventListener('click', (event) => {
  const button = event.target.closest('[data-review-page]');
  if (!button || button.disabled || button.getAttribute('aria-current') === 'page') return;
  const section = document.querySelector('#learningReviewsSection');
  loadLearningReviews(section.dataset.moduleId, Number(button.dataset.reviewPage));
});

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

// Dua tombol utama (ACC, Hapus) tampil apa adanya; pilihan keputusan lain
// bersembunyi di menu "Putuskan" supaya baris aksi tetap ringkas.
function buildReviewContentMenu(row) {
  const wrap = makeElement('div', 'admin-review-kebab-wrap');
  const trigger = makeElement('button', 'admin-review-kebab admin-content-decide', 'Putuskan');
  trigger.type = 'button';
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', `Keputusan lain untuk "${row.submission.title}"`);
  trigger.title = 'Opsi lainnya: Tandai Basi, Tidak Relevan, Duplikat';
  trigger.append(makeElement('span', 'admin-account-manage-caret', '⌄'));
  const menu = makeElement('div', 'admin-review-menu');
  menu.setAttribute('role', 'menu');
  menu.setAttribute('popover', 'manual');
  menu.setAttribute('aria-label', `Ubah kondisi konten "${row.submission.title}"`);
  [makeAdminConditionButton(row, 'stale', 'Tandai Basi'),
   makeAdminConditionButton(row, 'rejected', 'Tidak Relevan'),
   makeAdminConditionButton(row, 'duplicate', 'Duplikat')].forEach((button) => {
    button.setAttribute('role', 'menuitem');
    menu.append(button);
  });
  wrap.append(trigger, menu);
  return wrap;
}

function closeReviewMenus() {
  document.querySelectorAll('.admin-review-menu.is-open').forEach((menu) => {
    if (menu.matches(':popover-open')) menu.hidePopover();
    menu.classList.remove('is-open');
    const trigger = menu.parentElement?.querySelector('.admin-review-kebab');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

function toggleReviewMenu(trigger) {
  const menu = trigger.parentElement?.querySelector('.admin-review-menu');
  if (!menu) return;
  const willOpen = !menu.classList.contains('is-open');
  closeReviewMenus();
  menu.classList.toggle('is-open', willOpen);
  trigger.setAttribute('aria-expanded', String(willOpen));
  if (willOpen) {
    // The native top layer escapes clipping without moving the DOM nodes;
    // delegated actions still resolve their original content card/account.
    menu.style.maxHeight = '';
    if (typeof menu.showPopover === 'function') menu.showPopover();
    const bounds = menu.getBoundingClientRect();
    const { left, top, maxHeight } = positionReviewMenu(
      trigger.getBoundingClientRect(), bounds.width, bounds.height, window.innerWidth, window.innerHeight,
    );
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.maxHeight = `${maxHeight}px`;
    menu.querySelector('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
  }
}

let adminReviewRenderId = 0;
let latestAdminAccounts = [];
let latestActivityWeek = [];
let adminActivityPage = 1;
let adminActivityRequestId = 0;
let adminActivitySearchTimer;
const ADMIN_ACCOUNTS_PAGE_SIZE = 12;
let adminAccountsPage = 1;

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
  const heroChart = buildActivityWeekChart(latestActivityWeek);
  heroChart.classList.add('is-hero');
  grid.append(
    heroChart,
    buildContentConditionChart(accounts),
    buildFruitChart(accounts),
    buildLevelDistributionChart(accounts),
  );
  elements.adminCharts.replaceChildren(grid);
}

function makeAdminChartCard(title, sub, body, theme) {
  const card = makeElement('div', 'admin-chart-card');
  card.dataset.chartTheme = theme;
  const head = document.createElement('div');
  head.className = 'admin-chart-head';
  head.append(makeElement('strong', 'admin-chart-title', title));
  if (sub) head.append(makeElement('small', 'admin-chart-sub', sub));
  card.append(head, body);
  return card;
}

function makeAdminChartEmpty(symbolId, title) {
  const empty = makeElement('div', 'admin-chart-empty');
  const iconTile = makeElement('span', 'admin-chart-empty-icon');
  iconTile.append(makeSvgIcon(symbolId, 'icon'));
  empty.append(iconTile, makeElement('strong', '', title));
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
    body.append(makeAdminChartEmpty('icon-share', 'Belum ada konten'));
    return makeAdminChartCard('Status konten', '0 konten', body, 'content');
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

  return makeAdminChartCard('Status konten', `${formatRelativeNumber(totals.contents)} konten`, body, 'content');
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
    body.append(makeAdminChartEmpty('icon-fruit', 'Belum ada buah'));
    return makeAdminChartCard('Posisi buah', '0 buah', body, 'fruit');
  }
  const totalFruits = bars.reduce((sum, bar) => sum + bar.count, 0);
  bars.forEach((bar) => body.append(makeHbarRow(bar.label, bar.count, totalFruits, bar.cls)));
  return makeAdminChartCard('Posisi buah', `${formatRelativeNumber(totalFruits)} buah`, body, 'fruit');
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
    body.append(makeAdminChartEmpty('icon-clock', 'Belum ada aktivitas minggu ini'));
    return makeAdminChartCard('Aktivitas 7 hari', '0 aktivitas', body, 'activity');
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
  return makeAdminChartCard('Aktivitas 7 hari', `${formatRelativeNumber(total)} aktivitas`, body, 'activity');
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
    body.append(makeAdminChartEmpty('icon-sprout', 'Belum ada akun pengguna'));
    return makeAdminChartCard('Level pohon pengguna', '0 pengguna', body, 'level');
  }
  for (let level = 0; level <= 7; level += 1) {
    if (counts[level] === 0) continue;
    body.append(makeHbarRow(`L${level} · ${STAGE_SHORT_NAMES[level]}`, counts[level], totalAccounts, `hbar-level-${level}`, `${formatRelativeNumber(counts[level])} · ${Math.round(counts[level] / totalAccounts * 100)}%`));
  }
  return makeAdminChartCard('Level pohon pengguna', `${formatRelativeNumber(totalAccounts)} pengguna`, body, 'level');
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
  if (currentRole() !== 'admin') return;
  apiAdminAccounts()
    .then(({ accounts, activityWeek }) => {
      if (renderId !== adminReviewRenderId || currentRole() !== 'admin') return;
      latestAdminAccounts = accounts;
      latestActivityWeek = activityWeek ?? [];
      buildAdminStats(accounts);
      buildAdminCharts(accounts);
      renderAdminTab();
    })
    .catch((error) => {
      if (renderId !== adminReviewRenderId || currentRole() !== 'admin') return;
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
      const errorRow = makeElement('tr', 'admin-review-empty-row');
      const errorCell = makeElement('td', 'admin-review-empty', error?.message || 'Konsol admin gagal dimuat dari server.');
      errorCell.colSpan = 5;
      errorRow.append(errorCell);
      elements.adminReviewList.append(errorRow);
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
    const moduleInfo = makeElement('div', 'admin-account-info');
    moduleInfo.append(makeElement('strong', '', module.title), makeElement('small', '', module.id));
    titleLine.append(
      makeElement('span', 'learn-module-avatar', module.category ? module.category.charAt(0).toLocaleUpperCase('id-ID') : 'L'),
      moduleInfo,
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
    const reviewsButton = makeElement('button', 'learning-reviews-button', 'Lihat ulasan');
    reviewsButton.type = 'button';
    reviewsButton.dataset.learningReviews = module.id;
    reviewsButton.setAttribute('aria-label', `Lihat ulasan untuk ${module.title}`);
    reviewsButton.setAttribute('aria-controls', 'learningReviewsSection');
    ratingCell.append(reviewsButton);

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
    elements.learnFieldQuiz.value = normalizeLearningQuiz(module.quiz).map((item) => {
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
    syncLearningReviewsSection();
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
  const reviewsButton = event.target.closest('[data-learning-reviews]');
  if (reviewsButton) {
    openLearningReviews(reviewsButton.dataset.learningReviews);
    return;
  }
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
      syncLearningReviewsSection();
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
      syncLearningReviewsSection();
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
  closeReviewMenus();
  elements.adminAccountsBody.replaceChildren();
  const query = elements.adminAccountSearch.value.trim().toLocaleLowerCase('id-ID');
  const filteredAccounts = query
    ? accounts.filter((account) => `${account.name ?? ''} ${account.email ?? ''}`.toLocaleLowerCase('id-ID').includes(query))
    : accounts;
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / ADMIN_ACCOUNTS_PAGE_SIZE));
  adminAccountsPage = Math.min(Math.max(adminAccountsPage, 1), totalPages);
  const pagedAccounts = filteredAccounts.slice((adminAccountsPage - 1) * ADMIN_ACCOUNTS_PAGE_SIZE, adminAccountsPage * ADMIN_ACCOUNTS_PAGE_SIZE);
  const pageInfo = filteredAccounts.length === 0
    ? ''
    : ` · tampil ${formatRelativeNumber((adminAccountsPage - 1) * ADMIN_ACCOUNTS_PAGE_SIZE + 1)}–${formatRelativeNumber(Math.min(adminAccountsPage * ADMIN_ACCOUNTS_PAGE_SIZE, filteredAccounts.length))}`;
  elements.adminAccountCount.textContent = query
    ? `${formatRelativeNumber(filteredAccounts.length)} dari ${formatRelativeNumber(accounts.length)} akun ditemukan${pageInfo}`
    : `${formatRelativeNumber(accounts.length)} akun terdaftar${pageInfo}`;

  if (filteredAccounts.length === 0) {
    elements.adminAccountsPagination.hidden = true;
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'admin-accounts-empty';
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = query ? 'Tidak ada akun yang cocok. Coba nama atau email lain.' : 'Belum ada akun terdaftar di server.';
    emptyRow.append(cell);
    elements.adminAccountsBody.append(emptyRow);
    return;
  }
  renderTablePagination(elements.adminAccountsPagination, 'accountPage', adminAccountsPage, totalPages);

  pagedAccounts.forEach((account) => {
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
    const isSelf = currentAccount?.email === account.email;

    const row = document.createElement('tr');

    const accountCell = document.createElement('td');
    accountCell.className = 'admin-account-cell';
    const avatar = makeElement('span', 'admin-account-avatar', (account.name ?? '?').trim().charAt(0).toLocaleUpperCase('id-ID'));
    const accountInfo = document.createElement('span');
    accountInfo.className = 'admin-account-info';
    const roleBadge = makeElement('span', `admin-role-badge ${isAdmin ? 'role-admin' : 'role-user'}`, isAdmin ? 'admin' : 'user');
    const nameLine = makeElement('span', 'admin-account-name-line');
    nameLine.append(makeElement('strong', '', account.name || 'Tanpa nama'), roleBadge);
    if (isSelf) nameLine.append(makeElement('span', 'admin-self-label', 'Anda'));
    const emailLine = makeElement('small', 'admin-account-email', account.email ?? '');
    accountInfo.append(nameLine, emailLine);
    if (receivedReports > 0) {
      accountInfo.append(makeElement('span', 'admin-report-badge', `${receivedReports} laporan diterima`));
    }
    const accountWrap = document.createElement('span');
    accountWrap.className = 'admin-account-line';
    accountWrap.append(avatar, accountInfo);
    accountCell.append(accountWrap);

    const treeCell = document.createElement('td');
    treeCell.append(makeElement('strong', 'admin-account-level', `L${treeState.level ?? 0} · ${STAGE_SHORT_NAMES[treeState.level ?? 0]}`));
    treeCell.append(makeElement('span', `admin-condition-chip is-${getTreeCondition(treeState)}`, condition));
    treeCell.classList.add(isAdmin ? 'admin-tree-idle' : `admin-tree-${getTreeCondition(treeState)}`);

    const storageCell = document.createElement('td');
    storageCell.append(makeElement('strong', '', `${formatRelativeNumber(treeState.air ?? 0)} Air · ${formatPupukUnits(treeState.fertilizerUnits)} Pupuk`));
    storageCell.append(makeElement('small', '', `Progres: ${formatRelativeNumber(treeState.growthAir ?? 0)} Air / ${formatPupukUnits(treeState.growthFertilizerUnits)} Pupuk`));

    const fruitsCell = document.createElement('td');
    fruitsCell.append(makeElement('strong', '', `${formatRelativeNumber(treeState.fruitsOnTree ?? 0)} di pohon`));
    fruitsCell.append(makeElement('small', '', `${formatRelativeNumber(treeState.fruitsInStorage ?? 0)} Storage · ${grounding} basi · ${gone} diangkat`));

    const contentsCell = document.createElement('td');
    contentsCell.append(makeElement('strong', '', `${submissions.length} konten`));
    contentsCell.append(makeElement('small', '', `${accCount} ACC · ${pendingCount} menunggu`));

    const activeCell = document.createElement('td');
    activeCell.className = 'admin-active-cell admin-account-last-active';
    activeCell.textContent = formatRelative(treeState.lastValidActivityAt);
    if (Number.isFinite(treeState.lastValidActivityAt)) activeCell.title = formatDate(treeState.lastValidActivityAt);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'admin-account-actions';
    const actionWrap = makeElement('div', 'admin-review-kebab-wrap');
    const trigger = makeElement('button', 'admin-review-kebab admin-account-manage', 'Kelola');
    trigger.type = 'button';
    trigger.setAttribute('aria-label', `Kelola akun ${account.name || account.email}`);
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.append(makeElement('span', 'admin-account-manage-caret', '⌄'));
    const menu = makeElement('div', 'admin-review-menu admin-account-menu');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('popover', 'manual');
    menu.setAttribute('aria-label', `Tindakan akun ${account.email}`);
    [makeAdminRowActionButton('reset', 'Reset pohon', account, isSelf),
     makeAdminRowActionButton('role', isAdmin ? 'Jadikan user' : 'Jadikan admin', account, isSelf),
     makeAdminRowActionButton('delete', 'Hapus akun', account, isSelf)].filter(Boolean).forEach((button) => {
       button.setAttribute('role', 'menuitem');
       menu.append(button);
     });
    actionWrap.append(trigger, menu);
    actionsCell.append(actionWrap);

    [accountCell, treeCell, storageCell, fruitsCell, contentsCell, activeCell, actionsCell].forEach((cell, index) => {
      cell.dataset.label = ['Akun', 'Pohon', 'Storage', 'Buah', 'Konten', 'Aktivitas terakhir', 'Kelola'][index];
      row.append(cell);
    });
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
  renderTablePagination(elements.adminActivityPagination, 'activityPage', page, totalPages);

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

function renderTablePagination(nav, attribute, page, totalPages) {
  nav.replaceChildren();
  nav.hidden = totalPages <= 1;
  if (totalPages <= 1) return;

  const addButton = (label, targetPage, disabled = false, current = false) => {
    const button = makeElement('button', `admin-page-button${current ? ' is-current' : ''}`, label);
    button.type = 'button';
    button.dataset[attribute] = String(targetPage);
    button.disabled = disabled;
    if (current) button.setAttribute('aria-current', 'page');
    button.setAttribute('aria-label', label === 'Sebelumnya' || label === 'Berikutnya' ? label : `Halaman ${label}`);
    nav.append(button);
  };
  addButton('Sebelumnya', page - 1, page === 1);
  const pages = [...new Set([1, totalPages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= totalPages))].sort((a, b) => a - b);
  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) nav.append(makeElement('span', 'admin-page-gap', '…'));
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
  closeReviewMenus();
  elements.adminReviewList.replaceChildren();

  if (visibleRows.length === 0) {
    const emptyText = adminReviewFilter === 'all'
      ? 'Belum ada konten Sharing untuk direview. Materi dari halaman Sharing (akun mana pun di server) tampil di sini.'
      : `Tidak ada konten berstatus ${SHARING_STATUS_INFO[adminReviewFilter]?.label ?? adminReviewFilter}.`;
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'admin-review-empty-row';
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 5;
    emptyCell.className = 'admin-review-empty';
    emptyCell.textContent = emptyText;
    emptyRow.append(emptyCell);
    elements.adminReviewList.append(emptyRow);
    return;
  }

  visibleRows.forEach((row) => {
    const submissionReports = Array.isArray(row.submission.reports) ? row.submission.reports : [];
    const statusInfo = SHARING_STATUS_INFO[row.submission.status];
    const tr = document.createElement('tr');
    tr.className = 'admin-review-row';

    // -- Konten: judul + ringkasan ringkas + tautan/berkas + rincian laporan --
    const contentCell = document.createElement('td');
    contentCell.className = 'admin-review-content-cell';
    contentCell.append(makeElement('strong', 'admin-review-title', row.submission.title));
    contentCell.append(makeElement('div', 'sharing-item-meta', [
      SHARING_TYPE_LABELS[row.submission.type] ?? row.submission.type,
      row.submission.url ? 'Tautan' : (row.submission.attachment ? 'Video terlampir' : ''),
    ].filter(Boolean).join(' · ')));
    contentCell.append(makeElement('p', 'admin-review-summary', row.submission.summary));
    if (row.submission.url) {
      const link = makeElement('a', 'sharing-material-link', row.submission.url);
      link.href = row.submission.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      contentCell.append(link);
    } else if (row.submission.attachment?.name) {
      contentCell.append(makeElement('span', 'admin-review-file', row.submission.attachment.name));
    }
    if (submissionReports.length) {
      const details = makeElement('details', 'admin-report-details');
      details.append(makeElement('summary', '', `Lihat ${submissionReports.length} alasan laporan`));
      submissionReports.forEach((report) => {
        const entry = makeElement('div', 'admin-report-entry');
        entry.append(makeElement('strong', '', SHARING_REPORT_REASONS[report.reason ?? 'rejected'] ?? 'Laporan'),
          makeElement('small', '', `${report.by ?? 'Pengguna'} · ${formatDate(report.at)}`));
        if (report.note) entry.append(makeElement('p', '', report.note));
        details.append(entry);
      });
      contentCell.append(details);
    }

    // -- Pemilik: avatar + nama + email (gaya konsol Akun & pohon) --
    const ownerCell = document.createElement('td');
    ownerCell.className = 'admin-review-owner-cell';
    const avatar = makeElement('span', 'admin-account-avatar', (row.account.name || '?').trim().charAt(0).toLocaleUpperCase('id-ID'));
    const owner = makeElement('div', 'admin-account-info');
    owner.append(makeElement('strong', '', row.account.name), makeElement('small', '', row.account.email));
    const ownerLine = makeElement('div', 'admin-account-line');
    ownerLine.append(avatar, owner);
    ownerCell.append(ownerLine);

    // -- Status: chip berwarna + jumlah laporan --
    const statusCell = document.createElement('td');
    statusCell.className = 'admin-review-status-cell';
    statusCell.append(makeElement('span', `admin-condition-chip is-${row.submission.status}`, statusInfo?.label ?? row.submission.status));
    if (submissionReports.length > 0) {
      statusCell.append(makeElement('span', 'admin-report-badge', `${submissionReports.length} laporan`));
    }

    // -- Dikirim: tanggal kirim + kapan diputus --
    const sentCell = document.createElement('td');
    sentCell.className = 'admin-review-sent-cell';
    sentCell.append(makeElement('strong', '', formatDate(row.submission.submittedAt)));
    sentCell.append(makeElement('small', '', row.submission.reviewedAt ? `Diputus ${formatDate(row.submission.reviewedAt)}` : 'Belum diputus'));

    // -- Keputusan: ACC + menu Putuskan + Hapus konten --
    const actionsCell = document.createElement('td');
    actionsCell.className = 'admin-review-actions-cell';
    const actions = makeElement('div', 'admin-condition-actions');
    actions.append(makeAdminConditionButton(row, 'validated', 'ACC'));
    const deleteContentButton = makeElement('button', 'admin-content-delete', 'Hapus');
    deleteContentButton.type = 'button';
    deleteContentButton.dataset.adminDeleteContent = row.submission.id;
    deleteContentButton.dataset.accountEmail = row.account.email;
    deleteContentButton.setAttribute('aria-label', `Hapus konten "${row.submission.title}" beserta buahnya`);
    deleteContentButton.title = 'Hapus konten beserta buahnya secara permanen (slot dikosongkan).';
    actions.append(deleteContentButton);
    actions.append(buildReviewContentMenu(row));
    actionsCell.append(actions);

    [contentCell, ownerCell, statusCell, sentCell, actionsCell].forEach((cell, index) => {
      cell.dataset.label = ['Konten', 'Pemilik', 'Status', 'Dikirim', 'Keputusan'][index];
      tr.append(cell);
    });

    elements.adminReviewList.append(tr);
  });
}

async function applyAdminCondition(button) {
  const email = button.dataset.adminEmail;
  const submissionId = button.dataset.submissionId;
  const condition = button.dataset.adminCondition;
  const label = { validated: 'ACC', stale: 'Basi', rejected: 'Tidak Relevan', duplicate: 'Duplikat' }[condition];
  if (!label) return;
  const title = button.closest('.admin-review-row')?.querySelector('.admin-review-title')?.textContent ?? 'konten ini';
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
  const title = button.closest('.admin-review-row')?.querySelector('.admin-review-title')?.textContent ?? 'konten ini';
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
  closeReviewMenus();
  elements.libraryList.replaceChildren();

  if (rows.length === 0) {
    elements.libraryList.append(makeElement('div', 'library-empty', 'Belum ada materi tersedia. Konten Sharing yang lulus review admin akan tampil di sini.'));
    return;
  }

  rows.forEach((row) => {
    const reports = Array.isArray(row.submission.reports) ? row.submission.reports : [];
    const isOwn = currentAccount?.email === row.account.email;
    const alreadyReported = reports.some((report) => report?.by === currentAccount?.email);
    const item = makeElement('article', 'library-item');

    // Materi utama: judul dan isi tidak dipotong seperti baris tabel admin.
    const contentCell = makeElement('div', 'library-content');
    contentCell.append(makeElement('h3', 'library-title', row.submission.title));
    contentCell.append(makeElement('div', 'library-meta', `${SHARING_TYPE_LABELS[row.submission.type] ?? row.submission.type} · ${formatDate(row.submission.submittedAt)}`));
    if (row.submission.summary) contentCell.append(makeElement('p', 'library-description', row.submission.summary));

    // Identitas kontributor di kepala kartu.
    const ownerCell = makeElement('div', 'library-item-header');
    const avatar = makeElement('span', 'admin-account-avatar', (row.account.name || '?').trim().charAt(0).toLocaleUpperCase('id-ID'));
    const owner = makeElement('div', 'admin-account-info');
    owner.append(makeElement('strong', '', row.account.name || 'Kontributor'));
    const ownerLine = makeElement('div', 'admin-account-line');
    ownerLine.append(avatar, owner);
    ownerCell.append(ownerLine);

    // Aksi belajar sesuai jenis materi, tanpa menampilkan statistik moderasi.
    const actions = makeElement('div', 'library-learning-actions');
    const safeUrl = /^https?:\/\//i.test(row.submission.url ?? '') ? row.submission.url : null;
    if (safeUrl) {
      const label = row.submission.type === 'video' ? 'Tonton materi ↗' : row.submission.type === 'podcast' ? 'Dengarkan materi ↗' : 'Baca materi ↗';
      const openLink = makeElement('a', 'library-open', label);
      openLink.href = safeUrl;
      openLink.target = '_blank';
      openLink.rel = 'noreferrer';
      actions.append(openLink);
    } else if (row.submission.attachment?.name) {
      actions.append(makeElement('span', 'library-resource-note', `Lampiran: ${row.submission.attachment.name} · belum tersedia lintas perangkat`));
    } else {
      actions.append(makeElement('span', 'library-resource-note', 'Pelajari ringkasan di atas · tautan materi belum tersedia'));
    }

    if (isOwn) {
      ownerCell.append(makeElement('span', 'library-own-note', 'Konten milikmu'));
    } else {
      const wrap = makeElement('div', 'admin-review-kebab-wrap');
      const trigger = makeElement('button', 'admin-review-kebab library-options');
      trigger.type = 'button';
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-label', `Opsi untuk konten "${row.submission.title}" dari ${row.account.name}`);
      trigger.title = alreadyReported ? 'Satu akun satu laporan per konten.' : 'Laporkan jika menurutmu konten ini tidak relevan atau duplikat.';
      const dots = makeElement('span', 'library-options-dots', '⋮');
      dots.setAttribute('aria-hidden', 'true');
      trigger.append(dots);
      const menu = makeElement('div', 'admin-review-menu');
      menu.setAttribute('role', 'menu');
      menu.setAttribute('popover', 'manual');
      menu.setAttribute('aria-label', `Tindakan konten "${row.submission.title}"`);
      if (!alreadyReported && currentAccount) {
        const menuItem = makeElement('button', 'admin-row-action action-library-report', 'Laporkan konten');
        menuItem.type = 'button';
        menuItem.dataset.libraryEmail = row.account.email;
        menuItem.dataset.submissionId = row.submission.id;
        menuItem.setAttribute('role', 'menuitem');
        menu.append(menuItem);
      } else {
        const note = makeElement('span', 'admin-menu-note', alreadyReported ? 'Sudah kamu laporkan' : 'Masuk untuk melaporkan');
        menu.append(note);
      }
      wrap.append(trigger, menu);
      ownerCell.append(wrap);
    }
    item.append(ownerCell, contentCell, actions);
    elements.libraryList.append(item);
  });
}

function applyLibraryReport(button) {
  const submissionId = button.dataset.submissionId;
  if (!submissionId || !currentAccount) return;

  const dialog = document.querySelector('#reportDialog');
  document.querySelector('#reportForm').reset();
  document.querySelector('#reportNote').required = false;
  document.querySelector('#reportFeedback').textContent = '';
  dialog.dataset.submissionId = submissionId;
  if (!dialog.open) dialog.showModal();
}

let reportSubmitting = false;
document.querySelector('#reportReason').addEventListener('change', (event) => {
  document.querySelector('#reportNote').required = event.target.value === 'other';
});
document.querySelector('#reportCancel').addEventListener('click', () => {
  if (!reportSubmitting) document.querySelector('#reportDialog').close();
});
document.querySelector('#reportDialog').addEventListener('cancel', (event) => {
  if (reportSubmitting) event.preventDefault();
});
document.querySelector('#reportForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (reportSubmitting || !currentAccount) return;
  const dialog = document.querySelector('#reportDialog');
  const submissionId = dialog.dataset.submissionId;
  if (!submissionId) return;
  const submit = document.querySelector('#reportSubmit');
  const cancel = document.querySelector('#reportCancel');
  const reason = document.querySelector('#reportReason').value;
  const note = document.querySelector('#reportNote').value.trim();
  reportSubmitting = true;
  submit.disabled = true;
  cancel.disabled = true;
  submit.textContent = 'Mengirim…';
  try {
    const result = await apiReport(submissionId, { reason, note });
    dialog.close();
    showToast(result.added
      ? `Laporan tersimpan di server (total ${result.reports}). Admin yang memutuskan kondisinya.`
      : 'Kamu sudah pernah melaporkan konten ini.', result.added ? 'success' : 'notice');
    renderAdminReview();
    renderLibrary();
  } catch (error) {
    document.querySelector('#reportFeedback').textContent = error?.message || 'Laporan gagal dikirim. Coba lagi.';
  } finally {
    reportSubmitting = false;
    submit.disabled = false;
    cancel.disabled = false;
    submit.textContent = 'Kirim laporan';
  }
});

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

// Satu timer untuk animasi pop kanvas pohon: kelas sebelumnya dibatalkan
// dulu supaya spam aksi cepat (Boost beruntun) tidak memotong animasi baru.
let treeCanvasPopTimer = 0;
function playTreeCanvasPop(className, duration) {
  window.clearTimeout(treeCanvasPopTimer);
  const canvas = elements.treeCanvas;
  canvas.classList.remove('sprout-appear', 'level-pop', 'fruit-burst');
  void canvas.offsetWidth;
  canvas.classList.add(className);
  treeCanvasPopTimer = window.setTimeout(() => canvas.classList.remove(className), duration);
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
  // Preserve the ledger when levels decrease, but no fruit (even fallen
  // stale fruit) is visible before the fruit-bearing stage at level 3.
  if (state.level < 3) {
    fruitView.tree = [];
    fruitView.ground = [];
  }
  const fruitValue = [
    fruitView.maxSlot,
    `T${fruitView.tree.map((entry) => entry.slot).join(',')}`,
    `G${fruitView.ground.map((entry) => entry.slot).join(',')}`,
  ].join('|');
  const fruitChanged = Boolean(elements.treeCanvas.dataset.fruits) && elements.treeCanvas.dataset.fruits !== fruitValue;
  const visualChanged = elements.treeCanvas.dataset.level !== levelValue
    || elements.treeCanvas.dataset.condition !== condition
    || elements.treeCanvas.dataset.fruits !== fruitValue;

  if (visualChanged) {
    elements.treeCanvas.innerHTML = makeTreeSvg(state.level, condition, fruitView);
    elements.treeCanvas.dataset.level = levelValue;
    elements.treeCanvas.dataset.condition = condition;
    elements.treeCanvas.dataset.fruits = fruitValue;
  }
  elements.treeCanvas.setAttribute('aria-label', `Pohon Level ${state.level}, ${STAGES[state.level]}, ${fruitView.tree.length} Buah di pohon${fruitView.ground.length ? `, ${fruitView.ground.length} buah busuk rebah di tanah` : ''}, kondisi ${conditionInfo.title}`);

  // Pop transisi pohon: Level 0→Bibit tetap memakai sprout-appear (tunas
  // meletus dari tanah). Naik level lain = mahkota meletus + batang bangkit +
  // buah muncul beruntun (level-pop). Perpindahan buah tanpa ganti level
  // (konten dipindah/diangkat) = hanya buah yang pop (fruit-burst). Kelas
  // ditaruh di treeCanvas (div HTML) dan hanya menyasar elemen tanpa atribut
  // transform SVG supaya posisi buah/mahkota tidak tertimpa.
  if (levelChanged && previousLevel === 0 && state.level === 1) {
    playTreeCanvasPop('sprout-appear', 1200);
  } else if (levelChanged || fruitChanged) {
    playTreeCanvasPop(levelChanged ? 'level-pop' : 'fruit-burst', 1350);
  }
  elements.treeCanvas.classList.toggle('leaf-shedding', state.level >= 2);
  elements.treePanel.classList.remove('is-healthy', 'is-thirsty', 'is-dead');
  elements.treePanel.classList.add(sceneClass);
  elements.treeScene.classList.toggle('is-advanced-stage', state.level >= 7 && condition === 'healthy');
  elements.treeScene.classList.toggle('has-garden-life', state.level >= 4 && condition === 'healthy');
  // Stable positions along a sky arc; care actions keep the same position.
  // Stay clear of the badges at the far left and of the growing tree below.
  const sunPositions = [[90, 20], [82, 14], [74, 9], [66, 5], [58, 3], [50, 5], [40, 9], [30, 15]];
  const [sunX, sunY] = sunPositions[state.level] ?? sunPositions[0];
  elements.treeScene.style.setProperty('--sun-x', `${sunX}%`);
  elements.treeScene.style.setProperty('--sun-y', `${sunY}%`);
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
      saveState({ type: 'notifications.read', data: { ids: notifications.map((entry) => entry.id) } });
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
    elements.learningPageDescription.textContent = `Materi tuntas memberi +${pupuk(settings.learningRewardFertilizerUnits)} Pupuk ke Storage; bintang dan komentar memberi total +${f(settings.learningRatingAir)} Air, sekali per materi.`;
  }
  if (elements.learningRewardRating) {
    const air = settings.learningRatingAir;
    elements.learningRewardRating.textContent = `Bintang + komentar · +${f(air)} Air`;
    elements.learningRewardRating.parentElement.setAttribute('aria-label', `Bintang dan komentar, total tambah ${f(air)} Air ke Storage sekali per materi`);
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

function updateWith(nextState, message, tone = 'success', { action = { type: 'sync' } } = {}) {
  // nextState remains a local preview for messages/animation decisions only.
  // Never persist it: the server calculates and returns the authoritative state.
  return saveState(action).then((result) => {
    if (!result) return null;
    if (result.applied === false || result.awarded === false) {
      const reasons = {
        'progress-full': 'Progres resource ini sudah penuh. Saldo tetap di Storage sampai kebutuhan pasangannya terpenuhi.',
        'tree-not-ready': 'Buah hanya dapat dipindahkan ke pohon sehat mulai Level 3. Buah tetap di Storage.',
        'not-completed': 'Pelajari dan selesaikan materi sebelum memberi rating.',
        'already-completed': 'Materi ini sudah selesai; reward tidak diberikan dua kali.',
        'already-rated': 'Rating materi ini sudah tersimpan; reward tidak diberikan dua kali.',
      };
      showToast(reasons[result.reason] ?? 'Tindakan belum dapat diterapkan. Periksa saldo Storage dan kondisi pohon.', 'notice');
    } else if (message) showToast(message, tone);
    return result;
  });
}

function updateLearningQuizState() {
  if (!activeLearningModule) return;

  const answers = activeLearningModule.quiz.map((item, index) => elements.learningQuiz.querySelector(`input[name="learningAnswer-${index}"]:checked`));
  const answerIsCorrect = answers.every((answer, index) => answer && Number(answer.value) === activeLearningModule.quiz[index].correctAnswer);
  const materialWasRead = elements.learningReadCheck.checked;
  elements.completeLearningButton.disabled = !answerIsCorrect || !materialWasRead;

  if (answers.some((answer, index) => answer && Number(answer.value) !== activeLearningModule.quiz[index].correctAnswer)) {
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

  activeLearningModule = { ...module, quiz: normalizeLearningQuiz(module.quiz) };
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
  resource.href = safeResourceUrl(module.resourceUrl);
  resource.target = '_blank';
  resource.rel = 'noreferrer';
  resource.textContent = module.resourceLabel;
  if (safeResourceUrl(module.resourceUrl)) elements.learningLessonContent.append(resource);

  elements.learningQuiz.replaceChildren();
  elements.learningQuiz.hidden = activeLearningModule.quiz.length === 0;
  elements.learningQuiz.append(makeElement('legend', '', 'Kuis pemahaman'));
  activeLearningModule.quiz.forEach((question, questionIndex) => {
    const group = makeElement('fieldset', 'learning-question');
    group.append(makeElement('legend', '', question.prompt));
    question.answers.forEach((answer, index) => {
      const answerId = `learning-answer-${module.id}-${questionIndex}-${index}`;
      const label = makeElement('label', 'learning-answer');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `learningAnswer-${questionIndex}`;
      input.value = String(index);
      input.id = answerId;
      label.htmlFor = answerId;
      label.append(input, makeElement('span', '', answer));
      group.append(label);
    });
    elements.learningQuiz.append(group);
  });

  elements.learningReadCheck.checked = false;
  elements.completeLearningButton.disabled = true;
  elements.learningFeedback.textContent = activeLearningModule.quiz.length
    ? 'Pilih jawaban kuis dan konfirmasi materi untuk menyelesaikan Learning.'
    : 'Baca materi lalu tandai konfirmasi untuk menyelesaikan Learning.';
  elements.learningFeedback.className = 'learning-feedback';
  elements.learningDialog.showModal();
}

let authRegisterMode = false;
let authSubmitting = false;
function setAuthMode(register) {
  authRegisterMode = register;
  elements.loginForm.hidden = register;
  document.querySelector('#registerForm').hidden = !register;
  document.querySelector('#authTitle').textContent = register ? 'Mulai kebun pengetahuanmu' : 'Masuk ke kebunmu';
  document.querySelector('#authDescription').textContent = register
    ? 'Buat akun untuk menanam, belajar, dan berbagi pengetahuan.'
    : 'Lanjutkan merawat kebun pengetahuanmu dengan akun yang sudah terdaftar.';
  document.querySelector('#authSwitchHint').textContent = register ? 'Sudah punya akun?' : 'Belum punya akun?';
  document.querySelector('#authSwitch').textContent = register ? 'Masuk' : 'Daftar';
  document.querySelectorAll('[data-password-form]').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.textContent = 'Tampilkan kata sandi';
    document.getElementById(button.dataset.passwordForm).querySelectorAll('[name="password"], [name="confirmPassword"]').forEach((input) => { input.type = 'password'; });
  });
  setAuthMessage('');
}
document.querySelector('#authSwitch').addEventListener('click', () => {
  if (authSubmitting) return;
  setAuthMode(!authRegisterMode);
  document.querySelector(authRegisterMode ? '#registerName' : '#loginEmail').focus();
});
document.querySelectorAll('[data-password-form]').forEach((button) => {
  button.addEventListener('click', () => {
    const show = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(show));
    button.textContent = show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi';
    document.getElementById(button.dataset.passwordForm).querySelectorAll('[name="password"], [name="confirmPassword"]').forEach((input) => { input.type = show ? 'text' : 'password'; });
  });
});
for (const [form, register] of [[elements.loginForm, false], [document.querySelector('#registerForm'), true]]) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (authSubmitting) return;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    if (register && data.password !== data.confirmPassword) {
      setAuthMessage('Konfirmasi kata sandi tidak cocok.', 'error');
      document.querySelector('#registerConfirmPassword').focus();
      return;
    }
    authSubmitting = true;
    const submit = form.querySelector('[type="submit"]');
    const label = submit.innerHTML;
    submit.disabled = true;
    submit.textContent = register ? 'Membuat akun…' : 'Masuk…';
    document.querySelector('#authSwitch').disabled = true;
    form.setAttribute('aria-busy', 'true');
    setAuthMessage('');
    try {
      const { account, treeState, settings, demoEnabled } = await (register ? apiRegister(data) : apiLogin(data));
      elements.loginForm.reset();
      document.querySelector('#registerForm').reset();
      setAuthMode(false);
      enterApp(account, treeState, true, settings, demoEnabled);
      if (register) showToast('Akun dan kebun baru berhasil dibuat. Selamat menanam!', 'success');
    } catch (error) {
      setAuthMessage(error.message || 'Tidak dapat menghubungi server. Coba lagi.', 'error');
    } finally {
      authSubmitting = false;
      submit.disabled = false;
      submit.innerHTML = label;
      document.querySelector('#authSwitch').disabled = false;
      form.setAttribute('aria-busy', 'false');
    }
  });
}

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
  const reviewsButton = event.target.closest('[data-learning-reviews]');
  if (reviewsButton) {
    openLearningReviews(reviewsButton.dataset.learningReviews);
    return;
  }
  const startButton = event.target.closest('[data-learning-module]');
  if (startButton) {
    openLearningModule(startButton.dataset.learningModule);
  }
});

elements.learningCatalog.addEventListener('change', (event) => {
  const ratingInput = event.target.closest('input[name="rating"]');
  if (!ratingInput) return;

  const selectedRating = Number(ratingInput.value);
  const moduleId = ratingInput.closest('form[data-learning-rating]').dataset.learningRating;
  learningReviewDrafts.set(moduleId, { ...learningReviewDrafts.get(moduleId), rating: selectedRating });
  ratingInput.closest('.learning-star-picker').querySelectorAll('.learning-star-option').forEach((star, index) => {
    star.classList.toggle('is-selected', index < selectedRating);
  });
});

elements.learningQuizForm.addEventListener('change', updateLearningQuizState);
elements.learningReadCheck.addEventListener('change', updateLearningQuizState);
elements.learningQuizForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeLearningModule || elements.completeLearningButton.disabled) return;

  const result = completeLearningModule(state, activeLearningModule.id, { title: activeLearningModule.title });
  const action = { type: 'learning.complete', data: {
    moduleId: activeLearningModule.id, read: elements.learningReadCheck.checked,
    answers: activeLearningModule.quiz.map((item, index) => Number(elements.learningQuiz.querySelector(`input[name="learningAnswer-${index}"]:checked`)?.value)),
  } };
  elements.completeLearningButton.disabled = true;
  let saved = null;
  if (result.awarded) {
    saved = await updateWith(result.state, `Learning selesai: ${activeLearningModule.title}. +${formatPupukDisplay(getGamificationSettings().learningRewardFertilizerUnits)} Pupuk masuk Storage; gunakan pada pohon untuk menambah progres.`, 'success', { action });
  }
  if (!saved) { updateLearningQuizState(); return; }
  elements.learningDialog.close();
  activeLearningModule = null;
});

elements.learningCatalog.addEventListener('input', (event) => {
  const field = event.target.closest('textarea[name="comment"]');
  if (!field) return;
  field.setCustomValidity('');
  const moduleId = field.closest('form[data-learning-rating]').dataset.learningRating;
  learningReviewDrafts.set(moduleId, { ...learningReviewDrafts.get(moduleId), comment: field.value });
});

elements.learningCatalog.addEventListener('submit', async (event) => {
  const ratingForm = event.target.closest('form[data-learning-rating]');
  if (!ratingForm) return;
  event.preventDefault();

  const module = learningModules.find((entry) => entry.id === ratingForm.dataset.learningRating);
  if (!module) return;
  const button = ratingForm.querySelector('[type="submit"]');
  if (button.disabled) return;
  const fields = new FormData(ratingForm);
  const rating = Number(fields.get('rating'));
  const comment = String(fields.get('comment') ?? '').trim();
  if (!comment) {
    const field = ratingForm.querySelector('[name="comment"]');
    field.setCustomValidity('Tuliskan komentar sebelum mengirim ulasan.');
    field.reportValidity();
    return;
  }
  try {
    const result = rateLearningModule(state, module.id, rating, { title: module.title, comment });
    if (!result.awarded) {
      showToast('Materi belum selesai atau reward ulasannya sudah diterima.', 'notice');
      return;
    }
    button.disabled = true;
    const saved = await updateWith(result.state, `Ulasan ${rating}/5 dan komentar tersimpan. Total +${getGamificationSettings().learningRatingAir} Air masuk Storage.`, 'success', { action: { type: 'learning.rate', data: { moduleId: module.id, rating, comment } } });
    if (saved) {
      learningReviewDrafts.delete(module.id);
      if (document.querySelector('#learningReviewsSection').dataset.moduleId === module.id) loadLearningReviews(module.id);
    }
  } catch (error) {
    showToast(error.message || 'Ulasan belum dapat disimpan.', 'notice');
  } finally {
    button.disabled = false;
  }
});

elements.sharingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = elements.sharingForm.querySelector('[type="submit"]');
  if (submitButton.disabled) return;
  const formData = new FormData(elements.sharingForm);
  const videoFile = elements.sharingVideoFile.files?.[0];
  const accountEmail = currentAccount?.email;
  submitButton.disabled = true;
  try {
    const material = {
      title: String(formData.get('title')),
      type: String(formData.get('type')),
      url: String(formData.get('url') ?? ''),
      attachment: videoFile ? { name: videoFile.name, type: videoFile.type, size: videoFile.size } : null,
      summary: String(formData.get('summary')),
    };
    // Validate before sending; IDs, timestamps and status are assigned by server.
    submitSharingMaterial(state, material);
    const result = await saveState({ type: 'sharing', data: material });
    if (!result?.submission) return;
    let videoStored = true;
    if (videoFile) {
      try { await saveSharingVideo(accountEmail, result.submission.id, videoFile); }
      catch { videoStored = false; }
    }
    if (currentAccount?.email !== accountEmail) return;
    if (videoFile) renderSharingQueue();
    elements.sharingForm.reset();
    renderSelectedVideo();
    const message = result.submission.status === 'duplicate'
      ? 'Materi ini sudah pernah dikirim. Sharing ditandai duplikat tanpa reward.'
      : 'Materi Sharing masuk antrean validasi demo.';
    showToast(videoStored ? message : 'Materi tersimpan, tetapi salinan video lokal gagal disimpan. Gunakan tautan materi untuk berbagi video.', !videoStored || result.submission.status === 'duplicate' ? 'notice' : 'success');
  } catch (error) {
    const message = error?.name === 'QuotaExceededError'
      ? 'Penyimpanan browser penuh. Hapus video lama atau pilih video yang lebih kecil.'
      : error?.message || 'Video gagal disimpan di browser ini. Coba lagi dengan video yang lebih kecil.';
    showToast(message, 'notice');
  } finally {
    submitButton.disabled = false;
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
  const kebabTrigger = event.target.closest('.admin-review-kebab');
  if (kebabTrigger) {
    toggleReviewMenu(kebabTrigger);
    return;
  }

  if (event.target.closest('.admin-review-menu')) closeReviewMenus();

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

document.addEventListener('click', (event) => {
  if (!event.target.closest('.admin-review-kebab-wrap')) closeReviewMenus();
});

document.addEventListener('keydown', (event) => {
  const openMenu = document.querySelector('.admin-review-menu.is-open');
  if (!openMenu) return;
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const items = [...openMenu.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    if (!items.length) return;
    const current = items.indexOf(document.activeElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[index].focus({ preventScroll: true });
    return;
  }
  if (!['Escape', 'Tab'].includes(event.key)) return;
  const trigger = openMenu.parentElement?.querySelector('.admin-review-kebab');
  closeReviewMenus();
  trigger?.focus();
});
window.addEventListener('resize', closeReviewMenus);
document.addEventListener('scroll', (event) => {
  if (!(event.target instanceof Element) || !event.target.closest('.admin-review-menu')) closeReviewMenus();
}, true);

elements.adminAccountSearch.addEventListener('input', () => {
  adminAccountsPage = 1;
  buildAdminAccounts(latestAdminAccounts);
});

elements.adminAccountsPagination.addEventListener('click', (event) => {
  const button = event.target.closest('[data-account-page]');
  if (!button || button.disabled || button.getAttribute('aria-current') === 'page') return;
  adminAccountsPage = Number(button.dataset.accountPage);
  buildAdminAccounts(latestAdminAccounts);
  elements.adminAccountsScroll.scrollTop = 0;
});

elements.adminAccountsBody.addEventListener('click', (event) => {
  const trigger = event.target.closest('.admin-review-kebab');
  if (trigger) {
    toggleReviewMenu(trigger);
    return;
  }
  const actionButton = event.target.closest('[data-admin-action]');
  if (!actionButton) return;
  closeReviewMenus();
  applyAdminAccountAction(actionButton);
});

elements.libraryList.addEventListener('click', (event) => {
  const trigger = event.target.closest('.library-options');
  if (trigger) {
    toggleReviewMenu(trigger);
    return;
  }
  const reportButton = event.target.closest('[data-library-email][data-submission-id]');
  if (!reportButton) return;
  closeReviewMenus();
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

// Resolve the current ledger on activation, not stale HTML metadata. Titles
// and summaries use textContent; only HTTP(S) content links may be opened.
function openFruitDetail(target) {
  const slot = Number(target.dataset.fruitSlot);
  const view = getFruitView(state);
  const entry = [...view.tree, ...view.ground].find((fruit) => fruit.slot === slot);
  if (!entry) return;
  const submission = state.sharingSubmissions.find((item) => item.id === entry.submissionId);
  const dialog = document.querySelector('#fruitDetailDialog');
  document.querySelector('#fruitDetailTitle').textContent = submission?.title ?? `Buah slot ${slot}`;
  document.querySelector('#fruitDetailStatus').textContent = view.ground.some((fruit) => fruit.slot === slot)
    ? 'Basi · Konten perlu diperbarui agar buah dapat tumbuh kembali.'
    : 'Tervalidasi · Buah ini mewakili satu konten yang disetujui.';
  document.querySelector('#fruitDetailSummary').textContent = submission?.summary ?? 'Belum ada ringkasan konten.';
  const link = document.querySelector('#fruitDetailLink');
  link.removeAttribute('href');
  link.hidden = true;
  try {
    const url = new URL(submission?.url ?? '');
    if (['http:', 'https:'].includes(url.protocol)) {
      link.href = url.href;
      link.hidden = false;
    }
  } catch { /* A missing or invalid URL is not an actionable content link. */ }
  if (!dialog.open) dialog.showModal();
}
elements.treeCanvas.addEventListener('click', (event) => {
  const fruit = event.target.closest('[data-fruit-slot]');
  if (fruit) openFruitDetail(fruit);
});
elements.treeCanvas.addEventListener('keydown', (event) => {
  const fruit = event.target.closest('[data-fruit-slot]');
  if (fruit && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    openFruitDetail(fruit);
  }
});
document.querySelector('#fruitDetailClose').addEventListener('click', () => document.querySelector('#fruitDetailDialog').close());

let careAnimationTimer;
let wetSoilTimer;
function playCareAnimation(resourceType) {
  const effect = elements.careAnimation;
  const isWatering = resourceType === 'air';
  const particleClass = isWatering ? 'water-particle' : 'fertilizer-particle';
  const particleCount = isWatering ? 7 : 9;
  // Horizontal slot of each fertilizer grain, synced to the mascot flyby below.
  const fertilizerLefts = [14, 23, 32, 41, 50, 59, 68, 77, 86];
  const mascotFlybyMs = 6000;
  const fertilizerFallMs = 2000;
  effect.style.setProperty('--fertilizer-flyby-duration', `${mascotFlybyMs}ms`);
  effect.style.setProperty('--fertilizer-fall-duration', `${fertilizerFallMs}ms`);

  if (isWatering) {
    window.clearTimeout(wetSoilTimer);
    elements.treeScene.classList.remove('is-freshly-watered');
    void elements.treeScene.offsetWidth;
    elements.treeScene.classList.add('is-freshly-watered');
    wetSoilTimer = window.setTimeout(() => elements.treeScene.classList.remove('is-freshly-watered'), 2400);
  }

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
  }, isWatering ? 1500 : mascotFlybyMs + fertilizerFallMs + 200);
}

function careForTree(resourceType) {
  const result = applyCare(state, resourceType);
  const resourceName = { air: 'Air', fertilizer: 'Pupuk', fruit: 'Buah' }[resourceType];
  const action = { type: 'care', data: { resource: resourceType } };

  if (result.applied) {
    if (resourceType === 'fruit') {
      updateWith(result.state, '1 Buah dipindahkan dari Storage ke pohon — menggantung di slot kontennya. Progres dan perawatan tidak berubah.', 'success', { action });
      return;
    }

    const effect = result.progressApplied
      ? 'Progres dan perawatan pohon bertambah.'
      : 'Perawatan pulih; progres level sudah penuh.';
    updateWith(result.state, `Pohon menerima 1 ${resourceName} dari Storage. ${effect}`, 'success', { action });
    playCareAnimation(resourceType);
    return;
  }

  if (result.reason === 'progress-full') {
    updateWith(result.state, `Progres ${resourceName} sudah penuh. Saldo ${resourceName} tetap di Storage hingga progres pasangannya terpenuhi.`, 'notice', { action });
    return;
  }

  if (result.reason === 'tree-not-ready') {
    updateWith(result.state, 'Buah hanya dapat dipindahkan ke pohon yang sehat mulai Level 3. Buah tetap di Storage.', 'notice', { action });
    return;
  }

  updateWith(result.state, `Saldo ${resourceName} di Storage tidak cukup.`, 'notice', { action });
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
  const message = decayApplied
    ? `Simulasi +7 hari: progres ${progressChanges.length ? progressChanges.join(' · ') : 'sudah minimum'}; ${previousConditionLabel} → ${nextConditionLabel}. Storage dan level tetap.`
    : 'Simulasi maju 7 hari; decay belum diterapkan.';
  updateWith(nextState, message, 'notice', { action: { type: 'demo.advance' } });
});

elements.testYellowButton.addEventListener('click', () => {
  const nextState = simulateDemoTreeCondition(state, 'thirsty');
  updateWith(nextState, 'Uji demo: kondisi pohon menguning diterapkan.', 'notice', {
    action: { type: 'demo.condition', data: { condition: 'thirsty' } },
  });
});

elements.testDeadButton.addEventListener('click', () => {
  const nextState = simulateDemoTreeCondition(state, 'dead');
  updateWith(nextState, 'Uji demo: kondisi pohon mati diterapkan.', 'notice', {
    action: { type: 'demo.condition', data: { condition: 'dead' } },
  });
});

elements.boostButton.addEventListener('click', () => {
  const nextState = applyDemoBoost(state);
  updateWith(nextState, 'Boost demo: resource ditambahkan ke Storage; gunakan Air/Pupuk pada pohon untuk mengisi progres.', 'notice', { action: { type: 'demo.boost' } });
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
    { action: { type: 'demo.level-up' } },
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
    { action: { type: 'demo.level-down' } },
  );
});

elements.healthyButton.addEventListener('click', () => {
  const wasHealthy = getTreeCondition(state) === 'healthy';
  const nextState = simulateDemoTreeCondition(state, 'healthy');
  updateWith(
    nextState,
    wasHealthy ? 'Pohon sudah sehat; perawatan dipulihkan.' : 'Demo: pohon dipulihkan menjadi sehat.',
    'notice',
    { action: { type: 'demo.condition', data: { condition: 'healthy' } } },
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
    updateWith(nextState, message, 'notice', { action: { type: 'demo.resource', data: { resource: resourceType, amount } } });
  } catch (error) {
    showToast(error.message, 'notice');
  }
});

elements.resetButton.addEventListener('click', () => {
  const reset = window.confirm('Reset pohon dan seluruh riwayat demo?');
  if (!reset) return;

  updateWith(null, 'Pohon demo kembali ke Level 0.', 'notice', { action: { type: 'demo.reset' } });
});

async function initialize() {
  const loading = document.querySelector('#sessionLoading');
  const message = document.querySelector('#sessionLoadingMessage');
  const retry = document.querySelector('#sessionRetry');
  loading.hidden = false;
  loading.setAttribute('aria-busy', 'true');
  elements.authScreen.hidden = true;
  elements.appShell.hidden = true;
  message.textContent = 'Memuat kebun…';
  retry.hidden = true;
  // Keep the cookie server-owned; a network/DB failure is not a logout.
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const { account, treeState, settings, demoEnabled } = await apiMe({ signal: controller.signal });
    enterApp(account, treeState, false, settings, demoEnabled);
    loading.hidden = true;
  } catch (error) {
    if (error?.status === 401) {
      loading.hidden = true;
      elements.authScreen.hidden = false;
    } else {
      message.textContent = 'Kebun belum dapat dimuat. Periksa koneksi lalu coba lagi; sesi masukmu tidak dihapus.';
      retry.hidden = false;
    }
  } finally {
    window.clearTimeout(timeout);
    loading.setAttribute('aria-busy', 'false');
  }
}

document.querySelector('#sessionRetry').addEventListener('click', initialize);
initialize();
window.setInterval(() => {
  if (!currentAccount || !state) return;

  const previousCondition = getTreeCondition(state);
  const nextState = tickState(state);
  if (nextState.clockMs !== state.clockMs || getTreeCondition(nextState) !== previousCondition) {
    saveState();
  }
}, 60_000);
