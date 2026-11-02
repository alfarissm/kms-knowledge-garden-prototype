import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('function makeElement('), source.indexOf('\nfunction makeSvgIcon('));
const menuHelpers = source.slice(source.indexOf('function makeAdminConditionButton('), source.indexOf('\nfunction closeReviewMenus('));
const builder = source.slice(source.indexOf('function buildAdminReview('), source.indexOf('\nasync function applyAdminCondition('));

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.disabled = false;
    this.className = '';
    this.classList = { add: (name) => { this.className = `${this.className} ${name}`.trim(); } };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this.attributes[key] = value; }
  set textContent(value) { this.children = [String(value)]; }
  get textContent() { return this.children.map((child) => typeof child === 'string' ? child : child.textContent).join(''); }
  get disabled() { return this.#disabled; }
  set disabled(value) { this.#disabled = Boolean(value); }
  #disabled = false;
}

function setup(filter = 'all') {
  const tbody = new Element('tbody');
  const elements = { adminReviewList: tbody, adminSummary: new Element('div') };
  const build = new Function('document', 'elements', `
    const ADMIN_FILTERS = [
      { key: 'all', label: 'Semua' },
      { key: 'pending', label: 'Menunggu' },
      { key: 'validated', label: 'Relevan' },
      { key: 'stale', label: 'Basi' },
      { key: 'rejected', label: 'Tidak relevan' },
      { key: 'duplicate', label: 'Duplikat' },
    ];
    const SHARING_STATUS_INFO = { pending: { label: 'Menunggu' }, validated: { label: 'Relevan' }, stale: { label: 'Basi' }, rejected: { label: 'Tidak relevan' }, duplicate: { label: 'Duplikat' } };
    const SHARING_TYPE_LABELS = { video: 'Video', article: 'Artikel' };
    const SHARING_REPORT_REASONS = { duplicate: 'Duplikat', other: 'Lainnya' };
    const formatDate = () => '29 Okt 2026';
    let adminReviewFilter = ${JSON.stringify(filter)};
    function closeReviewMenus() {}
    ${helper}\n${menuHelpers}\n${builder}\nreturn buildAdminReview;
  `)({ createElement: (tag) => new Element(tag) }, elements);
  return { build, tbody, summary: elements.adminSummary };
}

const accounts = [
  {
    id: 2,
    name: 'Nadia Putri',
    email: 'nadia@example.com',
    treeState: {
      sharingSubmissions: [
        { id: 's1', status: 'pending', title: 'Menanam bibit apel', type: 'video', submittedAt: 1, summary: 'ringkasan', url: 'https://youtu.be/demo', reports: [{ reason: 'duplicate', by: 'budi@example.com', at: 9 }, { reason: 'other', note: 'isinya ganda', by: 'citra@example.com', at: 10 }] },
        { id: 's2', status: 'validated', title: 'Pendek', type: 'article', submittedAt: 2, summary: 'singkat', reports: [] },
      ],
    },
  },
];

it('renders every submission as a five-column review row', () => {
  const { build, tbody } = setup();
  build(accounts);
  expect(tbody.children).toHaveLength(2);
  const labels = tbody.children[0].children.map((cell) => cell.dataset.label);
  expect(labels).toEqual(['Konten', 'Pemilik', 'Status', 'Dikirim', 'Keputusan']);
});

it('shows content identity, link, and report details in the content cell', () => {
  const { build, tbody } = setup();
  build(accounts);
  const content = tbody.children[0].children[0];
  expect(content.children.map((child) => child.className)).toEqual(['admin-review-title', 'sharing-item-meta', 'admin-review-summary', 'sharing-material-link', 'admin-report-details']);
  expect(content.children[0].textContent).toBe('Menanam bibit apel');
  expect(content.children[1].textContent).toBe('Video · Tautan');
  const link = content.children[3];
  expect(link.children.join('')).toBe('https://youtu.be/demo');
  expect(link.rel).toBe('noreferrer');
  const details = content.children[4];
  expect(details.children[0].textContent).toBe('Lihat 2 alasan laporan');
});

it('keeps report reasons retrievable inside the details block', () => {
  const { build, tbody } = setup();
  build(accounts);
  const entries = tbody.children[0].children[0].children[4].children.slice(1);
  expect(entries[0].children[0].textContent).toBe('Duplikat');
  expect(entries[0].children[1].textContent).toBe('budi@example.com · 29 Okt 2026');
  expect(entries[1].children[2].textContent).toBe('isinya ganda');
});

it('mirrors the account table owner cell with avatar, name, and email', () => {
  const { build, tbody } = setup();
  build(accounts);
  const ownerLine = tbody.children[0].children[1].children[0];
  expect(ownerLine.className).toBe('admin-account-line');
  expect(ownerLine.children[0].className).toBe('admin-account-avatar');
  expect(ownerLine.children[0].textContent).toBe('N');
  expect(ownerLine.children[1].children[0].textContent).toBe('Nadia Putri');
  expect(ownerLine.children[1].children[1].textContent).toBe('nadia@example.com');
});

it('marks status with a colored chip plus report badge, or none', () => {
  const { build, tbody } = setup();
  build(accounts);
  const open = tbody.children[0].children[2];
  expect(open.children[0].className).toContain('admin-condition-chip is-pending');
  expect(open.children[1].textContent).toBe('2 laporan');
  expect(tbody.children[1].children[2].children[0].className).toContain('is-validated');
  expect(tbody.children[1].children[2].children).toHaveLength(1);
});

it('exposes ACC, delete, and the Putuskan menu with per-submission payloads', () => {
  const { build, tbody } = setup();
  build(accounts);
  const actions = tbody.children[0].children[4].children[0];
  const [acc, del, menuWrapper] = actions.children;
  expect(acc.textContent).toBe('ACC');
  expect(acc.dataset.adminCondition).toBe('validated');
  expect(acc.dataset.submissionId).toBe('s1');
  expect(del.dataset.adminDeleteContent).toBe('s1');
  expect(del.attributes['aria-label']).toContain('Hapus');
  expect(menuWrapper.className).toBe('admin-review-kebab-wrap');
  const trigger = menuWrapper.children[0];
  expect(trigger.textContent).toContain('Putuskan');
  expect(trigger.attributes['aria-haspopup']).toBe('menu');
  expect(trigger.attributes['aria-expanded']).toBe('false');
  const menu = menuWrapper.children[1];
  expect(menu.attributes.popover).toBe('manual');
  expect(menu.children.map((button) => button.textContent)).toEqual(['Tandai Basi', 'Tidak Relevan', 'Duplikat']);
  expect(menu.children.every((button) => button.textContent ? button.attributes.role === 'menuitem' : false && button.dataset.submissionId === 's1' && button.dataset.adminEmail === 'nadia@example.com')).toBe(true);
  expect(menu.children.every((button) => button.dataset.submissionId === 's1' && button.dataset.adminEmail === 'nadia@example.com')).toBe(true);
});

it('disables ACC on already validated content while menu options stay', () => {
  const { build, tbody } = setup('validated');
  build(accounts);
  const acc = tbody.children[0].children[4].children[0].children[0];
  expect(acc.disabled).toBe(true);
  const menuItems = tbody.children[0].children[4].children[0].children[2].children[1].children;
  expect(menuItems.map((button) => button.textContent)).toEqual(['Tandai Basi', 'Tidak Relevan', 'Duplikat']);
});

it('renders an empty state row spanning all five columns', () => {
  const { build, tbody } = setup();
  build([]) ;
  expect(tbody.children).toHaveLength(1);
  const [row] = tbody.children;
  expect(row.className).toBe('admin-review-empty-row');
  const cell = row.children[0];
  expect(cell.tagName).toBe('td');
  expect(cell.colSpan).toBe(5);
  expect(cell.textContent).toContain('Belum ada konten Sharing');
});
