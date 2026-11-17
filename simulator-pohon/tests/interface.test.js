import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('only one action category is initially open',()=>{
  assert.equal((html.match(/data-control-tab=/g)||[]).length,3);
  assert.match(html,/id="actions-care"[^>]*aria-labelledby="control-care">/);
  for(const id of ['reward','content']) assert.match(html,new RegExp(`id="actions-${id}"[^>]*hidden>`));
});
test('rules and history are initially collapsed instead of filling the page',()=>{
  for(const id of ['demoDisclosure','rulesDisclosure','historyDisclosure']) {
    const tag=html.match(new RegExp(`<details[^>]*id="${id}"[^>]*>`))?.[0];
    assert.ok(tag);assert.doesNotMatch(tag,/\bopen\b/);
  }
});
test('user and admin views are explicit and decisions are hidden in the user view',()=>{
  assert.match(html,/data-view-role="user" aria-pressed="true"/);
  assert.match(html,/data-view-role="admin" aria-pressed="false"/);
  assert.match(html,/id="adminDecisions" hidden/);
  assert.equal((html.match(/data-flow-step=/g)||[]).length,4);
});
test('all actions remain present once without input forms',()=>{
  const actions=[...html.matchAll(/data-action="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(actions.length,21);assert.equal(new Set(actions).size,21);
  assert.doesNotMatch(html,/<(?:input|select|textarea|form)\b/);
});
test('single-resource demo buttons are separate from normal activities',()=>{
  const demo=html.split('id="actions-demo"')[1].split('</section>')[0];
  for(const [action,label] of [['add-air','+1 Air'],['add-fertilizer','+1 Pupuk']]) {
    const button=demo.match(new RegExp(`<button[^>]+data-action="${action}"[\\s\\S]*?</button>`))?.[0];
    assert.ok(button);
    assert.ok(button.includes(`<strong>${label}</strong>`));
    assert.match(button,/Ke Storage · demo/);
    assert.ok(!html.split('id="demoDisclosure"')[0].includes(`data-action="${action}"`));
  }
});
test('field theme is loaded after the responsive layout',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.ok(main.indexOf("import './field-theme.css'")>main.indexOf("import './compact-layout.css'"));
  const theme=readFileSync(new URL('../src/field-theme.css',import.meta.url),'utf8');
  assert.match(theme,/--blue: #2459e0/);
  assert.match(theme,/--leaf: #397846/);
  assert.match(theme,/@media \(max-width: 760px\)/);
  assert.match(theme,/:focus-visible/);
});
test('care icons are decorative and action labels stay visible',()=>{
  for(const action of ['care-air','care-fertilizer','care-fruit']) {
    const button=html.match(new RegExp(`<button[^>]+data-action="${action}"[\\s\\S]*?</button>`))?.[0];
    assert.ok(button);
    assert.match(button,/<svg[^>]+aria-hidden="true"/);
    assert.match(button,/<strong>[^<]+<\/strong>/);
  }
});
test('simulator fonts do not depend on a third-party request',()=>{
  for(const name of ['styles.css','compact-layout.css','field-theme.css']) {
    const css=readFileSync(new URL(`../src/${name}`,import.meta.url),'utf8');
    assert.doesNotMatch(css,/@import\s+url\(['"]?https?:/);
  }
});
test('panels and resource totals do not use decorative accent stripes',()=>{
  const theme=readFileSync(new URL('../src/field-theme.css',import.meta.url),'utf8');
  assert.match(theme,/\.storage-item::before\s*\{\s*content: none;/);
  assert.doesNotMatch(theme,/border-(?:top|left):\s*[3-9]px solid/);
  assert.doesNotMatch(theme,/\.controls-panel\s*\{[^}]*border-top-color/);
});
test('Poppins is self-hosted in all four UI weights',()=>{
  const theme=readFileSync(new URL('../src/field-theme.css',import.meta.url),'utf8');
  for(const weight of [400,500,600,700]) {
    assert.match(theme,new RegExp(`font-weight: ${weight};[^}]*poppins-latin-${weight}\\.woff2`));
    const font=readFileSync(new URL(`../src/fonts/poppins-latin-${weight}.woff2`,import.meta.url));
    assert.equal(font.subarray(0,4).toString(),'wOF2');
  }
  assert.match(theme,/--font-ui: Poppins,/);
});
test('garden is full width and controls stay below it for both roles',()=>{
  const theme=readFileSync(new URL('../src/field-theme.css',import.meta.url),'utf8');
  for(const rule of theme.matchAll(/\.workspace\s*\{([^}]+)\}/g)) {
    assert.match(rule[1],/grid-template-columns: minmax\(0,1fr\);/);
  }
  assert.match(theme,/body\[data-view-role="admin"\] \.workspace > \.garden-panel \{ grid-row: 1;/);
  assert.match(theme,/body\[data-view-role="admin"\] \.workspace > \.controls-panel \{ grid-row: 2;/);
});
test('selected action tab has a solid background instead of an underline',()=>{
  const theme=readFileSync(new URL('../src/field-theme.css',import.meta.url),'utf8');
  const selected=theme.match(/\.control-tabs button\[aria-selected="true"\]\s*\{([^}]+)\}/)?.[1];
  assert.ok(selected);
  assert.match(selected,/background: var\(--blue\)/);
  assert.match(selected,/color: white/);
  assert.doesNotMatch(selected,/border-bottom/);
});
test('solid resource colors retain rounded cards and readable white labels',()=>{
  const theme=readFileSync(new URL('../src/field-theme.css',import.meta.url),'utf8');
  assert.match(theme,/\.garden-panel, \.controls-panel[^}]*border-radius: 18px/);
  assert.match(theme,/\.action-button \{[^}]*border-radius: 12px/);
  assert.match(theme,/\.action-button\.blue \{ color: white; background: var\(--blue\)/);
  assert.match(theme,/\.action-button\.green \{ color: white; background: var\(--leaf\)/);
  assert.doesNotMatch(theme,/#e1ebf5|#f7e9e2/);
});
test('strong accents do not recolor the sky or sun',()=>{
  const theme=readFileSync(new URL('../src/field-theme.css',import.meta.url),'utf8');
  assert.match(theme,/\.scene \{[^}]*background: #e8f2f8;/);
  assert.match(theme,/\.sun \{[^}]*background: #f3e4b5;/);
  assert.match(theme,/\.brand > svg \{[^}]*background: #e3eddf;/);
  assert.match(theme,/\.level-label \{[^}]*background: #e8eef4;/);
});
test('reward table follows the Probis decision of 13 November 2026',()=>{
  assert.match(html,/<th scope="row">ACC pertama<\/th><td>\+6<\/td><td>\+4<\/td><td>\+1<\/td>/);
});
test('Learning rating is stars only, with no comment form or hidden example comment',()=>{
  assert.match(html,/data-action="rate"><strong>Beri bintang<\/strong>/);
  assert.match(html,/<th scope="row">Bintang saja<\/th>/);
  assert.doesNotMatch(html,/komentar/i);
  const simulation=readFileSync(new URL('../src/simulation.js',import.meta.url),'utf8');
  assert.match(simulation,/rateLearningStars/);
  assert.doesNotMatch(simulation,/comment:|komentar contoh|rateLearningModule/);
});
