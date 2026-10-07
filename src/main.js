import './styles.css';
import {
  loginAccount,
  logoutAccount,
  readSessionAccount,
  registerAccount,
  saveAccountTreeState,
} from './auth.js';
import {
  advanceDemoDays,
  addDemoResource,
  applyActivity,
  applyCare,
  applyDemoBoost,
  completeLearningModule,
  createInitialState,
  getNextLevelRequirement,
  getTreeCondition,
  rateLearningModule,
  reviewSharingMaterial,
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
  mobileMenuClose: document.querySelector('#mobileMenuClose'),
  mobileMenuBackdrop: document.querySelector('#mobileMenuBackdrop'),
  loginView: document.querySelector('#loginView'),
  registerView: document.querySelector('#registerView'),
  loginForm: document.querySelector('#loginForm'),
  registerForm: document.querySelector('#registerForm'),
  loginEmail: document.querySelector('#loginEmail'),
  authMessage: document.querySelector('#authMessage'),
  showRegisterButton: document.querySelector('#showRegisterButton'),
  showLoginButton: document.querySelector('#showLoginButton'),
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
  airValue: document.querySelector('#airValue'),
  pupukValue: document.querySelector('#pupukValue'),
  careAirBalance: document.querySelector('#careAirBalance'),
  carePupukBalance: document.querySelector('#carePupukBalance'),
  careFruitBalance: document.querySelector('#careFruitBalance'),
  careAirButton: document.querySelector('[data-tree-care-resource="air"]'),
  careFertilizerButton: document.querySelector('[data-tree-care-resource="fertilizer"]'),
  careFruitButton: document.querySelector('[data-tree-care-resource="fruit"]'),
  storageFruitValue: document.querySelector('#storageFruitValue'),
  storageButton: document.querySelector('#storageButton'),
  storageDialog: document.querySelector('#storageDialog'),
  storageDialogClose: document.querySelector('#storageDialogClose'),
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

const STAGE_SHORT_NAMES = ['Tanah', 'Bibit', 'Daun', 'Berbuah', 'Besar', 'Maksimum'];
const CONDITION_LABELS = {
  healthy: { title: 'Healthy', detail: 'Air dan Pupuk tersedia', className: 'is-healthy' },
  thirsty: { title: 'Thirsty · Menguning', detail: 'Air habis · pohon perlu dipulihkan', className: 'is-thirsty' },
  dead: { title: 'Mati · Merah', detail: 'Pupuk habis · pohon perlu dipulihkan', className: 'is-dead' },
};
const PAGE_LABELS = {
  tree: 'Pohon',
  learning: 'Learning',
  sharing: 'Sharing',
  history: 'Riwayat',
};

let currentAccount = null;
let state = null;
let activeLearningModule = null;
let sharingQueueRenderId = 0;
const sharingVideoObjectUrls = new Map();

function pageFromLocationHash() {
  const page = window.location.hash.slice(1);
  return Object.hasOwn(PAGE_LABELS, page) ? page : 'tree';
}

function navigateToPage(page, updateHistory = true) {
  if (!Object.hasOwn(PAGE_LABELS, page)) return;

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

  saveAccountTreeState(currentAccount.email, state);
  currentAccount.treeState = state;
}

function setAuthMessage(message, tone = 'notice') {
  elements.authMessage.textContent = message;
  elements.authMessage.className = `auth-message${message ? ` auth-message-${tone}` : ''}`;
}

function setAuthView(view, message = '', tone = 'notice') {
  const showLogin = view === 'login';
  elements.loginView.hidden = !showLogin;
  elements.registerView.hidden = showLogin;
  setAuthMessage(message, tone);
}

function enterApp(account, awardLogin = false) {
  currentAccount = account;
  state = tickState(account.treeState ?? createInitialState());
  let loginRewarded = false;
  if (awardLogin) {
    const airBeforeLogin = state.air;
    state = applyActivity(state, 'access');
    loginRewarded = state.air > airBeforeLogin;
  }
  elements.currentUserName.textContent = account.name;
  elements.userAvatar.textContent = account.name.trim().charAt(0).toLocaleUpperCase('id-ID');
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
  logoutAccount();
  currentAccount = null;
  state = null;
  if (elements.learningDialog.open) {
    elements.learningDialog.close();
  }
  if (elements.storageDialog.open) {
    elements.storageDialog.close();
  }
  activeLearningModule = null;
  elements.appShell.hidden = true;
  elements.authScreen.hidden = false;
  elements.loginForm.reset();
  setAuthView('login', message, 'success');
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

function makeTreeSvg(level, condition, fruits, animateGrowth = false) {
  const palettes = {
    healthy: { leaf: '#69b978', leafDark: '#38895b', leafLight: '#93d18d', trunk: '#9b7049', branch: '#916441' },
    thirsty: { leaf: '#d6bb55', leafDark: '#b89437', leafLight: '#ecd982', trunk: '#9b7049', branch: '#916441' },
    dead: { leaf: '#b49a5c', leafDark: '#8d7546', leafLight: '#d0b36f', trunk: '#805c49', branch: '#805c49' },
  };
  const colors = palettes[condition];
  const growthEntryClass = animateGrowth ? ' tree-entering' : '';
  const canopyByLevel = {
    2: [[200, 168, 28], [174, 187, 24], [226, 188, 23]],
    3: [[200, 145, 31], [169, 163, 27], [231, 162, 27], [183, 188, 27], [218, 190, 27], [151, 183, 19], [249, 183, 19]],
    4: [[200, 132, 34], [165, 151, 30], [235, 150, 30], [181, 173, 30], [219, 174, 30], [145, 178, 23], [255, 178, 23], [185, 205, 24], [218, 205, 24], [130, 202, 17], [270, 202, 17]],
    5: [[200, 118, 36], [162, 137, 32], [238, 136, 32], [180, 161, 33], [220, 162, 33], [143, 170, 26], [257, 170, 26], [180, 190, 29], [220, 191, 29], [126, 198, 20], [274, 198, 20], [160, 218, 23], [240, 218, 23], [198, 222, 27]],
  };

  if (level === 0) {
    return `<svg class="tree-svg stage-0 ${condition}${growthEntryClass}" viewBox="0 0 400 340" role="img" aria-label="Level 0, tanah kosong"><ellipse cx="200" cy="294" rx="97" ry="17" fill="#8ab781" opacity=".22"/><path d="M104 291c16-28 43-42 96-42s80 14 96 42c-20 15-53 22-96 22s-76-7-96-22Z" fill="#a77b58"/><path d="M123 288c23-17 48-25 77-25s54 8 77 25c-22 10-48 15-77 15s-55-5-77-15Z" fill="#bd9165"/><path d="M162 288c8-3 15-4 23-4m34 0c8 0 15 1 23 4" stroke="#d5ad79" stroke-width="3" stroke-linecap="round" opacity=".8"/></svg>`;
  }

  if (level === 1) {
    return `<svg class="tree-svg stage-1 ${condition}${growthEntryClass}" viewBox="0 0 400 340" role="img" aria-label="Level 1, bibit"><ellipse cx="200" cy="294" rx="90" ry="16" fill="#8ab781" opacity=".22"/><path d="M200 293c1-25 0-45 2-73" fill="none" stroke="${colors.trunk}" stroke-width="9" stroke-linecap="round"/><path class="seed-leaf" d="M201 244c-18-1-29-12-35-28 21 0 34 10 35 28Zm1-8c11-21 27-27 43-27-5 20-20 29-43 27Z" fill="${colors.leaf}"/><path d="M112 291c21-19 50-27 88-27s67 8 88 27c-25 12-55 18-88 18s-63-6-88-18Z" fill="#93bf78"/><path d="M140 289c16-7 35-10 60-10s44 3 60 10" stroke="#c2d798" stroke-width="4" stroke-linecap="round"/></svg>`;
  }

  const canopy = canopyByLevel[level] ?? canopyByLevel[2];
  const branchCount = level + 1;
  const branches = Array.from({ length: branchCount }, (_, index) => {
    const y = 246 - (index * 25);
    const length = 27 + (level * 3) - (index * 2);
    const side = index % 2 === 0 ? -1 : 1;
    const startX = 200 + (side * 4);
    const endX = 200 + (side * length);
    return `<path d="M${startX} ${y + 17} Q${200 + (side * 9)} ${y + 3} ${endX} ${y}" fill="none" stroke="${colors.branch}" stroke-width="${Math.max(4, 8 - index)}" stroke-linecap="round"/>`;
  }).join('');

  const trunk = `<path d="M194 294c5-40 0-75 8-111 5-24 5-43 1-61m-4 83c-13-18-24-33-40-47m44 24c15-18 30-29 45-40m-50 76c-18-15-34-23-51-29m49 10c16-13 30-19 45-23" fill="none" stroke="${colors.trunk}" stroke-width="${level >= 4 ? 17 : 14}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const visibleCanopy = condition === 'dead' ? canopy.filter((_, index) => index % 4 !== 3) : canopy;
  const canopyMarkup = visibleCanopy.map(([cx, cy, radius], index) => `<circle class="leaf-cluster cluster-${index % 3}" cx="${cx}" cy="${cy}" r="${radius}" fill="${index % 3 === 0 ? colors.leaf : (index % 3 === 1 ? colors.leafDark : colors.leafLight)}"/>`).join('');
  const fruitPositions = [[178, 162], [223, 150], [154, 188], [242, 190], [196, 207], [211, 122], [171, 126]];
  const fruitCount = Math.max(0, Math.floor(Number(fruits) || 0));
  const visibleFruit = Math.min(fruitCount, MAX_VISIBLE_FRUIT);
  const fruitMarkup = fruitPositions.slice(0, visibleFruit).map(([x, y], index) => `<g class="tree-fruit" style="--fruit-index:${index}"><circle cx="${x}" cy="${y}" r="9" fill="#f2a64b"/><path d="M${x} ${y - 8}q2-8 8-7" fill="none" stroke="#4a9962" stroke-width="3" stroke-linecap="round"/><circle cx="${x - 3}" cy="${y - 3}" r="2.2" fill="#ffd382"/></g>`).join('');
  const fallingLeaves = condition === 'dead'
    ? '<ellipse class="falling-leaf fall-one" cx="134" cy="223" rx="7" ry="3" fill="#ca8d5d"/><ellipse class="falling-leaf fall-two" cx="263" cy="246" rx="7" ry="3" fill="#ca8d5d"/><ellipse class="falling-leaf fall-three" cx="156" cy="257" rx="6" ry="3" fill="#d7a66b"/>'
    : '';
  const fruitCounter = fruitCount > MAX_VISIBLE_FRUIT ? `<text x="286" y="149" class="extra-fruit-label">+${fruitCount - MAX_VISIBLE_FRUIT}</text>` : '';

  return `<svg class="tree-svg stage-${level} ${condition}${growthEntryClass}" viewBox="0 0 400 340" role="img" aria-label="Pohon Level ${level}, kondisi ${condition}, ${fruitCount} Buah di pohon"><ellipse cx="200" cy="294" rx="96" ry="17" fill="#8ab781" opacity=".22"/><path d="M110 291c25-19 53-27 90-27s65 8 90 27c-24 13-54 19-90 19s-66-6-90-19Z" fill="#94bf7b"/><path d="M131 290c19-8 42-12 69-12s50 4 69 12" fill="none" stroke="#c6d99b" stroke-width="4" stroke-linecap="round"/>${branches}${trunk}<g class="canopy">${canopyMarkup}</g>${fruitMarkup}${fallingLeaves}${fruitCounter}</svg>`;
}

function renderStageTrack() {
  elements.stageTrack.replaceChildren();

  STAGES.forEach((stageName, index) => {
    const stage = document.createElement('div');
    stage.className = `stage-step${index < state.level ? ' is-reached' : ''}${index === state.level ? ' is-current' : ''}`;
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
  elements.airValue.textContent = String(state.air);
  elements.pupukValue.textContent = formatPupuk(state.fertilizerUnits);
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
  elements.storageFruitValue.textContent = String(state.fruitsInStorage);
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

  const statusLabels = {
    pending: 'Menunggu validasi',
    validated: 'Tervalidasi · reward diberikan',
    rejected: 'Ditolak · tanpa reward',
    duplicate: 'Duplikat · tanpa reward',
  };

  state.sharingSubmissions.slice(0, 5).forEach((submission) => {
    const item = makeElement('article', `sharing-item status-${submission.status}`);
    const header = makeElement('div', 'sharing-item-header');
    const heading = makeElement('h5', '', submission.title);
    const status = makeElement('span', 'sharing-status-badge', statusLabels[submission.status] ?? submission.status);
    header.append(heading, status);

    const typeLabels = {
      video: 'Video',
      article: 'Artikel',
      document: 'Dokumen / panduan',
      podcast: 'Podcast',
      link: 'Tautan lainnya',
    };
    const meta = makeElement('div', 'sharing-item-meta', `${typeLabels[submission.type] ?? submission.type} · dikirim ${formatDate(submission.submittedAt)}`);
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

    if (submission.status === 'pending') {
      const reviewActions = makeElement('div', 'sharing-review-actions');
      reviewActions.append(makeReviewButton(submission.id, 'validated', 'Validasi'));
      reviewActions.append(makeReviewButton(submission.id, 'rejected', 'Tolak'));
      reviewActions.append(makeReviewButton(submission.id, 'duplicate', 'Tandai duplikat'));
      item.append(reviewActions);
    }

    elements.sharingQueue.append(item);
  });

  state.sharingSubmissions.slice(0, 5).forEach((submission) => {
    if (submission.attachment?.name) {
      void restoreSharingVideoPreview(submission, renderId);
    }
  });
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

function makeReviewButton(submissionId, action, label) {
  const button = makeElement('button', `sharing-review-button review-${action}`, label);
  button.type = 'button';
  button.dataset.sharingReview = action;
  button.dataset.submissionId = submissionId;
  return button;
}

function renderActivities() {
  renderLearningCatalog();
  renderSharingQueue();
}

function renderTree(animate = false, previousLevel = state.level, previousCondition = getTreeCondition(state)) {
  const condition = getTreeCondition(state);
  const conditionInfo = CONDITION_LABELS[condition];
  const sceneClass = conditionInfo.className;
  const levelChanged = previousLevel !== state.level;
  const conditionChanged = previousCondition !== condition;

  const levelValue = String(state.level);
  const fruitValue = String(state.fruitsOnTree);
  const visualChanged = elements.treeCanvas.dataset.level !== levelValue
    || elements.treeCanvas.dataset.condition !== condition
    || elements.treeCanvas.dataset.fruits !== fruitValue;

  if (visualChanged) {
    elements.treeCanvas.innerHTML = makeTreeSvg(state.level, condition, state.fruitsOnTree, animate && levelChanged);
    elements.treeCanvas.dataset.level = levelValue;
    elements.treeCanvas.dataset.condition = condition;
    elements.treeCanvas.dataset.fruits = fruitValue;
  }
  elements.treeCanvas.setAttribute('aria-label', `Pohon Level ${state.level}, ${STAGES[state.level]}, ${state.fruitsOnTree} Buah di pohon, kondisi ${conditionInfo.title}`);
  elements.treePanel.classList.remove('is-healthy', 'is-thirsty', 'is-dead');
  elements.treePanel.classList.add(sceneClass);
  elements.treeScene.classList.toggle('is-advanced-stage', state.level >= 4 && condition === 'healthy');
  elements.condition.className = `scene-condition ${sceneClass}`;
  elements.conditionLabel.textContent = conditionInfo.title;
  elements.levelValue.textContent = String(state.level);
  renderStageTrack();

  if (!animate) {
    elements.treeArt.classList.remove('tree-growing', 'tree-state-change');
  }

  if (animate && visualChanged && (levelChanged || conditionChanged)) {
    elements.treeArt.classList.remove('tree-growing', 'tree-state-change');
    void elements.treeArt.offsetWidth;
    elements.treeArt.classList.add(levelChanged ? 'tree-growing' : 'tree-state-change');
    window.setTimeout(() => elements.treeArt.classList.remove('tree-growing', 'tree-state-change'), 850);
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

elements.showRegisterButton.addEventListener('click', () => {
  setAuthView('register');
});

elements.showLoginButton.addEventListener('click', () => {
  setAuthView('login');
});

elements.registerForm.addEventListener('submit', async (event) => {
  if (event.type === 'keydown') {
    event.preventDefault();
  }
  const formData = new FormData(elements.registerForm);
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const passwordConfirm = String(formData.get('passwordConfirm'));

  if (password !== passwordConfirm) {
    setAuthMessage('Ulangi kata sandi dengan benar.', 'error');
    return;
  }

  try {
    const account = await registerAccount({
      name: String(formData.get('name')),
      email,
      password,
    });
    elements.registerForm.reset();
    elements.loginEmail.value = account.email;
    setAuthView('login', 'Akun demo berhasil dibuat. Silakan masuk untuk mulai bermain.', 'success');
  } catch (error) {
    setAuthMessage(error.message, 'error');
  }
});

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.loginForm);

  try {
    const account = await loginAccount({
      email: String(formData.get('email')),
      password: String(formData.get('password')),
    });
    elements.loginForm.reset();
    enterApp(account, true);
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

elements.storageButton.addEventListener('click', () => elements.storageDialog.showModal());
elements.storageDialogClose.addEventListener('click', () => elements.storageDialog.close());
elements.storageDialog.addEventListener('click', (event) => {
  if (event.target === elements.storageDialog) {
    elements.storageDialog.close();
  }
});
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

elements.sharingQueue.addEventListener('click', (event) => {
  const reviewButton = event.target.closest('[data-sharing-review]');
  if (!reviewButton) return;

  const validation = reviewButton.dataset.sharingReview;
  const result = reviewSharingMaterial(state, reviewButton.dataset.submissionId, validation);
  if (!result.applied) {
    showToast('Materi ini sudah pernah divalidasi.', 'notice');
    return;
  }

  const messages = {
    validated: 'Sharing tervalidasi: +3 Air dan +2 Pupuk masuk Storage; +1 Buah disimpan atau ditampilkan sesuai kondisi pohon.',
    rejected: 'Sharing ditolak. Tidak ada reward yang diberikan.',
    duplicate: 'Sharing ditandai duplikat. Tidak ada reward yang diberikan.',
  };
  updateWith(result.state, messages[validation], validation === 'validated' ? 'success' : 'notice');
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

  window.clearTimeout(careAnimationTimer);
  effect.className = 'care-animation';
  effect.replaceChildren();

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement('span');
    particle.className = `care-particle ${particleClass}`;
    particle.style.setProperty('--particle-index', String(index));
    effect.append(particle);
  }

  if (!isWatering) {
    const shovel = document.createElement('span');
    shovel.className = 'care-shovel';
    shovel.setAttribute('aria-hidden', 'true');
    shovel.innerHTML = '<svg viewBox="0 0 72 108" focusable="false"><path class="shovel-handle" d="M47 14 30 76"/><path class="shovel-grip" d="M41 15q2-10 13-9"/><path class="shovel-blade" d="M25 68c-8 10-14 22-13 32 10 7 25 7 37-1-2-12-7-23-14-32Z"/><path class="shovel-edge" d="M15 97q17 8 33-1"/></svg>';
    effect.append(shovel);
  }

  void effect.offsetWidth;
  effect.classList.add(isWatering ? 'is-watering' : 'is-fertilizing');
  careAnimationTimer = window.setTimeout(() => {
    effect.className = 'care-animation';
    effect.replaceChildren();
  }, 1500);
}

function careForTree(resourceType) {
  const result = applyCare(state, resourceType);
  const resourceName = { air: 'Air', fertilizer: 'Pupuk', fruit: 'Buah' }[resourceType];

  if (result.applied) {
    if (resourceType === 'fruit') {
      updateWith(result.state, '1 Buah dipindahkan dari Storage ke pohon. Progres dan perawatan tidak berubah.', 'success', { animateTree: false });
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
  const account = readSessionAccount();
  if (account) {
    enterApp(account);
    return;
  }

  setAuthView('login');
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
