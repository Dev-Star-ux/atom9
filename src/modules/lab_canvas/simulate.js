/** Local graph simulation for the Nuclear Lab Canvas. */
import { getComponent } from './components.js';
import { tryDetect } from './detectors.js';

function nodeById(nodes, id) {
  for (let i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i];
  return null;
}

function outs(wires, nodeId) {
  const list = [];
  for (let i = 0; i < wires.length; i++) {
    if (wires[i].from === nodeId) list.push(wires[i]);
  }
  return list;
}

function attenFor(shield, kind) {
  const mat = (shield.props && shield.props.material) || 'lead';
  const thick = Math.max(0, Number(shield.props && shield.props.thickness) || 0.5);
  const k = kind || 'gamma';
  let base = 0.4;

  // Material × radiation teaching table (not real μ tables — ranked correctly)
  if (k === 'alpha') {
    base = mat === 'lead' ? 2.4 : mat === 'concrete' ? 2.0 : mat === 'water' ? 1.8 : 2.2;
  } else if (k === 'beta' || k === 'electron') {
    base = mat === 'lead' ? 1.1 : mat === 'concrete' ? 0.85 : mat === 'water' ? 0.55 : 0.7;
  } else if (k === 'neutron') {
    // Borated / water good; lead poor
    base = mat === 'borated' ? 1.35 : mat === 'water' ? 0.55 : mat === 'concrete' ? 0.4 : 0.18;
  } else {
    // gamma / default — lead best
    base = mat === 'lead' ? 0.85 : mat === 'concrete' ? 0.4 : mat === 'water' ? 0.22 : 0.35;
  }

  const t = 1 - Math.exp(-base * thick * 2.2);
  return Math.max(0.05, Math.min(0.995, t));
}

/**
 * One simulation step. Mutates state: particles, detectorCounts, energyDeposit, events.
 */
export function simStep(graph, state, dt) {
  const nodes = graph.nodes || [];
  const wires = graph.wires || [];
  if (!state.particles) state.particles = [];
  if (!state.detectors) state.detectors = {};
  if (!state.energy) state.energy = {};
  if (!state.fissions) state.fissions = 0;
  if (!state.emitted) state.emitted = 0;
  if (!state.absorbed) state.absorbed = 0;
  if (!state.t) state.t = 0;
  if (!state.log) state.log = [];
  state.t += dt;

  // Emit from sources
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.type !== 'source') continue;
    const rate = Number(n.props.rate) || 30;
    const expect = rate * dt;
    let k = Math.floor(expect);
    if (Math.random() < expect - k) k++;
    for (let j = 0; j < k; j++) {
      const edges = outs(wires, n.id);
      if (!edges.length) continue;
      const edge = edges[Math.floor(Math.random() * edges.length)];
      state.particles.push({
        wireId: edge.id,
        u: 0,
        kind: n.props.kind || 'neutron',
        energyMeV: Number(n.props.energyMeV) || 1,
        alive: true,
        from: n.id,
      });
      state.emitted++;
    }
  }

  // Advance particles along wires
  const next = [];
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    if (!p.alive) continue;
    p.u += dt * 1.35;
    if (p.u < 1) {
      next.push(p);
      continue;
    }
    // Arrived at wire end
    let wire = null;
    for (let w = 0; w < wires.length; w++) {
      if (wires[w].id === p.wireId) { wire = wires[w]; break; }
    }
    if (!wire) continue;
    const dest = nodeById(nodes, wire.to);
    if (!dest) continue;
    processArrival(dest, p, wires, state, next);
  }
  state.particles = next;

  // Cap particles for performance
  if (state.particles.length > 220) {
    state.particles = state.particles.slice(-180);
  }
  return state;
}

function processArrival(node, particle, wires, state, nextParticles) {
  const type = node.type;
  const edges = outs(wires, node.id);

  if (type === 'detector') {
    const id = node.id;
    if (!state.detectors[id]) {
      state.detectors[id] = { counts: 0, energy: 0, missed: 0, byKind: {}, last: null };
    }
    const det = state.detectors[id];
    const result = tryDetect(node.props || {}, particle.kind);
    det.last = {
      hit: result.hit,
      particle: result.particle,
      t: state.t,
      reason: result.reason,
    };
    if (result.hit) {
      det.counts++;
      det.energy += particle.energyMeV || 0;
      const k = particle.kind || 'other';
      det.byKind[k] = (det.byKind[k] || 0) + 1;
      if (wirePort(wires, particle.wireId) === 'energy' ||
          (node.props && node.props.kind === 'energy') ||
          (node.props && node.props.mode === 'energy')) {
        state.energy[id] = (state.energy[id] || 0) + (particle.energyMeV || 0);
      }
      pushLog(state, 'HIT · ' + result.reason +
        ' (E≈' + (particle.energyMeV || 0).toFixed(3) + ' MeV).');
    } else {
      det.missed = (det.missed || 0) + 1;
      state.missed = (state.missed || 0) + 1;
      pushLog(state, 'MISS · ' + result.reason);
    }
    return;
  }

  if (type === 'shield') {
    const mat = (node.props && node.props.material) || 'lead';
    // Water (and lightly, concrete) can moderate neutrons that survive
    if (particle.kind === 'neutron' && (mat === 'water' || mat === 'concrete')) {
      const thick = Math.max(0, Number(node.props.thickness) || 0.5);
      particle.energyMeV = Math.max(0.000025, (particle.energyMeV || 1) * Math.exp(-1.8 * thick));
      if (particle.energyMeV < 0.001) {
        pushLog(state, 'Moderator slowed a neutron toward thermal energies.');
      }
    }
    const atten = attenFor(node, particle.kind);
    // Borated: strong capture even after “moderation”
    const boost = (particle.kind === 'neutron' && mat === 'borated') ? 1.15 : 1;
    if (Math.random() < Math.min(0.995, atten * boost)) {
      state.absorbed++;
      pushLog(state, 'Shielding (' + mat + ') absorbed a ' + (particle.kind || 'particle') + '.');
      return;
    }
    spawnAlong(edges, particle, nextParticles, 0.9);
    return;
  }

  if (type === 'efield' || type === 'bfield') {
    const s = Number(node.props.strength) || 0.5;
    // Charged particles deflect / bend — some miss the exit
    const charged = particle.kind === 'beta' || particle.kind === 'alpha' ||
      particle.kind === 'proton' || particle.kind === 'electron';
    if (charged && Math.random() < 0.25 * s) {
      state.absorbed++;
      pushLog(state, (type === 'efield' ? 'Electric' : 'Magnetic') +
        ' field steered a charged particle off the beamline.');
      return;
    }
    particle.energyMeV = Math.max(0.001, (particle.energyMeV || 1) * (1 + (Math.random() - 0.5) * 0.1 * s));
    spawnAlong(edges, particle, nextParticles, 1);
    return;
  }

  if (type === 'target' || type === 'nucleus') {
    const nuc = (node.props && node.props.nuclide) || 'U-235';
    const isFissile = nuc === 'U-235' || nuc === 'Pu-239';
    const isFertile = nuc === 'U-238';
    const isNeutron = particle.kind === 'neutron';
    const E = Number(particle.energyMeV) || 1;
    const thermal = E < 0.001; // teaching threshold

    if (isFissile && isNeutron) {
      // Thermal: high fission prob; fast: reduced (still possible)
      const pFiss = thermal ? (nuc === 'Pu-239' ? 0.62 : 0.55) : 0.18;
      if (Math.random() < pFiss) {
        state.fissions++;
        const nOut = nuc === 'Pu-239' ? (2 + (Math.random() < 0.55 ? 1 : 0)) : (2 + (Math.random() < 0.4 ? 1 : 0));
        pushLog(state, 'Fission in ' + nuc + '! ~200 MeV + ' + nOut + ' neutrons (' +
          (thermal ? 'thermal' : 'fast') + ' induced).');
        const beamEdges = edges.filter(function (e) { return e.fromPort === 'beam' || !e.fromPort; });
        const energyEdges = edges.filter(function (e) { return e.fromPort === 'energy'; });
        for (let i = 0; i < nOut; i++) {
          if (!beamEdges.length) break;
          const e = beamEdges[i % beamEdges.length];
          nextParticles.push({
            wireId: e.id, u: 0, kind: 'neutron', energyMeV: 1 + Math.random() * 2, alive: true, from: node.id,
          });
        }
        if (energyEdges.length) {
          nextParticles.push({
            wireId: energyEdges[0].id, u: 0, kind: 'energy', energyMeV: 180 + Math.random() * 40,
            alive: true, from: node.id,
          });
        }
        return;
      }
    }

    if (isFertile && isNeutron) {
      // Thermal: capture (breeding path) dominates; fast: small fission chance
      if (thermal) {
        if (Math.random() < 0.7) {
          state.absorbed++;
          pushLog(state, '²³⁸U captured a thermal neutron (fertile — breeding path, no prompt fission).');
          return;
        }
      } else if (Math.random() < 0.08) {
        state.fissions++;
        pushLog(state, 'Rare fast fission in ²³⁸U.');
        const beamEdges = edges.filter(function (e) { return e.fromPort === 'beam' || !e.fromPort; });
        const energyEdges = edges.filter(function (e) { return e.fromPort === 'energy'; });
        if (beamEdges.length) {
          nextParticles.push({
            wireId: beamEdges[0].id, u: 0, kind: 'neutron', energyMeV: 1.5, alive: true, from: node.id,
          });
        }
        if (energyEdges.length) {
          nextParticles.push({
            wireId: energyEdges[0].id, u: 0, kind: 'energy', energyMeV: 170 + Math.random() * 30,
            alive: true, from: node.id,
          });
        }
        return;
      }
    }

    if (nuc === 'B-10' && isNeutron && Math.random() < (thermal ? 0.82 : 0.35)) {
      state.absorbed++;
      pushLog(state, '¹⁰B(n,α)⁷Li — neutron captured, α-like signal emitted.');
      const sig = edges.filter(function (e) {
        return e.fromPort === 'signal' || e.fromPort === 'energy';
      });
      if (sig.length) {
        nextParticles.push({
          wireId: sig[0].id, u: 0, kind: 'alpha', energyMeV: 2.3, alive: true, from: node.id,
        });
      }
      return;
    }

    // Scatter / transmit
    if (Math.random() < 0.35) {
      state.absorbed++;
      return;
    }
    spawnAlong(edges.filter(function (e) { return e.fromPort !== 'energy'; }), particle, nextParticles, 0.9);
    return;
  }

  if (type === 'neutron' || type === 'proton' || type === 'electron') {
    if (type === 'neutron') particle.kind = 'neutron';
    if (type === 'proton') particle.kind = 'proton';
    if (type === 'electron') particle.kind = 'electron';
    spawnAlong(edges, particle, nextParticles, 1);
    return;
  }

  // Default: forward
  spawnAlong(edges, particle, nextParticles, 1);
}

function wirePort(wires, wireId) {
  for (let i = 0; i < wires.length; i++) {
    if (wires[i].id === wireId) return wires[i].toPort || wires[i].fromPort;
  }
  return '';
}

function spawnAlong(edges, particle, nextParticles, keepProb) {
  if (!edges || !edges.length) return;
  if (Math.random() > keepProb) return;
  const e = edges[Math.floor(Math.random() * edges.length)];
  nextParticles.push({
    wireId: e.id,
    u: 0,
    kind: particle.kind,
    energyMeV: particle.energyMeV,
    alive: true,
    from: particle.from,
  });
}

function shortNode(n) {
  const def = getComponent(n.type);
  return (def && def.short) || n.type;
}

function pushLog(state, msg) {
  state.log.push({ t: state.t, msg: msg });
  if (state.log.length > 40) state.log.shift();
}

export function resetSimState() {
  return {
    t: 0,
    particles: [],
    detectors: {},
    energy: {},
    fissions: 0,
    emitted: 0,
    absorbed: 0,
    missed: 0,
    log: [],
  };
}
