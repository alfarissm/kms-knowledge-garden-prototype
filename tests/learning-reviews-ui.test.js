import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('function makeElement('), source.indexOf('\nfunction makeSvgIcon('));
const builder = source.slice(source.indexOf('function buildLearningReviews('), source.indexOf('\nasync function loadLearningReviews('));

class Element {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.attributes = {}; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  setAttribute(key, value) { this.attributes[key] = value; }
  set textContent(value) { this.children = [String(value)]; }
  get textContent() { return this.children.map((item) => typeof item === 'string' ? item : item.textContent).join(''); }
  set innerHTML(value) { throw new Error('Review content must be rendered as text, not HTML.'); }
}

function setup() {
  const list = new Element('ul');
  const build = new Function('document', `${helper}\n${builder}\nreturn buildLearningReviews;`)({
    createElement: (tag) => new Element(tag), querySelector: () => list,
  });
  return { list, build };
}

it('shows each account name, stars, and comment and identifies your own review', () => {
  const { list, build } = setup();
  build([{ name: 'Raka', rating: 4, comment: 'Materi membantu.', isOwn: true }]);
  const item = list.children[0];
  expect(item.children[0].children[1].children[0].textContent).toBe('Raka');
  expect(item.children[0].children[1].children[1].textContent).toBe('Anda');
  expect(item.children[1].attributes['aria-label']).toBe('4 dari 5 bintang');
  expect(item.children[1].children.filter((star) => star.className === 'is-filled')).toHaveLength(4);
  expect(item.children[2].textContent).toBe('Materi membantu.');
});

it('renders names and comments as text even if they contain markup', () => {
  const { list, build } = setup();
  const name = '<img src=x onerror=alert(1)>';
  const comment = '<script>alert(1)</script>';
  build([{ name, rating: 5, comment, isOwn: false }]);
  expect(list.children[0].children[0].children[1].children[0].textContent).toBe(name);
  expect(list.children[0].children[2].textContent).toBe(comment);
});

it('labels legacy ratings without inventing comments and handles an empty list', () => {
  const { list, build } = setup();
  build([{ name: 'Nadia', rating: 3, comment: '', isOwn: false }]);
  expect(list.children[0].children[2].textContent).toBe('Belum ada komentar (rating lama).');
  build([]);
  expect(list.children).toHaveLength(1);
  expect(list.textContent).toBe('Belum ada ulasan untuk materi ini.');
});
