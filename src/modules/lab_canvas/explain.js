/** Rule-based AI observer — explains the student's lab graph and live run. */
import { getComponent } from './components.js';
import { getDetectorKind, prettyParticle, suggestDetectorFor } from './detectors.js';

function nodeById(nodes, id) {
  for (let i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i];
  return null;
}

function describeNode(n) {
  const def = getComponent(n.type);
  const name = (def && def.label) || n.type;
  if (n.type === 'source') return name + ' (' + ((n.props && n.props.kind) || 'beam') + ')';
  if (n.type === 'target' || n.type === 'nucleus') {
    return name + ' [' + ((n.props && n.props.nuclide) || '?') + ']';
  }
  if (n.type === 'shield') {
    return name + ' (' + ((n.props && n.props.material) || 'lead') + ')';
  }
  if (n.type === 'detector') {
    const d = getDetectorKind((n.props && n.props.kind) || 'gm');
    return d.short + ' detector';
  }
  return name;
}

export function analyzeGraph(graph) {
  const nodes = graph.nodes || [];
  const wires = graph.wires || [];
  const types = {};
  for (let i = 0; i < nodes.length; i++) {
    types[nodes[i].type] = (types[nodes[i].type] || 0) + 1;
  }

  const paths = [];
  // Simple BFS from each source along wires
  const sources = nodes.filter(function (n) { return n.type === 'source'; });
  for (let s = 0; s < sources.length; s++) {
    const start = sources[s];
    const queue = [{ id: start.id, trail: [start.id] }];
    const seen = {};
    seen[start.id] = true;
    while (queue.length) {
      const cur = queue.shift();
      const node = nodeById(nodes, cur.id);
      if (node && node.type === 'detector') {
        paths.push(cur.trail.slice());
        continue;
      }
      for (let w = 0; w < wires.length; w++) {
        if (wires[w].from !== cur.id) continue;
        const to = wires[w].to;
        if (seen[to]) continue;
        seen[to] = true;
        queue.push({ id: to, trail: cur.trail.concat([to]) });
      }
    }
  }

  const hasFissionSetup = nodes.some(function (n) {
    return (n.type === 'target' || n.type === 'nucleus') &&
      (n.props.nuclide === 'U-235' || n.props.nuclide === 'Pu-239');
  }) && nodes.some(function (n) { return n.type === 'source' && n.props.kind === 'neutron'; });

  const hasShield = !!types.shield;
  const hasFields = !!(types.efield || types.bfield);
  const hasDetector = !!types.detector;

  return {
    nodeCount: nodes.length,
    wireCount: wires.length,
    types: types,
    paths: paths,
    hasFissionSetup: hasFissionSetup,
    hasShield: hasShield,
    hasFields: hasFields,
    hasDetector: hasDetector,
    sources: sources.length,
  };
}

export function explainSetup(graph, tFn) {
  const a = analyzeGraph(graph);
  const lines = [];
  if (a.nodeCount === 0) {
    lines.push(tFn('ai.empty'));
    return lines;
  }
  lines.push(tFn('ai.inventory', {
    n: String(a.nodeCount),
    w: String(a.wireCount),
    s: String(a.sources),
  }));

  if (a.hasFissionSetup) lines.push(tFn('ai.seeFission'));
  if (a.hasShield) lines.push(tFn('ai.seeShield'));
  if (a.hasFields) lines.push(tFn('ai.seeFields'));
  if (!a.hasDetector) lines.push(tFn('ai.needDetector'));
  if (a.wireCount === 0) lines.push(tFn('ai.needWires'));

  // Detector ↔ source matching tips
  const nodes = graph.nodes || [];
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].type !== 'detector') continue;
    const det = getDetectorKind((nodes[i].props && nodes[i].props.kind) || 'gm');
    lines.push(tFn('ai.detKind', { name: det.short, blurb: det.blurb }));
  }
  for (let s = 0; s < nodes.length; s++) {
    if (nodes[s].type !== 'source') continue;
    const pk = (nodes[s].props && nodes[s].props.kind) || 'neutron';
    lines.push(tFn('ai.sourceNeeds', {
      p: prettyParticle(pk),
      det: suggestDetectorFor(pk),
    }));
  }

  if (a.paths.length) {
    lines.push(tFn('ai.paths', { n: String(a.paths.length) }));
    for (let i = 0; i < Math.min(3, a.paths.length); i++) {
      const labels = a.paths[i].map(function (id) {
        const n = nodeById(nodes, id);
        return n ? describeNode(n) : id;
      });
      lines.push('  → ' + labels.join('  →  '));
    }
  } else if (a.hasDetector && a.sources) {
    lines.push(tFn('ai.noPath'));
  }

  return lines;
}

export function explainLive(graph, state, tFn) {
  const lines = [];
  if (!state || state.t < 0.05) {
    lines.push(tFn('ai.running'));
    return lines;
  }
  lines.push(tFn('ai.stats', {
    t: state.t.toFixed(1),
    e: String(state.emitted || 0),
    f: String(state.fissions || 0),
    a: String(state.absorbed || 0),
  }));

  const dets = state.detectors || {};
  const ids = Object.keys(dets);
  if (!ids.length) {
    lines.push(tFn('ai.noCounts'));
  } else {
    for (let i = 0; i < ids.length; i++) {
      const d = dets[ids[i]];
      const node = nodeById(graph.nodes || [], ids[i]);
      const name = node ? describeNode(node) : ids[i];
      lines.push(tFn('ai.detLine', {
        name: name,
        c: String(d.counts || 0),
        e: (d.energy || 0).toFixed(1),
        m: String(d.missed || 0),
      }));
    }
  }

  if ((state.missed || 0) > 0) {
    lines.push(tFn('ai.missLive', { n: String(state.missed) }));
  }

  const a = analyzeGraph(graph);
  if (a.hasFissionSetup && state.fissions > 0) {
    lines.push(tFn('ai.fissionLive', { n: String(state.fissions) }));
  }
  if (a.hasShield && state.absorbed > 0) {
    lines.push(tFn('ai.shieldLive'));
  }
  if (state.log && state.log.length) {
    const last = state.log[state.log.length - 1];
    lines.push(tFn('ai.lastEvent', { msg: last.msg }));
  }
  return lines;
}

export function suggestNext(graph, tFn) {
  const a = analyzeGraph(graph);
  if (a.nodeCount === 0) return tFn('ai.suggestStart');
  if (a.sources && !a.hasDetector) return tFn('ai.suggestDetector');
  if (a.sources && a.hasDetector && a.wireCount === 0) return tFn('ai.suggestConnect');
  if (a.hasFissionSetup && a.hasDetector) return tFn('ai.suggestRunFission');
  if (!a.hasShield && a.sources) return tFn('ai.suggestShield');
  return tFn('ai.suggestMatch');
}
