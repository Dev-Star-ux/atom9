import { exportMathLab } from '../common/mathLabModule.js';
import { el, paramSlider } from '../common/ui.js';
import { SturmLiouville2D } from './scene2d.js';
import {
  ORDER_MAX,
  legendreInnerProduct,
  besselInnerProduct,
  legendreP,
  besselJ,
  productOnGrid,
  integrateTrapezoid,
} from './physics.js';

function innerEstimate(family, o1, o2) {
  if (family === 'legendre') {
    if (o1 !== o2) {
      const prod = productOnGrid(
        function (x) { return legendreP(o1, x); },
        function (x) { return legendreP(o2, x); },
        function () { return 1; },
        -1, 1, 160
      );
      return integrateTrapezoid(prod.xs, prod.ys);
    }
    return legendreInnerProduct(o1, o2);
  }
  const prod = productOnGrid(
    function (x) { return besselJ(o1, x); },
    function (x) { return besselJ(o2, x); },
    function (x) { return x; },
    0.001, 10, 160
  );
  return integrateTrapezoid(prod.xs, prod.ys);
}

export default exportMathLab({
  id: 'sturm_liouville',
  icon: 'SL',
  group: 'math_physics',
  Scene2D: SturmLiouville2D,
  initialState: { family: 'legendre', order1: 2, order2: 3 },
  buildPanel(inst) {
    const self = inst;
    const card = el('div', 'card');
    card.appendChild(el('div', 'card-title', inst.T('controls.title')));

    card.appendChild(el('div', 'field-label', inst.T('controls.family')));
    const chips = el('div', 'chips');
    ['legendre', 'bessel'].forEach(function (f) {
      const b = el('button', 'chip' + (inst.state.family === f ? ' active' : ''), f === 'legendre' ? inst.T('controls.legendre') : inst.T('controls.bessel'));
      b.onclick = function () {
        self.state.family = f;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        self._refresh();
      };
      chips.appendChild(b);
    });
    card.appendChild(chips);

    paramSlider(card, {
      label: inst.T('controls.order1'),
      unit: '',
      min: 0,
      max: ORDER_MAX,
      step: 1,
      value: inst.state.order1,
      decimals: 0,
      help: inst.T('controls.order1Help'),
      onInput(v) {
        inst.state.order1 = Math.round(v);
        inst._refresh();
      },
    });
    paramSlider(card, {
      label: inst.T('controls.order2'),
      unit: '',
      min: 0,
      max: ORDER_MAX,
      step: 1,
      value: inst.state.order2,
      decimals: 0,
      help: inst.T('controls.order2Help'),
      onInput(v) {
        inst.state.order2 = Math.round(v);
        inst._refresh();
      },
    });

    inst._infoHost = el('div', '');
    card.appendChild(inst._infoHost);
    inst.panel.appendChild(card);
  },
  getInfoRows() {
    const f = this.state.family;
    const o1 = this.state.order1;
    const o2 = this.state.order2;
    const inner = innerEstimate(f, o1, o2);
    const sym = f === 'legendre' ? 'P' : 'J';
    const w = f === 'legendre' ? this.T('info.wLegendre') : this.T('info.wBessel');
    const orth = o1 !== o2 && Math.abs(inner) < 0.08
      ? this.T('info.yes')
      : (o1 === o2 ? this.T('info.norm') : this.T('info.check'));
    return [
      [this.T('info.family'), f === 'legendre' ? this.T('info.familyLegendre') : this.T('info.familyBessel')],
      [this.T('info.modes'), sym + '_' + o1 + ', ' + sym + '_' + o2],
      [this.T('info.inner'), inner.toExponential(3)],
      [this.T('info.weight'), w],
      [this.T('info.orthogonal'), orth],
    ];
  },
});
