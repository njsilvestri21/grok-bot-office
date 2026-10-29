// Office scene: floor, furniture, desks and low-poly bot characters.
import * as THREE from 'three';

export const STATUS_COLORS = { coding:'#4f9dff', browsing:'#38c7d6', thinking:'#b18cff', needs_you:'#ffb02e', idle:'#6b7385', error:'#ff4d5e', done:'#3fd17a' };
const COLS = 7, SPX = 4.2, SPZ = 4.4;
const PALETTE = ['#3b5bdb','#2ba88a','#d63a9a','#7b3fe4','#f08c1a','#1c9fd8','#e8493f','#4cae4f','#c9a227','#8e5bd6','#e0607e','#14b8a6','#5c7cfa'];
const SHAPES = ['sphere','dome','drop','bean'];
// Lathe profile (radius, height) for each blob shape; all about 1.1 wide x 1.0 tall.
function blobGeometry(kind) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = i / 24, th = -Math.PI / 2 + a * Math.PI;           // bottom -> top
    let r = Math.cos(th) * .55, y = (Math.sin(th) + 1) * .5;
    if (kind === 'dome') { r = Math.cos(th) * .58 * (a < .5 ? 1 : 1.05); y = a < .5 ? y * .55 + .0 : .275 + (y - .5) * 1.25; }
    if (kind === 'drop') { r *= a > .5 ? Math.pow(1 - (a - .5) * 2, .8) * 1.0 + .0 : 1; y = a > .5 ? .5 + (a - .5) * 1.25 : y; }
    if (kind === 'bean') { r *= 1.08; y *= .9; }
    pts.push(new THREE.Vector2(Math.max(r, 0.0001), y));
  }
  const g = new THREE.LatheGeometry(pts, 32); g.computeVertexNormals(); return g;
}

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .75, ...o });
const box = (w, h, d, m) => { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.castShadow = g.receiveShadow = true; return g; };
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const cyl = (rt, rb, h, m, s = 12) => { const g = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), m); g.castShadow = true; return g; };

export function createOffice(container, deskCount) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const rows = Math.ceil(deskCount / COLS);
  const W = COLS * SPX + 6, D = rows * SPZ + 8;

  // isometric orthographic camera
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camera.position.set(30, 30, 30); camera.lookAt(0, 0, 0);
  let zoom = Math.min(4, Math.max(.7, +new URLSearchParams(location.search).get('zoom') || 1));

  // lights
  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x30261c, .6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(-15, 30, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -W/2-4, right: W/2+4, top: D/2+4, bottom: -D/2-4 }); sun.shadow.bias = -0.0005;
  scene.add(sun);
  const lampLights = [];

  // floor, walls, rugs
  const floor = box(W, .3, D, mat(0x2a2f3a)); floor.position.y = -.15; scene.add(floor);
  for (let i = 0; i < W; i += 2) { const s = box(.04, .01, D, mat(0x232833)); s.position.set(-W/2 + i, .005, 0); scene.add(s); }
  const wallM = mat(0x3a4152);
  const wb = box(W, 4, .3, wallM); wb.position.set(0, 2, -D/2); scene.add(wb);
  const wl = box(.3, 4, D, wallM); wl.position.set(-W/2, 2, 0); scene.add(wl);
  // windows on back wall
  const winM = mat(0x9fc6ff, { emissive: 0x6b8fd0, emissiveIntensity: .4 });
  for (let x = -W/2 + 5; x < W/2 - 3; x += 6) { const w = box(3.2, 1.8, .05, winM); w.position.set(x, 2.4, -D/2 + .18); scene.add(w); }
  // pink neon "office" sign on the back wall
  const cv = Object.assign(document.createElement('canvas'), { width: 512, height: 160 }), cx = cv.getContext('2d');
  cx.font = 'italic 700 110px system-ui, sans-serif'; cx.textAlign = 'center'; cx.shadowColor = '#ff4fb0'; cx.shadowBlur = 28; cx.fillStyle = '#ffd0ec';
  cx.fillText('office', 256, 115); cx.fillText('office', 256, 115);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.25), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true }));
  neon.position.set(-W/2 + 8.5, 3, -D/2 + .17); scene.add(neon);
  const neonLight = new THREE.PointLight(0xff4fb0, 6, 9, 1.5); neonLight.position.set(-W/2 + 8.5, 3, -D/2 + 1.2); scene.add(neonLight);
  const rugColors = [0x4b3a5e, 0x2f4a4a, 0x5a3b33];
  for (let r = 0; r < rows; r++) { const rug = box(COLS * SPX - .6, .03, SPZ - 1.2, mat(rugColors[r % 3])); rug.position.set(0, .02, -D/2 + 4 + r * SPZ + SPZ/2 - .3); rug.receiveShadow = true; scene.add(rug); }
  // bookshelves along back + left wall
  const shelfM = mat(0x6b4a32); const bookCols = [0xc0504d, 0x4f81bd, 0x9bbb59, 0xf2c14e, 0x8064a2, 0x4bacc6];
  const bookshelf = (x, z, ry) => { const g = new THREE.Group(); g.add(at(box(2.4, 2.6, .6, shelfM), 0, 1.3, 0));
    for (let s = 0; s < 3; s++) for (let b = 0; b < 8; b++) { const h = .45 + Math.random() * .2; const bk = box(.22, h, .45, mat(bookCols[(s * 8 + b) % 6])); bk.position.set(-1 + b * .27, .35 + s * .8 + h/2, .1); g.add(bk); }
    g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); };
  bookshelf(-W/2 + 2.2, -D/2 + .5, 0); bookshelf(W/2 - 2.2, -D/2 + .5, 0); bookshelf(-W/2 + .5, 0, Math.PI/2);
  // plants
  const plant = (x, z, s = 1) => { const g = new THREE.Group(); g.add(at(cyl(.35, .28, .6, mat(0xb5703c)), 0, .3, 0));
    for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(.45 + Math.random() * .2, 0), mat(0x3f8f4f, { flatShading: true })); l.castShadow = true; l.position.set((Math.random() - .5) * .6, .9 + Math.random() * .7, (Math.random() - .5) * .6); g.add(l); }
    g.scale.setScalar(s); g.position.set(x, 0, z); scene.add(g); };
  plant(-W/2 + 1, -D/2 + 1, 1.3); plant(W/2 - 1, -D/2 + 1.2, 1.2); plant(-W/2 + 1, D/2 - 1); plant(W/2 - 1, D/2 - 1, 1.1); plant(0, -D/2 + 1, .9);
  // lounge: sofa + coffee table
  const sofa = new THREE.Group(); const sm = mat(0x3d5a80);
  sofa.add(at(box(3, .5, 1.1, sm), 0, .4, 0), at(box(3, .8, .3, sm), 0, .8, -.45));
  sofa.position.set(-6, 0, D/2 - 1.2); sofa.rotation.y = Math.PI; scene.add(sofa);
  const tbl = box(1.6, .1, .8, mat(0x8a6a4a)); tbl.position.set(-6, .45, D/2 - 2.6); scene.add(tbl);
  const water = cyl(.3, .3, 1.3, mat(0xd8e6f2)); water.position.set(5, .65, D/2 - 1); scene.add(water);

  // desks
  const desks = [];
  for (let i = 0; i < deskCount; i++) {
    const c = i % COLS, r = Math.floor(i / COLS);
    const x = -((COLS - 1) * SPX) / 2 + c * SPX, z = -D/2 + 4 + r * SPZ + .6;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI; scene.add(g); // desks face the camera so bot faces show
    const top = box(2.6, .1, 1.3, mat(0xa07a55)); top.position.y = 1; g.add(top);
    [[-1.2, -.55], [1.2, -.55], [-1.2, .55], [1.2, .55]].forEach(([lx, lz]) => { const l = box(.08, 1, .08, mat(0x333842)); l.position.set(lx, .5, lz); g.add(l); });
    // monitor
    const screenM = mat(0x111111, { emissive: 0x223344, emissiveIntensity: 1 });
    const mon = box(1.1, .58, .06, mat(0x1b1e24)); mon.position.set(-.45, 1.45, -.4); g.add(mon);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .5), screenM); scr.position.set(-.45, 1.45, -.365); g.add(scr);
    const st = box(.1, .3, .1, mat(0x1b1e24)); st.position.set(-.45, 1.15, -.4); g.add(st);
    // laptop
    const lb = box(.7, .04, .45, mat(0x9aa3ad)); lb.position.set(.75, 1.07, .05); g.add(lb);
    const lidM = mat(0x111111, { emissive: 0x223344, emissiveIntensity: 1 });
    const lid = box(.7, .45, .03, mat(0x9aa3ad)); lid.position.set(.75, 1.3, -.17); lid.rotation.x = -.25; g.add(lid);
    const lscr = new THREE.Mesh(new THREE.PlaneGeometry(.62, .38), lidM); lscr.position.set(0, 0, .02); lid.add(lscr);
    // mug + lamp
    const mug = cyl(.08, .08, .16, mat([0xe74c3c, 0xf1c40f, 0xecf0f1][i % 3])); mug.position.set(1.1, 1.13, -.3); g.add(mug);
    const lamp = new THREE.Group(); lamp.add(cyl(.02, .02, .5, mat(0x222222)), at(cyl(.05, .16, .14, mat(0xffe6a8, { emissive: 0xffc870, emissiveIntensity: 0 })), 0, .28, 0));
    lamp.position.set(-1.1, 1.3, -.35); g.add(lamp);
    // chair
    const chair = new THREE.Group(); const cm = mat(0x262b36);
    chair.add(at(box(.8, .1, .8, cm), 0, .6, 0), at(box(.8, .8, .1, cm), 0, 1, .4), at(cyl(.05, .05, .55, cm), 0, .3, 0));
    chair.position.set(0, 0, 1.15); g.add(chair);
    // status ring (glow) on floor
    const ringM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.55, 40), ringM); ring.rotation.x = -Math.PI/2; ring.position.set(0, .05, .6); g.add(ring);
    desks.push({ group: g, screenM, lidM, lampShade: lamp.children[1].material, ringM, chair, bot: null });
  }
  // a few real lamp point lights for evening/night ambience
  for (let i = 0; i < 4; i++) { const p = new THREE.PointLight(0xffc27a, 0, 18, 1.5); p.position.set(-W/2 + W * (i + .5) / 4, 3.5, 0); scene.add(p); lampLights.push(p); }

  // Blob bots: one soft limbless shape per bot (sphere, dome or teardrop) with two white eyes.
  function addBot(deskIdx, bot, idx) {
    const d = desks[deskIdx];
    const color = new THREE.Color(PALETTE[idx % PALETTE.length]);
    const bodyM = mat(color, { roughness: .95 });
    const g = new THREE.Group(); g.position.set(0, .62, 1.15); g.rotation.y = Math.PI; g.scale.setScalar(1.15); d.group.add(g); // seated, facing the monitor
    const body = new THREE.Mesh(blobGeometry(SHAPES[idx % SHAPES.length]), bodyM); body.castShadow = true; g.add(body);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyes = new THREE.Group(); eyes.position.set(0, .55, .56); g.add(eyes);
    const open = [-.15, .15].map(x => at(new THREE.Mesh(new THREE.CapsuleGeometry(.06, .1, 4, 8), eyeM), x, 0, 0));
    const happy = [-.15, .15].map(x => at(new THREE.Mesh(new THREE.TorusGeometry(.08, .028, 6, 12, Math.PI), eyeM), x, -.02, 0));
    open.forEach(e => eyes.add(e)); happy.forEach(e => eyes.add(e));
    const ticks = new THREE.Group(); g.add(ticks);   // little "typing" motion marks
    [[-.62, .75, -.5], [.62, .8, .5], [0, 1.15, 0]].forEach(([x, y, r]) => { const tk = at(box(.03, .14, .03, eyeM), x, y, .1); tk.rotation.z = r; tk.castShadow = false; ticks.add(tk); });
    const b = { ...bot, group: g, body, eyes, open, happy, ticks, bodyM, desk: d, baseColor: color, phase: Math.random() * 6 };
    d.bot = b; return b;
  }

  const LIGHTING = {
    day:     { bg: 0x9fb6d0, hemi: .9, sun: 1.6, sunC: 0xfff4e0, lamps: 0, shade: 0, win: .5 },
    evening: { bg: 0x2a2236, hemi: .45, sun: .8, sunC: 0xff9a5a, lamps: 18, shade: .8, win: .3 },
    night:   { bg: 0x0a0d14, hemi: .22, sun: .25, sunC: 0x7f9cff, lamps: 30, shade: 1.6, win: .05 },
  };
  function setLighting(name) {
    const L = LIGHTING[name]; scene.background = new THREE.Color(L.bg);
    hemi.intensity = L.hemi; sun.intensity = L.sun; sun.color.set(L.sunC); winM.emissiveIntensity = L.win;
    lampLights.forEach(p => p.intensity = L.lamps); desks.forEach(d => d.lampShade.emissiveIntensity = L.shade);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h);
    const aspect = w / h, view = Math.max(D * .5, (W * .47) / aspect) / zoom;
    Object.assign(camera, { left: -view * aspect, right: view * aspect, top: view, bottom: -view }); camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  container.addEventListener('wheel', e => { zoom = Math.min(4, Math.max(.7, zoom * (e.deltaY < 0 ? 1.1 : .9))); resize(); e.preventDefault(); }, { passive: false });

  // picking
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect(); ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera); const hit = ray.intersectObjects(desks.map(d => d.group), true)[0];
    if (!hit) return null; let o = hit.object; while (o && !desks.find(d => d.group === o)) o = o.parent; return desks.find(d => d.group === o)?.bot || null;
  }

  // project a bot's head position to screen pixels
  const v = new THREE.Vector3();
  function screenPos(b) { b.group.getWorldPosition(v); v.y += 1.35; v.project(camera); return { x: (v.x + 1) / 2 * container.clientWidth, y: (1 - v.y) / 2 * container.clientHeight }; }

  return { scene, camera, renderer, desks, addBot, setLighting, pick, screenPos, render: () => renderer.render(scene, camera) };
}

// Per-frame animation for one bot based on its status.
const tmpC = new THREE.Color();
export function animateBot(b, t, focused) {
  const s = b.status, p = t + b.phase;
  const col = new THREE.Color(STATUS_COLORS[s]);
  let y = .62, sq = 1, lean = 0, sway = 0, shake = 0, eyeY = 0, eyeOpen = 1, happy = false;
  if (s === 'coding') { sq = 1 + Math.sin(p * 14) * .05; y += Math.abs(Math.sin(p * 7)) * .04; }
  if (s === 'browsing') { lean = .18 + Math.sin(p * 1.2) * .03; }
  if (s === 'thinking') { sway = Math.sin(p * .9) * .12; eyeY = .07; }
  if (s === 'needs_you') { y += Math.abs(Math.sin(p * 4)) * .08; }
  if (s === 'idle') { y += Math.sin(p * 1.1) * .02; eyeOpen = .35; }
  if (s === 'error') { shake = Math.sin(p * 40) * .04; }
  if (s === 'done') { y += Math.max(0, Math.sin(p * 7)) * .4; happy = true; }
  b.group.position.set(shake, y, 1.15);
  b.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  b.group.rotation.set(lean, Math.PI, sway);
  b.eyes.position.y = .55 * sq + eyeY;
  b.open.forEach(e => { e.visible = !happy; e.scale.y = eyeOpen; });
  b.happy.forEach(e => e.visible = happy);
  b.ticks.visible = s === 'coding'; b.ticks.children.forEach((tk, i) => tk.scale.setScalar(.6 + .4 * Math.abs(Math.sin(p * 9 + i))));
  // matte color: dimmer when idle, red tint on error
  tmpC.copy(b.baseColor); if (s === 'idle') tmpC.multiplyScalar(.55); if (s === 'error') tmpC.lerp(new THREE.Color(0xff3344), .55);
  b.bodyM.color.copy(tmpC); b.bodyM.emissive.copy(s === 'needs_you' ? col : b.baseColor); b.bodyM.emissiveIntensity = s === 'needs_you' ? .25 : focused ? .2 : s === 'error' ? .15 : 0;
  // desk screens + floor glow
  const d = b.desk, on = s !== 'idle';
  d.screenM.emissive.copy(on ? col : tmpC.set(0x111820)); d.screenM.emissiveIntensity = on ? .55 : .4;
  d.lidM.emissive.copy(d.screenM.emissive); d.lidM.emissiveIntensity = on ? .5 : .3;
  const pulse = (Math.sin(t * 5) + 1) / 2;
  d.ringM.color.copy(col);
  d.ringM.opacity = focused ? .9 : s === 'needs_you' ? .45 + pulse * .5 : s === 'error' ? .5 + pulse * .4 : s === 'done' ? .8 : s === 'idle' ? 0 : .22;
}
