import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const helpers = source.slice(source.indexOf('function makeElement('), source.indexOf('\nfunction makeSvgIcon('));
const renderer = source.slice(source.indexOf('function buildLearnAdmin('), source.indexOf('\nfunction openLearningAdminDialog('));

// Small DOM stand-in with the same textContent string coercion that exposed
// this regression; no server, real user data or third-party DOM dependency.
class Element {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.dataset = {}; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  set textContent(value) { this.children = [String(value)]; }
  get textContent() { return this.children.map((child) => typeof child === 'string' ? child : child.textContent).join(''); }
  toString() { return '[object HTMLElement]'; }
}

it('renders module title and ID as child elements instead of stringifying DOM objects', () => {
  const body = new Element('tbody');
  const modules = [{ id: 'learn-1', title: 'Berbagi pengetahuan', category: 'Panduan', active: true }];
  const build = new Function('document', 'elements', 'learningModules', 'computeLearningAdminStats', `${helpers}\n${renderer}\nreturn buildLearnAdmin;`)(
    { createElement: (tag) => new Element(tag) }, { learnAdminBody: body }, modules, () => new Map(),
  );
  build([]);
  const titleLine = body.children[0].children[0].children[0];
  const info = titleLine.children[1];
  expect(info.className).toBe('admin-account-info');
  expect(info.children.map((node) => node.tagName)).toEqual(['strong', 'small']);
  expect(info.children[0].textContent).toBe('Berbagi pengetahuan');
  expect(info.children[1].textContent).toBe('learn-1');
  expect(body.textContent).not.toContain('[object HTMLElement]');
  expect(body.children[0].children[5].children.map((button) => button.dataset.learnAction)).toEqual(['edit', 'toggle', 'delete']);
});
