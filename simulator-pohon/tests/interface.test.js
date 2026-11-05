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
  assert.equal(actions.length,19);assert.equal(new Set(actions).size,19);
  assert.doesNotMatch(html,/<(?:input|select|textarea|form)\b/);
});
