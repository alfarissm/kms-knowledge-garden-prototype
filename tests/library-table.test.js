import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('function makeElement('), source.indexOf('\nfunction makeSvgIcon('));
const builder = source.slice(source.indexOf('function buildLibrary('), source.indexOf('\nfunction applyLibraryReport('));

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
}

function setup(viewerEmail) {
  const tbody = new Element('tbody');
  const elements = { libraryList: tbody, libraryCount: new Element('span') };
  const build = new Function('document', 'elements', 'currentAccount', `
    const SHARING_TYPE_LABELS = { video: 'Video', article: 'Artikel' };
    const formatDate = () => '2 Nov 2026 08.47';
    function closeReviewMenus() {}
    ${helper}\n${builder}\nreturn buildLibrary;
  `)({ createElement: (tag) => new Element(tag) }, elements, viewerEmail ? { email: viewerEmail } : null);
  return { build, tbody, count: elements.libraryCount };
}

const rows = [
  { account: { name: 'Raka', email: 'raka@example.com' }, submission: { id: 'l1', status: 'validated', title: 'belajar problem solving', type: 'video', submittedAt: 1, reviewedAt: 2, summary: 'blablablabla', url: 'https://youtu.be/x', reports: [{ by: 'budi@example.com' }] } },
  { account: { name: 'Budi', email: 'budi@example.com' }, submission: { id: 'l2', status: 'validated', title: 'materi lampiran', type: 'article', submittedAt: 3, summary: 'ringkas', attachment: { name: 'materi.pdf' } } },
];

it('renders the library as five labeled columns', () => {
  const { build, tbody, count } = setup('nadia@example.com');
  build(rows);
  expect(count.textContent).toBe('2');
  const labels = tbody.children[0].children.map((cell) => cell.dataset.label);
  expect(labels).toEqual(['Konten', 'Pemilik', 'Status', 'Dikirim', 'Tindakan']);
});

it('prioritises learning with an open action before the report option', () => {
  const { build, tbody } = setup('nadia@example.com');
  build(rows);
  const actions = tbody.children[0].children[4].children[0].children;
  const open = actions[0];
  expect(open.textContent).toBe('Buka konten');
  expect(open.href).toBe('https://youtu.be/x');
  const wrap = actions[1];
  const trigger = wrap.children[0];
  expect(trigger.textContent).toContain('Opsi');
  const menu = wrap.children[1];
  expect(menu.attributes.popover).toBe('manual');
  const item = menu.children[0];
  expect(item.textContent).toBe('Laporkan konten');
  expect(item.dataset.submissionId).toBe('l1');
  expect(item.dataset.libraryEmail).toBe('raka@example.com');
  expect(item.attributes.role).toBe('menuitem');
});

it('blocks reporting your own content with a plain note', () => {
  const { build, tbody } = setup('raka@example.com');
  build(rows);
  const actions = tbody.children[0].children[4].children[0].children;
  expect(actions[1].className).toBe('library-own-note');
  expect(actions[1].textContent).toBe('Konten milikmu');
});

it('shows an attachment instead of an open link when there is no url', () => {
  const { build, tbody } = setup('nadia@example.com');
  build(rows);
  const secondContent = tbody.children[1].children[0];
  expect(secondContent.children[0].textContent).toBe('materi lampiran');
  expect(secondContent.children[1].textContent).toBe('Artikel');
  expect(secondContent.children[2].textContent).toBe('ringkas');
  const actions = tbody.children[1].children[4].children[0].children;
  expect(actions[0].textContent).toBe('materi.pdf');
  expect(actions[1].textContent).toContain('Opsi');
});

it('shows the already reported state without a menu item', () => {
  const { build, tbody } = setup('budi@example.com');
  build(rows);
  const actions = tbody.children[0].children[4].children[0].children;
  const trigger = actions[1].children[0];
  expect(trigger.textContent).toContain('Sudah dilaporkan');
  const menu = actions[1].children[1];
  expect(menu.children[0].className).toBe('admin-menu-note');
  expect(menu.children[0].textContent).toBe('Sudah kamu laporkan');
});

it('shows a logged-out hint in the report menu', () => {
  const { build, tbody } = setup(null);
  build(rows);
  const menu = tbody.children[0].children[4].children[0].children[1].children[1];
  expect(menu.children[0].textContent).toBe('Masuk untuk melaporkan');
});

it('collapses to an empty state row that spans all five columns', () => {
  const { build, tbody } = setup('nadia@example.com');
  build([]);
  expect(tbody.children[0].className).toBe('admin-review-empty-row');
  expect(tbody.children[0].children[0].colSpan).toBe(5);
  expect(tbody.children[0].children[0].textContent).toContain('Belum ada konten relevan');
});
