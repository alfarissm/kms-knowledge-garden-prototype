import test from 'node:test';
import assert from 'node:assert/strict';
import { USER_ACTIONS, ADMIN_ACTIONS, DEMO_ACTIONS, isActionAllowed } from '../src/roles.js';

test('user can perform activities and care but cannot decide content status',()=>{
  for(const action of USER_ACTIONS) assert.equal(isActionAllowed('user',action),true,action);
  for(const action of ADMIN_ACTIONS) assert.equal(isActionAllowed('user',action),false,action);
});
test('admin reviews content without performing user activities',()=>{
  for(const action of ADMIN_ACTIONS) assert.equal(isActionAllowed('admin',action),true,action);
  for(const action of USER_ACTIONS) assert.equal(isActionAllowed('admin',action),false,action);
});
test('demo overrides must be opened separately and are not ordinary role actions',()=>{
  for(const role of ['user','admin']) for(const action of DEMO_ACTIONS) {
    assert.equal(isActionAllowed(role,action),false,action);
    assert.equal(isActionAllowed(role,action,true),true,action);
  }
});
test('roles cover every simulation action once without changing gamification rules',()=>{
  const all=[...USER_ACTIONS,...ADMIN_ACTIONS,...DEMO_ACTIONS];
  assert.equal(all.length,19);assert.equal(new Set(all).size,19);
  assert.equal(isActionAllowed('user','reset'),true);assert.equal(isActionAllowed('admin','reset'),true);
  assert.equal(isActionAllowed('user','unknown',true),false);
});
