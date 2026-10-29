// Office scene: floor, furniture, desks and low-poly bot characters.
import * as THREE from 'three';

export const STATUS_COLORS = { coding:'#4f9dff', browsing:'#38c7d6', thinking:'#b18cff', needs_you:'#ffb02e', idle:'#6b7385', error:'#ff4d5e', done:'#3fd17a' };
const COLS = 7, SPX = 4.2, SPZ = 4.4;
const ACCESSORIES = ['antenna','tophat','headphones','cap','halo','horns','visor','crown','bow','beanie'];

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
  let zoom = 1;

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
    const x = -((COLS - 1) * SPX) / 2 + c * SPX, z = -D/2 + 4 + r * SPZ + 1.2;
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const top = box(2.6, .1, 1.3, mat(0xa07a55)); top.position.y = 1; g.add(top);
    [[-1.2, -.55], [1.2, -.55], [-1.2, .55], [1.2, .55]].forEach(([lx, lz]) => { const l = box(.08, 1, .08, mat(0x333842)); l.position.set(lx, .5, lz); g.add(l); });
    // monitor
    const screenM = mat(0x111111, { emissive: 0x223344, emissiveIntensity: 1 });
    const mon = box(1.2, .75, .06, mat(0x1b1e24)); mon.position.set(-.3, 1.65, -.4); g.add(mon);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .65), screenM); scr.position.set(-.3, 1.65, -.365); g.add(scr);
    const st = box(.1, .3, .1, mat(0x1b1e24)); st.position.set(-.3, 1.2, -.4); g.add(st);
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

  function addBot(deskIdx, bot, idx) {
    const d = desks[deskIdx];
    const hue = (idx * 0.137) % 1; const color = new THREE.Color().setHSL(hue, .55, .55);
    const bodyM = mat(color, { flatShading: true }), darkM = mat(color.clone().multiplyScalar(.6), { flatShading: true }), faceM = mat(0xeef2f7);
    const g = new THREE.Group(); g.position.set(0, .65, 1.15); g.scale.setScalar(1.25); d.group.add(g);
    const torso = new THREE.Group(); g.add(torso);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, .75, 6), bodyM); body.position.y = .45; body.castShadow = true; torso.add(body);
    const head = new THREE.Group(); head.position.y = 1.05; torso.add(head);
    const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(.32, 0), bodyM); skull.castShadow = true; head.add(skull);
    const visor = box(.4, .14, .05, mat(0x10141c, { emissive: 0x66ccff, emissiveIntensity: .8 })); visor.position.set(0, .03, .29); head.add(visor);
    addAccessory(head, ACCESSORIES[idx % ACCESSORIES.length], new THREE.Color().setHSL((hue + .5) % 1, .7, .55));
    const arm = (side) => { const p = new THREE.Group(); p.position.set(side * .4, .75, 0); const a = box(.13, .5, .13, darkM); a.position.y = -.22; p.add(a); p.rotation.x = -1.1; torso.add(p); return p; };
    const armL = arm(-1), armR = arm(1);
    const legs = box(.55, .14, .5, darkM); legs.position.set(0, .05, .25); g.add(legs);
    g.rotation.y = Math.PI; // face the desk (desk is toward -z)
    const b = { ...bot, group: g, torso, head, armL, armR, visorM: visor.material, bodyM, desk: d, baseColor: color, doneAt: 0, phase: Math.random() * 6 };
    d.bot = b; return b;
  }

  function addAccessory(head, kind, c) {
    const m = mat(c, { flatShading: true }); const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; head.add(mesh); return mesh; };
    if (kind === 'antenna') { add(cyl(.02, .02, .35, m), 0, .45, 0); add(new THREE.Mesh(new THREE.SphereGeometry(.07), mat(c, { emissive: c })), 0, .65, 0); }
    if (kind === 'tophat') { add(cyl(.38, .38, .04, m), 0, .27, 0); add(cyl(.22, .22, .35, m), 0, .45, 0); }
    if (kind === 'headphones') { add(box(.08, .2, .2, m), -.33, 0, 0); add(box(.08, .2, .2, m), .33, 0, 0); add(new THREE.Mesh(new THREE.TorusGeometry(.33, .03, 6, 16, Math.PI), m), 0, 0, 0); }
    if (kind === 'cap') { add(new THREE.Mesh(new THREE.SphereGeometry(.31, 10, 6, 0, Math.PI * 2, 0, Math.PI/2), m), 0, .08, 0); add(box(.35, .03, .25, m), 0, .1, .32); }
    if (kind === 'halo') { const h = add(new THREE.Mesh(new THREE.TorusGeometry(.22, .03, 6, 20), mat(0xffe680, { emissive: 0xffd040, emissiveIntensity: .8 })), 0, .48, 0); h.rotation.x = Math.PI/2; }
    if (kind === 'horns') { const a = add(new THREE.Mesh(new THREE.ConeGeometry(.07, .25, 6), m), -.18, .32, 0); a.rotation.z = .4; const b = add(new THREE.Mesh(new THREE.ConeGeometry(.07, .25, 6), m), .18, .32, 0); b.rotation.z = -.4; }
    if (kind === 'visor') add(box(.6, .06, .3, m), 0, .18, .2);
    if (kind === 'crown') for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(new THREE.Mesh(new THREE.ConeGeometry(.06, .18, 4), mat(0xffd34d, { metalness: .6 })), Math.cos(a) * .17, .36, Math.sin(a) * .17); }
    if (kind === 'bow') { add(new THREE.Mesh(new THREE.ConeGeometry(.1, .18, 4), m), -.1, .3, 0).rotation.z = Math.PI/2; add(new THREE.Mesh(new THREE.ConeGeometry(.1, .18, 4), m), .1, .3, 0).rotation.z = -Math.PI/2; }
    if (kind === 'beanie') { add(new THREE.Mesh(new THREE.SphereGeometry(.33, 10, 6, 0, Math.PI * 2, 0, Math.PI/2), m), 0, .05, 0); add(new THREE.Mesh(new THREE.SphereGeometry(.08), m), 0, .38, 0); }
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
  container.addEventListener('wheel', e => { zoom = Math.min(2.5, Math.max(.7, zoom * (e.deltaY < 0 ? 1.1 : .9))); resize(); e.preventDefault(); }, { passive: false });

  // picking
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect(); ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera); const hit = ray.intersectObjects(desks.map(d => d.group), true)[0];
    if (!hit) return null; let o = hit.object; while (o && !desks.find(d => d.group === o)) o = o.parent; return desks.find(d => d.group === o)?.bot || null;
  }

  // project a bot's head position to screen pixels
  const v = new THREE.Vector3();
  function screenPos(b) { b.head.getWorldPosition(v); v.y += .7; v.project(camera); return { x: (v.x + 1) / 2 * container.clientWidth, y: (1 - v.y) / 2 * container.clientHeight }; }

  return { scene, camera, renderer, desks, addBot, setLighting, pick, screenPos, render: () => renderer.render(scene, camera) };
}

// Per-frame animation for one bot based on its status.
const tmpC = new THREE.Color();
export function animateBot(b, t, focused) {
  const s = b.status, p = t * 1 + b.phase;
  const col = new THREE.Color(STATUS_COLORS[s]);
  let ry = 0, tz = 0, hx = 0, hz = 0, lx = -1.1, rx = -1.1, lz = 0, y = .65, shake = 0;
  if (s === 'coding') { lx = -1.15 + Math.sin(p * 18) * .15; rx = -1.15 + Math.cos(p * 18) * .15; hx = .1 + Math.sin(p * 4) * .03; }
  if (s === 'browsing') { hz = Math.sin(p * .8) * .12; hx = .05; rx = -1.0 + Math.sin(p * 3) * .05; lx = -.2; }
  if (s === 'thinking') { rx = -2.6; lz = 0; hz = .2; hx = -.15; lx = -.3; ry = Math.sin(p * .6) * .25; }
  if (s === 'needs_you') { rx = -2.9 + Math.sin(p * 6) * .25; lx = -.3; hx = -.2; ry = Math.PI * .15 * Math.sin(p * 1.5); }
  if (s === 'idle') { tz = -.25; lx = -.15; rx = -.15; hx = -.2 + Math.sin(p * .5) * .03; }
  if (s === 'error') { shake = Math.sin(p * 40) * .04; lx = -2.2; rx = -2.2; hx = .25; }
  if (s === 'done') { const k = Math.max(0, Math.sin(p * 7)); y += k * .35; lx = rx = -3; }
  b.group.position.y = y; b.group.position.x = shake; b.group.rotation.y = Math.PI + ry;
  b.torso.rotation.x = tz; b.head.rotation.set(hx, 0, hz); b.armL.rotation.set(lx, 0, lz); b.armR.rotation.x = rx;
  // body dims when idle, tints red on error
  tmpC.copy(b.baseColor); if (s === 'idle') tmpC.multiplyScalar(.5); if (s === 'error') tmpC.lerp(new THREE.Color(0xff3344), .6);
  b.bodyM.color.copy(tmpC); b.bodyM.emissive.set(s === 'error' ? 0x550000 : focused ? 0x222222 : 0);
  b.visorM.emissive.copy(col); b.visorM.emissiveIntensity = s === 'idle' ? .2 : 1;
  // desk screens + glow ring
  const d = b.desk, on = s !== 'idle';
  d.screenM.emissive.copy(on ? col : tmpC.set(0x111820)); d.screenM.emissiveIntensity = on ? .55 + (s === 'coding' ? Math.random() * .1 : 0) : .4;
  d.lidM.emissive.copy(d.screenM.emissive); d.lidM.emissiveIntensity = on ? .5 : .3;
  const pulse = (Math.sin(t * 5) + 1) / 2;
  d.ringM.color.copy(col);
  d.ringM.opacity = focused ? .9 : s === 'needs_you' ? .45 + pulse * .5 : s === 'error' ? .5 + pulse * .4 : s === 'done' ? .8 : s === 'idle' ? 0 : .22;
}
