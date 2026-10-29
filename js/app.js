// App glue: builds the office, wires data source, panels, bubbles and actions.
import { createOffice, animateBot, STATUS_COLORS } from './office.js';
import { createSource, TEAM } from './data.js';

const FREE_DESKS = 3;
const q = new URLSearchParams(location.search);
const stage = document.getElementById('stage'), overlay = document.getElementById('overlay');
const office = createOffice(stage, TEAM.length + FREE_DESKS);
const bots = new Map(); let focusId = null; const log = [];
const deskOrder = [...Array(TEAM.length + FREE_DESKS).keys()].filter(i => ![9, 17, 24].includes(i)); // leave 3 desks free

// --- bots in the scene
TEAM.forEach((t, i) => { const b = office.addBot(deskOrder[i], { ...t, status: 'idle', task: '', request: null, updatedAt: Date.now() }, i); b.el = document.createElement('div'); b.el.className = 'bub'; overlay.append(b.el); bots.set(t.id, b); });

// --- legend + lighting
document.getElementById('legend').innerHTML = Object.entries(STATUS_COLORS).map(([k, c]) => `<span style="--c:${c}"><i></i>${k.replace('_', ' ')}</span>`).join('');
const setLight = l => { office.setLighting(l); document.querySelectorAll('#lights button').forEach(b => b.classList.toggle('on', b.dataset.l === l)); };
document.getElementById('lights').onclick = e => e.target.dataset.l && setLight(e.target.dataset.l);
setLight(q.get('light') || 'night');

// --- data
function apply(u, quiet) {
  const b = bots.get(u.id); if (!b) return;
  const changed = b.status !== u.status;
  Object.assign(b, { status: u.status, task: u.task ?? b.task, request: u.request ?? null, updatedAt: u.updatedAt ?? u.at ?? Date.now() });
  if (u.status === 'done') setTimeout(() => b.status === 'done' && apply({ id: b.id, status: 'idle' }, true), 2500);
  if (changed && !quiet) addLog(b, u.status === 'needs_you' ? `needs you: ${b.request}` : `${u.status.replace('_', ' ')} — ${b.task}`, u.status);
}
function addLog(b, text, status) { log.unshift({ at: Date.now(), name: b.name, text, status }); log.length = Math.min(log.length, 80); renderLog(); }
const source = createSource({ onSnapshot: list => { list.forEach(u => apply(u, true)); renderTeam(); }, onEvent: e => { if (e.type === 'status') apply(e); if (e.type === 'log') { const b = bots.get(e.id); b && addLog(b, e.text, b.status); } renderTeam(); } });
document.getElementById('mode').textContent = source.mode + ' mode';
if (q.has('static')) { overlay.style.display = 'none'; }

function decide(id, ok) {
  const b = bots.get(id); if (!b || b.status !== 'needs_you') return;
  const req = b.request;
  addLog(b, `${ok ? 'Approved' : 'Declined'}: ${req}`, ok ? 'done' : 'idle');
  apply({ id, status: ok ? 'done' : 'idle', task: ok ? `Approved: ${req}` : b.task, request: null }, true);
  source.send({ type: 'decision', id, approved: ok, request: req, at: Date.now() });
  renderTeam();
}
document.addEventListener('click', e => { const a = e.target.dataset.act; if (a) { decide(e.target.dataset.id, a === 'ok'); e.stopPropagation(); } });

// --- side panel
function rel(ts) { const s = (Date.now() - ts) / 1000; return s < 60 ? `${s | 0}s ago` : s < 3600 ? `${s / 60 | 0}m ago` : `${s / 3600 | 0}h ago`; }
function btns(id) { return `<div class="btns"><button class="ok" data-act="ok" data-id="${id}">Approve</button><button class="no" data-act="no" data-id="${id}">Decline</button></div>`; }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`); }
function renderTeam() {
  const all = [...bots.values()], n = s => all.filter(b => s.includes(b.status)).length;
  document.getElementById('c-working').textContent = n(['coding', 'browsing', 'thinking']);
  document.getElementById('c-needs').textContent = n(['needs_you']);
  document.getElementById('c-idle').textContent = n(['idle', 'done']);
  document.getElementById('c-free').textContent = FREE_DESKS;
  const order = { needs_you: 0, error: 1, coding: 2, browsing: 2, thinking: 2, done: 3, idle: 4 };
  document.getElementById('team').innerHTML = all.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name)).map(b => `
    <div class="row ${b.id === focusId ? 'sel' : ''}" data-id="${b.id}" style="--c:${STATUS_COLORS[b.status]}">
      <span class="dot"></span><span><span class="nm">${esc(b.name)}</span> <span class="rl">· ${esc(b.role)}</span></span><span class="st">${b.status.replace('_', ' ')}<br><span class="rl">${rel(b.updatedAt)}</span></span>
      <span class="act">${esc(b.status === 'needs_you' ? b.request : b.task)}</span>${b.status === 'needs_you' ? btns(b.id) : ''}</div>`).join('');
}
function renderLog() {
  document.getElementById('log').innerHTML = log.map(e => `<div class="ev" style="--c:${STATUS_COLORS[e.status]}"><time>${new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time><b>${esc(e.name)}</b> ${esc(e.text)}</div>`).join('');
}
document.getElementById('team').onclick = e => { const r = e.target.closest('.row'); if (r && !e.target.dataset.act) focus(r.dataset.id); };
stage.addEventListener('click', e => { const b = office.pick(e); focus(b ? b.id : null); });
function focus(id) { focusId = focusId === id ? null : id; renderTeam(); }
setInterval(renderTeam, 5000);

// --- bubbles: always for needs_you / error, task bubble for focused bot (or all with ?bubbles=all)
var allBubbles = q.get('bubbles') === 'all';
function updateBubble(b) {
  const show = b.status === 'needs_you' || b.status === 'error' || b.id === focusId || (allBubbles && b.status !== 'idle');
  b.el.style.display = show ? '' : 'none'; if (!show) return;
  const key = b.status + b.task + b.request;
  if (b.el._key !== key) {
    b.el._key = key; b.el.className = 'bub' + (b.status === 'needs_you' ? ' needs' : ''); b.el.style.setProperty('--c', STATUS_COLORS[b.status]);
    const icon = { thinking: '💭 ', needs_you: '✋ ', error: '⚠ ', done: '✔ ' }[b.status] || '';
    b.el.innerHTML = `<div class="n">${icon}${esc(b.name)}</div>${esc(b.status === 'needs_you' ? b.request : b.status === 'thinking' ? b.task + ' …' : b.task)}${b.status === 'needs_you' ? btns(b.id) : ''}`;
  }
  const p = office.screenPos(b); b.el.style.left = p.x + 'px'; b.el.style.top = p.y + 'px';
}

// --- render loop
const t0 = performance.now();
(function loop() {
  const t = (performance.now() - t0) / 1000;
  bots.forEach(b => { animateBot(b, t, b.id === focusId); updateBubble(b); });
  office.render(); requestAnimationFrame(loop);
})();
window.__office = { bots, decide, focus, setLight };
