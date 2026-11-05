import './styles.css';
import './compact-layout.css';
import { LEVELS, STAGES, getNextLevelRequirement, getTreeCondition, getFruitView } from './engine/gamification.js';
import { makeTreeSvg } from './engine/tree-svg.js';
import { createSimulation, performAction, canLogin } from './simulation.js';
import { ADMIN_ACTIONS, DEMO_ACTIONS, isActionAllowed } from './roles.js';

const $ = (selector) => document.querySelector(selector);
const fmt = (value) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value);
const names = { healthy: 'Sehat', thirsty: 'Menguning', dead: 'Mati' };
const statuses = { pending: 'Menunggu review', validated: 'ACC / relevan', stale: 'Basi', rejected: 'Tidak relevan', duplicate: 'Duplikat' };
let sim = performAction(createSimulation(), 'example').sim;
let viewRole = 'user';
let userTab = 'care';
let flowStep = '4';

function element(tag, cls, text) {
  const node = document.createElement(tag); node.className = cls; node.textContent = text; return node;
}
function disabled(action, value, title = '') {
  const button = $(`[data-action="${action}"]`); button.disabled = value; button.title = title;
}
function updateBar(id, value, max) {
  const bar = $(id);
  bar.setAttribute('aria-valuemax', max); bar.setAttribute('aria-valuenow', Math.min(value,max));
  bar.setAttribute('aria-valuetext', `${fmt(value)} dari ${fmt(max)}`);
  bar.firstElementChild.style.width = `${max ? Math.min(100, value/max*100) : 100}%`;
}
function renderContents() {
  const list = $('#contentList'); list.replaceChildren();
  $('#contentCount').textContent = `${sim.state.sharingSubmissions.length} konten`;
  const pending = sim.state.sharingSubmissions.filter(item => item.status === 'pending').length;
  $('#pendingCount').textContent = pending;
  $('button[data-view-role="admin"]').setAttribute('aria-label', `Sisi admin, ${pending} konten menunggu review`);
  $('#contentEmpty').hidden = sim.state.sharingSubmissions.length > 0;
  for (const content of [...sim.state.sharingSubmissions].reverse()) {
    const button = element('button', `content-chip ${content.status}`, '');
    button.type = 'button'; button.dataset.contentId = content.id;
    button.setAttribute('aria-pressed', content.id === sim.selectedId ? 'true' : 'false');
    const entry = sim.state.fruitLedger.find(x => x.submissionId === content.id);
    button.append(element('strong','',content.title), element('span','',statuses[content.status]),
      element('small','',entry ? `Slot ${entry.slot} · ${{tree:'di pohon',storage:'Storage',ground:'di tanah',gone:'kosong'}[entry.placement]}` : 'Belum ada slot buah'));
    list.append(button);
  }
  const selected = sim.state.sharingSubmissions.find(x => x.id === sim.selectedId);
  $('#reviewAsAdmin').hidden = viewRole !== 'user' || selected?.status !== 'pending';
  $('#returnToUser').hidden = viewRole !== 'admin' || !selected || selected.status === 'pending';
  $('#selectedContent').textContent = selected ? `${selected.title} · ${statuses[selected.status]}` : 'Belum ada konten dipilih';
  for (const action of ['acc','stale','rejected','duplicate']) {
    disabled(action, !selected || (action === 'stale' && !sim.state.fruitLedger.some(x => x.submissionId === sim.selectedId)), !selected ? 'Pilih konten terlebih dahulu.' : '');
  }
}
function render() {
  const s = sim.state, condition = getTreeCondition(s), view = getFruitView(s);
  $('#stageLabel').textContent = STAGES[s.level]; $('#levelLabel').textContent = `Level ${s.level} / 7`;
  $('#dayLabel').textContent = `Hari ${Math.floor((s.clockMs-sim.startClock)/86400000)}`;
  $('#scene').dataset.condition = condition;
  $('#conditionBadge').textContent = names[condition]; $('#conditionBadge').className = `condition-badge ${condition}`;
  $('#treeCanvas').innerHTML = makeTreeSvg(s.level,condition,view);
  $('#emptySeed').hidden = s.level !== 0;
  const next = getNextLevelRequirement(s.level);
  $('#nextLevelLabel').textContent = s.level===7 ? 'Level tertinggi tercapai' : `Target Level ${next.level}`;
  $('#airProgressText').textContent = `${fmt(s.growthAir)} / ${fmt(next.air)}`;
  $('#pupukProgressText').textContent = `${fmt(s.growthFertilizerUnits/2)} / ${fmt(next.fertilizerUnits/2)}`;
  updateBar('#airProgress',s.growthAir,next.air); updateBar('#pupukProgress',s.growthFertilizerUnits/2,next.fertilizerUnits/2);
  for (const [id,value] of Object.entries({storageAir:s.air,storagePupuk:s.fertilizerUnits/2,storageFruit:s.fruitsInStorage,careAir:s.careAir,carePupuk:s.careFertilizerUnits/2})) $(`#${id}`).textContent = fmt(value);
  $('#fruitSummary').textContent = `${s.fruitsOnTree} menggantung · ${view.ground.length} di tanah`;
  disabled('care-air',s.air<1,'Butuh 1 Air di Storage.'); disabled('care-fertilizer',s.fertilizerUnits<2,'Butuh 1 Pupuk di Storage.');
  disabled('care-fruit',s.fruitsInStorage<1 || s.level<3 || condition!=='healthy','Butuh buah di Storage, pohon sehat, dan Level 3+.');
  disabled('login',!canLogin(s),'Reward login hanya sekali per hari simulasi.');
  disabled('rate',!sim.lastModuleId || Object.hasOwn(s.learningRatings,sim.lastModuleId),'Setelah materi tuntas, satu ulasan per materi.');
  $('#learnButtonLabel').textContent = `Materi #${s.completedLearningIds.length+1}`;
  renderContents();
  $('#historyList').replaceChildren(...sim.events.map(e => {
    const item = element('li','', ''); item.append(element('span','history-day',`H${e.day}`),element('span','',e.message)); return item;
  }));
  if (!sim.events.length) $('#historyList').append(element('li','history-empty','Belum ada aksi. Semua perubahan akan tercatat di sini.'));
}
function run(action) {
  try {
    if (!isActionAllowed(viewRole, action, $('#demoDisclosure').open)) {
      throw new Error(ADMIN_ACTIONS.includes(action) ? 'Keputusan konten ada di sisi Admin.' : 'Aksi ini ada di sisi Pengguna atau Alat demo.');
    }
    const previous = sim.state;
    const result = performAction(sim,action); sim = result.sim;
    render();
    const brief = {
      login: '+1 Air → Storage', learn: '+1 Pupuk → Storage', rate: '+1 Air → Storage',
      share: `${sim.state.sharingSubmissions[0]?.title} · menunggu ACC`,
      'care-air': '−1 Air Storage · pohon disiram', 'care-fertilizer': '−1 Pupuk Storage · pohon dipupuk',
      'care-fruit': '+1 buah di pohon',
      acc: sim.state.air > previous.air ? 'ACC · +3 Air · +2 Pupuk · +1 Buah' : 'ACC ulang · slot sama · tanpa reward tambahan',
      stale: 'Basi · buah cokelat di tanah', rejected: 'Tidak relevan · slot kosong', duplicate: 'Duplikat · slot kosong',
      advance: `+7 hari · Air pohon ${fmt(previous.careAir)} → ${fmt(sim.state.careAir)} · Pupuk ${fmt(previous.careFertilizerUnits/2)} → ${fmt(sim.state.careFertilizerUnits/2)}`,
      healthy: 'Pohon sehat · buah bisa dipasang lagi', thirsty: 'Menguning · buah kembali ke Storage', dead: 'Mati · buah kembali ke Storage',
      boost: 'Khusus demo: +10 Air · +6 Pupuk · +1 Buah', 'level-up': `Level ${sim.state.level}`, 'level-down': `Level ${sim.state.level}`,
      example: 'Contoh: Level 3 · 3 buah', reset: 'Level 0 · 1 Air · 1 Pupuk',
    };
    $('#feedback').textContent = result.tone === 'notice' ? result.message : (brief[action] || result.message);
    $('#feedback').dataset.tone = result.tone;
    if (DEMO_ACTIONS.includes(action)) $('#demoFeedback').textContent = $('#feedback').textContent;
    if (action==='share') flowStep='2';
    else if (action==='acc' && sim.state.air>previous.air) flowStep='3';
    else if (action.startsWith('care-') || action==='example') flowStep='4';
    else if (action==='reset') flowStep='1';
    if (['share','example','reset'].includes(action)) {
      userTab=action==='share'?'content':'care';
      activateControl(viewRole==='admin'?'content':userTab);
    }
    renderFlow();
  } catch (error) { $('#feedback').textContent = error.message; $('#feedback').dataset.tone = 'notice'; }
}
document.addEventListener('click',(event) => {
  const button=event.target.closest('button[data-action]');
  if (button && !button.disabled) run(button.dataset.action);
  const content=event.target.closest('button[data-content-id]');
  if (content) { sim.selectedId=content.dataset.contentId; renderContents(); }
});
function selectFruit(event) {
  const target = event.target.closest('[data-fruit-slot]'); if (!target) return;
  if (event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
  if (event.type === 'keydown') event.preventDefault();
  const entry=sim.state.fruitLedger.find(x=>x.slot===Number(target.dataset.fruitSlot));
  if (!entry?.submissionId) { $('#feedback').textContent='Buah bonus demo: tidak terikat konten. Gunakan Sharing baru untuk membuat buah konten.'; return; }
  sim.selectedId=entry.submissionId; renderContents(); activateControl('content');
  $('#selectedContent').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  $(`[data-content-id="${entry.submissionId}"]`).focus({preventScroll:true});
}
$('#treeCanvas').addEventListener('click',selectFruit); $('#treeCanvas').addEventListener('keydown',selectFruit);
$('#resetButton').addEventListener('click',()=>{ $('#resetConfirm').hidden=false; $('#confirmReset').focus(); });
$('#cancelReset').addEventListener('click',()=>{ $('#resetConfirm').hidden=true; $('#resetButton').focus(); });
$('#confirmReset').addEventListener('click',()=>{ run('reset'); $('#resetConfirm').hidden=true; $('#resetButton').focus(); });

const controlTabs=[...document.querySelectorAll('[data-control-tab]')];
function activateControl(name, focus=false) {
  if (viewRole==='admin') name='content';
  else userTab=name;
  for (const tab of controlTabs) {
    const selected=tab.dataset.controlTab===name;
    tab.setAttribute('aria-selected',String(selected)); tab.tabIndex=selected?0:-1;
    $(`#actions-${tab.dataset.controlTab}`).hidden=!selected;
    if(selected && focus)tab.focus();
  }
  const contentPanel=$('#actions-content');
  contentPanel.setAttribute('role',viewRole==='admin'?'region':'tabpanel');
  contentPanel.setAttribute('aria-labelledby',viewRole==='admin'?'controlsTitle':'control-content');
}
function renderFlow() {
  for (const step of document.querySelectorAll('[data-flow-step]')) {
    if (step.dataset.flowStep===flowStep) step.setAttribute('aria-current','step');
    else step.removeAttribute('aria-current');
  }
}
function setViewRole(role, focus=false) {
  viewRole=role;
  document.body.dataset.viewRole=role;
  for (const button of document.querySelectorAll('button[data-view-role]')) button.setAttribute('aria-pressed',String(button.dataset.viewRole===role));
  $('.control-tabs').hidden=role==='admin';
  $('#viewLabel').textContent=role==='admin'?'SISI ADMIN':'SISI PENGGUNA';
  $('#controlsTitle').textContent=role==='admin'?'Review konten pengguna':'Aktivitas & perawatan';
  $('#contentHint').textContent=role==='admin'?'Pilih → tentukan status':'Status konten milik pengguna';
  $('#adminDecisions').hidden=role!=='admin';
  $('#contentEmpty').textContent=role==='admin'?'Belum ada konten. Pengguna perlu mengirim Sharing.':'Buat Sharing baru di tab Aktivitas.';
  activateControl(role==='admin'?'content':userTab);
  renderContents();
  if (focus) $('button[data-view-role="'+role+'"]').focus();
}
for (const button of document.querySelectorAll('button[data-view-role]')) button.addEventListener('click',()=>setViewRole(button.dataset.viewRole));
$('#reviewAsAdmin').addEventListener('click',()=>setViewRole('admin',true));
$('#returnToUser').addEventListener('click',()=>{userTab='care';setViewRole('user',true);});
for(const tab of controlTabs) {
  tab.addEventListener('click',()=>activateControl(tab.dataset.controlTab));
  tab.addEventListener('keydown',event=>{
    const i=controlTabs.indexOf(tab);
    const next=event.key==='Home'?0:event.key==='End'?controlTabs.length-1:event.key==='ArrowRight'?(i+1)%controlTabs.length:event.key==='ArrowLeft'?(i+controlTabs.length-1)%controlTabs.length:null;
    if(next!==null){event.preventDefault();activateControl(controlTabs[next].dataset.controlTab,true);}
  });
}

const tabs=[...document.querySelectorAll('[data-tab]')];
function activateTab(tab, focus=false) {
  for (const button of tabs) { const selected=button===tab; button.setAttribute('aria-selected',String(selected)); button.tabIndex=selected?0:-1; $(`#rules-${button.dataset.tab}`).hidden=!selected; }
  if (focus) tab.focus();
}
for (const tab of tabs) {
  tab.addEventListener('click',()=>activateTab(tab));
  tab.addEventListener('keydown',event=>{
    const i=tabs.indexOf(tab);
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:event.key==='ArrowRight'?(i+1)%tabs.length:event.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:null;
    if(next!==null){event.preventDefault();activateTab(tabs[next],true);}
  });
}
for (const level of LEVELS) {
  const row=document.createElement('tr'),head=element('th','',`L${level.level}`);head.scope='row';
  row.append(head,element('td','',STAGES[level.level]),element('td','',fmt(level.air)),element('td','',fmt(level.fertilizerUnits/2)));
  $('#levelRulesBody').append(row);
}
render();
setViewRole('user');renderFlow();
$('#feedback').textContent = 'Contoh: Level 3 · 3 buah';
