// 3D (three.js) renderer. Draws the SAME solved primitives (rig.js solve()) as the 2D SVG renderer.
// three.js is loaded lazily from a pinned CDN URL; callers fall back to 2D if loadThree() rejects.
// Render-on-demand: the caller drives animation by calling draw() each frame (draw() renders).
import { solve } from './rig.js';

export const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

let threeP = null;
export function loadThree() {
  if (!threeP) threeP = import(THREE_URL).catch((err) => { threeP = null; throw err; });
  return threeP;
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const ok = !!gl;
    if (gl && gl.getExtension) { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); }
    return ok;
  } catch (e) { return false; }
}

const MATS = { skin: 'sk', top: 'tp', legs: 'lg', hair: 'hr' };
const FALLBACK = { sk: '#e2b393', tp: '#4f8678', lg: '#4a5875', hr: '#523a2c' };
const rad = (d) => (d * Math.PI) / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Renderer3D {
  constructor(host, THREE, { floor = true } = {}) {
    this.T = THREE; this.host = host; this.floorOn = floor;
    const T = THREE;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fig3d';
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;outline:none';
    host.appendChild(this.canvas);
    this.renderer = new T.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(28, 1, 5, 4000);
    // lights
    this.hemi = new T.HemisphereLight(0xfff6ec, 0xb8a898, 1.35);
    this.key = new T.DirectionalLight(0xfff1e0, 2.1);
    this.rim = new T.DirectionalLight(0xdfeaff, 0.55);
    this.scene.add(this.hemi, this.key, this.rim, this.key.target, this.rim.target);
    // shared geometry
    this.sphereG = new T.SphereGeometry(1, 28, 20);
    this.cylG = new T.CylinderGeometry(1, 1, 1, 24, 1, true);
    this.geoms = [this.sphereG, this.cylG];
    this.mats = {};
    for (const [m, v] of Object.entries(MATS)) {
      this.mats[m] = new T.MeshStandardMaterial({ color: FALLBACK[v], roughness: m === 'hair' ? 0.7 : 0.82, metalness: 0 });
    }
    this.figure = new T.Group();
    this.scene.add(this.figure);
    this.items = new Map(); // id -> { kind, meshes, r0, r1 }
    // temporaries
    this.m4 = new T.Matrix4(); this.v0 = new T.Vector3(); this.v1 = new T.Vector3(); this.v2 = new T.Vector3();
    this.q = new T.Quaternion(); this.up = new T.Vector3(0, 1, 0);
    this.target = new T.Vector3(0, 100, 0);
    // ground
    this.shadowMat = new T.MeshBasicMaterial({ map: this._radialTex([[0, 'rgba(28,24,20,.55)'], [0.45, 'rgba(28,24,20,.22)'], [1, 'rgba(28,24,20,0)']]), transparent: true, depthWrite: false, opacity: 1 });
    this.shadow = new T.Mesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.shadowMat);
    this.shadow.position.y = 0.15; this.shadow.renderOrder = 1;
    this.scene.add(this.shadow);
    this.geoms.push(this.shadow.geometry);
    this.floorMat = new T.MeshBasicMaterial({ map: this._radialTex([[0, 'rgba(255,255,255,.55)'], [0.7, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']]), transparent: true, depthWrite: false, opacity: 1 });
    this.floorMesh = new T.Mesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.floorMat);
    this.floorMesh.position.y = 0; this.floorMesh.scale.set(520, 1, 520); this.floorMesh.visible = floor;
    this.scene.add(this.floorMesh);
    this.geoms.push(this.floorMesh.geometry);
    this._makeFace();
    // props
    this.propGroup = new T.Group(); this.scene.add(this.propGroup);
    this.propSig = ''; this.propObjs = [];
    this.propMats = {
      block: new T.MeshStandardMaterial({ color: '#7ba7a0', roughness: 0.9 }),
      cush: new T.MeshStandardMaterial({ color: '#d8b4a0', roughness: 0.95 }),
      strap: new T.MeshStandardMaterial({ color: '#c9794f', roughness: 0.8 }),
      wall: new T.MeshStandardMaterial({ color: '#d9d6cf', roughness: 1, transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false }),
    };
    // view state
    this.defAz = 28; this.defEl = 6; this.dAz = 0; this.dEl = 0; this.zoom = 1;
    this.onChange = null; this.S = null; this.w = 0; this.h = 0; this._disposed = false;
    this._readPalette();
    this._bind();
    this.resize();
  }

  // ---------------------------------------------------------------- helpers
  _radialTex(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new this.T.CanvasTexture(c); t.colorSpace = this.T.SRGBColorSpace; return t;
  }

  _readPalette() {
    try {
      const cs = getComputedStyle(document.documentElement);
      const get = (n, d) => (cs.getPropertyValue(n).trim() || d);
      for (const [m, v] of Object.entries(MATS)) this.mats[m].color.set(get('--' + v, FALLBACK[v]));
      this.propMats.block.color.set(get('--prop-block', '#7ba7a0'));
      this.propMats.cush.color.set(get('--prop-cush', '#d8b4a0'));
      this.propMats.strap.color.set(get('--prop-strap', '#c9794f'));
      this.propMats.wall.color.set(get('--prop-wall', '#d9d6cf'));
      this.faceMats.ink.color.set(get('--fig-ink', '#4a3328'));
      const dark = (() => { const bg = get('--bg', '#f6f3ee'); const c = new this.T.Color(bg); return (c.r + c.g + c.b) / 3 < 0.4; })();
      this.floorMat.color.set(get('--floor', '#b9b2a5'));
      this.floorMat.map.needsUpdate = false;
      this.floorMat.opacity = dark ? 0.2 : 0.3;
      this.hemi.intensity = dark ? 1.1 : 1.35;
      this.shadowMat.opacity = dark ? 0.9 : 1;
    } catch (e) { /* keep defaults */ }
  }

  _makeFace() {
    const T = this.T;
    this.faceMats = {
      ink: new T.MeshBasicMaterial({ color: '#4a3328' }),
      mouth: new T.MeshBasicMaterial({ color: '#9a5a4c' }),
      cheek: new T.MeshBasicMaterial({ color: '#e58c7e', transparent: true, opacity: 0.5, depthWrite: false }),
    };
    this.faceG = new T.Group(); this.faceG.matrixAutoUpdate = false; this.faceG.matrixWorldNeedsUpdate = true;
    this.scene.add(this.faceG);
    const rx = 11, ry = 13.5, rz = 8.8;
    // point on the head ellipsoid surface (slightly proud), head-local coords
    const surf = (y, z, lift = 0.35) => {
      const k = 1 - (y / ry) ** 2 - (z / rz) ** 2;
      return new T.Vector3(rx * Math.sqrt(Math.max(0.02, k)) + lift, y, z);
    };
    const arc = (pts, rad0, mat, segs = 10) => {
      const g = new T.TubeGeometry(new T.CatmullRomCurve3(pts), segs, rad0, 6, false);
      this.geoms.push(g);
      const m = new T.Mesh(g, mat); this.faceG.add(m); return m;
    };
    for (const s of [1, -1]) {
      const zc = 3.8 * s;
      // closed calm eye: a downward-curving arc
      arc([surf(1.9, zc - 1.9 * s), surf(1.0, zc), surf(1.9, zc + 1.9 * s)], 0.34, this.faceMats.ink);
      arc([surf(4.6, zc - 2.4 * s), surf(5.3, zc), surf(4.4, zc + 2.6 * s)], 0.28, this.faceMats.ink);
      const ch = new T.Mesh(this.sphereG, this.faceMats.cheek);
      const p = surf(-2.6, 5.6 * s, -0.4);
      ch.position.copy(p); ch.scale.set(0.6, 1.6, 2.4); ch.rotation.y = -s * 0.5;
      this.faceG.add(ch);
    }
    arc([surf(-5.9, -2.2), surf(-6.7, 0), surf(-5.9, 2.2)], 0.3, this.faceMats.mouth);
  }

  _bind() {
    const cv = this.canvas;
    this.ptrs = new Map(); this.pinch0 = 0; this.zoom0 = 1; this.tween = null;
    this._down = (e) => {
      cv.setPointerCapture?.(e.pointerId);
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this._stopTween();
      if (this.ptrs.size === 2) { this.pinch0 = this._pinchDist(); this.zoom0 = this.zoom; }
      cv.style.cursor = 'grabbing';
    };
    this._move = (e) => {
      const p = this.ptrs.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (this.ptrs.size === 1) {
        this.dAz -= dx * 0.45;
        this.dEl = clamp(this.defEl + this.dEl + dy * 0.35, -10, 80) - this.defEl;
      } else if (this.ptrs.size === 2 && this.pinch0 > 0) {
        this.zoom = clamp(this.zoom0 * (this.pinch0 / Math.max(1, this._pinchDist())), 0.45, 2.4);
      }
      this._changed();
    };
    this._up = (e) => {
      this.ptrs.delete(e.pointerId);
      try { cv.releasePointerCapture?.(e.pointerId); } catch (err) { /* */ }
      if (this.ptrs.size < 2) this.pinch0 = 0;
      if (!this.ptrs.size) cv.style.cursor = 'grab';
    };
    this._wheel = (e) => {
      e.preventDefault();
      this.zoom = clamp(this.zoom * Math.exp(e.deltaY * 0.0012), 0.45, 2.4);
      this._changed();
    };
    this._dbl = () => this.reset();
    cv.addEventListener('pointerdown', this._down);
    cv.addEventListener('pointermove', this._move);
    cv.addEventListener('pointerup', this._up);
    cv.addEventListener('pointercancel', this._up);
    cv.addEventListener('wheel', this._wheel, { passive: false });
    cv.addEventListener('dblclick', this._dbl);
    this._ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.resize()) : null;
    this._ro?.observe(this.host);
    this._mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    this._theme = () => { this._readPalette(); this.renderNow(); };
    this._mq?.addEventListener?.('change', this._theme);
    this._mo = new MutationObserver(this._theme);
    this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  }
  _pinchDist() {
    const a = [...this.ptrs.values()]; if (a.length < 2) return 0;
    return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
  }
  _changed() { this.renderNow(); if (this.onChange) this.onChange(this); }
  _stopTween() { if (this.tween) { cancelAnimationFrame(this.tween); this.tween = null; } }

  // ---------------------------------------------------------------- public view API
  setDefaultCamera(az, el) {
    if (Number.isFinite(az)) this.defAz = az;
    if (Number.isFinite(el)) this.defEl = el;
  }

  reset({ animate = true } = {}) {
    this._stopTween();
    this.dAz = ((((this.dAz + 180) % 360) + 360) % 360) - 180;
    if (!animate) { this.dAz = 0; this.dEl = 0; this.zoom = 1; this._changed(); return; }
    const a0 = this.dAz, e0 = this.dEl, z0 = this.zoom, t0 = performance.now();
    const step = (t) => {
      const u = clamp((t - t0) / 320, 0, 1), k = 1 - (1 - u) ** 3;
      this.dAz = a0 * (1 - k); this.dEl = e0 * (1 - k); this.zoom = z0 + (1 - z0) * k;
      this._changed();
      this.tween = u < 1 ? requestAnimationFrame(step) : null;
    };
    this.tween = requestAnimationFrame(step);
  }

  resize() {
    if (this._disposed) return;
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.w = w; this.h = h;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.S) this.renderNow();
  }

  // ---------------------------------------------------------------- scene update
  draw(frame, { props = [], e = 1, breath = 0, cam } = {}) {
    if (this._disposed) return null;
    if (cam) this.setDefaultCamera(cam.az, cam.el);
    const S = solve(frame, { breath });
    this.S = S;
    for (const p of S.prims) (p.kind === 'cap' ? this._cap(p) : this._ell(p));
    this._face(S);
    this._props(props, S, e);
    this._ground(S);
    this.renderNow();
    return S;
  }

  _ell(p) {
    let it = this.items.get(p.id);
    if (!it) {
      const mesh = new this.T.Mesh(this.sphereG, this.mats[p.mat] || this.mats.skin);
      mesh.matrixAutoUpdate = false; mesh.frustumCulled = false;
      this.figure.add(mesh); it = { mesh }; this.items.set(p.id, it);
    }
    const [a, b, c] = p.ax, o = p.c;
    it.mesh.matrix.set(a[0], b[0], c[0], o[0], a[1], b[1], c[1], o[1], a[2], b[2], c[2], o[2], 0, 0, 0, 1);
    it.mesh.matrixWorldNeedsUpdate = true;
  }

  _cap(p) {
    const T = this.T;
    let it = this.items.get(p.id);
    if (!it) {
      const mat = this.mats[p.mat] || this.mats.skin;
      const mk = (g) => { const m = new T.Mesh(g, mat); m.matrixAutoUpdate = false; m.frustumCulled = false; this.figure.add(m); return m; };
      it = { body: mk(this.cylG), s0: mk(this.sphereG), s1: mk(this.sphereG) };
      this.items.set(p.id, it);
    }
    const { v0, v1, v2, q, m4 } = this;
    v0.set(p.p0[0], p.p0[1], p.p0[2]); v1.set(p.p1[0], p.p1[1], p.p1[2]);
    v2.subVectors(v1, v0);
    const len = Math.max(1e-4, v2.length());
    q.setFromUnitVectors(this.up, v2.divideScalar(len));
    // cylinder: unit radius at both ends -> scale x/z by mean radius; taper via shear-free approach:
    // we use the average radius on the body mesh and rely on the end spheres for the taper silhouette
    // (exact taper is applied through the matrix below using a per-end scale baked into geometry).
    this._taper(it, p.r0, p.r1);
    m4.compose(this.v2.addVectors(v0, v1).multiplyScalar(0.5), q, this.v1.set(1, len, 1));
    it.body.matrix.copy(m4); it.body.matrixWorldNeedsUpdate = true;
    it.s0.matrix.makeScale(p.r0, p.r0, p.r0).setPosition(p.p0[0], p.p0[1], p.p0[2]); it.s0.matrixWorldNeedsUpdate = true;
    it.s1.matrix.makeScale(p.r1, p.r1, p.r1).setPosition(p.p1[0], p.p1[1], p.p1[2]); it.s1.matrixWorldNeedsUpdate = true;
  }

  // per-prim tapered cylinder geometry, built once (rebuilt only if the radii change)
  _taper(it, r0, r1) {
    if (it.r0 === r0 && it.r1 === r1) return;
    if (it.own) it.own.dispose();
    const g = new this.T.CylinderGeometry(r1, r0, 1, 24, 1, true);
    it.own = g; it.body.geometry = g; it.r0 = r0; it.r1 = r1;
  }

  _face(S) {
    const { c, F } = S.head; // F: row-major 3x3, columns = head-local axes
    this.faceG.matrix.set(F[0], F[1], F[2], c[0], F[3], F[4], F[5], c[1], F[6], F[7], F[8], c[2], 0, 0, 0, 1);
    this.faceG.matrixWorldNeedsUpdate = true;
  }

  _ground(S) {
    const b = S.bounds;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const sx = Math.max(60, (b.maxX - b.minX) * 1.25 + 24), sz = Math.max(46, (b.maxZ - b.minZ) * 1.35 + 40);
    this.shadow.position.set(cx, 0.15, cz);
    this.shadow.scale.set(sx, 1, sz);
    this.shadow.material.opacity = (this.shadowMat.userData.base ?? (this.shadowMat.userData.base = this.shadowMat.opacity)) * Math.max(0.25, 1 - (S.lift || 0) / 40);
    this.floorMesh.position.x = cx; this.floorMesh.position.z = cz;
    // target: figure bounds centre; radius to fit
    const hx = (b.maxX - b.minX) / 2, hy = (b.maxY - b.minY) / 2, hz = (b.maxZ - b.minZ) / 2;
    this.target.set(cx, (b.minY + b.maxY) / 2 - 2, cz);
    this.fitR = Math.max(112, Math.hypot(hx, hy, hz * 0.5) * 1.05);
  }

  // ---------------------------------------------------------------- props
  _props(props, S, e) {
    const T = this.T;
    const sig = JSON.stringify(props || []);
    if (sig !== this.propSig) {
      for (const o of this.propObjs) { this.propGroup.remove(o.obj); o.obj.traverse?.((n) => { if (n.geometry && n.geometry !== this.sphereG) n.geometry.dispose(); }); }
      this.propObjs = []; this.propSig = sig;
      const box = () => new T.Mesh(new T.BoxGeometry(1, 1, 1), this.propMats.block);
      for (const p of props || []) {
        if (p.type === 'block') {
          for (const k of p.arms || ['R']) { const m = box(); m.userData = { k, h: p.h || 22 }; this.propGroup.add(m); this.propObjs.push({ type: 'block', obj: m, k, h: p.h || 22 }); }
        } else if (p.type === 'cushion') {
          const m = box(); m.material = this.propMats.cush; this.propGroup.add(m); this.propObjs.push({ type: 'cushion', obj: m, h: p.h || 12, w: p.w || 56 });
        } else if (p.type === 'wall') {
          const m = new T.Mesh(new T.PlaneGeometry(140, 215).rotateY(Math.PI / 2), this.propMats.wall); this.propGroup.add(m); this.propObjs.push({ type: 'wall', obj: m });
        } else if (p.type === 'strap') {
          const g = new T.Group();
          const line = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 8, 1), this.propMats.strap);
          const loop = new T.Mesh(new T.TorusGeometry(1, 0.28, 8, 20), this.propMats.strap);
          g.add(line, loop); this.propGroup.add(g);
          this.propObjs.push({ type: 'strap', obj: g, line, loop, arm: p.arm || 'R', leg: p.leg || 'R' });
        }
      }
    }
    const ke = clamp(e * 1.4, 0, 1), vis = ke > 0.001;
    for (const o of this.propObjs) {
      o.obj.visible = vis;
      if (!vis) continue;
      if (o.type === 'block') {
        const w = S.J['wrist' + o.k], h = Math.max(0.01, o.h * ke);
        o.obj.position.set(w[0], h / 2, w[2]); o.obj.scale.set(24, h, 12);
      } else if (o.type === 'cushion') {
        const pl = S.J.pelvis, h = Math.max(0.01, o.h * ke);
        o.obj.position.set(pl[0] - 2, h / 2, pl[2]); o.obj.scale.set(o.w, h, 36);
      } else if (o.type === 'wall') {
        o.obj.position.set(S.bounds.maxX + 8, 107.5, 0);
        this.propMats.wall.opacity = 0.55 * ke;
      } else if (o.type === 'strap') {
        const w = S.J['wrist' + o.arm], an = S.J['ankle' + o.leg], toe = S.J['toe' + o.leg];
        const f = this.v0.set((an[0] + toe[0]) / 2, (an[1] + toe[1]) / 2 - 2, (an[2] + toe[2]) / 2 + 1);
        const d = this.v1.set(f.x - w[0], f.y - w[1], f.z - w[2]); const len = Math.max(1e-3, d.length());
        this.q.setFromUnitVectors(this.up, d.divideScalar(len));
        o.line.position.set((w[0] + f.x) / 2, (w[1] + f.y) / 2, (w[2] + f.z) / 2);
        o.line.quaternion.copy(this.q); o.line.scale.set(1.1, len, 1.1);
        o.loop.position.copy(f); o.loop.scale.set(5.2, 7.5, 5.2);
        o.loop.rotation.set(0, 1.2, 0);
      }
    }
  }

  // ---------------------------------------------------------------- render
  renderNow() {
    if (this._disposed || !this.w) return;
    const T = this.T, cam = this.camera;
    const el = clamp(this.defEl + this.dEl, -10, 80), az = this.defAz + this.dAz;
    const a = rad(az), e = rad(el);
    const tx = Math.sin(a) * Math.cos(e), ty = Math.sin(e), tz = Math.cos(a) * Math.cos(e);
    const vf = rad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
    const R = this.fitR || 125;
    const dist = (R / Math.sin(Math.min(vf, hf) / 2)) * this.zoom;
    cam.position.set(this.target.x + tx * dist, this.target.y + ty * dist, this.target.z + tz * dist);
    cam.lookAt(this.target);
    cam.updateMatrixWorld();
    // lights follow the camera: key from the upper left front, rim from behind right
    const right = this.v0.set(Math.cos(a), 0, -Math.sin(a));
    const rx = right.x, rz = right.z;
    const upx = -Math.sin(e) * Math.sin(a), upy = Math.cos(e), upz = -Math.sin(e) * Math.cos(a);
    this.key.position.set(this.target.x + (-0.9 * rx + 1.1 * upx + 0.9 * tx) * 300, this.target.y + (1.1 * upy + 0.9 * ty) * 300, this.target.z + (-0.9 * rz + 1.1 * upz + 0.9 * tz) * 300);
    this.key.target.position.copy(this.target);
    this.rim.position.set(this.target.x + (0.9 * rx + 0.5 * upx - 1 * tx) * 300, this.target.y + (0.5 * upy - 1 * ty) * 300, this.target.z + (0.9 * rz + 0.5 * upz - 1 * tz) * 300);
    this.rim.target.position.copy(this.target);
    this.renderer.render(this.scene, cam);
    void T;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._stopTween();
    const cv = this.canvas;
    cv.removeEventListener('pointerdown', this._down);
    cv.removeEventListener('pointermove', this._move);
    cv.removeEventListener('pointerup', this._up);
    cv.removeEventListener('pointercancel', this._up);
    cv.removeEventListener('wheel', this._wheel);
    cv.removeEventListener('dblclick', this._dbl);
    this._ro?.disconnect(); this._mo?.disconnect();
    this._mq?.removeEventListener?.('change', this._theme);
    for (const it of this.items.values()) it.own?.dispose();
    for (const o of this.propObjs) o.obj.traverse?.((n) => { if (n.geometry && n.geometry !== this.sphereG) n.geometry.dispose(); });
    for (const g of this.geoms) g.dispose();
    for (const m of [...Object.values(this.mats), ...Object.values(this.propMats), ...Object.values(this.faceMats), this.shadowMat, this.floorMat]) { m.map?.dispose(); m.dispose(); }
    this.renderer.dispose();
    try { this.renderer.forceContextLoss(); } catch (e) { /* */ }
    cv.remove();
  }
}
