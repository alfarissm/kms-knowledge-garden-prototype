import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('function makeElement('), source.indexOf('\nfunction makeSvgIcon('));
const builder = source.slice(source.indexOf('function buildAdminAccounts('), source.indexOf('\nasync function applyAdminAccountAction('));

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.classList = { add: (name) => { this.className = `${this.className ?? ''} ${name}`.trim(); } };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this.attributes[key] = value; }
  set textContent(value) { this.children = [String(value)]; }
  get textContent() { return this.children.map((child) => typeof child === 'string' ? child : child.textContent).join(''); }
}

function setup(query = '') {
  const elements = { adminAccountsBody: new Element('tbody'), adminAccountSearch: { value: query }, adminAccountCount: new Element('p'), adminAccountsPagination: new Element('nav') };
  const build = new Function('document', 'elements', 'currentAccount', 'closeReviewMenus', `
    const ADMIN_ACCOUNTS_PAGE_SIZE = 12; let adminAccountsPage = 1;
    const TREE_CONDITION_LABELS = { healthy: 'Sehat' };
    const STAGE_SHORT_NAMES = ['Tanah', 'Bibit'];
    const getTreeCondition = () => 'healthy';
    const formatRelativeNumber = (n) => String(n ?? 0);
    const formatPupukUnits = (n) => String((n ?? 0) / 2);
    const formatRelative = () => 'baru saja'; const formatDate = () => 'tanggal';
    const renderTablePagination = () => {};
    ${helper}\n${builder}\nreturn buildAdminAccounts;
  `)({ createElement: (tag) => new Element(tag) }, elements, { email: 'admin@example.com' }, vi.fn());
  return { build, elements };
}
const accounts = [
  { id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin', treeState: { level: 0 } },
  { id: 2, name: 'Nadia', email: 'nadia@example.com', role: 'user', treeState: { level: 1, sharingSubmissions: [{ status: 'validated', reports: [{ by: 'reporter@example.com' }] }] } },
];

it('keeps all seven account columns labelled for the mobile card layout', () => {
  const { build, elements } = setup();
  build(accounts);
  expect(elements.adminAccountsBody.children[0].children.map((cell) => cell.dataset.label))
    .toEqual(['Akun', 'Pohon', 'Storage', 'Buah', 'Konten', 'Aktivitas terakhir', 'Kelola']);
});

it('keeps account actions in an accessible menu and excludes self-deletion', () => {
  const { build, elements } = setup();
  build(accounts);
  const selfWrap = elements.adminAccountsBody.children[0].children[6].children[0];
  const otherWrap = elements.adminAccountsBody.children[1].children[6].children[0];
  expect(selfWrap.children[0].attributes['aria-haspopup']).toBe('menu');
  expect(selfWrap.children[1].attributes.popover).toBe('manual');
  expect(selfWrap.children[1].children.map((button) => button.dataset.adminAction)).toEqual(['reset', 'role']);
  expect(otherWrap.children[1].children.map((button) => button.dataset.adminAction)).toEqual(['reset', 'role', 'delete']);
  expect(otherWrap.children[1].children.every((button) => button.dataset.userId === '2' && button.attributes.role === 'menuitem')).toBe(true);
});

it('preserves search results and nests report badges below the account identity', () => {
  const { build, elements } = setup('NADIA');
  build(accounts);
  expect(elements.adminAccountsBody.children).toHaveLength(1);
  expect(elements.adminAccountCount.textContent).toContain('1 dari 2 akun ditemukan');
  const info = elements.adminAccountsBody.children[0].children[0].children[0].children[1];
  expect(info.children[1].textContent).toBe('nadia@example.com');
  expect(info.children[2].className).toBe('admin-report-badge');
  expect(info.children[2].textContent).toBe('1 laporan diterima');
});
