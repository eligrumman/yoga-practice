/*! Bundle includes code from anidoodle (https://github.com/alexgreensh/anidoodle),
 Copyright 2026 Alex Greenshpun, licensed under the Apache License 2.0 (see LICENSE and NOTICE next to this file).
 Modifications: bundled with a pilot entry point; engine sources otherwise unchanged. */
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/core.ts
  var rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  var noiseCache = /* @__PURE__ */ new Map();
  var table = (seed) => {
    let t = noiseCache.get(seed);
    if (!t) {
      const r = rng(seed * 7919 + 13), perm = new Uint16Array(512), gx = new Float32Array(256), gy = new Float32Array(256);
      const p = Array.from({ length: 256 }, (_, i) => i);
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
      }
      for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
      for (let i = 0; i < 256; i++) {
        const a = r() * Math.PI * 2;
        gx[i] = Math.cos(a);
        gy[i] = Math.sin(a);
      }
      t = { perm, gx, gy };
      noiseCache.set(seed, t);
    }
    return t;
  };
  var noise2 = (seed, x, y, px = 0, py = 0) => {
    const { perm, gx, gy } = table(seed);
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const w = (v, p) => (p > 0 ? (v % p + p) % p : v) & 255;
    const g = (ix, iy, dx, dy) => {
      const h = perm[perm[w(ix, px)] + w(iy, py)];
      return gx[h] * dx + gy[h] * dy;
    };
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = g(x0, y0, fx, fy), b = g(x0 + 1, y0, fx - 1, fy), c = g(x0, y0 + 1, fx, fy - 1), d = g(x0 + 1, y0 + 1, fx - 1, fy - 1);
    return a + sx * (b - a) + sy * (c + sx * (d - c) - (a + sx * (b - a)));
  };
  var fractal = (seed, x, y, fx, fy, oct, tile2 = 0) => {
    let sum = 0, amp = 1, px = tile2 ? Math.max(1, Math.round(fx * tile2)) : 0, py = tile2 ? Math.max(1, Math.round(fy * tile2)) : 0;
    let kx = tile2 ? px / tile2 : fx, ky = tile2 ? py / tile2 : fy;
    for (let o = 0; o < oct; o++) {
      sum += noise2(seed + o * 101, x * kx, y * ky, px, py) * amp;
      amp *= 0.5;
      kx *= 2;
      ky *= 2;
      px *= 2;
      py *= 2;
    }
    return (sum + 1) / 2;
  };
  var clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  var jitter = (pts, amt, seed) => {
    if (amt <= 0) return pts;
    const r = rng(seed);
    return pts.map(([x, y]) => [x + (r() - 0.5) * 2 * amt, y + (r() - 0.5) * 2 * amt]);
  };
  var sample = (pts, closed = false, per = 10) => {
    if (pts.length < 2) return pts;
    const n = pts.length, at = (i) => closed ? pts[(i % n + n) % n] : pts[Math.max(0, Math.min(n - 1, i))], out = [], segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    out.push(closed ? out[0] : pts[n - 1]);
    return out;
  };
  var densify = (s, step) => {
    const out = [s[0]];
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return out;
  };
  var ribbon = (s0, width, seed, taper, pressure, rough = 0) => {
    const s = rough ? densify(s0, 1.5) : s0;
    const a = seed % 17 * 0.37, b = seed % 11 * 0.53, L = [], R = [], r = rng(seed * 31 + 7);
    for (let i = 0; i < s.length; i++) {
      const t = i / (s.length - 1), p = s[i], q = s[Math.min(s.length - 1, i + 1)], o = s[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], len2 = Math.hypot(dx, dy) || 1;
      const ends = Math.min(1, t / 0.14, (1 - t) / 0.2), tp = 1 - taper + taper * Math.pow(Math.max(0.04, ends), 0.7);
      const pr = Math.max(0.14, 1 - 0.26 * pressure + pressure * (0.3 * Math.sin(t * 5.5 + a) + 0.14 * Math.sin(t * 17 + b)));
      const w = width * tp * pr / 2, j1 = (r() - 0.5) * rough, j2 = (r() - 0.5) * rough;
      L.push([p[0] - dy / len2 * (w + j1), p[1] + dx / len2 * (w + j1)]);
      R.push([p[0] + dy / len2 * (w + j2), p[1] - dx / len2 * (w + j2)]);
    }
    return [...L, ...R.reverse()];
  };
  var bbox = (s) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    s.forEach(([x, y]) => {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    });
    return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };
  var scaled = (s, k, dx = 0, dy = 0) => {
    const b = bbox(s);
    return s.map(([x, y]) => [b.cx + (x - b.cx) * k + dx, b.cy + (y - b.cy) * k + dy]);
  };
  var displace = (pts, amp, freq, oct, seed) => pts.map(([x, y]) => [x + (fractal(seed, x, y, freq, freq, oct) - 0.5) * amp, y + (fractal(seed + 50, x, y, freq, freq, oct) - 0.5) * amp]);
  var TILE = 512;
  var TILES = {
    pencilTooth: { fx: 1.3, oct: 1, seed: 8, k: -2, o: 2.05 },
    // graphite skips the valleys of the sheet
    washGran: { fx: 0.09, oct: 2, seed: 11, k: -0.45, o: 1.2 },
    // granulating pigment
    risoSpeck: { fx: 1.15, oct: 2, seed: 18, k: -3, o: 2.35 },
    // pinholes where soy ink missed
    risoMottle: { fx: 0.012, fy: 0.05, oct: 3, seed: 22, k: -0.9, o: 1.38 },
    // the drum never inks evenly
    paper: { fx: 0.75, oct: 3, seed: 21, gray: true },
    coldpress: { fx: 0.16, oct: 4, seed: 23, gray: true },
    draftTooth: { fx: 0.95, oct: 2, seed: 33, k: -1.7, o: 1.95 },
    // ruling-pen ink breaking up on the tooth of the sheet
    blueMottle: { fx: 65e-4, oct: 4, seed: 37, gray: true }
    // a cyanotype never exposes evenly
  };
  var tile = (env, kind) => {
    const key = `tile:${kind}:${env.scale}`;
    let L = env.cache.get(key);
    if (L) return L;
    const sp = TILES[kind], n = Math.round(TILE * env.scale);
    L = env.canvas(n, n);
    const img = L.ctx.createImageData(n, n), d = img.data;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const lx = x / env.scale, ly = y / env.scale, i = (y * n + x) * 4, v = fractal(sp.seed, lx, ly, sp.fx, sp.fy ?? sp.fx, sp.oct, TILE);
      if (sp.gray) {
        const lin = clamp((v + fractal(sp.seed + 7, lx, ly, sp.fx, sp.fy ?? sp.fx, sp.oct, TILE)) / 2), g = 255 * (lin <= 31308e-7 ? lin * 12.92 : 1.055 * Math.pow(lin, 1 / 2.4) - 0.055);
        d[i] = d[i + 1] = d[i + 2] = g;
        d[i + 3] = 255;
      } else {
        d[i] = d[i + 1] = d[i + 2] = 0;
        d[i + 3] = 255 * clamp(sp.k * v + sp.o);
      }
    }
    L.ctx.putImageData(img, 0, 0);
    env.cache.set(key, L);
    return L;
  };
  var PENCIL = { nib: 1.45, taper: 1, pressure: 1, retrace: true, wobble: 1, rough: 1.15 };
  var GRAPHITE = "#3d3437";
  var Gfx = class {
    constructor(main, env, frame, medium) {
      this.main = main;
      this.env = env;
      this.frame = frame;
      this.medium = medium;
      // `drawn`: union of every device box composited onto `main` since construction. Read-only for the
      // art; the web profile (bake.ts) crops a part into a sprite by it. Setting it changes no pixel.
      __publicField(this, "drawn", null);
      __publicField(this, "cur");
      __publicField(this, "pool", []);
      __publicField(this, "stack", [[0, 0, 1, 0]]);
      __publicField(this, "box", null);
      this.cur = main;
      this.base(main);
      const key = `pool:${Math.round(env.W * env.scale)}x${Math.round(env.H * env.scale)}`;
      let pool = env.cache.get(key);
      if (!pool) {
        pool = [];
        env.cache.set(key, pool);
      }
      this.pool = pool;
    }
    get m() {
      return this.stack[this.stack.length - 1];
    }
    get DW() {
      return Math.round(this.env.W * this.env.scale);
    }
    get DH() {
      return Math.round(this.env.H * this.env.scale);
    }
    base(c) {
      const [x, y, s, r] = this.m, k = this.env.scale;
      if (r === 0) {
        c.setTransform(k * s, 0, 0, k * s, k * x, k * y);
        return;
      }
      const co = Math.cos(r), si = Math.sin(r);
      c.setTransform(k * s * co, k * s * si, -k * s * si, k * s * co, k * x, k * y);
    }
    dev(c) {
      c.setTransform(1, 0, 0, 1, 0, 0);
    }
    clip(r, pad = 0) {
      return [Math.max(0, Math.floor(r[0] - pad)), Math.max(0, Math.floor(r[1] - pad)), Math.min(this.DW, Math.ceil(r[2] + pad)), Math.min(this.DH, Math.ceil(r[3] + pad))];
    }
    join(a, b) {
      return a ? [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])] : b;
    }
    // local points -> device box, with `pad` local units of slack (line weight, displacement, blur)
    boxOf(pts, pad) {
      const [tx, ty, s, r] = this.m, k = this.env.scale;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [x, y] of pts) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
      x0 -= pad;
      y0 -= pad;
      x1 += pad;
      y1 += pad;
      if (r === 0) return this.clip([k * (tx + x0 * s), k * (ty + y0 * s), k * (tx + x1 * s), k * (ty + y1 * s)]);
      const co = Math.cos(r), si = Math.sin(r), cs = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
      let a0 = 1e9, b0 = 1e9, a1 = -1e9, b1 = -1e9;
      for (const [x, y] of cs) {
        const ax = k * (tx + s * (co * x - si * y)), by = k * (ty + s * (si * x + co * y));
        if (ax < a0) a0 = ax;
        if (by < b0) b0 = by;
        if (ax > a1) a1 = ax;
        if (by > b1) b1 = by;
      }
      return this.clip([a0, b0, a1, b1]);
    }
    mark(pts, pad = 4) {
      this.box = this.join(this.box, this.boxOf(pts, pad));
    }
    touch(x0, y0, x1, y1) {
      this.mark([[x0, y0], [x1, y1]], 0);
    }
    // for raw ctx drawing inside a group
    layer() {
      let L = this.pool.pop();
      if (!L) {
        L = this.env.canvas(this.DW, this.DH);
        L.dirty = null;
      }
      this.dev(L.ctx);
      L.ctx.globalCompositeOperation = "source-over";
      L.ctx.globalAlpha = 1;
      if (L.dirty) {
        const d = L.dirty;
        L.ctx.clearRect(d[0], d[1], d[2] - d[0], d[3] - d[1]);
        L.dirty = null;
      }
      return L;
    }
    release(L, dirty) {
      L.dirty = dirty ? this.join(L.dirty ?? null, dirty) : L.dirty;
      this.pool.push(L);
    }
    push(x, y, s, r = 0) {
      const [px, py, ps, pr] = this.m;
      if (pr === 0) {
        this.stack.push([px + x * ps, py + y * ps, ps * s, r]);
        this.base(this.cur);
        return;
      }
      const co = Math.cos(pr), si = Math.sin(pr);
      this.stack.push([px + ps * (co * x - si * y), py + ps * (si * x + co * y), ps * s, pr + r]);
      this.base(this.cur);
    }
    pop() {
      this.stack.pop();
      this.base(this.cur);
    }
    path(c, pts) {
      c.beginPath();
      pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
      c.closePath();
    }
    // gaussian-ish blur without ctx.filter (Safari has none): halve the box N times, scale it back up
    soften(L, radius, r) {
      const rp = this.clip(r, radius * this.env.scale * 3), steps = Math.max(1, Math.round(Math.log2(Math.max(2, radius * this.env.scale * 1.6)))), T = this.layer(), U = this.layer();
      let w = rp[2] - rp[0], h = rp[3] - rp[1];
      if (w < 2 || h < 2) {
        this.release(T, null);
        this.release(U, null);
        return rp;
      }
      const sizes = [[w, h]];
      let src = L, sx = rp[0], sy = rp[1], a = T, b = U;
      for (let i = 0; i < steps; i++) {
        const nw = Math.max(1, Math.ceil(w / 2)), nh = Math.max(1, Math.ceil(h / 2));
        a.ctx.clearRect(0, 0, nw + 1, nh + 1);
        a.ctx.imageSmoothingEnabled = true;
        a.ctx.drawImage(src.canvas, sx, sy, w, h, 0, 0, nw, nh);
        sizes.push([nw, nh]);
        src = a;
        sx = 0;
        sy = 0;
        w = nw;
        h = nh;
        [a, b] = [b, a];
      }
      for (let i = steps - 1; i >= 1; i--) {
        const [dw, dh] = sizes[i];
        a.ctx.clearRect(0, 0, dw + 1, dh + 1);
        a.ctx.drawImage(src.canvas, 0, 0, w, h, 0, 0, dw, dh);
        src = a;
        w = dw;
        h = dh;
        [a, b] = [b, a];
      }
      this.dev(L.ctx);
      L.ctx.clearRect(rp[0], rp[1], rp[2] - rp[0], rp[3] - rp[1]);
      L.ctx.imageSmoothingEnabled = true;
      L.ctx.drawImage(src.canvas, 0, 0, w, h, rp[0], rp[1], rp[2] - rp[0], rp[3] - rp[1]);
      const used = [0, 0, sizes[1][0] + 1, sizes[1][1] + 1];
      this.release(T, used);
      this.release(U, used);
      return rp;
    }
    // multiply a layer's alpha by a texture tile, inside the box only (texK scales the tooth with the actor)
    tooth(L, kind, r, texK = 1) {
      const c = L.ctx, t = tile(this.env, kind);
      c.save();
      c.setTransform(texK, 0, 0, texK, 0, 0);
      c.globalCompositeOperation = "destination-in";
      c.fillStyle = c.createPattern(t.canvas, "repeat");
      c.beginPath();
      c.rect(r[0] / texK, r[1] / texK, (r[2] - r[0]) / texK, (r[3] - r[1]) / texK);
      c.clip();
      c.fillRect(r[0] / texK - 1, r[1] / texK - 1, (r[2] - r[0]) / texK + 2, (r[3] - r[1]) / texK + 2);
      c.restore();
    }
    // draw a group on its own layer, texture it once, composite only what was touched
    group(kind, fn, opts = {}) {
      const L = this.layer(), prev = this.cur, outer = this.box;
      this.cur = L.ctx;
      this.box = null;
      this.base(L.ctx);
      fn();
      this.cur = prev;
      if (prev !== this.main) this.base(prev);
      let r = this.box ?? [0, 0, this.DW, this.DH];
      this.box = outer;
      const k = this.m[2];
      if (kind === "paint") {
        r = this.soften(L, 0.9 * k, r);
        this.tooth(L, "washGran", r, k);
      }
      if (kind === "ink") this.tooth(L, "pencilTooth", r, k);
      if (opts.blur) r = this.soften(L, opts.blur, r);
      (opts.textures ?? []).forEach((t) => this.tooth(L, t, r));
      const m = this.main, w = r[2] - r[0], h = r[3] - r[1];
      if (w > 0 && h > 0) {
        const ox = Math.round((opts.off?.[0] ?? 0) * this.env.scale), oy = Math.round((opts.off?.[1] ?? 0) * this.env.scale);
        this.drawn = this.join(this.drawn, this.clip([r[0] + ox, r[1] + oy, r[2] + ox, r[3] + oy]));
      }
      if (w > 0 && h > 0) {
        m.save();
        this.dev(m);
        m.globalCompositeOperation = opts.blend ?? "source-over";
        m.globalAlpha = opts.alpha ?? 1;
        m.drawImage(L.canvas, r[0], r[1], w, h, r[0] + Math.round((opts.off?.[0] ?? 0) * this.env.scale), r[1] + Math.round((opts.off?.[1] ?? 0) * this.env.scale), w, h);
        m.restore();
      }
      this.release(L, r);
    }
    // INK IN ONE PASS. White ink on a blue ground blooms, so every line wants a soft halo under it.
    // Drawing the group twice (halo, then line) costs the strokes twice; this takes the halo from a
    // blurred COPY of the same ink instead, which is the same picture for half the stroke work.
    inkGroup(fn, o = {}) {
      const L = this.layer(), prev = this.cur, outer = this.box;
      this.cur = L.ctx;
      this.box = null;
      this.base(L.ctx);
      fn();
      this.cur = prev;
      if (prev !== this.main) this.base(prev);
      const r = this.box ?? [0, 0, this.DW, this.DH];
      this.box = outer;
      const w = r[2] - r[0], h = r[3] - r[1];
      if (w <= 0 || h <= 0) {
        this.release(L, r);
        return;
      }
      const H2 = this.layer(), pad = this.clip(r, (o.blur ?? 1.8) * this.env.scale * 3);
      this.dev(H2.ctx);
      H2.ctx.drawImage(L.canvas, r[0], r[1], w, h, r[0], r[1], w, h);
      const rh = this.soften(H2, o.blur ?? 1.8, r);
      (o.textures ?? ["draftTooth"]).forEach((t) => this.tooth(L, t, r));
      this.drawn = this.join(this.drawn, this.join(rh, r));
      const m = this.main;
      m.save();
      this.dev(m);
      m.globalCompositeOperation = "source-over";
      m.globalAlpha = o.alpha ?? 0.28;
      m.drawImage(H2.canvas, rh[0], rh[1], rh[2] - rh[0], rh[3] - rh[1], rh[0], rh[1], rh[2] - rh[0], rh[3] - rh[1]);
      m.globalAlpha = 1;
      m.drawImage(L.canvas, r[0], r[1], w, h, r[0], r[1], w, h);
      m.restore();
      this.base(m);
      this.release(L, r);
      this.release(H2, pad);
    }
    // progress < 1 draws the first part of the stroke only, cut on the CENTRELINE so the travelling
    // tip keeps the taper of a lifting nib. progress 1 takes the old path, byte for byte.
    upTo(s, progress) {
      if (progress >= 1) return s;
      const n = (s.length - 1) * progress, i = Math.floor(n), f = n - i;
      const head = s.slice(0, i + 1);
      if (f > 1e-9 && i + 1 < s.length) head.push([s[i][0] + (s[i + 1][0] - s[i][0]) * f, s[i][1] + (s[i + 1][1] - s[i][1]) * f]);
      return head.length > 1 ? head : s.slice(0, 2);
    }
    pen(pts, o = {}) {
      const { w = 3.4, color = GRAPHITE, seed = 1, closed = false, wobble = 1.1, boil = 0.55, taper = 1, opacity = 0.96, retrace = true, progress = 1 } = o, M = this.medium, b = Math.floor(this.frame / 4), c = this.cur;
      if (progress <= 0) return;
      const ctrl = closed ? [...pts, pts[0], pts[1]] : pts, basePts = jitter(ctrl, wobble * M.wobble, seed), W2 = w * M.nib;
      const main = ribbon(this.upTo(sample(jitter(basePts, boil, seed * 911 + b)), progress), W2, seed, taper * M.taper, M.pressure, M.rough);
      this.mark(main, 2);
      c.fillStyle = color;
      c.globalAlpha = opacity;
      this.path(c, main);
      c.fill();
      if (retrace && M.retrace) {
        const re = ribbon(this.upTo(sample(jitter(basePts, boil + 1.3 * M.wobble, seed * 577 + b)), progress), W2 * 0.5, seed + 5, 1, M.pressure, M.rough);
        this.mark(re, 2);
        c.globalAlpha = opacity * 0.4;
        this.path(c, re);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    hatch(x, y, w, o = {}) {
      const { n = 8, len: len2 = 16, angle = -1.05, color = GRAPHITE, seed = 1, pw = 1.9, opacity = 0.55 } = o, r = rng(seed);
      for (let i = 0; i < n; i++) {
        const px = x + w * i / Math.max(1, n - 1) + (r() - 0.5) * 3, l = len2 * (0.7 + r() * 0.6), a = angle + (r() - 0.5) * 0.18;
        this.pen([[px, y], [px + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5], [px + Math.cos(a) * l, y + Math.sin(a) * l]], { w: pw, color, seed: seed + i, wobble: 0.6, opacity, retrace: false });
      }
    }
    // a plain filled shape (for media that cut or print rather than paint)
    fill(pts, color, alpha = 1) {
      const c = this.cur;
      this.mark(pts, 2);
      c.globalAlpha = alpha;
      c.fillStyle = color;
      this.path(c, pts);
      c.fill();
      c.globalAlpha = 1;
    }
    // watercolour that never quite fills its outline; the wet edge is displaced GEOMETRY
    wash(pts, color, o = {}) {
      const { alpha = 0.62, seed = 1, dx = 3, dy = 2, shrink = 0.94, rim = true } = o, c = this.cur;
      const s = displace(scaled(sample(jitter(pts, 2.2, seed), true, 8), shrink, dx, dy), 13, 0.022, 3, 5);
      this.mark(s, 5);
      c.globalAlpha = alpha;
      c.fillStyle = color;
      this.path(c, s);
      c.fill();
      if (rim) {
        c.globalAlpha = alpha * 0.55;
        c.strokeStyle = color;
        c.lineWidth = 3.5;
        c.lineJoin = "round";
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    // a shaded form: shadow colour underneath, the lit colour shifted toward the light (one soft pass, one crisp), a lifted highlight
    form(pts, color, shade, o = {}) {
      const { seed = 1, light = [-8, -9], alpha = 0.98, hi } = o, s = displace(sample(jitter(pts, 1.2, seed), true, 8), 13, 0.022, 3, 5), k = this.m[2];
      const r = this.boxOf(s, 3);
      this.box = this.join(this.box, r);
      const T = this.layer();
      this.base(T.ctx);
      T.ctx.fillStyle = shade;
      this.path(T.ctx, s);
      T.ctx.fill();
      const U = this.layer();
      this.base(U.ctx);
      U.ctx.fillStyle = color;
      U.ctx.translate(light[0], light[1]);
      this.path(U.ctx, s);
      U.ctx.fill();
      const ru = this.soften(U, 5 * k, this.boxOf(s.map(([x, y]) => [x + light[0], y + light[1]]), 2));
      const w = r[2] - r[0], h = r[3] - r[1];
      T.ctx.save();
      this.base(T.ctx);
      this.path(T.ctx, s);
      T.ctx.clip();
      this.dev(T.ctx);
      T.ctx.drawImage(U.canvas, r[0], r[1], w, h, r[0], r[1], w, h);
      this.base(T.ctx);
      T.ctx.translate(light[0] * 2.2, light[1] * 2.2);
      T.ctx.fillStyle = color;
      this.path(T.ctx, s);
      T.ctx.fill();
      if (hi) {
        const V = this.layer();
        this.base(V.ctx);
        V.ctx.fillStyle = "#ffffff";
        V.ctx.globalAlpha = 0.75;
        V.ctx.beginPath();
        V.ctx.ellipse(hi[0], hi[1], hi[2], hi[3], (hi[4] ?? -30) * Math.PI / 180, 0, Math.PI * 2);
        V.ctx.fill();
        const m = Math.max(hi[2], hi[3]);
        const rv = this.soften(V, 5 * k, this.boxOf([[hi[0] - m, hi[1] - m], [hi[0] + m, hi[1] + m]], 1));
        this.dev(T.ctx);
        T.ctx.drawImage(V.canvas, rv[0], rv[1], rv[2] - rv[0], rv[3] - rv[1], rv[0], rv[1], rv[2] - rv[0], rv[3] - rv[1]);
        this.release(V, rv);
      }
      T.ctx.restore();
      const c = this.cur;
      c.save();
      this.dev(c);
      c.globalAlpha = alpha;
      c.drawImage(T.canvas, r[0], r[1], w, h, r[0], r[1], w, h);
      c.restore();
      this.base(c);
      this.release(T, r);
      this.release(U, ru);
    }
    glow(cx, cy, r, color, opacity) {
      const c = this.cur, g = c.createRadialGradient(cx, cy, 0, cx, cy, r * 1.7), a = (v) => Math.round(255 * clamp(v * opacity)).toString(16).padStart(2, "0");
      [[0, 1], [0.35, 0.9], [0.6, 0.55], [0.8, 0.2], [1, 0]].forEach(([t, v]) => g.addColorStop(t, color + a(v)));
      this.touch(cx - r * 1.8, cy - r * 1.8, cx + r * 1.8, cy + r * 1.8);
      c.fillStyle = g;
      c.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
    }
    // the sheet itself, over everything
    paper(kind, opacity) {
      const m = this.main, t = tile(this.env, kind);
      m.save();
      this.dev(m);
      m.globalCompositeOperation = "multiply";
      m.globalAlpha = opacity;
      m.fillStyle = m.createPattern(t.canvas, "repeat");
      m.fillRect(0, 0, this.DW, this.DH);
      m.restore();
      this.base(m);
    }
    vignette(edge) {
      const m = this.main, W2 = this.env.W, H2 = this.env.H;
      m.save();
      this.base(m);
      m.translate(W2 / 2, H2 * 0.46);
      m.scale(1, H2 / W2);
      const g = m.createRadialGradient(0, 0, 0, 0, 0, W2 * 0.72);
      g.addColorStop(0, "rgba(255,250,240,0.08)");
      g.addColorStop(0.45, "rgba(255,250,240,0)");
      g.addColorStop(1, edge);
      m.fillStyle = g;
      m.fillRect(-W2, -H2, W2 * 2, H2 * 2);
      m.restore();
    }
  };

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/math3.ts
  var DEG = Math.PI / 180;
  var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  var mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  var cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  var len = (a) => Math.hypot(a[0], a[1], a[2]);
  var norm = (a) => {
    const l = len(a) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  var mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  var I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  var mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  var mm = (a, b) => {
    const o = new Array(9).fill(0);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    return o;
  };
  var rx = (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0, c, -s, 0, s, c];
  };
  var ry = (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, 0, s, 0, 1, 0, -s, 0, c];
  };
  var rz = (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
  };
  var rotAxis = (axis, a) => {
    const [x, y, z] = norm(axis), c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
  };
  var MIRROR_X = [-1, 0, 0, 0, 1, 0, 0, 0, 1];
  var apply = (f, local) => add(f.p, mv(f.R, local));
  var camera = (eye, target, f, cx, cy, upHint = [0, 1, 0]) => {
    const fwd = norm(sub(target, eye)), right = norm(cross(fwd, upHint)), up = cross(right, fwd);
    return { eye, right, up, fwd, f, cx, cy };
  };
  var project = (c, p) => {
    const d = sub(p, c.eye), z = Math.max(1e-4, dot(d, c.fwd)), s = c.f / z;
    return { x: c.cx + dot(d, c.right) * s, y: c.cy - dot(d, c.up) * s, z, s };
  };
  var LAT = 7;
  var LON = 14;
  var UNIT = (() => {
    const o = [];
    for (let i = 0; i <= LAT; i++) {
      const ph = -Math.PI / 2 + i / LAT * Math.PI;
      const n = i === 0 || i === LAT ? 1 : LON;
      for (let j = 0; j < n; j++) {
        const th = j / n * Math.PI * 2;
        o.push([Math.cos(ph) * Math.cos(th), Math.sin(ph), Math.cos(ph) * Math.sin(th)]);
      }
    }
    return o;
  })();
  var blobPts = (cam, b) => UNIT.map((u) => {
    const q = project(cam, add(b.c, mv(b.R, [u[0] * b.r[0], u[1] * b.r[1], u[2] * b.r[2]])));
    return [q.x, q.y];
  });

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/human/canon.ts
  var CANON = {
    // The average adult, 7.5 heads: crotch at half height, elbow at the waist, wrist at the crotch,
    // hand = face, foot = forearm.
    adult: {
      id: "adult",
      label: "Adult, realistic (7.5 heads)",
      age: 30,
      stylised: false,
      note: "Hogarth / Loomis average adult",
      heads: 7.5,
      eyeLine: 0.5,
      root: 4.12,
      hip: 3.9,
      knee: 2.1,
      ankle: 0.36,
      lumbar: 4.5,
      chest: 5,
      neckBase: 6.24,
      pivot: 6.74,
      shoulder: 6.12,
      hipX: 0.42,
      shoulderX: 0.76,
      upperArm: 1.42,
      forearm: 1.12,
      hand: 0.8,
      foot: 1.1,
      heel: 0.24,
      build: 0.5
    },
    // A nine-year-old is about 6.2 heads in life. Storybook enlarges the head (the reader looks at
    // the face) so the same child reads 5.2 heads tall. Limb ratios below the neck are the real
    // child's, rescaled: legs are 46% of height, not the adult 50%.
    storybookChild: {
      id: "storybookChild",
      label: "Child 9 y, storybook (5.2 heads, declared stylisation of 6.2)",
      age: 9,
      stylised: true,
      note: "head enlarged 1.19x over the age-9 canon; body ratios kept",
      heads: 5.2,
      eyeLine: 0.44,
      root: 2.72,
      hip: 2.62,
      knee: 1.42,
      ankle: 0.22,
      lumbar: 2.9,
      chest: 3.12,
      neckBase: 3.98,
      pivot: 4.44,
      shoulder: 3.9,
      hipX: 0.28,
      shoulderX: 0.6,
      upperArm: 0.9,
      forearm: 0.72,
      hand: 0.5,
      foot: 0.72,
      heel: 0.15,
      build: 0.35
    }
  };

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/human/skeleton.ts
  var SIDES = ["L", "R"];
  var sgn = (s) => s === "L" ? 1 : -1;
  var LIMITS = {
    pelvisTilt: [-20, 30],
    pelvisSide: [-15, 15],
    pelvisTwist: [-40, 40],
    spineBend: [-30, 70],
    spineSide: [-35, 35],
    spineTwist: [-45, 45],
    neckBend: [-40, 45],
    neckSide: [-35, 35],
    neckTwist: [-60, 60],
    headNod: [-30, 30],
    headTilt: [-20, 20],
    headTurn: [-30, 30],
    clavLift: [-10, 30],
    clavFwd: [-15, 25],
    shoulderRaise: [0, 180],
    shoulderSwing: [-90, 140],
    shoulderTwist: [-90, 90],
    elbow: [0, 150],
    pronation: [-90, 90],
    wristFlex: [-70, 80],
    wristDev: [-25, 35],
    hipFlex: [-20, 125],
    hipAbd: [-25, 45],
    hipRot: [-40, 45],
    knee: [0, 140],
    ankle: [-45, 25],
    toe: [0, 60]
  };
  var JOINT_NAMES = [
    "pelvisTilt",
    "pelvisSide",
    "pelvisTwist",
    "spineBend",
    "spineSide",
    "spineTwist",
    "neckBend",
    "neckSide",
    "neckTwist",
    "headNod",
    "headTilt",
    "headTurn",
    ...["clavLift", "clavFwd", "shoulderRaise", "shoulderSwing", "shoulderTwist", "elbow", "pronation", "wristFlex", "wristDev", "hipFlex", "hipAbd", "hipRot", "knee", "ankle", "toe"].flatMap((j) => [j + "L", j + "R"])
  ];
  var baseName = (j) => /[LR]$/.test(j) && LIMITS[j.slice(0, -1)] ? j.slice(0, -1) : j;
  var limitViolations = (j) => {
    const out = [];
    for (const [k, v] of Object.entries(j)) {
      const b = baseName(k), L = LIMITS[b];
      if (!L) {
        out.push(`unknown joint '${k}'`);
        continue;
      }
      if (!Number.isFinite(v)) out.push(`${k} is not a number`);
      else if (v < L[0] - 1e-6 || v > L[1] + 1e-6) out.push(`${k} = ${v.toFixed(1)} outside ${L[0]}..${L[1]}`);
    }
    const g = (k) => j[k] ?? 0;
    for (const s of ["L", "R"]) {
      const f = g("wristFlex" + s), d = g("wristDev" + s), lf = f >= 0 ? 80 : 70, ld = d >= 0 ? 35 : 25;
      if ((f / lf) ** 2 + (d / ld) ** 2 > 1.0001) out.push(`wrist${s} cone: flex ${f} with deviation ${d} exceeds the wrist ellipse`);
      const r = g("shoulderRaise" + s), w = g("shoulderSwing" + s);
      if (w < 0 && r * Math.sin(-w * DEG) > 62) out.push(`shoulder${s} cone: ${(r * Math.sin(-w * DEG)).toFixed(0)} deg of extension behind the body (max ~60)`);
      if (w > 90 && r * Math.sin((w - 90) * DEG) > 55) out.push(`shoulder${s} cone: ${(r * Math.sin((w - 90) * DEG)).toFixed(0)} deg of cross-body adduction (max ~50)`);
      if (g("knee" + s) < 20 && g("hipFlex" + s) > 95) out.push(`hip${s}: flexion ${g("hipFlex" + s)} with a straight knee (hamstrings stop a straight leg near 90)`);
    }
    const nb = g("neckBend") + g("headNod"), ns = g("neckSide") + g("headTilt"), nt = g("neckTwist") + g("headTurn");
    if ((nb / (nb >= 0 ? 60 : 55)) ** 2 + (ns / 45) ** 2 > 1.0001) out.push(`neck cone: bend ${nb} with side ${ns} exceeds the cervical ellipse`);
    if (Math.abs(nt) > 80) out.push(`neck: total head rotation ${nt} (max ~80)`);
    return out;
  };
  var dimsFromCanon = (c, heightM) => {
    const hh = heightM / c.heads, k = (v) => v * hh;
    return {
      hh,
      height: heightM,
      root: k(c.root),
      hipDrop: k(c.root - c.hip),
      hipX: k(c.hipX),
      thigh: k(c.hip - c.knee),
      shin: k(c.knee - c.ankle),
      ankleH: k(c.ankle),
      heel: k(c.heel),
      toe: k(c.foot - c.heel),
      ball: k((c.foot - c.heel) * 0.72),
      lumbar: k(c.lumbar - c.root),
      chest: k(c.chest - c.lumbar),
      neckBase: k(c.neckBase - c.chest),
      neckBaseZ: -k(0.1),
      neck: k(c.pivot - c.neckBase),
      pivotToChin: k(c.pivot - (c.heads - 1)),
      shoulderX: k(c.shoulderX),
      shoulderY: k(c.shoulder - c.chest),
      upperArm: k(c.upperArm),
      forearm: k(c.forearm),
      hand: k(c.hand)
    };
  };
  var child = (f, off, R = I3) => ({ p: apply(f, off), R: mm(f.R, R) });
  var flexFwd = (a) => rx(a * DEG);
  var sideTo = (a) => rz(-a * DEG);
  var twist = (a) => ry(a * DEG);
  var fk = (dims, pose) => {
    const j = pose.joints, g = (k) => j[k] ?? 0, d = dims;
    const body = mm(ry(pose.yaw * DEG), mm(rx((pose.pitch ?? 0) * DEG), rz(-(pose.roll ?? 0) * DEG)));
    const pelvis = { p: pose.root, R: mm(body, mm(twist(g("pelvisTwist")), mm(flexFwd(g("pelvisTilt")), sideTo(g("pelvisSide"))))) };
    const spine = (k) => mm(twist(g("spineTwist") * k), mm(flexFwd(g("spineBend") * k), sideTo(g("spineSide") * k)));
    const lumbar = child(pelvis, [0, d.lumbar, -0.01 * d.hh], spine(0.5));
    const chest = child(lumbar, [0, d.chest, 0], spine(0.5));
    const neck = child(chest, [0, d.neckBase, d.neckBaseZ], mm(twist(g("neckTwist")), mm(flexFwd(g("neckBend") + 12), sideTo(g("neckSide")))));
    const head = child(neck, [0, d.neck, 0], mm(twist(g("headTurn")), mm(flexFwd(g("headNod") - 12), sideTo(g("headTilt")))));
    const rig = { dims, j, pelvis, lumbar, chest, neck, head, shoulder: {}, upper: {}, fore: {}, hand: {}, hip: {}, thigh: {}, shin: {}, foot: {}, toes: {}, joints: {} };
    for (const s of SIDES) {
      const k = sgn(s), G = (n) => g(n + s);
      const sh = child(chest, [k * d.shoulderX, d.shoulderY + Math.sin(G("clavLift") * DEG) * d.shoulderX * 0.55, -0.02 * d.hh + Math.sin(G("clavFwd") * DEG) * d.shoulderX * 0.5]);
      const out = [k, 0, 0], fwd = [0, 0, 1], down = [0, -1, 0], w = G("shoulderSwing") * DEG;
      const h = norm(add(out.map((v) => v * Math.cos(w)), fwd.map((v) => v * Math.sin(w))));
      const Rr = rotAxis(cross(down, h), G("shoulderRaise") * DEG), dir = mv(Rr, down);
      const Rup = mm(rotAxis(dir, -k * G("shoulderTwist") * DEG), Rr);
      const upper = { p: sh.p, R: mm(chest.R, Rup) };
      const fore = child(upper, [0, -d.upperArm, 0], rx(-G("elbow") * DEG));
      const wrist = child(fore, [0, -d.forearm, 0], mm(ry(-k * G("pronation") * DEG), mm(rz(-k * G("wristFlex") * DEG), rx(-G("wristDev") * DEG))));
      rig.shoulder[s] = sh;
      rig.upper[s] = upper;
      rig.fore[s] = fore;
      rig.hand[s] = wrist;
      const hip = child(pelvis, [k * d.hipX, -d.hipDrop, 0]);
      const thigh = { p: hip.p, R: mm(pelvis.R, mm(rx(-G("hipFlex") * DEG), mm(rz(k * G("hipAbd") * DEG), ry(k * G("hipRot") * DEG)))) };
      const shin = child(thigh, [0, -d.thigh, 0], rx(G("knee") * DEG));
      const foot = child(shin, [0, -d.shin, 0], rx(-G("ankle") * DEG));
      const toes = child(foot, [0, -d.ankleH * 0.85, d.ball], rx(-G("toe") * DEG));
      rig.hip[s] = hip;
      rig.thigh[s] = thigh;
      rig.shin[s] = shin;
      rig.foot[s] = foot;
      rig.toes[s] = toes;
      Object.assign(rig.joints, { ["shoulder" + s]: sh.p, ["elbow" + s]: fore.p, ["wrist" + s]: wrist.p, ["hip" + s]: hip.p, ["knee" + s]: shin.p, ["ankle" + s]: foot.p, ["ball" + s]: toes.p, ["heel" + s]: apply(foot, [0, -d.ankleH * 0.9, -d.heel]), ["toeTip" + s]: apply(toes, [0, 0, d.toe - d.ball]) });
    }
    Object.assign(rig.joints, { pelvis: pelvis.p, lumbar: lumbar.p, chest: chest.p, neck: neck.p, head: head.p, crown: apply(head, [0, d.hh - d.pivotToChin, 0]) });
    return rig;
  };
  var lowestFoot = (r) => Math.min(...SIDES.flatMap((s) => [apply(r.foot[s], [0, -r.dims.ankleH, -r.dims.heel * 0.9])[1], apply(r.toes[s], [0, -r.dims.ankleH * 0.15, r.dims.toe - r.dims.ball])[1], apply(r.foot[s], [0, -r.dims.ankleH, 0])[1]]));

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/human/hands.ts
  var DIGITS = ["thumb", "index", "middle", "ring", "little"];
  var FINGERS = {
    // knuckle positions trace the arc: middle furthest out, little finger well back
    index: { mcp: [-0.012, -0.452, 0.128], len: [0.225, 0.14, 0.105], r: 0.05, spreadDir: -1 },
    middle: { mcp: [0, -0.47, 0.042], len: [0.245, 0.16, 0.12], r: 0.052, spreadDir: 0 },
    ring: { mcp: [-6e-3, -0.456, -0.046], len: [0.232, 0.152, 0.11], r: 0.048, spreadDir: 1 },
    little: { mcp: [-0.02, -0.415, -0.128], len: [0.182, 0.112, 0.096], r: 0.041, spreadDir: 1.35 }
  };
  var THUMB = { cmc: [-0.035, -0.07, 0.1], len: [0.225, 0.155, 0.13], r: 0.062 };
  var HAND_LIMITS = { spread: [-15, 25], mcp: [-20, 90], pip: [0, 110], dip: [-5, 80], abd: [0, 70], opp: [0, 80], tmcp: [-10, 60], ip: [-15, 80] };
  var handViolations = (a, tag) => {
    const out = [], L = HAND_LIMITS;
    DIGITS.forEach((d) => {
      const v = a[d];
      if (!v || v.length !== 4) {
        out.push(`${tag} ${d}: missing`);
        return;
      }
      const lims = d === "thumb" ? [L.abd, L.opp, L.tmcp, L.ip] : [L.spread, L.mcp, L.pip, L.dip], names = d === "thumb" ? ["abd", "opp", "mcp", "ip"] : ["spread", "mcp", "pip", "dip"];
      v.forEach((x, i) => {
        if (x < lims[i][0] || x > lims[i][1]) out.push(`${tag} ${d}.${names[i]} = ${x} outside ${lims[i][0]}..${lims[i][1]}`);
      });
    });
    return out;
  };
  var F = (s, m, p, d) => [s, m, p, d];
  var HAND_POSES = {
    // hanging at rest: each finger a little more curled than the one before it (the cascade)
    relaxed: { thumb: F(10, 15, 10, 12), index: F(2, 14, 22, 10), middle: F(0, 20, 30, 14), ring: F(2, 26, 36, 18), little: F(4, 32, 40, 22) },
    open: { thumb: F(52, 8, 0, -5), index: F(10, 0, 2, 0), middle: F(0, 0, 2, 0), ring: F(8, 0, 3, 0), little: F(14, 0, 4, 2) },
    point: { thumb: F(12, 44, 30, 28), index: F(0, 0, 2, 0), middle: F(0, 86, 100, 55), ring: F(2, 88, 102, 58), little: F(3, 90, 100, 60) },
    fist: { thumb: F(10, 52, 30, 26), index: F(0, 86, 100, 62), middle: F(0, 88, 102, 62), ring: F(2, 90, 102, 62), little: F(3, 90, 100, 60) },
    // closed around a cylinder about 0.3 Lh across (a mug, a tool handle)
    grip: { thumb: F(30, 58, 20, 22), index: F(0, 52, 62, 32), middle: F(0, 56, 66, 34), ring: F(2, 60, 68, 36), little: F(4, 64, 70, 38) },
    // thumb pad meets index pad; the rest fall away in a cascade
    pinch: { thumb: F(34, 52, 20, 16), index: F(-2, 50, 56, 18), middle: F(2, 40, 50, 20), ring: F(4, 44, 56, 24), little: F(6, 50, 60, 28) },
    // a wave: open, fingers a touch back, fanned wider toward the little finger
    wave: { thumb: F(46, 10, 4, -2), index: F(8, -8, 4, 0), middle: F(0, -8, 4, 0), ring: F(10, -6, 5, 2), little: F(18, -4, 6, 2) }
  };
  var resolveHand = (h) => {
    if (h && typeof h === "object" && "angles" in h) return h.angles;
    if (!h) return HAND_POSES.relaxed;
    if (typeof h === "string") {
      const p = HAND_POSES[h];
      if (!p) throw new Error(`unknown hand pose '${h}' (have ${Object.keys(HAND_POSES).join(", ")})`);
      return p;
    }
    const acc = { thumb: [0, 0, 0, 0], index: [0, 0, 0, 0], middle: [0, 0, 0, 0], ring: [0, 0, 0, 0], little: [0, 0, 0, 0] };
    let tot = 0;
    for (const [name, w] of Object.entries(h)) {
      const p = HAND_POSES[name];
      if (!p) throw new Error(`unknown hand pose '${name}'`);
      tot += w;
      DIGITS.forEach((d) => p[d].forEach((v, i) => acc[d][i] += v * w));
    }
    DIGITS.forEach((d) => acc[d].forEach((_, i) => acc[d][i] /= tot || 1));
    return acc;
  };
  var handModel = (wrist, side, Lh, ang, girth = 1) => {
    const M = side === "L" ? I3 : MIRROR_X;
    const W2 = (p) => apply(wrist, mv(M, p.map((v) => v * Lh)));
    const WR = (R2) => mm(wrist.R, mm(M, mm(R2, M)));
    const digits = [], nails = [];
    Object.keys(FINGERS).forEach((d) => {
      const s = FINGERS[d], [sp, m, p, q] = ang[d];
      const conv = -Math.sign(s.spreadDir) * Math.min(m, 80) * 0.06;
      const R2 = mm(rx(((s.spreadDir < 0 ? -sp : s.spreadDir > 0 ? sp : 0) + conv) * DEG), rz(-m * DEG));
      let pos2 = s.mcp;
      const pts = [W2(pos2)], frames = [], radii = [s.r * girth, s.r * 0.9 * girth, s.r * 0.8 * girth, s.r * 0.72 * girth];
      const bends = [0, p, q];
      let Rc = R2;
      for (let k = 0; k < 3; k++) {
        if (k) Rc = mm(Rc, rz(-bends[k] * DEG));
        frames.push({ p: W2(pos2), R: WR(Rc) });
        pos2 = add(pos2, mv(Rc, [0, -s.len[k], 0]));
        pts.push(W2(pos2));
      }
      digits.push({ digit: d, pts, radii: radii.map((r) => r * Lh), frames });
      const last = frames[2];
      nails.push({ digit: d, c: apply(last, mv(M, [s.r * 0.8 * Lh, -s.len[2] * 0.6 * Lh, 0])), R: last.R, w: s.r * 1.25 * Lh, l: s.len[2] * 0.55 * Lh });
    });
    const [abd, opp, tm, ip] = ang.thumb, d0 = norm([-0.22, -0.8, 0.52]), f0 = norm(cross(cross(d0, norm([-0.8, 0, -0.6])), d0));
    const colX = [-f0[0], -f0[1], -f0[2]], colY = [-d0[0], -d0[1], -d0[2]], colZ = norm(cross(colX, colY));
    const B = [colX[0], colY[0], colZ[0], colX[1], colY[1], colZ[1], colX[2], colY[2], colZ[2]];
    let R = mm(ry(-opp * DEG), mm(rx(-abd * DEG), B));
    let pos = THUMB.cmc;
    const tp = [W2(pos)], tf = [], tl = [pos];
    const tb = [0, tm, ip];
    for (let k = 0; k < 3; k++) {
      if (k) R = mm(R, rz(-tb[k] * DEG));
      tf.push({ p: W2(pos), R: WR(R) });
      pos = add(pos, mv(R, [0, -THUMB.len[k], 0]));
      tp.push(W2(pos));
      tl.push(pos);
    }
    const tr0 = THUMB.r * girth;
    digits.unshift({ digit: "thumb", pts: tp, radii: [tr0 * 1.35, tr0 * 1.02, tr0 * 0.97, tr0 * 0.9].map((r) => r * Lh), frames: tf });
    nails.unshift({ digit: "thumb", c: apply(tf[2], mv(M, [0.05 * Lh, -THUMB.len[2] * 0.62 * Lh, 0])), R: tf[2].R, w: THUMB.r * 1.2 * Lh, l: THUMB.len[2] * 0.55 * Lh });
    const blob2 = (c, r) => ({ c: W2(c), R: WR(I3), r: r.map((v) => v * Lh * girth) });
    const palm = [
      blob2([4e-3, -0.05, 0], [0.07, 0.07, 0.17]),
      // heel of the hand, over the carpals
      blob2([0, -0.25, -5e-3], [0.07, 0.2, 0.215]),
      // the palm block
      blob2([6e-3, -0.44, -5e-3], [0.06, 0.085, 0.205]),
      // the knuckle row, and the web of skin that runs a third of the way up the fingers
      blob2([-0.022, -0.22, -0.12], [0.06, 0.17, 0.075]),
      // hypothenar pad, little-finger side
      blob2(mix3(tl[0], tl[1], 0.45), [0.085, 0.085, 0.085]),
      // the thenar eminence: the thumb's metacarpal is buried in it, the thumb only leaves the palm at its MCP
      blob2(mix3(tl[0], tl[1], 0.8), [0.066, 0.066, 0.066])
    ];
    return { palm, digits, nails, mcpArc: ["index", "middle", "ring", "little"].map((d) => W2(FINGERS[d].mcp)) };
  };
  var solvePinch = (start) => {
    const id = { p: [0, 0, 0], R: I3 }, a = JSON.parse(JSON.stringify(start));
    const cost = (h) => {
      const m = handModel(id, "L", 1, h), t = m.digits[0], i = m.digits[1], d = Math.hypot(t.pts[3][0] - i.pts[3][0], t.pts[3][1] - i.pts[3][1], t.pts[3][2] - i.pts[3][2]) - (t.radii[3] + i.radii[3]) * 0.85;
      return d * d + handViolations(h, "").length;
    };
    let e = cost(a), step = 8;
    for (let it = 0; it < 80 && step > 0.1; it++) {
      let imp = false;
      for (const [dg, k] of [["thumb", 0], ["thumb", 1], ["thumb", 2], ["thumb", 3], ["index", 1], ["index", 2], ["index", 3]]) for (const s of [1, -1]) {
        const t = JSON.parse(JSON.stringify(a));
        t[dg][k] += s * step;
        const et = cost(t);
        if (et < e) {
          e = et;
          Object.assign(a, t);
          imp = true;
        }
      }
      if (!imp) step *= 0.5;
    }
    return a;
  };
  HAND_POSES.pinch = solvePinch(HAND_POSES.pinch);

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/human/mannequin.ts
  var ADULT_BODY = {
    torso: [["lumbar", [0, 0.16, 0.04], [0.5, 0.34, 0.35]], ["chest", [0, 0.52, 0], [0.6, 0.62, 0.43]], ["chest", [0, 0.9, -0.01], [0.66, 0.26, 0.38]]],
    torsoSided: [
      ["chest", [0.25, 0.86, 0.22], [0.27, 0.2, 0.18]],
      // pectorals: their lower edge squares the chest
      ["chest", [0.22, 1.2, -0.08], [0.26, 0.16, 0.17]],
      // trapezius: the slope from the neck down to the acromion
      ["chest", [0.44, 0.62, -0.08], [0.17, 0.36, 0.3]],
      // latissimus: the V under the arm
      ["chest", [0.56, 1, -0.03], [0.23, 0.15, 0.22]]
      // the shoulder girdle: clavicle and scapula carry the torso out to the acromion
    ],
    hips: [["lumbar", [0, 0.1, 0.03], [0.5, 0.22, 0.35]], ["pelvis", [0, -0.08, -0.02], [0.6, 0.34, 0.38]]],
    hipsSided: [["pelvis", [0.23, -0.24, -0.2], [0.27, 0.3, 0.25]], ["pelvis", [0.44, -0.22, 0], [0.19, 0.24, 0.25]]],
    // glutes; the flare over the trochanter
    neck: [["neck", [0, 0.02, 0.04], [0.215, 0.14, 0.21]], ["neck", [0, 0.5, 0.02], [0.19, 0.1, 0.19]]],
    upperArm: [["upper", [0.02, -0.26, 0], [0.18, 0.3, 0.22]], ["upper", [0, -0.66, 0.03], [0.19, 0.42, 0.21]], ["upper", [0, -1.36, -0.02], [0.15, 0.12, 0.14]]],
    foreArm: [["fore", [0.02, -0.28, 0.01], [0.19, 0.3, 0.17]], ["fore", [0, -0.72, 0], [0.13, 0.22, 0.12]], ["hand", [0, 0.04, 0], [0.085, 0.07, 0.13]]],
    thigh: [["thigh", [0.04, -0.25, 0], [0.31, 0.38, 0.33]], ["thigh", [0, -0.88, 0.05], [0.3, 0.51, 0.3]], ["thigh", [0, -1.77, 0.02], [0.19, 0.16, 0.2]]],
    shin: [["shin", [0, -0.05, 0.02], [0.18, 0.14, 0.19]], ["shin", [0.01, -0.49, -0.09], [0.2, 0.46, 0.21]], ["shin", [0, -1.66, 0], [0.12, 0.08, 0.12]]],
    shinExtra: [["shin", [-0.06, -0.54, -0.11], [0.16, 0.32, 0.17]]],
    // gastrocnemius: the inner head sits lower than the outer
    foot: [["foot", [0, -0.1, 0], [0.12, 0.08, 0.12]], ["foot", [0, -0.24, -0.14], [0.12, 0.12, 0.14]], ["foot", [0, -0.22, 0.25], [0.16, 0.11, 0.26]]],
    toes: [["toes", [0, -0.01, 0.1], [0.17, 0.05, 0.13]]],
    seam: { neck: 0.3, waist: 0.62, shoulder: 0.28, elbow: 0.17, wrist: 0.13, hip: 0.42, knee: 0.2, ankle: 0.15 },
    handGirth: 1,
    handDetail: true,
    landmarks: {
      upperArm: [["upper", [0, -0.62, 0.1], [0.16, 0.3, 0.14]], ["upper", [0, -0.72, -0.1], [0.15, 0.36, 0.13]]],
      // biceps in front, triceps behind: two masses, not a tube
      foreArm: [["fore", [0, 0.02, -0.12], [0.08, 0.08, 0.07]], ["fore", [0.02, -0.2, 0.1], [0.14, 0.22, 0.11]], ["fore", [-0.06, -0.3, -0.03], [0.13, 0.26, 0.12]], ["hand", [0.05, 0.06, -0.1], [0.035, 0.035, 0.035]]],
      // elbow point; brachioradialis swell high on the thumb side; the flexor mass lower on the inside; the ulnar head at the wrist
      thigh: [["thigh", [-0.12, -1.52, 0.08], [0.14, 0.22, 0.13]]],
      // vastus medialis: the teardrop above the inner knee
      shin: [["shin", [0, 0.02, 0.19], [0.1, 0.11, 0.06]], ["shin", [-0.1, -0.03, 0], [0.12, 0.12, 0.14]], ["shin", [0.07, -0.38, -0.1], [0.15, 0.28, 0.16]], ["shin", [-0.1, -1.6, 0], [0.055, 0.055, 0.055]], ["shin", [0.1, -1.68, -0.02], [0.05, 0.05, 0.05]], ["shin", [0, -1.32, -0.12], [0.07, 0.2, 0.05]]]
      // kneecap; the inner condyle; outer calf head HIGHER than the inner; inner ankle bone higher than the outer; Achilles
    }
  };
  var frameOf = (r, n, s) => n === "pelvis" || n === "lumbar" || n === "chest" || n === "neck" ? r[n] : r[n][s];
  var blob = (r, [fn, c, rad], s, inflate = 0) => {
    const hh = r.dims.hh, k = sgn(s), f = frameOf(r, fn, s);
    return { c: apply(f, [c[0] * k * hh, c[1] * hh, c[2] * hh]), R: mm(f.R, I3), r: [(rad[0] + inflate) * hh, (rad[1] + inflate * 0.6) * hh, (rad[2] + inflate) * hh] };
  };
  var bodyParts = (r, spec, o) => {
    const hh = r.dims.hh, J = r.joints, role = (id) => o.roles?.[id] ?? o.roles?.skin ?? "skin", inf = (id) => o.inflate?.[id] ?? 0;
    const chain = (bs, s, id) => bs.map((b) => blob(r, b, s, inf(id)));
    const sided = (bs, id) => SIDES.flatMap((s) => bs.map((b) => blob(r, b, s, inf(id))));
    const parts = [
      { id: "torso", role: role("torso"), groups: [{ blobs: chain(spec.torso, "L", "torso"), mode: "chain" }, { blobs: sided(spec.torsoSided, "torso"), mode: "each" }], depthAt: J.chest },
      { id: "hips", role: role("hips"), groups: [{ blobs: chain(spec.hips, "L", "hips"), mode: "chain" }, { blobs: sided(spec.hipsSided, "hips"), mode: "each" }], seams: [{ at: J.lumbar, r: spec.seam.waist * hh, with: "torso" }], depthAt: J.pelvis },
      { id: "neck", role: role("neck"), groups: [{ blobs: chain(spec.neck, "L", "neck"), mode: "chain" }], seams: [{ at: J.neck, r: spec.seam.neck * hh, with: "torso" }, { at: J.head, r: 0.3 * hh, with: "head" }], depthBias: 0.03 * hh, over: ["torso"] }
      // the neck stands IN FRONT of the trapezius: seen from the front it paints over the shoulders
    ];
    for (const s of SIDES) {
      parts.push(
        { id: "upperArm" + s, role: role("upperArm"), groups: [{ blobs: chain(spec.upperArm, s, "upperArm"), mode: "chain" }], seams: [{ at: J["shoulder" + s], r: spec.seam.shoulder * hh, with: "torso" }, { at: J["elbow" + s], r: spec.seam.elbow * hh, with: "foreArm" + s }], depthBias: -0.06 * hh },
        { id: "foreArm" + s, role: role("foreArm"), groups: [{ blobs: chain(spec.foreArm, s, "foreArm"), mode: "chain" }], seams: [{ at: J["elbow" + s], r: spec.seam.elbow * hh, with: "upperArm" + s }, { at: J["wrist" + s], r: spec.seam.wrist * hh, with: "palm" + s }], depthBias: -0.07 * hh },
        { id: "thigh" + s, role: role("thigh"), groups: [{ blobs: chain(spec.thigh, s, "thigh"), mode: "chain" }], seams: [{ at: J["hip" + s], r: spec.seam.hip * hh, with: "hips" }, { at: J["knee" + s], r: spec.seam.knee * hh, with: "shin" + s }], depthBias: -0.02 * hh },
        { id: "shin" + s, role: role("shin"), groups: [{ blobs: chain(spec.shin, s, "shin"), mode: "chain" }, ...spec.shinExtra.length ? [{ blobs: spec.shinExtra.map((b) => blob(r, b, s, inf("shin"))), mode: "each" }] : []], seams: [{ at: J["knee" + s], r: spec.seam.knee * hh, with: "thigh" + s }, { at: J["ankle" + s], r: spec.seam.ankle * hh, with: "foot" + s }], depthBias: -0.02 * hh },
        { id: "foot" + s, role: role("foot"), groups: [{ blobs: chain(spec.foot, s, "foot"), mode: "chain" }, { blobs: [blob(r, spec.foot[2], s, inf("foot")), ...spec.toes.map((b) => blob(r, b, s, inf("foot")))], mode: "chain" }], seams: [{ at: J["ankle" + s], r: spec.seam.ankle * hh, with: "shin" + s }], depthBias: -0.03 * hh }
      );
      for (const [pid, bs] of Object.entries(spec.landmarks ?? {})) {
        const part = parts.find((q) => q.id === pid + s);
        if (part && bs?.length) part.groups.push({ blobs: bs.map((b) => blob(r, b, s, inf(pid))), mode: "each" });
      }
      const hm = handModel(r.hand[s], s, r.dims.hand, o.hands[s], spec.handGirth);
      const Lh = r.dims.hand, Mh = s === "L" ? I3 : MIRROR_X, H2 = r.hand[s];
      const palmMarks = (cam) => {
        const px = project(cam, H2.p).s * Lh;
        if (!spec.handDetail || px < 70) return [];
        const L = (v) => apply(H2, mv(Mh, mul(v, Lh))), P2 = (vs) => vs.map((v) => {
          const p = project(cam, L(v));
          return [p.x, p.y];
        });
        const back = mv(H2.R, mv(Mh, [1, 0, 0])), toCam = norm(sub(cam.eye, H2.p)), out = [], w = Math.max(0.6, px * 6e-3);
        if (dot(back, toCam) > 0.2) hm.mcpArc.forEach((_, i) => {
          const m = ["index", "middle", "ring", "little"][i], c = FINGERS[m].mcp;
          out.push({ kind: "line", pts: P2([[0.07, c[1] - 5e-3, c[2] - 0.035], [0.078, c[1] + 0.012, c[2]], [0.07, c[1] - 5e-3, c[2] + 0.035]]), role: "line", w, alpha: 0.35 });
        });
        if (dot(back, toCam) < -0.2) {
          out.push({ kind: "line", pts: P2([[-0.074, -0.37, -0.19], [-0.076, -0.385, -0.08], [-0.075, -0.39, 0.03], [-0.072, -0.4, 0.1]]), role: "line", w, alpha: 0.4 });
          out.push({ kind: "line", pts: P2([[-0.074, -0.3, 0.15], [-0.076, -0.31, 0.04], [-0.075, -0.33, -0.08], [-0.072, -0.35, -0.15]]), role: "line", w, alpha: 0.35 });
          out.push({ kind: "line", pts: P2([[-0.074, -0.3, 0.14], [-0.078, -0.22, 0.08], [-0.078, -0.12, 0.05], [-0.074, -0.05, 0.03]]), role: "line", w, alpha: 0.35 });
        }
        return out;
      };
      parts.push({ id: "palm" + s, role: role("hand"), groups: [{ blobs: hm.palm, mode: "hull" }], seams: [{ at: J["wrist" + s], r: spec.seam.wrist * hh * 1.2, with: "foreArm" + s }], depthBias: -0.08 * hh, marksFn: palmMarks });
      hm.digits.forEach((d) => {
        const from = d.digit === "thumb" ? 1 : 0, bl = d.pts.slice(from).map((p, i) => ({ c: p, R: I3, r: [d.radii[i + from], d.radii[i + from], d.radii[i + from]] }));
        const nail = hm.nails.find((n) => n.digit === d.digit), k = sgn(s);
        const marksFn = (cam) => {
          const out = [], rpx = project(cam, d.pts[2]).s * d.radii[2];
          if (spec.handDetail && rpx > 2.2) d.frames.forEach((f, j) => {
            if (j === 0 || d.digit === "thumb" && j === 0) return;
            const at = d.pts[j], rad = d.radii[j], dn = mv(f.R, [k, 0, 0]), la = mv(f.R, [0, 0, 1]), al = mv(f.R, [0, -1, 0]);
            const arc = (side, off, span) => Array.from({ length: 5 }, (_, i) => {
              const u = -1 + i / 2;
              return add(add(at, mul(dn, side * rad * Math.sqrt(1 - (u * span) ** 2) * 0.98)), add(mul(la, u * span * rad), mul(al, off * rad + side * 0.12 * rad * u * u)));
            });
            const seen = (side) => dot(mul(dn, side), norm(sub(cam.eye, at))) > 0.2;
            const P2 = (q) => q.map((v) => {
              const p = project(cam, v);
              return [p.x, p.y];
            });
            if (seen(1)) (j === 1 ? [-0.25, 0.05, 0.3] : [0]).forEach((off, i) => out.push({ kind: "line", pts: P2(arc(1, off, 0.62 - Math.abs(off) * 0.4)), role: "line", w: Math.max(0.5, rpx * 0.12), alpha: 0.32 - i * 0.04 }));
            if (seen(-1)) out.push({ kind: "line", pts: P2(arc(-1, 0.05, 0.75)), role: "line", w: Math.max(0.5, rpx * 0.14), alpha: 0.4 });
          });
          const nrm = mv(nail.R, [k, 0, 0]), dist = mv(nail.R, [0, -1, 0]), lat = mv(nail.R, [0, 0, 1]);
          if (dot(nrm, norm(sub(cam.eye, nail.c))) < 0.15) return out;
          const pts = Array.from({ length: 12 }, (_, i) => {
            const a = i / 12 * Math.PI * 2, u = Math.cos(a), v = Math.sin(a), sq = (t) => Math.sign(t) * Math.abs(t) ** 0.7;
            return project(cam, add(nail.c, add(mul(lat, sq(u) * nail.w * 0.5), mul(dist, sq(v) * nail.l * 0.5))));
          }).map((q) => [q.x, q.y]);
          out.push({ kind: "fill", pts, role: "nail", alpha: 0.55, line: 0.5 });
          if (spec.handDetail && rpx > 3) out.push({ kind: "line", pts: Array.from({ length: 5 }, (_, i) => {
            const u = -0.8 + i / 4 * 1.6;
            const q = project(cam, add(nail.c, add(mul(lat, u * nail.w * 0.45), mul(dist, nail.l * (0.42 - 0.08 * u * u)))));
            return [q.x, q.y];
          }), role: "white", w: Math.max(0.5, rpx * 0.15), alpha: 0.6 });
          return out;
        };
        parts.push({ id: `${d.digit}${s}`, role: role("hand"), groups: [{ blobs: bl, mode: "chain" }], seams: [{ at: d.pts[from], r: d.radii[from] * (d.digit === "thumb" ? 1.3 : 1.5), with: "palm" + s }], depthBias: -0.085 * hh, depthAt: d.pts[2], marksFn });
      });
    }
    return parts;
  };

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/shape2d.ts
  var hull = (pts) => {
    const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (s.length < 3) return s;
    const x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const p of s) {
      while (lo.length >= 2 && x(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    }
    for (let i = s.length - 1; i >= 0; i--) {
      const p = s[i];
      while (hi.length >= 2 && x(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop();
      hi.push(p);
    }
    return [...lo.slice(0, -1), ...hi.slice(0, -1)];
  };
  var signedArea = (s) => s.reduce((a, p, i) => {
    const q = s[(i + 1) % s.length];
    return a + p[0] * q[1] - q[0] * p[1];
  }, 0) / 2;
  var ccw = (s) => signedArea(s) < 0 ? [...s].reverse() : s;
  var insidePoly = (pts, x, y) => {
    let k = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if (a[1] > y !== b[1] > y && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) k = !k;
    }
    return k;
  };
  var segDist = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  var edgeDist = (poly, p) => {
    let d = 1e9;
    for (let i = 0; i < poly.length; i++) d = Math.min(d, segDist(p, poly[i], poly[(i + 1) % poly.length]));
    return d;
  };
  var bbox2 = (polys) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of polys) for (const [x, y] of s) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    return { x0, y0, x1, y1 };
  };
  var densifyClosed = (s, step) => {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      const a = s[i], b = s[(i + 1) % s.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return out;
  };
  var unionRuns = (polys, step, hide, eps = 0.8) => {
    const runs = [];
    const bbs = polys.map((s) => bbox2([s]));
    polys.forEach((poly, i) => {
      if (poly.length < 3) return;
      const d = densifyClosed(poly, step), keep = d.map((p) => {
        if (hide && hide(p)) return false;
        for (let j = 0; j < polys.length; j++) {
          if (j === i || polys[j].length < 3) continue;
          const b = bbs[j];
          if (p[0] < b.x0 - eps || p[0] > b.x1 + eps || p[1] < b.y0 - eps || p[1] > b.y1 + eps) continue;
          const inn = insidePoly(polys[j], p[0], p[1]), e = edgeDist(polys[j], p);
          if (inn && e > eps) return false;
          if (e <= eps && j < i) return false;
        }
        return true;
      });
      const n = d.length;
      if (!n) return;
      if (keep.every(Boolean)) {
        runs.push([...d, d[0]]);
        return;
      }
      const s0 = keep.findIndex((k) => !k);
      let cur = [];
      for (let k = 1; k <= n; k++) {
        const i2 = (s0 + k) % n;
        if (keep[i2]) cur.push(d[i2]);
        else {
          if (cur.length > 1) runs.push(cur);
          cur = [];
        }
      }
      if (cur.length > 1) runs.push(cur);
    });
    return runs;
  };
  var thin = (s, every) => {
    if (s.length <= 3) return s;
    const o = s.filter((_, i) => i % every === 0);
    if (o[o.length - 1] !== s[s.length - 1]) o.push(s[s.length - 1]);
    return o;
  };
  var runLength = (s) => s.reduce((a, p, i) => i ? a + Math.hypot(p[0] - s[i - 1][0], p[1] - s[i - 1][1]) : 0, 0);

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/human/head.ts
  var ADULT_HEAD = {
    pivot: [0, 0.27, -0.06],
    skull: [
      { c: [0, 0.63, -0.05], r: [0.36, 0.41, 0.46] },
      { c: [0.25, 0.44, 0.18], r: [0.11, 0.1, 0.14] },
      { c: [-0.25, 0.44, 0.18], r: [0.11, 0.1, 0.14] },
      // cheekbones
      { c: [0.27, 0.15, 0], r: [0.09, 0.1, 0.1] },
      { c: [-0.27, 0.15, 0], r: [0.09, 0.1, 0.1] },
      // jaw angles: wide and low, a man's jaw
      { c: [0, 0.61, 0.35], r: [0.27, 0.05, 0.08] },
      // the brow ridge, over the eyes
      { c: [0, 0.2, 0.28], r: [0.15, 0.12, 0.11] },
      // the muzzle over the teeth
      { c: [0.045, 0.04, 0.3], r: [0.07, 0.06, 0.08] },
      { c: [-0.045, 0.04, 0.3], r: [0.07, 0.06, 0.08] }
      // a squared chin, two eminences
    ],
    nose: [{ c: [0, 0.54, 0.4], r: [0.03, 0.04, 0.03] }, { c: [0, 0.45, 0.44], r: [0.034, 0.05, 0.034] }, { c: [0, 0.36, 0.47], r: [0.042, 0.034, 0.034] }],
    ear: { c: [0.36, 0.43, -0.03], r: [0.045, 0.14, 0.085] },
    face: { c: [0, 0.45, -0.05], r: [0.34, 0.56, 0.46] },
    eyeStyle: "almond",
    eyeY: 0.5,
    eyeX: 0.138,
    eyeW: 0.066,
    eyeH: 0.026,
    browY: 0.6,
    noseY: 0.33,
    mouthY: 0.2,
    mouthW: 0.1
  };
  var headCtx = (head, hh, spec, cam) => ({ f: head, hh, spec, cam, M: (q) => apply(head, mul(sub(q, spec.pivot), hh)) });
  var toBlob = (h, e, mirror = false) => ({ c: h.M(mirror ? [-e.c[0], e.c[1], e.c[2]] : e.c), R: h.f.R, r: mul(e.r, h.hh) });
  var onFace = (h, x, y, lift = 4e-3) => {
    const F2 = h.spec.face, u = (x - F2.c[0]) / F2.r[0], v = (y - F2.c[1]) / F2.r[1], w = Math.sqrt(Math.max(0, 1 - u * u - v * v));
    const local = [x, y, F2.c[2] + F2.r[2] * w], n0 = norm([u / F2.r[0], v / F2.r[1], w / F2.r[2]]);
    const world = h.M(add(local, mul(n0, lift))), n = mv(h.f.R, n0), facing = dot(n, norm(sub(h.cam.eye, world)));
    const q = project(h.cam, world);
    return { p: [q.x, q.y], facing, world };
  };
  var faceRuns = (h, pts, min = 0.05) => {
    const out = [];
    let cur = [];
    pts.forEach(([x, y]) => {
      const f = onFace(h, x, y);
      if (f.facing > min) cur.push(f.p);
      else {
        if (cur.length > 1) out.push(cur);
        cur = [];
      }
    });
    if (cur.length > 1) out.push(cur);
    return out;
  };
  var ring = (cx, cy, rx2, ry2, n = 14, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n }, (_, i) => {
    const a = a0 + (a1 - a0) * i / (n - (a1 - a0 >= Math.PI * 2 - 1e-6 ? 0 : 1));
    return [cx + Math.cos(a) * rx2, cy + Math.sin(a) * ry2];
  });
  var lerp = (a, b, t) => a + (b - a) * t;
  var clampE = (v) => Math.max(-1, Math.min(1, v));
  var clipConvex = (subject, clip) => {
    let out = subject;
    const n = clip.length, sgnA = Math.sign(clip.reduce((a, p, i) => {
      const q = clip[(i + 1) % n];
      return a + p[0] * q[1] - q[0] * p[1];
    }, 0)) || 1;
    for (let i = 0; i < n && out.length; i++) {
      const a = clip[i], b = clip[(i + 1) % n], inn = (p) => sgnA * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= 0, inp = out;
      out = [];
      inp.forEach((p, k) => {
        const q = inp[(k + inp.length - 1) % inp.length], pi = inn(p), qi = inn(q);
        if (pi !== qi) {
          const d1 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]), d2 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]), t = d1 / (d1 - d2);
          out.push([q[0] + (p[0] - q[0]) * t, q[1] + (p[1] - q[1]) * t]);
        }
        if (pi) out.push(p);
      });
    }
    return out;
  };
  var faceMarks = (h, ex, roles, px) => {
    const S = h.spec, E = (k) => ex[k] ?? 0, marks = [], w = Math.max(0.9, px * 0.018);
    const lookX = clampE(E("lookX")), lookY = clampE(E("lookY"));
    const vis = (x, y, k = 0.12) => onFace(h, x, y).facing > k;
    [-1, 1].forEach((s) => {
      const inner = s * S.eyeX * 0.42, outer = s * (S.eyeX + S.eyeW * 1.35), y0 = S.browY + E("browRaise") * 0.035;
      const pts = Array.from({ length: 7 }, (_, i) => {
        const t = i / 6, x = lerp(inner - s * E("browFurrow") * 0.012, outer, t), arch = Math.sin(t * Math.PI * 0.9) * 0.018;
        return [x, y0 + arch + (1 - t) * (-E("browFurrow") * 0.03 + E("browSad") * 0.035) - t * E("browSad") * 0.01];
      });
      if (S.eyeStyle === "bead") faceRuns(h, pts, 0.12).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.brow, w: w * 1.5 }));
      else if (vis((inner + outer) / 2, y0, 0.15)) {
        const band = [...pts.map(([x, y], i) => [x, y + 0.013 * (1 - i / 7)]), ...pts.slice().reverse().map(([x, y], i) => [x, y - 9e-3 * (i / 7) - 2e-3])];
        marks.push({ kind: "fill", pts: band.map(([x, y]) => onFace(h, x, y).p), role: roles.brow, alpha: 0.85 });
      }
    });
    [-1, 1].forEach((s) => {
      const cx = s * S.eyeX, cy = S.eyeY, c = onFace(h, cx, cy);
      if (c.facing < 0.12) return;
      const lid = Math.max(-0.4, Math.min(1, E("lidUpper"))), low = Math.max(0, Math.min(1, E("lidLower") + E("cheek") * 0.35));
      if (S.eyeStyle === "bead") {
        if (lid > 0.85) {
          const up = E("smile") > 0.2 ? 1 : 0;
          faceRuns(h, ring(cx, cy - S.eyeH * 0.1, S.eyeW * 1.15, S.eyeH * (up ? 0.55 : 0.12), 9, Math.PI * 1.02, Math.PI * 1.98).map(([x, y]) => [x, cy - (y - cy) * (up ? 1 : -1)]), 0.1).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 2 }));
          return;
        }
        const ry2 = S.eyeH * (1 - Math.max(0, lid) * 0.75) * (1 - low * 0.35) * (1 + Math.max(0, -lid) * 0.25), ox = lookX * S.eyeW * 0.25, oy = lookY * S.eyeH * 0.18;
        const shape = ring(cx + ox, cy + oy - (S.eyeH - ry2) * 0.5 * Math.sign(lid), S.eyeW, ry2, 16).map(([x, y]) => onFace(h, x, y).p);
        marks.push({ kind: "fill", pts: shape, role: roles.pupil });
        const hi = onFace(h, cx + ox - S.eyeW * 0.32, cy + oy + ry2 * 0.36), hi2 = onFace(h, cx + ox + S.eyeW * 0.38, cy + oy - ry2 * 0.4);
        const k = project(h.cam, c.world).s * h.hh;
        marks.push({ kind: "dot", at: hi.p, rx: S.eyeW * 0.36 * k * Math.max(0.5, c.facing), ry: S.eyeW * 0.36 * k, rot: 0, role: roles.white });
        marks.push({ kind: "dot", at: hi2.p, rx: S.eyeW * 0.16 * k * Math.max(0.5, c.facing), ry: S.eyeW * 0.16 * k, rot: 0, role: roles.white, alpha: 0.85 });
        faceRuns(h, ring(cx, cy + ry2 * 0.2, S.eyeW * 1.28, ry2 * 1.25, 7, Math.PI * 0.18, Math.PI * 0.82).map(([x, y]) => [x, 2 * cy - y + ry2 * 0.4]), 0.12).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 1.2, alpha: 0.7 }));
      } else {
        const inner = cx - s * S.eyeW * 0.95, outer = cx + s * S.eyeW * 1, open = S.eyeH * (1 - Math.max(0, lid) * 0.9) * (1 + Math.max(0, -lid) * 0.35);
        const up = Array.from({ length: 9 }, (_, i) => {
          const t = i / 8, x = lerp(inner, outer, t), b = Math.sin(Math.pow(t, 0.8) * Math.PI);
          return [x, cy + 2e-3 + open * b * 0.95 - t * 4e-3];
        });
        const lo = Array.from({ length: 9 }, (_, i) => {
          const t = 1 - i / 8, x = lerp(inner, outer, t), b = Math.sin(Math.pow(t, 1.25) * Math.PI);
          return [x, cy - open * b * (0.62 - low * 0.35) - t * 4e-3 + low * 6e-3];
        });
        const open2D = [...up, ...lo].map(([x, y]) => onFace(h, x, y).p);
        marks.push({ kind: "fill", pts: open2D, role: roles.white, alpha: 0.9 });
        const ir = S.eyeH * 0.95, ix = cx + lookX * S.eyeW * 0.35, iy = cy + open * 0.35 + lookY * open * 0.3;
        const iris = clipConvex(ring(ix, iy, ir, ir, 16).map(([x, y]) => onFace(h, x, y).p), open2D.length > 2 ? convexify(open2D) : open2D);
        if (iris.length > 2) marks.push({ kind: "fill", pts: iris, role: roles.pupil, alpha: 0.85 });
        const pup = clipConvex(ring(ix, iy, ir * 0.42, ir * 0.42, 10).map(([x, y]) => onFace(h, x, y).p), convexify(open2D));
        if (pup.length > 2) marks.push({ kind: "fill", pts: pup, role: roles.line });
        faceRuns(h, up, 0.1).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 1.5 }));
        faceRuns(h, lo, 0.1).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 0.7, alpha: 0.6 }));
        faceRuns(h, up.slice(1, 8).map(([x, y]) => [x, y + 0.016 + E("browRaise") * 6e-3]), 0.12).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 0.8, alpha: 0.55 }));
      }
    });
    if (S.eyeStyle === "bead") {
      faceRuns(h, ring(0, S.noseY + 0.02, 0.028, 0.022, 7, Math.PI * 0.15, Math.PI * 0.85).map(([x, y]) => [x, 2 * (S.noseY + 0.02) - y]), 0.2).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 1.2, alpha: 0.75 }));
    } else {
      [-1, 1].forEach((s) => faceRuns(h, ring(s * 0.036, S.noseY + 6e-3, 0.02, 0.016, 7, s > 0 ? -0.6 : Math.PI - 1.9, s > 0 ? 1.9 : Math.PI + 0.6), 0.15).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 1.1, alpha: 0.8 })));
      faceRuns(h, [[-0.035, 0.53], [-0.038, 0.46], [-0.04, 0.4], [-0.036, 0.355]], 0.15).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 0.7, alpha: 0.4 }));
    }
    const mw = S.mouthW * (1 + E("mouthWide") * 0.35 + Math.max(0, E("smile")) * 0.15), sm = E("smile"), op = Math.max(0, E("mouthOpen"));
    const upper = Array.from({ length: 11 }, (_, i) => {
      const t = -1 + 2 * i / 10;
      return [t * mw, S.mouthY + sm * 0.032 * t * t - (S.eyeStyle === "almond" ? 4e-3 * Math.cos(t * Math.PI * 1.5) * (1 - Math.abs(t)) : 0) + op * 0.012];
    });
    if (op > 0.05) {
      const lower = [...upper].reverse().map(([x, y]) => {
        const t = x / mw;
        return [x, y - op * 0.085 * (1 - t * t) * (sm > 0.3 ? 1.1 : 1) - op * 0.012];
      });
      const shape = [...upper, ...lower].map(([x, y]) => onFace(h, x, y).p);
      if (vis(0, S.mouthY, 0.1)) {
        marks.push({ kind: "fill", pts: shape, role: roles.mouth, line: w * 1.4, tag: "mouth" });
        const tongue = lower.slice(2, 9).map(([x, y]) => [x * 0.8, y + 0.012]);
        marks.push({ kind: "fill", pts: [...tongue, ...tongue.slice().reverse().map(([x, y]) => [x, y + op * 0.022])].map(([x, y]) => onFace(h, x, y).p), role: roles.lip, alpha: 0.9, tag: "mouth" });
      }
    } else {
      faceRuns(h, upper, 0.12).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * (S.eyeStyle === "bead" ? 1.7 : 1.3), tag: "mouth" }));
      if (S.eyeStyle === "almond" && vis(0, S.mouthY, 0.12)) {
        const top = Array.from({ length: 13 }, (_, i) => {
          const t = -1 + 2 * i / 12;
          return [t * mw * 1.02, S.mouthY + sm * 0.032 * t * t + 0.02 * Math.pow(1 - t * t, 0.55) - 8e-3 * Math.exp(-((t / 0.13) ** 2))];
        });
        const bot = Array.from({ length: 13 }, (_, i) => {
          const t = 1 - 2 * i / 12;
          return [t * mw * 0.96, S.mouthY + sm * 0.03 * t * t - 0.028 * Math.pow(1 - t * t, 0.7)];
        });
        marks.push({ kind: "fill", pts: [...top, ...upper.slice().reverse()].map(([x, y]) => onFace(h, x, y).p), role: roles.lip, alpha: 0.55, tag: "mouth" });
        marks.push({ kind: "fill", pts: [...upper, ...bot].map(([x, y]) => onFace(h, x, y).p), role: roles.lip, alpha: 0.32, tag: "mouth" });
        faceRuns(h, top.slice(2, 11), 0.12).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 0.6, alpha: 0.35 }));
        faceRuns(h, Array.from({ length: 5 }, (_, i) => [(-0.5 + i / 4) * mw * 0.7, S.mouthY - 0.042]), 0.12).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 0.9, alpha: 0.4 }));
        [-1, 1].forEach((s) => faceRuns(h, [[s * 0.018, S.noseY - 0.035], [s * 0.022, S.mouthY + 0.03]], 0.2).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 0.5, alpha: 0.25 })));
      }
    }
    if (sm > 0.4 && S.eyeStyle === "bead") [-1, 1].forEach((s) => faceRuns(h, [[s * (mw + 0.012), S.mouthY + sm * 0.04], [s * (mw + 0.02), S.mouthY + sm * 0.022]], 0.15).forEach((r) => marks.push({ kind: "line", pts: r, role: roles.line, w: w * 1.1, alpha: 0.7 })));
    if (S.blush) [-1, 1].forEach((s) => {
      const c = onFace(h, s * 0.235, 0.3 + E("cheek") * 0.02);
      if (c.facing > 0.2) {
        const k = project(h.cam, c.world).s * h.hh;
        marks.push({ kind: "dot", at: c.p, rx: 0.075 * k * Math.max(0.35, c.facing), ry: 0.045 * k, rot: 0, role: roles.blush, alpha: 0.55 });
      }
    });
    (S.freckles ?? []).forEach(([x, y]) => {
      const c = onFace(h, x, y);
      if (c.facing > 0.25) {
        const k = project(h.cam, c.world).s * h.hh;
        marks.push({ kind: "dot", at: c.p, rx: 8e-3 * k * c.facing, ry: 8e-3 * k, rot: 0, role: roles.brow, alpha: 0.7 });
      }
    });
    return marks;
  };
  var convexify = (pts) => {
    const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
    for (const p of s) {
      while (lo.length >= 2 && x(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    }
    for (let i = s.length - 1; i >= 0; i--) {
      const p = s[i];
      while (hi.length >= 2 && x(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop();
      hi.push(p);
    }
    return [...lo.slice(0, -1), ...hi.slice(0, -1)];
  };
  var headParts = (h, skinRole, id = "head") => {
    const S = h.spec;
    const adult = S.eyeStyle === "almond";
    const earMarks = (s) => (cam) => {
      const e = S.ear, c = [s * e.c[0], e.c[1], e.c[2]], n = mv(h.f.R, [s, 0, 0.3]), w = h.M(c);
      if (!adult || dot(norm(n), norm(sub(cam.eye, w))) < 0.2) return [];
      const P2 = (q) => {
        const r = project(cam, h.M(q));
        return [r.x, r.y];
      }, px = project(cam, w).s * h.hh, lw = Math.max(0.7, px * 0.012);
      const helix = Array.from({ length: 9 }, (_, i) => {
        const a = -0.3 + i / 8 * Math.PI * 1.15;
        return P2([s * (e.c[0] + e.r[0] * 0.9), e.c[1] + Math.sin(a) * e.r[1] * 0.72, e.c[2] - Math.cos(a) * e.r[2] * 0.7]);
      });
      const concha = Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI * 0.2 + i / 6 * Math.PI * 1.1;
        return P2([s * (e.c[0] + e.r[0] * 0.9), e.c[1] - 0.02 + Math.sin(a) * e.r[1] * 0.3, e.c[2] - Math.cos(a) * e.r[2] * 0.3 + 0.01]);
      });
      return [{ kind: "line", pts: helix, role: "line", w: lw, alpha: 0.5 }, { kind: "line", pts: concha, role: "line", w: lw, alpha: 0.4 }];
    };
    const ear = (s) => ({ id: s > 0 ? "earL" : "earR", role: skinRole, groups: [{ blobs: [toBlob(h, S.ear, s < 0)], mode: "each" }], depthBias: 4e-3 * h.hh / 0.25, seams: [], marksFn: earMarks(s) });
    const skull = { id, role: skinRole, over: ["neck", "neckSkin"], groups: [{ blobs: S.skull.map((e) => toBlob(h, e)), mode: "hull" }, ...adult ? [] : [{ blobs: S.nose.map((e) => toBlob(h, e)), mode: "chain" }]], depthAt: h.M([0, 0.5, 0]) };
    if (!adult) return [skull, ear(1), ear(-1)];
    const nose = {
      id: "nose",
      role: skinRole,
      groups: [{ blobs: S.nose.map((e) => toBlob(h, e)), mode: "chain" }, { blobs: [-1, 1].map((s) => toBlob(h, { c: [s * 0.033, 0.345, 0.43], r: [0.022, 0.02, 0.024] })), mode: "each" }],
      over: [id],
      depthAt: h.M([0, 0.42, 0.3]),
      keepLineFn: (cam) => {
        const tip = project(cam, h.M([0, 0.36, 0.48])), root = project(cam, h.M([0, 0.4, 0])), dx = tip.x - root.x, dy = tip.y - root.y, L = Math.hypot(dx, dy), hs = project(cam, h.M([0, 0.4, 0])).s * h.hh;
        if (L < hs * 0.12) return () => false;
        const ux = dx / L, uy = dy / L;
        return (p) => (p[0] - tip.x) * ux + (p[1] - tip.y) * uy > -hs * 0.05 - L / hs * hs * 0.1;
      }
    };
    return [skull, nose, ear(1), ear(-1)];
  };

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/build.ts
  var polysOf = (cam, groups) => {
    const out = [];
    for (const g of groups) {
      const pp = g.blobs.map((b) => blobPts(cam, b));
      if (g.mode === "hull") out.push(ccw(hull(pp.flat())));
      else if (g.mode === "each" || pp.length === 1) pp.forEach((p) => out.push(ccw(hull(p))));
      else for (let i = 0; i + 1 < pp.length; i++) out.push(ccw(hull([...pp[i], ...pp[i + 1]])));
    }
    return out;
  };
  var toPart = (cam, bp) => {
    const all = bp.groups.flatMap((g) => g.blobs);
    const depth = bp.depthAt ? project(cam, bp.depthAt).z : all.reduce((a, b) => a + project(cam, b.c).z, 0) / Math.max(1, all.length);
    const size = all.reduce((a, b) => a + Math.max(b.r[0], b.r[2]) * project(cam, b.c).s, 0) / Math.max(1, all.length);
    return {
      id: bp.id,
      role: bp.role,
      depth: depth + (bp.depthBias ?? 0),
      polys: polysOf(cam, bp.groups),
      size,
      seams: (bp.seams ?? []).map((s) => {
        const q = project(cam, s.at);
        return { at: [q.x, q.y], r: s.r * q.s, with: s.with };
      }),
      marks: [...bp.marks ?? [], ...bp.marksFn ? bp.marksFn(cam) : []],
      keepLine: bp.keepLineFn?.(cam),
      over: bp.over,
      feature: bp.feature,
      outline: bp.outline,
      fill: bp.fill
    };
  };
  var order = (parts) => {
    const o = [...parts].sort((a, b) => b.depth - a.depth || a.id.localeCompare(b.id));
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (const p of [...o]) for (const under of p.over ?? []) {
        const i = o.indexOf(p), j = o.findIndex((q) => q.id === under);
        if (j > i) {
          o.splice(i, 1);
          o.splice(o.findIndex((q) => q.id === under) + 1, 0, p);
          moved = true;
        }
      }
      if (!moved) break;
    }
    return o;
  };

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/human/figure.ts
  var checkPose = (p, tag = "pose") => {
    const bad = limitViolations(p.joints);
    const hands = { L: resolveHand(p.hands?.L), R: resolveHand(p.hands?.R) };
    bad.push(...handViolations(hands.L, "handL"), ...handViolations(hands.R, "handR"));
    if (bad.length) throw new Error(`${tag}: outside the range of motion:
  ` + bad.join("\n  "));
    return hands;
  };
  var rigFor = (spec, p) => {
    const dims = dimsFromCanon(spec.canon, spec.height);
    let rig = fk(dims, p);
    if (p.plant) {
      const dy = lowestFoot(rig);
      rig = fk(dims, { ...p, root: [p.root[0], p.root[1] - dy, p.root[2]] });
    }
    return rig;
  };
  var build = (spec, p, cam) => {
    const hands = checkPose(p);
    const rig = rigFor(spec, p), dims = rig.dims;
    const head = headCtx(rig.head, dims.hh, spec.head, cam);
    const parts = [...bodyParts(rig, spec.body, { hands, roles: spec.roles, inflate: spec.inflate }), ...headParts(head, spec.roles?.head ?? spec.roles?.skin ?? "skin")];
    return { rig, dims, hands, head, parts, extra: [] };
  };
  var groundShadow = (cam, rig, away = [0.5, 0]) => {
    const pts = [];
    const hh = rig.dims.hh;
    SIDES.forEach((s) => {
      for (const loc of [[0, -rig.dims.ankleH, -rig.dims.heel], [0, -rig.dims.ankleH, 0]]) {
        const w = apply(rig.foot[s], loc);
        pts.push([w[0], 0, w[2]]);
      }
      const t = apply(rig.toes[s], [0, 0, rig.dims.toe - rig.dims.ball]);
      pts.push([t[0], 0, t[2]]);
    });
    const pel = rig.joints.pelvis;
    pts.push([pel[0] + away[0] * hh, 0, pel[2] + away[1] * hh]);
    const ring2 = [];
    pts.forEach((q) => {
      for (let a = 0; a < 8; a++) ring2.push([q[0] + Math.cos(a * 0.785) * hh * 0.35, 0, q[2] + Math.sin(a * 0.785) * hh * 0.22]);
    });
    return hull(ring2.map((q) => {
      const r = project(cam, q);
      return [r.x, r.y];
    }));
  };
  var assemble = (cam, b, p, faceRoles, meta = {}, post) => {
    const parts = b.parts.map((bp) => toPart(cam, bp));
    const head = parts.find((q) => q.id === "head");
    if (head) head.marks.push(...faceMarks(b.head, p.expression, faceRoles, head.size * 2));
    const all = order([...parts, ...b.extra, ...post ? post(parts) : []]);
    return { parts: all, light: [-0.62, -0.78], ground: { y: 0, shadow: groundShadow(cam, b.rig) }, px: project(cam, b.rig.joints.head).s * b.dims.hh, meta };
  };

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/gallery.ts
  var clamp2 = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  var normals = (s, closed = false) => s.map((_, i) => {
    const n = s.length, a = closed ? s[(i - 1 + n) % n] : s[Math.max(0, i - 1)], b = closed ? s[(i + 1) % n] : s[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
  var area = (s) => s.reduce((a, p, i) => {
    const q = s[(i + 1) % s.length];
    return a + p[0] * q[1] - q[0] * p[1];
  }, 0) / 2;
  var trace = (c, pts, closed = true) => {
    c.beginPath();
    pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    if (closed) c.closePath();
  };
  var boxOf = (pts) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return { x0, y0, x1, y1 };
  };
  var inkRibbon = (center, o) => {
    const { w, light = [-0.6, -0.8], shadow = 0.8, taper = [0.12, 0.18], seed = 1, rough = 0.25, closed = false, side = 1, min = 0.18, swell = 0.12 } = o;
    const s = closed ? center : center, n = s.length, nr = normals(s, closed), out = closed ? area(s) > 0 ? -1 : 1 : side, r = rng(seed);
    const ph = seed % 13 * 0.7, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), q = nr[i], ox = q[0] * out, oy = q[1] * out;
      const away = clamp2(-(ox * light[0] + oy * light[1]));
      const ends = closed ? 1 : Math.min(1, t / taper[0], (1 - t) / taper[1]);
      const tp = min + (1 - min) * Math.pow(clamp2(ends), 0.8);
      const wv = w * tp * (1 + shadow * away * 1.1 - shadow * 0.35) * (1 + swell * Math.sin(t * 9 + ph)) / 2;
      const j1 = (r() - 0.5) * rough, j2 = (r() - 0.5) * rough;
      L.push([s[i][0] - q[0] * (wv + j1), s[i][1] - q[1] * (wv + j1)]);
      R.push([s[i][0] + q[0] * (wv + j2), s[i][1] + q[1] * (wv + j2)]);
    }
    return closed ? [...L, L[0], ...[...R, R[0]].reverse()] : [...L, ...R.reverse()];
  };
  var ink = (g, center, color, o, alpha = 1) => {
    const pts = inkRibbon(center, o), b = boxOf(pts);
    g.touch(b.x0 - 3, b.y0 - 3, b.x1 + 3, b.y1 + 3);
    const c = g.cur;
    c.globalAlpha = alpha;
    c.fillStyle = color;
    if (o.closed) {
      const n = center.length + 1;
      c.beginPath();
      pts.slice(0, n).forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
      c.closePath();
      pts.slice(n).forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
      c.closePath();
      c.fill("evenodd");
    } else {
      trace(c, pts);
      c.fill();
    }
    c.globalAlpha = 1;
  };

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/render/storybook.ts
  var hashId = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) % 1e5;
  };
  var pathPolys = (c, polys, dx = 0, dy = 0) => {
    c.beginPath();
    polys.forEach((s) => s.forEach(([x, y], i) => i ? c.lineTo(x + dx, y + dy) : c.moveTo(x + dx, y + dy)));
    polys.forEach(() => c.closePath());
  };
  var contourRuns = (part, byId, step = 1.5) => {
    const seams = (part.seams ?? []).map((s) => ({ ...s, polys: byId.get(s.with)?.polys ?? [] })).filter((s) => s.polys.length);
    const seamHide = (p) => seams.some((s) => Math.hypot(p[0] - s.at[0], p[1] - s.at[1]) < s.r && s.polys.some((q) => insidePoly(q, p[0], p[1])));
    const hide = seams.length || part.keepLine ? (p) => (part.keepLine ? !part.keepLine(p) : false) || seamHide(p) : void 0;
    return unionRuns(part.polys, step, hide).filter((r) => runLength(r) > 2.5);
  };
  var inkWeight = (part, k = 1) => Math.max(1.1, Math.min(4.2, 0.9 + part.size * 0.055)) * k;
  var drawMarks = (g, marks, col, seed, penW = 1) => {
    marks.forEach((m, i) => {
      const c = g.cur;
      if (m.kind === "line") g.pen(m.pts, { w: m.w * penW, color: col(m.role), seed: seed + i * 7, wobble: Math.min(0.5, m.w * 0.2), boil: 0.25, opacity: m.alpha ?? 0.92, retrace: false, closed: m.closed, taper: 0.8 });
      else if (m.kind === "fill") {
        g.fill(m.pts, col(m.role), m.alpha ?? 1);
        if (m.line) g.pen(m.pts, { w: m.line * penW, color: GRAPHITE, seed: seed + i * 7 + 1, wobble: 0.3, boil: 0.2, closed: true, retrace: false, taper: 0.4 });
      } else {
        g.touch(m.at[0] - m.rx - 2, m.at[1] - m.ry - 2, m.at[0] + m.rx + 2, m.at[1] + m.ry + 2);
        c.globalAlpha = m.alpha ?? 1;
        c.fillStyle = col(m.role);
        c.beginPath();
        c.ellipse(m.at[0], m.at[1], Math.max(0.3, m.rx), Math.max(0.3, m.ry), m.rot, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
    });
  };
  var renderStorybook = (g, scene, pal2, o = {}) => {
    const byId = new Map(scene.parts.map((p) => [p.id, p])), L = scene.light, sw = (r) => pal2[r] ?? { base: "#ff00ff", shade: "#990099" };
    const col = (r) => r === "line" ? GRAPHITE : sw(r).base;
    if (scene.ground?.shadow.length) g.group("paint", () => g.wash(scene.ground.shadow, "#7d6fa8", { alpha: 0.32, seed: 8, dx: 0, dy: 0, shrink: 1, rim: false }));
    for (const part of scene.parts) {
      const seed = hashId(part.id), s = sw(part.role), k = part.size, clipPolys = part.clipTo ? byId.get(part.clipTo)?.polys : void 0;
      const clipped = (fn) => {
        if (!clipPolys?.length) return fn();
        const c = g.cur;
        c.save();
        pathPolys(c, clipPolys);
        c.clip("nonzero");
        fn();
        c.restore();
      };
      if (part.fill !== false && part.polys.length) {
        const wet = Math.min(3.2, 0.6 + k * 0.05), polys = part.polys.map((q, i) => displace(q, wet, 0.03, 2, seed + i));
        g.group("paint", () => {
          clipped(() => {
            const c = g.cur, b = bbox2(polys);
            g.touch(b.x0 - 6, b.y0 - 6, b.x1 + 6, b.y1 + 6);
            c.globalAlpha = o.paintAlpha ?? 0.97;
            c.fillStyle = s.shade;
            pathPolys(c, polys);
            c.fill("nonzero");
            c.save();
            pathPolys(c, polys);
            c.clip("nonzero");
            c.fillStyle = s.base;
            pathPolys(c, polys, L[0] * k * 0.28, L[1] * k * 0.28);
            c.fill("nonzero");
            c.restore();
            c.globalAlpha = 1;
          });
        });
      }
      g.group("ink", () => clipped(() => {
        if (part.outline !== false) {
          const w = inkWeight(part, o.weight ?? 1), r = rng(seed);
          contourRuns(part, byId).forEach((run, i) => {
            const every = Math.max(2, Math.round(run.length / 26));
            g.pen(thin(run, every), { w, color: s.line ?? GRAPHITE, seed: seed + i * 13 + Math.floor(r() * 9), wobble: Math.min(1, 0.2 + k * 0.012), boil: 0.3, taper: 0.7, opacity: 0.95 });
          });
        }
        drawMarks(g, part.marks, col, seed + 500, 1);
      }));
    }
  };

  // ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/render/marker.ts
  var COMIC_INK = "#15122a";
  var pathPolys2 = (c, polys, dx = 0, dy = 0) => {
    c.beginPath();
    polys.forEach((s) => {
      s.forEach(([x, y], i) => i ? c.lineTo(x + dx, y + dy) : c.moveTo(x + dx, y + dy));
      c.closePath();
    });
  };
  var markInk = (g, marks, col, seed, light) => {
    marks.forEach((m, i) => {
      const c = g.cur;
      if (m.kind === "line") {
        if (m.pts.length > 1) ink(g, m.pts, m.role === "line" ? COMIC_INK : col(m.role), { w: m.w * 1.25, light, shadow: 0.3, taper: [0.2, 0.2], seed: seed + i, rough: 0.15 }, m.alpha ?? 1);
      } else if (m.kind === "fill") {
        const b = bbox2([m.pts]);
        g.touch(b.x0 - 3, b.y0 - 3, b.x1 + 3, b.y1 + 3);
        c.globalAlpha = m.alpha ?? 1;
        c.fillStyle = col(m.role);
        pathPolys2(c, [m.pts]);
        c.fill();
        c.globalAlpha = 1;
        if (m.line) ink(g, [...m.pts, m.pts[0]], COMIC_INK, { w: m.line * 1.3, light, shadow: 0.4, taper: [0.02, 0.02], seed: seed + i + 50 });
      } else {
        g.touch(m.at[0] - m.rx - 2, m.at[1] - m.ry - 2, m.at[0] + m.rx + 2, m.at[1] + m.ry + 2);
        c.globalAlpha = m.alpha ?? 1;
        c.fillStyle = col(m.role);
        c.beginPath();
        c.ellipse(m.at[0], m.at[1], Math.max(0.3, m.rx), Math.max(0.3, m.ry), m.rot, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
    });
  };
  var renderMarker = (g, scene, pal2, o = {}) => {
    const byId = new Map(scene.parts.map((p) => [p.id, p])), L = scene.light, lightTo = [L[0], L[1]], sw = (r) => pal2[r] ?? { base: "#ff00ff", shade: "#990099" };
    const col = (r) => r === "line" ? COMIC_INK : sw(r).base;
    g.group("plain", () => {
      if (scene.ground?.shadow.length) {
        const c = g.cur, b = bbox2([scene.ground.shadow]);
        g.touch(b.x0, b.y0, b.x1, b.y1);
        c.fillStyle = "rgba(21,18,42,0.28)";
        pathPolys2(c, [scene.ground.shadow]);
        c.fill();
      }
      for (const part of scene.parts) {
        const s = sw(part.role), k = part.size, seed = hashId(part.id), c = g.cur;
        if (part.fill !== false && part.polys.length) {
          const b = bbox2(part.polys);
          g.touch(b.x0 - 4, b.y0 - 4, b.x1 + 4, b.y1 + 4);
          c.fillStyle = s.shade;
          pathPolys2(c, part.polys);
          c.fill("nonzero");
          c.save();
          pathPolys2(c, part.polys);
          c.clip("nonzero");
          c.fillStyle = s.base;
          pathPolys2(c, part.polys, L[0] * k * 0.34, L[1] * k * 0.34);
          c.fill("nonzero");
          c.restore();
        }
        if (part.outline !== false) {
          const w = Math.max(1.6, Math.min(6.5, 1.2 + k * 0.1)) * (o.weight ?? 1);
          contourRuns(part, byId).forEach((run, i) => {
            const r = thin(run, Math.max(1, Math.round(run.length / 60)));
            ink(g, r, COMIC_INK, { w, light: lightTo, shadow: 0.95, taper: [0.06, 0.06], seed: seed + i, side: signedArea(part.polys[0]) >= 0 ? -1 : 1, rough: 0.2, min: 0.3 });
          });
        }
        markInk(g, part.marks, col, seed + 700, lightTo);
      }
    });
  };

  // fitted.json
  var fitted_default = {
    "warrior-2": {
      pose: {
        root: [
          0,
          0,
          0
        ],
        yaw: -12.626288639999997,
        pitch: 41.315763200000006,
        roll: 1.1197439999999996,
        joints: {
          pelvisTilt: -17.5614464,
          pelvisTwist: -6.623907839999998,
          spineBend: -30,
          spineSide: -0.2707292160000004,
          spineTwist: 17.727344639999995,
          neckBend: -5.894369279999999,
          neckSide: -5.329981439999998,
          neckTwist: 49.90685183999999,
          headTurn: 30,
          shoulderRaiseL: 89.88065792000002,
          shoulderRaiseR: 90.03747737600001,
          shoulderSwingL: 0,
          shoulderSwingR: 0,
          shoulderTwistL: 0,
          shoulderTwistR: 0,
          elbowL: 0,
          elbowR: 0,
          hipFlexL: 13.993517056000004,
          hipFlexR: 59.59815577599999,
          hipAbdL: 45,
          hipAbdR: 45,
          hipRotL: -27.087609856000004,
          hipRotR: 45,
          kneeL: 0,
          kneeR: 59.43635967999999,
          ankleL: 25,
          ankleR: 7.6760064
        },
        expression: {},
        plant: true
      },
      loss: 0.11287994294962357,
      errDeg: {
        torso: 0.3,
        neck: 2.4,
        head: 4,
        shoulderLine: 0,
        hipLine: 17.6,
        upperArmL: 0.1,
        forearmL: 0.1,
        thighL: 5.4,
        shinL: 5.4,
        footL: 12,
        upperArmR: 0,
        forearmR: 0,
        thighR: 9.1,
        shinR: 1.9,
        footR: 7.6
      },
      violations: []
    },
    "downward-dog": {
      pose: {
        root: [
          0,
          0,
          0
        ],
        yaw: 299.21263513599973,
        pitch: 53.27103999999999,
        roll: 57.43510015999998,
        joints: {
          pelvisTilt: 13.361391615999995,
          pelvisTwist: 33.848541184,
          spineBend: 62.883296256,
          spineSide: -4.78181376,
          spineTwist: 1.9199877119999995,
          neckBend: -6.563519999999988,
          neckSide: 1.0407935999999944,
          neckTwist: 49.88774399999999,
          headTurn: 30,
          shoulderRaiseL: 180,
          shoulderRaiseR: 180,
          shoulderSwingL: 72.49058611200002,
          shoulderSwingR: 107.391688704,
          shoulderTwistL: 38.26394726399999,
          shoulderTwistR: -38.073102336000034,
          elbowL: 7.828578304000001,
          elbowR: 7.8760304639999985,
          hipFlexL: 68.59378278399996,
          hipFlexR: 68.59378278399996,
          hipAbdL: -0.7223869439999999,
          hipAbdR: 0.7223869439999999,
          hipRotL: -3.0726144000000026,
          hipRotR: 3.0726144000000026,
          kneeL: 9.857396736,
          kneeR: 9.857396736,
          ankleL: 14.515261440000002,
          ankleR: 14.515261440000002
        },
        expression: {},
        plant: true
      },
      loss: 0.08125263974903175,
      errDeg: {
        torso: 11.3,
        neck: 7.9,
        head: 13.1,
        shoulderLine: 1.2,
        hipLine: 3.1,
        upperArmL: 5.9,
        forearmL: 0,
        thighL: 0.1,
        shinL: 0.1,
        footL: 0.1,
        upperArmR: 5.9,
        forearmR: 0,
        thighR: 0.1,
        shinR: 0.1,
        footR: 0.1
      },
      violations: []
    },
    tree: {
      pose: {
        root: [
          0,
          0,
          0
        ],
        yaw: 323.47495424,
        pitch: -44.73969152000001,
        roll: -31.36,
        joints: {
          pelvisTilt: 30,
          pelvisTwist: 40,
          spineBend: 41.46313216,
          spineSide: -7.899614720000007,
          spineTwist: -11.748871679999995,
          neckBend: -17.861595135999995,
          neckSide: -13.130919935999998,
          neckTwist: -49.759744,
          headTurn: -30,
          shoulderRaiseL: 0,
          shoulderRaiseR: 0,
          shoulderSwingL: 0,
          shoulderSwingR: 0,
          shoulderTwistL: -27.611480064000006,
          shoulderTwistR: -29.50457343999999,
          elbowL: 138.2625024,
          elbowR: 137.78909184,
          hipFlexL: 16.951957504,
          hipFlexR: -20,
          hipAbdL: 45,
          hipAbdR: -9.61714432,
          hipRotL: 45,
          hipRotR: 12.39640064,
          kneeL: 108.23532134400001,
          kneeR: 1.7899315200000003,
          ankleL: -8.212738559999998,
          ankleR: 8.048885759999997
        },
        expression: {},
        plant: true
      },
      loss: 0.21836144691392975,
      errDeg: {
        torso: 3.3,
        neck: 6.3,
        head: 10.2,
        shoulderLine: 0.7,
        hipLine: 15.3,
        upperArmL: 16.1,
        forearmL: 0.1,
        thighL: 11.5,
        shinL: 1,
        footL: 12.5,
        upperArmR: 14.9,
        forearmR: 0,
        thighR: 2,
        shinR: 0.3,
        footR: 0.1
      },
      violations: []
    }
  };

  // targets.json
  var targets_default = {
    "warrior-2": {
      camera: {
        az: 90,
        el: 4
      },
      J: {
        pelvis: [
          0,
          76.72,
          0
        ],
        spine1: [
          0,
          98.72,
          0
        ],
        spine2: [
          0,
          120.72,
          0
        ],
        spine3: [
          0,
          138.72,
          0
        ],
        neckTop: [
          0,
          149.22,
          0
        ],
        head: [
          0.56,
          158.22,
          1.39
        ],
        shoulderR: [
          0,
          134.72,
          22
        ],
        elbowR: [
          0,
          134.72,
          59.2
        ],
        wristR: [
          0,
          134.72,
          88.4
        ],
        hipR: [
          0,
          76.72,
          9.5
        ],
        kneeR: [
          3.83,
          57,
          54.19
        ],
        ankleR: [
          3.88,
          7.8,
          54.42
        ],
        fingersR: [
          0,
          134.72,
          110
        ],
        toeR: [
          5.96,
          3.03,
          78.34
        ],
        heelR: [
          3.4,
          3.5,
          48.45
        ],
        shoulderL: [
          0,
          134.72,
          -22
        ],
        elbowL: [
          0,
          134.72,
          -59.2
        ],
        wristL: [
          0,
          134.72,
          -88.4
        ],
        hipL: [
          0,
          76.72,
          -9.5
        ],
        kneeL: [
          1.92,
          42.37,
          -44.39
        ],
        ankleL: [
          3.85,
          7.88,
          -79.42
        ],
        fingersL: [
          0,
          134.72,
          -110
        ],
        toeL: [
          19.28,
          3.31,
          -60.98
        ],
        heelL: [
          0.4,
          3.54,
          -84.3
        ]
      },
      frame: {
        pelvis: {
          pos: [
            0,
            0,
            0
          ],
          rot: [
            0,
            0,
            0
          ]
        },
        spine1: [
          0,
          0,
          0
        ],
        spine2: [
          0,
          0,
          0
        ],
        spine3: [
          0,
          0,
          0
        ],
        neck: [
          0,
          -58,
          0
        ],
        head: [
          0,
          -10,
          0
        ],
        shoulderR: [
          90,
          0,
          0
        ],
        elbowR: [
          0,
          0,
          0
        ],
        wristR: [
          0,
          0,
          0
        ],
        hipR: [
          65.8,
          78,
          11
        ],
        kneeR: [
          0,
          0,
          66
        ],
        ankleR: [
          0.4,
          0,
          -0.2
        ],
        shoulderL: [
          90,
          0,
          0
        ],
        elbowL: [
          0,
          0,
          0
        ],
        wristL: [
          0,
          0,
          0
        ],
        hipL: [
          45.4,
          -42,
          3.2
        ],
        kneeL: [
          0,
          0,
          0
        ],
        ankleL: [
          29.4,
          0,
          32.4
        ]
      },
      props: []
    },
    "downward-dog": {
      camera: {
        az: 28,
        el: 6
      },
      J: {
        pelvis: [
          0,
          104.06,
          0
        ],
        spine1: [
          14.78,
          87.76,
          0
        ],
        spine2: [
          29.56,
          71.46,
          0
        ],
        spine3: [
          41.65,
          58.13,
          0
        ],
        neckTop: [
          47.85,
          49.66,
          0
        ],
        head: [
          51.08,
          41.12,
          0
        ],
        shoulderR: [
          38.96,
          61.09,
          22
        ],
        elbowR: [
          62.02,
          31.9,
          22
        ],
        wristR: [
          80.9,
          9.63,
          22
        ],
        hipR: [
          0,
          104.06,
          9.5
        ],
        kneeR: [
          -13.42,
          56.93,
          9.5
        ],
        ankleR: [
          -34.91,
          12.68,
          9.5
        ],
        fingersR: [
          101.98,
          4.92,
          22.34
        ],
        toeR: [
          -13.94,
          0.07,
          9.5
        ],
        heelR: [
          -42.01,
          10.65,
          9.5
        ],
        shoulderL: [
          38.96,
          61.09,
          -22
        ],
        elbowL: [
          62.02,
          31.9,
          -22
        ],
        wristL: [
          80.9,
          9.63,
          -22
        ],
        hipL: [
          0,
          104.06,
          -9.5
        ],
        kneeL: [
          -13.42,
          56.93,
          -9.5
        ],
        ankleL: [
          -34.91,
          12.68,
          -9.5
        ],
        fingersL: [
          101.98,
          4.92,
          -22.34
        ],
        toeL: [
          -13.94,
          0.07,
          -9.5
        ],
        heelL: [
          -42.01,
          10.65,
          -9.5
        ]
      },
      frame: {
        pelvis: {
          pos: [
            0,
            0,
            0
          ],
          rot: [
            0,
            0,
            137.8
          ]
        },
        spine1: [
          0,
          0,
          0
        ],
        spine2: [
          0,
          0,
          0
        ],
        spine3: [
          0,
          0,
          0
        ],
        neck: [
          0,
          0,
          6
        ],
        head: [
          0,
          0,
          6
        ],
        shoulderR: [
          0,
          0,
          176.1
        ],
        elbowR: [
          0,
          0,
          2
        ],
        wristR: [
          -0.9,
          88,
          37.1
        ],
        hipR: [
          0,
          0,
          121.9
        ],
        kneeR: [
          0,
          0,
          10
        ],
        ankleR: [
          0,
          0,
          6.2
        ],
        shoulderL: [
          0,
          0,
          176.1
        ],
        elbowL: [
          0,
          0,
          2
        ],
        wristL: [
          -0.9,
          88,
          37.1
        ],
        hipL: [
          0,
          0,
          121.9
        ],
        kneeL: [
          0,
          0,
          10
        ],
        ankleL: [
          0,
          0,
          6.2
        ]
      },
      props: []
    },
    tree: {
      camera: {
        az: 70,
        el: 4
      },
      J: {
        pelvis: [
          0,
          106,
          0
        ],
        spine1: [
          0,
          128,
          0
        ],
        spine2: [
          0,
          150,
          0
        ],
        spine3: [
          0,
          168,
          0
        ],
        neckTop: [
          0,
          178.5,
          0
        ],
        head: [
          1.5,
          187.5,
          0
        ],
        shoulderR: [
          0,
          164,
          22
        ],
        elbowR: [
          -12.09,
          130.23,
          12.12
        ],
        wristR: [
          10.99,
          145.51,
          2.8
        ],
        hipR: [
          0,
          106,
          9.5
        ],
        kneeR: [
          0,
          57,
          9.5
        ],
        ankleR: [
          0,
          7.8,
          9.5
        ],
        fingersR: [
          11,
          167.11,
          2.83
        ],
        toeR: [
          24,
          3,
          9.5
        ],
        heelR: [
          -6,
          3.5,
          9.5
        ],
        shoulderL: [
          0,
          164,
          -22
        ],
        elbowL: [
          -12.09,
          130.23,
          -12.12
        ],
        wristL: [
          10.99,
          145.51,
          -2.8
        ],
        hipL: [
          0,
          106,
          -9.5
        ],
        kneeL: [
          6.06,
          70.15,
          -42.35
        ],
        ankleL: [
          -2.57,
          46.02,
          -0.35
        ],
        fingersL: [
          11,
          167.11,
          -2.83
        ],
        toeL: [
          5.88,
          23.12,
          1.43
        ],
        heelL: [
          -4.12,
          51.22,
          4.65
        ]
      },
      frame: {
        pelvis: {
          pos: [
            0,
            0,
            0
          ],
          rot: [
            0,
            0,
            0
          ]
        },
        spine1: [
          0,
          0,
          0
        ],
        spine2: [
          0,
          0,
          0
        ],
        spine3: [
          0,
          0,
          0
        ],
        neck: [
          0,
          0,
          0
        ],
        head: [
          0,
          0,
          0
        ],
        shoulderR: [
          -15.4,
          -41.9,
          -19.7
        ],
        elbowR: [
          0,
          0,
          130.3
        ],
        wristR: [
          24.2,
          38.1,
          55
        ],
        hipR: [
          0,
          0,
          0
        ],
        kneeR: [
          0,
          0,
          0
        ],
        ankleR: [
          0,
          0,
          0
        ],
        shoulderL: [
          -15.4,
          -41.9,
          -19.7
        ],
        elbowL: [
          0,
          0,
          130.3
        ],
        wristL: [
          24.2,
          38.1,
          55
        ],
        hipL: [
          42.1,
          74.8,
          9.6
        ],
        kneeL: [
          0,
          0,
          103.6
        ],
        ankleL: [
          17.1,
          -19.1,
          -23.9
        ]
      },
      props: []
    }
  };

  // src/page.ts
  var SPEC = {
    canon: CANON.adult,
    height: 1.7,
    body: ADULT_BODY,
    head: ADULT_HEAD,
    roles: { skin: "skin", torso: "top", hips: "pants", upperArm: "skin", thigh: "pants", shin: "pants", foot: "skin" }
  };
  var pal = (hex) => Object.fromEntries(Object.entries(hex).map(([k, [base, shade]]) => [k, { base, shade }]));
  var COMMON = { skin: ["#f1c4a2", "#d79a76"], top: ["#2f7d78", "#1f5753"], pants: ["#46407a", "#2d2956"], nail: ["#f7d9c4", "#e8b99c"], hair: ["#4a3328", "#2d1d15"], white: ["#ffffff", "#dfe6ee"], pupil: ["#222", "#222"], blush: ["#ee8a8f", "#d46a70"], mouth: ["#8a3a3a", "#6b2929"], lip: ["#e08a8d", "#c26a70"], brow: ["#3a2a22", "#3a2a22"] };
  var PAL = pal(COMMON);
  var W = 640;
  var H = 640;
  var mkEnv = (scale) => ({
    W,
    H,
    scale,
    cache: /* @__PURE__ */ new Map(),
    canvas: (w, h) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return { canvas: c, ctx: c.getContext("2d") };
    }
  });
  function drawPose(cv, id, hand, scale = 1) {
    cv.width = W * scale;
    cv.height = H * scale;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#f6f1e7";
    ctx.fillRect(0, 0, cv.width, cv.height);
    const pose = fitted_default[id].pose, cam0 = targets_default[id].camera;
    const a = cam0.az * Math.PI / 180, e = cam0.el * Math.PI / 180;
    const dir = [-Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)];
    const dist = 9, tgt = [0, 0.95, 0];
    const eye = [tgt[0] + dir[0] * dist, tgt[1] + dir[1] * dist, tgt[2] + dir[2] * dist];
    const span = 2.3;
    const cam = camera(eye, tgt, H / span * dist * (1 - 0), W / 2, H / 2);
    const built = build(SPEC, pose, cam);
    const scene = assemble(cam, built, pose, { line: "line", pupil: "pupil", white: "white", blush: "blush", brow: "brow", mouth: "mouth", lip: "lip" });
    const g = new Gfx(ctx, mkEnv(scale), 0, PENCIL);
    if (hand === "marker") renderMarker(g, scene, PAL);
    else renderStorybook(g, scene, PAL);
  }
  window.drawPose = drawPose;
})();
