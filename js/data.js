// Data adapter: mock (default), JSON polling (?feed=url) or WebSocket (?ws=url).
// All sources call onSnapshot(bots[]) and onEvent(event). See README for schema.

export const TEAM = [
  ['dreggbot','dr eggbot','Bot designer'],['oracle','Oracle','Q&A'],['mail','.mail','Inbox'],['pastabase','Pastabase','Creepypasta archivist'],
  ['vesper','Vesper','Chess coach'],['pitwall','Pit Wall','GT7 coach'],['couchpotato','Couch Potato','Watch picks'],['dm','Dungeon Master','Text adventures'],
  ['mixtape','Mixtape Maker','Music digger'],['trendline','Trendline','X trends'],['logpose','Log Pose','One Piece'],['benchmark','Bench Mark','eBay pricing'],
  ['textcleanup','Text-cleanup','Rewrites'],['coach','Grok Bot Coach','Bot health'],['dojo','Dojo','SF6 coach'],['morningwire','Morning Wire','News'],
  ['bookmarks','X Bookmarks','Bookmarks KB'],['touchline','Touchline','Football'],['edgecase','Edge Case','Card flips'],['playmaker','Playmaker','EA FC coach'],
  ['botscout','Bot Scout','X scout'],['threadbait','Thread Bait','AskReddit'],['weather','Weather Bot','Weather'],['levelzero','Level Zero','Backrooms'],['patchwork','Patchwork','Coding'],
].map(([id, name, role]) => ({ id, name, role }));

const TASKS = {
  dreggbot:['Sketching a new bot persona','Tuning skill descriptions'], oracle:['Researching a tricky question','Cross-checking sources'],
  mail:['Triaging 14 new emails','Summarizing a long thread'], pastabase:['Cataloguing a new creepypasta','Tagging archive entries'],
  vesper:['Reviewing a blitz game','Building a tactic drill'], pitwall:['Analysing Spa lap telemetry','Tuning a Gr.3 setup'],
  couchpotato:['Ranking tonight\'s watch picks','Checking streaming catalogs'], dm:['Narrating the crypt level','Rolling encounter tables'],
  mixtape:['Digging B-sides from 1978','Sequencing a playlist'], trendline:['Scanning X trends','Clustering hashtags'],
  logpose:['Summarizing the latest chapter','Updating bounty table'], benchmark:['Pricing sold listings','Comparing eBay comps'],
  textcleanup:['Rewriting a cover letter','Tightening a paragraph'], coach:['Auditing bot health','Checking routine failures'],
  dojo:['Reviewing SF6 replays','Writing a combo drill'], morningwire:['Drafting the morning briefing','Fetching headlines'],
  bookmarks:['Indexing new bookmarks','Tagging saved threads'], touchline:['Updating La Liga table','Checking injury news'],
  edgecase:['Scanning card flip margins','Pricing a PSA 10'], playmaker:['Building an EA FC squad','Reviewing a match'],
  botscout:['Scouting new bot accounts','Reading X profiles'], threadbait:['Picking top AskReddit threads','Summarizing replies'],
  weather:['Pulling the forecast','Checking storm alerts'], levelzero:['Mapping Backrooms levels','Writing an atlas entry'],
  patchwork:['Fixing a failing test','Refactoring the data layer'],
};
const REQUESTS = ['Send the drafted reply to 3 people?','Approve $12 purchase?','OK to post this to X?','Merge PR #42 into main?','Delete 40 old drafts?','Share the doc with the team?','Book a table for 7:30pm?'];
const WORK = ['coding','browsing','thinking'];
const pick = a => a[Math.floor(Math.random() * a.length)];

export function createSource({ onSnapshot, onEvent }) {
  const q = new URLSearchParams(location.search);
  if (q.get('ws')) return wsSource(q.get('ws'), onSnapshot, onEvent);
  if (q.get('feed')) return feedSource(q.get('feed'), +q.get('interval') || 3000, onSnapshot, onEvent);
  return mockSource(onSnapshot, onEvent, q.has('static'));
}

function mockSource(onSnapshot, onEvent, frozen) {
  const now = Date.now();
  const bots = TEAM.map((b, i) => ({ ...b, status: frozen ? 'idle' : ['coding','browsing','thinking','idle','coding','idle'][i % 6], task: pick(TASKS[b.id]), request: null, updatedAt: now - Math.random() * 6e5 }));
  if (!frozen) { bots[2].status = 'needs_you'; bots[2].request = 'Send the drafted reply to 3 people?'; bots[13].status = 'error'; bots[13].task = 'Routine "digest" failed: timeout'; }
  onSnapshot(bots);
  if (frozen) return { mode: 'static', send() {} };
  setInterval(() => {
    const b = pick(bots), r = Math.random(); let status = b.status, task = b.task, request = null;
    if (b.status === 'needs_you' || b.status === 'error') { if (Math.random() < .25) status = 'idle'; else return; }
    else if (b.status === 'done') status = 'idle';
    else if (r < .08) { status = 'needs_you'; request = pick(REQUESTS); }
    else if (r < .12) { status = 'error'; task = 'Hit an error: ' + pick(['rate limited','login expired','page timed out']); }
    else if (r < .3 && b.status !== 'idle') status = 'done';
    else if (r < .5) status = 'idle';
    else { status = pick(WORK); task = pick(TASKS[b.id]); }
    Object.assign(b, { status, task, request, updatedAt: Date.now() });
    onEvent({ type: 'status', id: b.id, status, task, request, at: b.updatedAt });
  }, 2200);
  return { mode: 'mock', send() {} };
}

function feedSource(url, interval, onSnapshot) {
  const poll = () => fetch(url, { cache: 'no-store' }).then(r => r.json()).then(d => onSnapshot(d.bots)).catch(e => console.warn('feed error', e));
  poll(); setInterval(poll, interval);
  return { mode: 'feed', send() {} };
}

function wsSource(url, onSnapshot, onEvent) {
  let ws;
  const open = () => {
    ws = new WebSocket(url);
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.bots) onSnapshot(d.bots); else onEvent(d); };
    ws.onclose = () => setTimeout(open, 3000);
  };
  open();
  return { mode: 'ws', send: msg => ws?.readyState === 1 && ws.send(JSON.stringify(msg)) };
}
