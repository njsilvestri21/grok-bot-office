// Office scene: floor, furniture, desks and low-poly bot characters.
import * as THREE from 'three';

export const STATUS_COLORS = { coding:'#4f9dff', browsing:'#38c7d6', thinking:'#b18cff', needs_you:'#ffb02e', idle:'#6b7385', error:'#ff4d5e', done:'#3fd17a' };
const COLS = 7, SPX = 4.2, SPZ = 4.4;
// Avatar colors by name; unknown/missing -> soft light gray.
export const AVATAR_COLORS = { cyan: '#19c3dc', black: '#23252c', gray: '#9aa1ad', orange: '#f2852b', green: '#3dbb57', blue: '#3b6fe0', default: '#e3e6eb' };

// Clay avatar bodies, about 1.1 wide x 1.0 tall, resting on y=0, facing +z.
// Each returns { parts: [geometry...], eyeY, eyeZ }.
function lathe(fn) { const pts = []; for (let i = 0; i <= 24; i++) { const th = -Math.PI / 2 + i / 24 * Math.PI; pts.push(new THREE.Vector2(Math.max(Math.cos(th) * .55, 1e-4), (Math.sin(th) + 1) * .5)); } return new THREE.LatheGeometry(pts, 32); }
function extruded(shape, w) {   // flat 2D outline -> puffy beveled tile standing upright
  const g = new THREE.ExtrudeGeometry(shape, { depth: .4, bevelEnabled: true, bevelSize: .12, bevelThickness: .16, bevelSegments: 5, curveSegments: 16 });
  g.computeBoundingBox(); const bb = g.boundingBox; g.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
  g.computeBoundingBox(); const k = w / (g.boundingBox.max.x - g.boundingBox.min.x); g.scale(k, k, 1); g.computeVertexNormals(); return g;
}
function polygon(n, rOut, rIn, rot = 0) { const s = new THREE.Shape(); const m = rIn ? n * 2 : n; for (let i = 0; i < m; i++) { const a = rot + i / m * Math.PI * 2, r = rIn && i % 2 ? rIn : rOut; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } return s; }
const SHAPE_BUILDERS = {
  blob:   () => ({ parts: [lathe()], eyeY: .55, eyeZ: .56 }),
  pebble: () => { const g = lathe(); g.scale(1.15, .72, .95); return { parts: [g], eyeY: .42, eyeZ: .53 }; },
  hex:    () => ({ parts: [extruded(polygon(6, .5, 0, Math.PI / 2), 1.0)], eyeY: .55, eyeZ: .38 }),
  square: () => { const s = new THREE.Shape(), r = .12, h = .42; s.moveTo(-h + r, -h); s.lineTo(h - r, -h); s.quadraticCurveTo(h, -h, h, -h + r); s.lineTo(h, h - r); s.quadraticCurveTo(h, h, h - r, h); s.lineTo(-h + r, h); s.quadraticCurveTo(-h, h, -h, h - r); s.lineTo(-h, -h + r); s.quadraticCurveTo(-h, -h, -h + r, -h);
            return { parts: [extruded(s, 1.0)], eyeY: .55, eyeZ: .38 }; },
  star:   () => ({ parts: [extruded(polygon(5, .6, .3, Math.PI / 2), 1.2)], eyeY: .5, eyeZ: .38 }),
  sparkle:() => { const s = new THREE.Shape(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, b = a + Math.PI / 4, n = a + Math.PI / 2;
              if (!i) s.moveTo(Math.cos(a) * .6, Math.sin(a) * .6); s.quadraticCurveTo(Math.cos(b) * .14, Math.sin(b) * .14, Math.cos(n) * .6, Math.sin(n) * .6); }
            return { parts: [extruded(s, 1.15)], eyeY: .58, eyeZ: .38 }; },
  cloud:  () => ({ parts: [[0, .42, 0, .4], [-.36, .3, .02, .3], [.36, .3, .02, .3], [-.17, .66, -.02, .3], [.2, .64, -.02, .27]].map(([x, y, z, r]) => { const g = new THREE.SphereGeometry(r, 24, 16); g.translate(x, y, z); return g; }), eyeY: .45, eyeZ: .41 }),
  pumpkin:() => { const g = new THREE.SphereGeometry(.56, 48, 24), v = g.attributes.position;
            for (let i = 0; i < v.count; i++) { const x = v.getX(i), z = v.getZ(i), a = Math.atan2(z, x), k = 1 - .1 * Math.pow(1 - Math.abs(Math.sin(a * 4)), 6); /* 8 soft grooves */ v.setXYZ(i, x * k, v.getY(i) * .78 + .44, z * k); }
            g.computeVertexNormals(); return { parts: [g], eyeY: .5, eyeZ: .5, stem: true }; },
};

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
  const W = COLS * SPX + 6, D = rows * SPZ + 13;   // extra depth up front for the lounge

  // isometric orthographic camera
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camera.position.set(30, 24.5, 30); /* ~30° elevation like the reference */ camera.lookAt(0, 0, 0);
  let zoom = Math.min(4, Math.max(.7, +new URLSearchParams(location.search).get('zoom') || 1));

  // lights
  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x30261c, .6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(-15, 30, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -W/2-4, right: W/2+4, top: D/2+4, bottom: -D/2-4 }); sun.shadow.bias = -0.0005;
  scene.add(sun);
  const lampLights = [];

  // floor, walls, rugs
  const floor = box(W, .3, D, mat(0xa98260, { roughness: .8 })); floor.position.y = -.15; floor.receiveShadow = true; scene.add(floor);
  const plankM = mat(0x8f6a4c);
  for (let i = .9; i < W; i += .9) { const s = box(.03, .01, D, plankM); s.position.set(-W/2 + i, .005, 0); scene.add(s); }
  for (let i = 0; i < W / .9; i++) for (let z = -D/2 + (i % 3) * 1.4; z < D/2; z += 4.2) { const s = box(.9, .01, .03, plankM); s.position.set(-W/2 + i * .9 + .45, .006, z); scene.add(s); }
  const wallM = mat(0xc9ccd6, { emissive: 0x8a8fa0, emissiveIntensity: .35 });
  const trimM = mat(0xe8eaef);
  [at(box(W, .25, .35, trimM), 0, .12, -D/2 + .05), at(box(.35, .25, D, trimM), -W/2 + .05, .12, 0)].forEach(m => scene.add(m));
  const wb = box(W, 4, .3, wallM); wb.position.set(0, 2, -D/2); scene.add(wb);
  const wl = box(.3, 4, D, wallM); wl.position.set(-W/2, 2, 0); scene.add(wl);
  // windows on back wall
  const wc = Object.assign(document.createElement('canvas'), { width: 256, height: 160 }), wx = wc.getContext('2d');
  wx.fillStyle = '#121a33'; wx.fillRect(0, 0, 256, 160);
  for (let i = 0; i < 140; i++) { wx.fillStyle = Math.random() < .5 ? '#ffe9a8' : '#8fb4ff'; wx.globalAlpha = .3 + Math.random() * .6; wx.fillRect(Math.random() * 256, 30 + Math.random() * 130, 2, 2); }
  wx.globalAlpha = 1; wx.fillStyle = '#2a3150'; wx.fillRect(126, 0, 4, 160); wx.fillRect(0, 78, 256, 4);
  const winM = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(wc), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: .4, roughness: .4 });
  winM.emissiveMap = winM.map;
  const frameM = mat(0x2c3240);
  for (let x = -W/2 + 13; x < W/2 - 3; x += 7) { const f = box(3.5, 2.1, .08, frameM); f.position.set(x, 2.4, -D/2 + .16); scene.add(f); const w = box(3.3, 1.9, .05, winM); w.position.set(x, 2.4, -D/2 + .2); scene.add(w); }
  for (let z = -D/2 + 7; z < D/2 - 6; z += 8) { const f = box(.08, 2.1, 3.5, frameM); f.position.set(-W/2 + .16, 2.4, z); scene.add(f); const w = box(.05, 1.9, 3.3, winM); w.position.set(-W/2 + .2, 2.4, z); scene.add(w); }
  // door, clock, whiteboard
  scene.add(at(box(1.6, 3, .1, mat(0x5a3a2a)), -W/2 + 11, 1.5, -D/2 + .18));
  const clock = cyl(.4, .4, .06, mat(0xf4f4f6)); clock.rotation.x = Math.PI / 2; clock.position.set(W/2 - 6, 3.2, -D/2 + .2); scene.add(clock);
  scene.add(at(box(3, 1.4, .06, mat(0xf7f8fa)), W/2 - 2.5, 2.2, -D/2 + .2));
  // pink neon "office" sign on the back wall
  const cv = Object.assign(document.createElement('canvas'), { width: 512, height: 160 }), cx = cv.getContext('2d');
  cx.font = 'italic 700 110px system-ui, sans-serif'; cx.textAlign = 'center'; cx.shadowColor = '#ff4fb0'; cx.shadowBlur = 28; cx.fillStyle = '#ffd0ec';
  cx.fillText('office', 256, 115); cx.fillText('office', 256, 115);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.25), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true }));
  neon.position.set(-W/2 + 6.5, 3, -D/2 + .17); scene.add(neon);
  const gc = Object.assign(document.createElement('canvas'), { width: 128, height: 128 }), gx = gc.getContext('2d');
  const grd = gx.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = grd; gx.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(gc);
  const glow = (color, w, h, op) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
  const bloom = glow(0xff4fb0, 9, 6, .55); bloom.position.set(-W/2 + 6.5, 3, -D/2 + .2); scene.add(bloom);
  const neonLight = new THREE.PointLight(0xff4fb0, 6, 9, 1.5); neonLight.position.set(-W/2 + 6.5, 3, -D/2 + 1.2); scene.add(neonLight);
  
  // bookshelves along back + left wall
  const shelfM = mat(0x6b4a32); const bookCols = [0xc0504d, 0x4f81bd, 0x9bbb59, 0xf2c14e, 0x8064a2, 0x4bacc6];
  const bookshelf = (x, z, ry) => { const g = new THREE.Group(); g.add(at(box(2.4, 2.6, .6, shelfM), 0, 1.3, 0));
    for (let s = 0; s < 3; s++) for (let b = 0; b < 8; b++) { const h = .45 + Math.random() * .2; const bk = box(.22, h, .45, mat(bookCols[(s * 8 + b) % 6])); bk.position.set(-1 + b * .27, .35 + s * .8 + h/2, .1); g.add(bk); }
    g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); };
  bookshelf(-W/2 + 2.4, -D/2 + .5, 0); bookshelf(-W/2 + .5, D/2 - 9, Math.PI/2);
  // plants
  const plant = (x, z, s = 1) => { const g = new THREE.Group(); g.add(at(cyl(.35, .28, .6, mat(0xb5703c)), 0, .3, 0));
    for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(.45 + Math.random() * .2, 0), mat(0x3f8f4f, { flatShading: true })); l.castShadow = true; l.position.set((Math.random() - .5) * .6, .9 + Math.random() * .7, (Math.random() - .5) * .6); g.add(l); }
    g.scale.setScalar(s); g.position.set(x, 0, z); scene.add(g); };
  plant(-W/2 + 4.6, -D/2 + 1, 1.1); plant(W/2 - 1, -D/2 + 1.2, 1.2); plant(-W/2 + 1, D/2 - 1); plant(W/2 - 1, D/2 - 1, 1.1); plant(1, -D/2 + 1, .9); plant(-W/2 + 1, -D/2 + 9, 1);
  // lounge up front: red round rug with beanbags + table (left), teal sofa on a blue rug (right), floor lamps
  const LZ = D/2 - 3.2;
  const redRug = cyl(3, 3, .03, mat(0xb83a3a)); redRug.position.set(-W/2 + 6, .02, LZ); redRug.receiveShadow = true; scene.add(redRug);
  const redIn = cyl(2.3, 2.3, .035, mat(0xc94a48)); redIn.position.set(-W/2 + 6, .025, LZ); scene.add(redIn);
  const rt = cyl(1.1, 1.1, .12, mat(0xc79a6a)); rt.position.set(-W/2 + 6, .55, LZ); rt.castShadow = true; scene.add(rt); scene.add(at(cyl(.12, .12, .5, mat(0x7a5a3a)), -W/2 + 6, .25, LZ));
  const beanCols = [0xe05a8a, 0x6a8fe0, 0xf2b03d, 0x47b88a];
  [[-2.2, -.6], [2.1, -.9], [-1.4, 1.9], [1.6, 1.7]].forEach(([dx, dz], i) => { const bb = new THREE.Mesh(new THREE.SphereGeometry(.7, 24, 16), mat(beanCols[i], { roughness: .9 })); bb.scale.set(1, .55, 1); bb.position.set(-W/2 + 6 + dx, .35, LZ + dz); bb.castShadow = true; scene.add(bb); });
  const blueRug = box(7, .03, 4.2, mat(0x2b3f8a)); blueRug.position.set(W/2 - 7, .02, LZ + .3); blueRug.receiveShadow = true; scene.add(blueRug);
  const blueIn = box(6.2, .035, 3.4, mat(0x34509f)); blueIn.position.set(W/2 - 7, .025, LZ + .3); scene.add(blueIn);
  const sofa = new THREE.Group(); const sm = mat(0x2fa59a, { roughness: .9 });
  sofa.add(at(box(4.2, .55, 1.3, sm), 0, .4, 0), at(box(4.2, 1, .35, sm), 0, .9, -.5), at(box(.35, .8, 1.3, sm), -1.95, .55, 0), at(box(.35, .8, 1.3, sm), 1.95, .55, 0));
  sofa.children.forEach(m => m.castShadow = true);
  sofa.position.set(W/2 - 7, 0, LZ - 1.2); scene.add(sofa);
  const tbl = box(2, .12, 1, mat(0xc79a6a)); tbl.position.set(W/2 - 7, .5, LZ + 1); tbl.castShadow = true; scene.add(tbl);
  const water = cyl(.3, .3, 1.3, mat(0xd8e6f2)); water.position.set(W/2 - 1.5, .65, D/2 - 7); scene.add(water);
  const floorLamp = (x, z) => { scene.add(at(cyl(.04, .04, 2.4, mat(0x2a2a2a)), x, 1.2, z), at(cyl(.3, .45, .5, mat(0xffe9c4, { emissive: 0xffc870, emissiveIntensity: 1 })), x, 2.5, z));
    const p = new THREE.PointLight(0xffc27a, 0, 9, 1.6); p.position.set(x, 2.2, z); scene.add(p); lampLights.push(p);
    const pool = glow(0xffb45a, 6, 6, .35); pool.rotation.x = -Math.PI / 2; pool.position.set(x, .04, z); scene.add(pool); pools.push(pool); };
  const pools = [];
  floorLamp(W/2 - 2.5, LZ - 1.4); floorLamp(-W/2 + 1.5, LZ - 2.5);

  // desks
  const desks = [];
  for (let i = 0; i < deskCount; i++) {
    const c = i % COLS, r = Math.floor(i / COLS);
    const x = -((COLS - 1) * SPX) / 2 + c * SPX, z = -D/2 + 4 + r * SPZ + .6;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI; scene.add(g); // desks face the camera so bot faces show
    const top = box(2.6, .1, 1.3, mat(0xf2f3f5)); top.receiveShadow = true; top.position.y = 1; g.add(top);
    [[-1.2, -.55], [1.2, -.55], [-1.2, .55], [1.2, .55]].forEach(([lx, lz]) => { const l = box(.08, 1, .08, mat(0xd5d8de)); l.position.set(lx, .5, lz); g.add(l); });
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
    g.add(at(box(.6, .85, 1.1, mat(0xe6e8ec)), 1, .45, 0));   // drawer cabinet
    const mug = cyl(.08, .08, .16, mat([0xe74c3c, 0xf1c40f, 0xecf0f1][i % 3])); mug.position.set(1.1, 1.13, -.3); g.add(mug);
    const lamp = new THREE.Group(); lamp.add(cyl(.02, .02, .5, mat(0x222222)), at(cyl(.05, .16, .14, mat(0xffe6a8, { emissive: 0xffc870, emissiveIntensity: 0 })), 0, .28, 0));
    lamp.position.set(-1.1, 1.3, -.35); g.add(lamp);
    // chair
    const chair = new THREE.Group(); const cm = mat(0x6b717e);
    chair.add(at(box(.8, .12, .8, cm), 0, .6, 0), at(box(.8, .8, .1, cm), 0, 1, .4), at(cyl(.05, .05, .55, mat(0x3a3e46)), 0, .3, 0), at(cyl(.4, .4, .05, mat(0x3a3e46)), 0, .05, 0));
    chair.position.set(0, 0, 1.15); g.add(chair);
    // status ring (glow) on floor
    const ring = glow(0xffffff, 3.6, 3.6, 0), ringM = ring.material; ring.rotation.x = -Math.PI/2; ring.position.set(0, .05, .8); g.add(ring);
    const sg = glow(0xffffff, 2.2, 1.4, 0); sg.position.set(-.45, 1.45, -.3); g.add(sg);
    desks.push({ group: g, screenM, lidM, lampShade: lamp.children[1].material, ringM, glowM: sg.material, chair, bot: null });
  }
  // a few real lamp point lights for evening/night ambience
  for (let i = 0; i < 4; i++) { const p = new THREE.PointLight(0xffc27a, 0, 14, 1.5); p.position.set(-W/2 + W * (i + .5) / 4, 3.5, 0); scene.add(p); lampLights.push(p); }

  // Blob bots: one soft limbless shape per bot (sphere, dome or teardrop) with two white eyes.
  function addBot(deskIdx, bot) {
    const d = desks[deskIdx];
    const colorName = AVATAR_COLORS[bot.color] ? bot.color : 'default';
    const color = new THREE.Color(AVATAR_COLORS[colorName]);
    const bodyM = mat(color, { roughness: .55 });
    const rim = colorName === 'black' ? new THREE.Color(0x4a5878) : null;   // dark bots get a faint glow so they read at night
    const g = new THREE.Group(); g.position.set(0, .62, 1.15); g.rotation.y = Math.PI; g.scale.setScalar(1.4); d.group.add(g); // seated, facing the monitor
    const spec = (SHAPE_BUILDERS[bot.shape] || SHAPE_BUILDERS.blob)();
    const body = new THREE.Group(); g.add(body);
    spec.parts.forEach(geo => { const m = new THREE.Mesh(geo, bodyM); m.castShadow = true; body.add(m); });
    if (spec.stem) { const st = at(cyl(.05, .07, .2, mat(0x5b7a2e)), 0, .93, 0); st.rotation.z = .2; body.add(st); }
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyes = new THREE.Group(); eyes.position.set(0, spec.eyeY, spec.eyeZ); g.add(eyes);
    const open = [-.16, .16].map(x => at(new THREE.Mesh(new THREE.CapsuleGeometry(.065, .13, 4, 10), eyeM), x, 0, 0));
    const happy = [-.16, .16].map(x => at(new THREE.Mesh(new THREE.TorusGeometry(.08, .028, 6, 12, Math.PI), eyeM), x, -.02, 0));
    open.forEach(e => eyes.add(e)); happy.forEach(e => eyes.add(e));
    const ticks = new THREE.Group(); g.add(ticks);   // little "typing" motion marks
    [[-.62, .75, -.5], [.62, .8, .5], [0, 1.15, 0]].forEach(([x, y, r]) => { const tk = at(box(.03, .14, .03, eyeM), x, y, .1); tk.rotation.z = r; tk.castShadow = false; ticks.add(tk); });
    const b = { ...bot, group: g, body, eyes, open, happy, ticks, bodyM, rim, eyeY: spec.eyeY, desk: d, baseColor: color, phase: Math.random() * 6 };
    d.bot = b; return b;
  }

  const LIGHTING = {
    day:     { bg: 0x1a1d26, hemi: .9, sun: 1.6, sunC: 0xfff4e0, lamps: 0, shade: 0, win: .5 },
    evening: { bg: 0x1a1726, hemi: .65, sun: .7, sunC: 0xff9a5a, lamps: 14, shade: .8, win: .3 },
    night:   { bg: 0x0a0d14, hemi: .3, sun: .3, sunC: 0x7f9cff, lamps: 22, shade: 1.6, win: .05 },
  };
  function setLighting(name) {
    const L = LIGHTING[name]; scene.background = new THREE.Color(L.bg);
    hemi.intensity = L.hemi; sun.intensity = L.sun; sun.color.set(L.sunC); winM.emissiveIntensity = L.win;
    lampLights.forEach(p => p.intensity = L.lamps); pools.forEach(m => m.material.opacity = L.shade * .25); bloom.material.opacity = .25 + L.shade * .25; desks.forEach(d => d.lampShade.emissiveIntensity = L.shade);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h);
    const aspect = w / h, view = Math.max(D * .5, (W * .47) / aspect) / zoom;
    Object.assign(camera, { left: -view * aspect, right: view * aspect, top: view, bottom: -view }); camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();
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
  function screenPos(b) { b.group.getWorldPosition(v); v.y += 1.65; v.project(camera); return { x: (v.x + 1) / 2 * container.clientWidth, y: (1 - v.y) / 2 * container.clientHeight }; }

  return { scene, camera, renderer, desks, addBot, setLighting, pick, screenPos, render: () => renderer.render(scene, camera) };
}

// Per-frame animation for one bot based on its status.
const tmpC = new THREE.Color();
export function animateBot(b, t, focused) {
  const s = b.status, p = t + b.phase;
  const col = new THREE.Color(STATUS_COLORS[s]);
  let y = .62 + Math.sin(p * 1.6) * .03, sq = 1 + Math.sin(p * 1.6 + 1) * .025, lean = 0, sway = 0, shake = 0, eyeY = 0, eyeOpen = 1, happy = false;
  if (s === 'coding') { sq = 1 + Math.sin(p * 14) * .05; y += Math.abs(Math.sin(p * 7)) * .04; }
  if (s === 'browsing') { lean = .18 + Math.sin(p * 1.2) * .03; }
  if (s === 'thinking') { sway = Math.sin(p * .9) * .12; eyeY = .07; }
  if (s === 'needs_you') { y += Math.abs(Math.sin(p * 4)) * .08; }
  if (s === 'idle') { eyeOpen = .35; }
  if (s === 'error') { shake = Math.sin(p * 40) * .04; }
  if (s === 'done') { y += Math.max(0, Math.sin(p * 7)) * .4; happy = true; }
  b.group.position.set(shake, y, 1.15);
  b.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  b.group.rotation.set(lean, Math.PI, sway);
  b.eyes.position.y = b.eyeY * sq + eyeY;
  b.open.forEach(e => { e.visible = !happy; e.scale.y = eyeOpen; });
  b.happy.forEach(e => e.visible = happy);
  b.ticks.visible = s === 'coding'; b.ticks.children.forEach((tk, i) => tk.scale.setScalar(.6 + .4 * Math.abs(Math.sin(p * 9 + i))));
  // matte color: dimmer when idle, red tint on error
  tmpC.copy(b.baseColor); if (s === 'idle') tmpC.multiplyScalar(.55); if (s === 'error') tmpC.lerp(new THREE.Color(0xff3344), .55);
  b.bodyM.color.copy(tmpC); b.bodyM.emissive.copy(s === 'needs_you' ? col : b.rim || b.baseColor); b.bodyM.emissiveIntensity = s === 'needs_you' ? .25 : focused ? .2 : s === 'error' ? .15 : b.rim ? (s === 'idle' ? .2 : .35) : 0;
  // desk screens + floor glow
  const d = b.desk, on = s !== 'idle';
  d.screenM.emissive.copy(on ? col : tmpC.set(0x111820)); d.screenM.emissiveIntensity = on ? .55 : .4;
  d.lidM.emissive.copy(d.screenM.emissive); d.lidM.emissiveIntensity = on ? .5 : .3;
  const pulse = (Math.sin(t * 5) + 1) / 2;
  d.ringM.color.copy(col); d.glowM.color.copy(col).lerp(tmpC.set(0xffffff), .35); d.glowM.opacity = on ? .35 : 0;
  d.ringM.opacity = focused ? .9 : s === 'needs_you' ? .45 + pulse * .5 : s === 'error' ? .5 + pulse * .4 : s === 'done' ? .8 : s === 'idle' ? 0 : .3;
}
