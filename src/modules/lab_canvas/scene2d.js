// Nuclear Lab Canvas — DOM nodes + SVG wires (reliable drag & connect).
import { COMPONENTS, getComponent, makeNode, PRESETS, EXPERIMENTS, getExperiment } from './components.js';
import { getDetectorKind, senseBadges, prettyParticle } from './detectors.js';
import { simStep, resetSimState } from './simulate.js';

let _uid = 1;
function uid(prefix) {
  _uid += 1;
  return (prefix || 'id') + _uid;
}

function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}

export class LabCanvasScene {
  constructor(host) {
    this.host = host;
    this.nodes = [];
    this.wires = [];
    this.selectedId = null;
    this.running = false;
    this.paused = false;
    this.sim = resetSimState();
    this._onChange = null;
    this._onSelect = null;
    this._placeCount = 0;
    this._drag = null;
    this._wireDraft = null;
    this._nodeEls = {};
    this._raf = null;
    this._last = performance.now();

    host.classList.add('lab-host');
    host.innerHTML = '';

    this.stage = el('div', 'lab-stage');
    this.hint = el('div', 'lab-hint',
      'Drag a part to move it · Click a green ● then a blue ● to connect · Run to simulate');
    this.stage.appendChild(this.hint);

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'lab-wires');
    this.stage.appendChild(this.svg);

    this.nodesLayer = el('div', 'lab-nodes');
    this.stage.appendChild(this.nodesLayer);

    this.ghostLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.ghostLine.setAttribute('class', 'lab-wire-ghost');
    this.svg.appendChild(this.ghostLine);

    host.appendChild(this.stage);

    const self = this;
    this._onResize = function () { self.resize(); self._redrawWires(); };
    window.addEventListener('resize', this._onResize);

    this._onWinMove = function (e) { self._onPointerMove(e); };
    this._onWinUp = function (e) { self._onPointerUp(e); };
    window.addEventListener('pointermove', this._onWinMove);
    window.addEventListener('pointerup', this._onWinUp);
    window.addEventListener('pointercancel', this._onWinUp);

    this.stage.addEventListener('pointerdown', function (e) {
      if (e.target === self.stage || e.target === self.svg || e.target === self.nodesLayer || e.target === self.hint) {
        if (self._wireDraft) {
          self._wireDraft = null;
          self.stage.classList.remove('wiring');
          self._updateGhost();
        }
        self.selectedId = null;
        self._renderSelection();
        self._notify('select');
      }
    });

    this._loop = function (now) {
      const dt = Math.min(0.05, (now - self._last) / 1000);
      self._last = now;
      if (self.running && !self.paused) {
        simStep({ nodes: self.nodes, wires: self.wires }, self.sim, dt);
        self._updateLiveLabels();
        self._redrawParticles();
        if (self._onChange) self._onChange('tick');
      }
      self._raf = requestAnimationFrame(self._loop);
    };
    this._raf = requestAnimationFrame(this._loop);

    this.resize();
    this.loadPreset('detector_match');
  }

  setCallbacks(opts) {
    this._onChange = opts && opts.onChange;
    this._onSelect = opts && opts.onSelect;
  }

  resize() {
    const w = Math.max(1, this.host.clientWidth || 0);
    const h = Math.max(1, this.host.clientHeight || 0);
    this._w = w;
    this._h = h;
    this.stage.style.width = '100%';
    this.stage.style.height = '100%';
    this.stage.style.minHeight = '0';
    this.svg.setAttribute('width', String(w));
    this.svg.setAttribute('height', String(h));
    this.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  }

  getGraph() { return { nodes: this.nodes, wires: this.wires }; }
  getSim() { return this.sim; }

  clear() {
    this.nodes = [];
    this.wires = [];
    this.selectedId = null;
    this.sim = resetSimState();
    this.running = false;
    this._rebuildDom();
    this._notify('clear');
  }

  loadPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    this.nodes = p.nodes.map(function (n) {
      return {
        id: n.id,
        type: n.type,
        x: n.x,
        y: n.y,
        w: 150,
        h: 72,
        props: Object.assign({}, n.props),
      };
    });
    this.wires = p.wires.map(function (w) {
      return {
        id: w.id,
        from: w.from,
        fromPort: w.fromPort,
        to: w.to,
        toPort: w.toPort,
      };
    });
    this.selectedId = null;
    this.sim = resetSimState();
    this.running = false;
    this._rebuildDom();
    this._notify('preset');
  }

  addComponent(typeId, x, y) {
    const w = this._w || 800;
    const h = this._h || 500;
    const col = this._placeCount % 3;
    const row = Math.floor(this._placeCount / 3) % 4;
    this._placeCount += 1;
    const px = x != null ? x : Math.max(40, Math.min(w - 180, 60 + col * 180));
    const py = y != null ? y : Math.max(56, Math.min(h - 100, 80 + row * 100));
    const n = makeNode(typeId, px, py, uid('n'));
    if (!n) return null;
    n.w = 150;
    n.h = 72;
    this.nodes.push(n);
    this.selectedId = n.id;
    this._mountNode(n);
    this._renderSelection();
    this._notify('add');
    return n;
  }

  deleteSelected() {
    if (!this.selectedId) return;
    const id = this.selectedId;
    this.nodes = this.nodes.filter(function (n) { return n.id !== id; });
    this.wires = this.wires.filter(function (w) { return w.from !== id && w.to !== id; });
    this.selectedId = null;
    this._rebuildDom();
    this._notify('delete');
  }

  start() {
    this.sim = resetSimState();
    this.running = true;
    this.paused = false;
    this._notify('start');
  }

  stop() {
    this.running = false;
    this._notify('stop');
  }

  setPaused(v) { this.paused = !!v; }

  updateSelectedProps(props) {
    const n = this._node(this.selectedId);
    if (!n) return;
    Object.keys(props).forEach(function (k) { n.props[k] = props[k]; });
    this._refreshNodeLabel(n);
    this._notify('props');
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onWinMove);
    window.removeEventListener('pointerup', this._onWinUp);
    window.removeEventListener('pointercancel', this._onWinUp);
    this.host.innerHTML = '';
    this.host.classList.remove('lab-host');
  }

  _notify(reason) {
    if (this._onChange) this._onChange(reason);
    if (this._onSelect) this._onSelect(this._node(this.selectedId));
  }

  _node(id) {
    for (let i = 0; i < this.nodes.length; i++) if (this.nodes[i].id === id) return this.nodes[i];
    return null;
  }

  _rebuildDom() {
    this.nodesLayer.innerHTML = '';
    this._nodeEls = {};
    // keep ghost line
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    this.ghostLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.ghostLine.setAttribute('class', 'lab-wire-ghost');
    this.svg.appendChild(this.ghostLine);
    this._particleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this._particleGroup);

    for (let i = 0; i < this.nodes.length; i++) this._mountNode(this.nodes[i]);
    this._redrawWires();
    this._renderSelection();
  }

  _mountNode(node) {
    const self = this;
    const def = getComponent(node.type) || { color: '#94a3b8', short: node.type, icon: '•', ports: {}, label: node.type };
    const detKind = node.type === 'detector' ? getDetectorKind((node.props && node.props.kind) || 'gm') : null;
    const box = el('div', 'lab-node' + (node.type === 'detector' ? ' lab-node-det' : ''));
    box.dataset.id = node.id;
    box.style.left = node.x + 'px';
    box.style.top = node.y + 'px';
    const color = (detKind && detKind.color) || def.color || '#94a3b8';
    box.style.setProperty('--lab-c', color);

    const head = el('div', 'lab-node-head');
    head.appendChild(el('span', 'lab-node-ico', (detKind && detKind.icon) || def.icon || '•'));
    head.appendChild(el('span', 'lab-node-title', (detKind && detKind.short) || def.short || node.type));
    box.appendChild(head);

    const sub = el('div', 'lab-node-sub');
    box.appendChild(sub);

    let badges = null;
    let flash = null;
    if (node.type === 'detector') {
      badges = el('div', 'lab-det-badges');
      box.appendChild(badges);
      flash = el('div', 'lab-det-flash');
      box.appendChild(flash);
      node.h = 96;
    }

    const grip = el('div', 'lab-node-grip', '⠿ drag');
    box.appendChild(grip);

    // Ports — outside the body so they don't fight with drag
    const ports = def.ports || {};
    (ports.in || []).forEach(function (name, idx) {
      const p = el('button', 'lab-port lab-port-in');
      p.type = 'button';
      p.dataset.port = name;
      p.dataset.dir = 'in';
      p.title = 'Input: ' + name + ' (click after green port to connect)';
      p.style.top = ((idx + 1) / ((ports.in.length || 1) + 1) * 100) + '%';
      p.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        e.preventDefault();
        self._portPointerDown(node, 'in', name, e);
      });
      box.appendChild(p);
    });
    (ports.out || []).forEach(function (name, idx) {
      const p = el('button', 'lab-port lab-port-out' + (name === 'energy' ? ' energy' : ''));
      p.type = 'button';
      p.dataset.port = name;
      p.dataset.dir = 'out';
      p.title = 'Output: ' + name + ' (click, then click a blue input)';
      p.style.top = ((idx + 1) / ((ports.out.length || 1) + 1) * 100) + '%';
      p.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        e.preventDefault();
        self._portPointerDown(node, 'out', name, e);
      });
      box.appendChild(p);
    });

    // Drag from body / grip (not from ports)
    const startDrag = function (e) {
      if (e.button != null && e.button !== 0) return;
      if (e.target && e.target.classList && e.target.classList.contains('lab-port')) return;
      e.preventDefault();
      e.stopPropagation();
      self.selectedId = node.id;
      self._renderSelection();
      self._notify('select');
      const rect = self.stage.getBoundingClientRect();
      self._drag = {
        id: node.id,
        ox: e.clientX - rect.left - node.x,
        oy: e.clientY - rect.top - node.y,
      };
      box.classList.add('dragging');
      try { box.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    };
    box.addEventListener('pointerdown', startDrag);

    this.nodesLayer.appendChild(box);
    this._nodeEls[node.id] = { el: box, sub: sub, badges: badges, flash: flash };
    this._refreshNodeLabel(node);
  }

  _refreshNodeLabel(node) {
    const pack = this._nodeEls[node.id];
    if (!pack) return;
    let sub = '';
    if (node.type === 'source') sub = (node.props.kind || '') + ' · rate ' + (node.props.rate || 0);
    else if (node.type === 'target' || node.type === 'nucleus') sub = node.props.nuclide || '';
    else if (node.type === 'shield') sub = (node.props.material || '') + ' ×' + (node.props.thickness || 0);
    else if (node.type === 'detector') {
      const det = getDetectorKind((node.props && node.props.kind) || 'gm');
      const d = this.sim.detectors[node.id];
      const hits = d ? d.counts : 0;
      const miss = d ? (d.missed || 0) : 0;
      sub = det.short + ' · hit ' + hits + (miss ? ' · miss ' + miss : '');
      // Color / icon may change if kind was edited
      pack.el.style.setProperty('--lab-c', det.color || '#4ade80');
      const ico = pack.el.querySelector('.lab-node-ico');
      const title = pack.el.querySelector('.lab-node-title');
      if (ico) ico.textContent = det.icon || '📡';
      if (title) title.textContent = det.short;
      if (pack.badges) {
        pack.badges.innerHTML = '';
        const badges = senseBadges(det.id);
        for (let i = 0; i < badges.length; i++) {
          const b = badges[i];
          const span = el('span', 'lab-det-badge' + (b.ok ? ' ok' : ' no'), b.label);
          span.title = b.ok
            ? ('Senses ' + b.label)
            : ('Mostly blind to ' + b.label);
          pack.badges.appendChild(span);
        }
      }
      if (pack.flash && d && d.last && d.last.t != null && this.sim.t - d.last.t < 0.35) {
        pack.flash.textContent = (d.last.hit ? 'HIT ' : 'MISS ') + prettyParticle(d.last.particle);
        pack.flash.className = 'lab-det-flash show ' + (d.last.hit ? 'hit' : 'miss');
      } else if (pack.flash) {
        pack.flash.className = 'lab-det-flash';
        pack.flash.textContent = '';
      }
    } else if (node.type === 'efield' || node.type === 'bfield') sub = 'strength ' + (node.props.strength || 0);
    else if (node.type === 'neutron' || node.type === 'proton' || node.type === 'electron') sub = 'particle';
    pack.sub.textContent = sub;
  }

  _updateLiveLabels() {
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].type === 'detector') this._refreshNodeLabel(this.nodes[i]);
    }
  }

  _renderSelection() {
    const ids = Object.keys(this._nodeEls);
    for (let i = 0; i < ids.length; i++) {
      const pack = this._nodeEls[ids[i]];
      pack.el.classList.toggle('selected', ids[i] === this.selectedId);
    }
  }

  _portPointerDown(node, dir, name, e) {
    this.selectedId = node.id;
    this._renderSelection();
    this._notify('select');

    if (dir === 'out') {
      const pos = this._portCenter(node.id, dir, name);
      this._wireDraft = {
        from: node.id,
        fromPort: name,
        x0: pos.x,
        y0: pos.y,
        x1: pos.x,
        y1: pos.y,
      };
      this.stage.classList.add('wiring');
      this._updateGhost();
      return;
    }

    // Input port: complete a draft wire if one is active
    if (dir === 'in' && this._wireDraft && this._wireDraft.from !== node.id) {
      this.wires.push({
        id: uid('w'),
        from: this._wireDraft.from,
        fromPort: this._wireDraft.fromPort,
        to: node.id,
        toPort: name,
      });
      this._wireDraft = null;
      this.stage.classList.remove('wiring');
      this._updateGhost();
      this._redrawWires();
      this._notify('wire');
    }
  }

  _onPointerMove(e) {
    if (this._drag) {
      const n = this._node(this._drag.id);
      const pack = this._nodeEls[this._drag.id];
      if (n && pack) {
        const rect = this.stage.getBoundingClientRect();
        let nx = e.clientX - rect.left - this._drag.ox;
        let ny = e.clientY - rect.top - this._drag.oy;
        nx = Math.max(8, Math.min((this._w || 800) - n.w - 8, nx));
        ny = Math.max(40, Math.min((this._h || 500) - n.h - 8, ny));
        n.x = nx;
        n.y = ny;
        pack.el.style.left = nx + 'px';
        pack.el.style.top = ny + 'px';
        this._redrawWires();
      }
      return;
    }
    if (this._wireDraft) {
      const rect = this.stage.getBoundingClientRect();
      this._wireDraft.x1 = e.clientX - rect.left;
      this._wireDraft.y1 = e.clientY - rect.top;
      this._updateGhost();
    }
  }

  _onPointerUp(e) {
    if (this._drag) {
      const pack = this._nodeEls[this._drag.id];
      if (pack) pack.el.classList.remove('dragging');
      this._drag = null;
    }
    // Keep wire draft alive for click→click connect; cancel only via empty canvas click.
  }

  _portCenter(nodeId, dir, name) {
    const pack = this._nodeEls[nodeId];
    const node = this._node(nodeId);
    if (!pack || !node) return { x: 0, y: 0 };
    const port = pack.el.querySelector('.lab-port-' + dir + '[data-port="' + name + '"]');
    const stageRect = this.stage.getBoundingClientRect();
    if (port) {
      const r = port.getBoundingClientRect();
      return { x: r.left + r.width / 2 - stageRect.left, y: r.top + r.height / 2 - stageRect.top };
    }
    return {
      x: dir === 'in' ? node.x : node.x + node.w,
      y: node.y + node.h / 2,
    };
  }

  _updateGhost() {
    if (!this._wireDraft) {
      this.ghostLine.setAttribute('d', '');
      return;
    }
    const d = this._wireDraft;
    const mx = (d.x0 + d.x1) / 2;
    this.ghostLine.setAttribute('d',
      'M ' + d.x0 + ' ' + d.y0 + ' C ' + mx + ' ' + d.y0 + ', ' + mx + ' ' + d.y1 + ', ' + d.x1 + ' ' + d.y1);
  }

  _redrawWires() {
    // Remove old wire paths (keep ghost + particles group)
    const keep = {};
    keep[this.ghostLine] = true;
    if (this._particleGroup) keep[this._particleGroup] = true;
    const remove = [];
    for (let i = 0; i < this.svg.childNodes.length; i++) {
      const c = this.svg.childNodes[i];
      if (c === this.ghostLine || c === this._particleGroup) continue;
      remove.push(c);
    }
    for (let i = 0; i < remove.length; i++) this.svg.removeChild(remove[i]);

    for (let i = 0; i < this.wires.length; i++) {
      const w = this.wires[i];
      const a = this._portCenter(w.from, 'out', w.fromPort || 'beam');
      const b = this._portCenter(w.to, 'in', w.toPort || 'beam');
      const mx = (a.x + b.x) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const energy = w.fromPort === 'energy' || w.toPort === 'energy';
      path.setAttribute('class', 'lab-wire' + (energy ? ' energy' : ''));
      path.setAttribute('d',
        'M ' + a.x + ' ' + a.y + ' C ' + mx + ' ' + a.y + ', ' + mx + ' ' + b.y + ', ' + b.x + ' ' + b.y);
      path.dataset.wireId = w.id;
      const self = this;
      path.addEventListener('click', function (e) {
        e.stopPropagation();
        self.wires = self.wires.filter(function (x) { return x.id !== w.id; });
        self._redrawWires();
        self._notify('wire');
      });
      // insert before particles
      if (this._particleGroup) this.svg.insertBefore(path, this._particleGroup);
      else this.svg.appendChild(path);
    }
  }

  _redrawParticles() {
    if (!this._particleGroup) return;
    while (this._particleGroup.firstChild) this._particleGroup.removeChild(this._particleGroup.firstChild);
    const parts = (this.sim && this.sim.particles) || [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      let wire = null;
      for (let w = 0; w < this.wires.length; w++) {
        if (this.wires[w].id === p.wireId) { wire = this.wires[w]; break; }
      }
      if (!wire) continue;
      const a = this._portCenter(wire.from, 'out', wire.fromPort || 'beam');
      const b = this._portCenter(wire.to, 'in', wire.toPort || 'beam');
      const t = Math.max(0, Math.min(1, p.u));
      const mx = (a.x + b.x) / 2;
      const u = 1 - t;
      const x = u * u * u * a.x + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * b.x;
      const y = u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', String(x));
      c.setAttribute('cy', String(y));
      c.setAttribute('r', p.kind === 'energy' ? '5' : '3.5');
      c.setAttribute('class', 'lab-particle ' + (p.kind || 'other'));
      this._particleGroup.appendChild(c);
    }
  }
}

export { COMPONENTS, PRESETS, EXPERIMENTS, getExperiment };
