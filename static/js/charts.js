// Charts and tables for the ProcObject-10K page.
// Small hand-rolled SVG charts: rendered at the container's real width (so text stays
// legible on phones), re-rendered on resize, with one shared hover tooltip.
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const C = {
    ours: '#2a78d6', closed: '#18253a', open: '#8d99ab', blind: '#9aa6b6', sighted: '#5f6b7c',
    famQwen: '#5f6b7c', famIntern: '#a5b0bf',
    multi: '#4a3aa7', needle: '#eb6834', bar: '#5b8fd1', surface: '#ffffff',
  };
  const TYPE_SHORT = {
    'Precondition Grounding': 'Precondition', 'Object State Evolution': 'State Evolution',
    'Counterfactual Reasoning': 'Counterfactual', 'Mistake Recognition': 'Mistake',
    'Readiness Assessment': 'Readiness',
  };
  const fmt = (v) => v.toLocaleString('en-US');

  // ---------- shared tooltip ----------
  const tip = document.getElementById('viz-tip');
  function showTip(evt, html) {
    if (!tip) return;
    tip.innerHTML = html;
    tip.hidden = false;
    const pad = 14, r = tip.getBoundingClientRect();
    let x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - pad;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  }
  function hideTip() { if (tip) tip.hidden = true; }
  window.ProcTip = { show: showTip, hide: hideTip };

  function el(tag, attrs, parent, text) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function svgFor(host, h) {
    host.innerHTML = '';
    const w = Math.max(280, host.clientWidth);
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h }, host);
    return { svg, w, h };
  }
  function hover(node, html) {
    node.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') showTip(e, html); });
    node.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideTip(); });
    // Touch / pen: a tap shows the tooltip; the next tap elsewhere or a scroll hides it.
    node.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { e.stopPropagation(); showTip(e, html); } });
  }
  document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') hideTip(); });
  window.addEventListener('scroll', hideTip, { passive: true });
  function legend(host, items) {
    const d = document.createElement('div');
    d.className = 'chart-legend';
    d.innerHTML = items.map(([cls, color, label]) =>
      `<span class="key"><i class="sw ${cls}" style="background:${color};${cls === 'ring' ? `border-color:${color}` : ''}"></i>${label}</span>`).join('');
    host.prepend(d);
  }
  // Rounded data-end, square at the baseline (horizontal bar growing right).
  function hbarPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (w <= 0) return '';
    return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  }
  function vbarPath(x, y0, w, h, r) {  // grows up from baseline y0
    r = Math.min(r, w / 2, h);
    if (h <= 0) return '';
    const y = y0 - h;
    return `M${x},${y0}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y0}Z`;
  }
  function niceTicks(max, n) {
    const raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const out = [];
    for (let v = 0; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
    return out;
  }

  // ---------- dataset charts ----------
  function chartDomains(host, S) {
    const rows = S.domains;  // [name, videos, qa, tasks]
    const rowH = 26, top = 8, left = Math.min(170, host.clientWidth * 0.42), right = 46;
    const { svg, w } = svgFor(host, top + rows.length * rowH + 22);
    const max = Math.max(...rows.map((r) => r[1]));
    const x = (v) => left + (v / max) * (w - left - right);
    niceTicks(max, 4).forEach((t) => {
      el('line', { x1: x(t), x2: x(t), y1: top - 4, y2: top + rows.length * rowH, class: 'gridline' }, svg);
      el('text', { x: x(t), y: top + rows.length * rowH + 15, 'text-anchor': 'middle' }, el('g', { class: 'ax' }, svg), fmt(t));
    });
    rows.forEach((r, i) => {
      const y = top + i * rowH, bh = 14, by = y + (rowH - bh) / 2;
      el('text', { x: left - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end' }, svg, r[0]);
      el('path', { d: hbarPath(left, by, x(r[1]) - left, bh, 4), fill: C.bar }, svg);
      el('text', { x: x(r[1]) + 5, y: y + rowH / 2 + 4, class: 'val' }, svg, fmt(r[1]));
      const hit = el('rect', { x: 0, y, width: w, height: rowH, class: 'hit' }, svg);
      hover(hit, `<b>${r[0]}</b><br>${fmt(r[1])} videos &middot; ${fmt(r[2])} QA &middot; ${r[3]} tasks`);
    });
    el('line', { x1: left, x2: left, y1: top - 4, y2: top + rows.length * rowH, class: 'baseline' }, svg);
  }

  function chartReasoning(host, S) {
    const rows = S.reasoning;  // [type, multi, needle]
    const rowH = 34, top = 6, left = Math.min(120, host.clientWidth * 0.3), right = 12;
    const { svg, w } = svgFor(host, top + rows.length * rowH + 22);
    const max = Math.max(...rows.map((r) => r[1] + r[2]));
    const x = (v) => left + (v / max) * (w - left - right);
    niceTicks(max, 4).forEach((t) => {
      el('line', { x1: x(t), x2: x(t), y1: top - 2, y2: top + rows.length * rowH, class: 'gridline' }, svg);
      el('text', { x: x(t), y: top + rows.length * rowH + 15, 'text-anchor': 'middle' }, el('g', { class: 'ax' }, svg), fmt(t));
    });
    rows.forEach((r, i) => {
      const y = top + i * rowH, bh = 18, by = y + (rowH - bh) / 2, tot = r[1] + r[2];
      el('text', { x: left - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end' }, svg, TYPE_SHORT[r[0]]);
      const w1 = x(r[1]) - left, w2 = x(tot) - x(r[1]);
      const a = el('rect', { x: left, y: by, width: Math.max(0, w1 - 1), height: bh, fill: C.multi }, svg);
      const b = el('path', { d: hbarPath(x(r[1]) + 1, by, Math.max(0, w2 - 1), bh, 4), fill: C.needle }, svg);
      hover(a, `<b>${r[0]}</b><br>Multi-hop: ${fmt(r[1])} (${Math.round(100 * r[1] / tot)}%)`);
      hover(b, `<b>${r[0]}</b><br>Needle: ${fmt(r[2])} (${Math.round(100 * r[2] / tot)}%)`);
      if (w1 > 46) el('text', { x: left + 6, y: by + bh / 2 + 4, fill: '#fff', style: 'fill:#fff;font-size:11px' }, svg, fmt(r[1]));
      if (w2 > 40) el('text', { x: x(tot) - 6, y: by + bh / 2 + 4, 'text-anchor': 'end', style: 'fill:#fff;font-size:11px' }, svg, fmt(r[2]));
    });
    legend(host, [['', C.multi, 'Multi-hop Reasoning'], ['', C.needle, 'Needle-in-a-Haystack']]);
  }

  function chartDuration(host, S) {
    const bins = S.hist.filter((b) => b[0] < 180);  // [start, count]
    const top = 10, bottom = 26, left = 40, right = 8;
    const { svg, w, h } = svgFor(host, 200);
    const max = Math.max(...bins.map((b) => b[1]));
    const yMax = niceTicks(max, 4).slice(-1)[0] < max ? max : niceTicks(max, 4).slice(-1)[0];
    const y = (v) => h - bottom - (v / yMax) * (h - top - bottom);
    const xs = (t) => left + (t / 180) * (w - left - right);
    niceTicks(yMax, 4).forEach((t) => {
      el('line', { x1: left, x2: w - right, y1: y(t), y2: y(t), class: 'gridline' }, svg);
      el('text', { x: left - 6, y: y(t) + 4, 'text-anchor': 'end' }, el('g', { class: 'ax' }, svg), fmt(t));
    });
    [0, 30, 60, 90, 120, 150, 180].forEach((t) =>
      el('text', { x: xs(t), y: h - 8, 'text-anchor': 'middle' }, el('g', { class: 'ax' }, svg), `${t}s`));
    const bw = xs(5) - xs(0);
    bins.forEach((b) => {
      const p = el('path', { d: vbarPath(xs(b[0]) + 1, y(0), Math.max(1, bw - 2), y(0) - y(b[1]), 3), fill: C.bar }, svg);
      const hit = el('rect', { x: xs(b[0]), y: top, width: bw, height: h - top - bottom, class: 'hit' }, svg);
      hover(hit, `<b>${b[0]}&ndash;${b[0] + 5} s</b><br>${fmt(b[1])} QA pairs`);
      p.style.pointerEvents = 'none';
    });
    el('line', { x1: left, x2: w - right, y1: y(0), y2: y(0), class: 'baseline' }, svg);
    const m = xs(S.mean_dur);
    el('line', { x1: m, x2: m, y1: top, y2: y(0), class: 'ref-line', style: 'stroke:#18253a;stroke-dasharray:4 3;stroke-width:1.2' }, svg);
    el('text', { x: m + 5, y: top + 10, class: 'lbl-strong', style: 'font-size:11px' }, svg, `mean ${S.mean_dur} s`);
  }

  function chartSpans(host, S) {
    const rows = S.spans;  // [k, count], k=5 means 5+
    const top = 18, bottom = 26, left = 40, right = 8;
    const { svg, w, h } = svgFor(host, 200);
    const total = rows.reduce((a, r) => a + r[1], 0);
    const max = Math.max(...rows.map((r) => r[1]));
    const ticks = niceTicks(max, 4), yMax = Math.max(max, ticks[ticks.length - 1]);
    const y = (v) => h - bottom - (v / yMax) * (h - top - bottom);
    ticks.forEach((t) => {
      el('line', { x1: left, x2: w - right, y1: y(t), y2: y(t), class: 'gridline' }, svg);
      el('text', { x: left - 6, y: y(t) + 4, 'text-anchor': 'end' }, el('g', { class: 'ax' }, svg), fmt(t));
    });
    const slot = (w - left - right) / rows.length, bw = Math.min(56, slot * 0.6);
    rows.forEach((r, i) => {
      const cx = left + slot * (i + 0.5), lab = r[0] >= 5 ? '5+' : String(r[0]);
      el('path', { d: vbarPath(cx - bw / 2, y(0), bw, y(0) - y(r[1]), 4), fill: C.bar }, svg);
      el('text', { x: cx, y: y(r[1]) - 5, 'text-anchor': 'middle', class: 'val' }, svg, `${Math.round(100 * r[1] / total)}%`);
      el('text', { x: cx, y: h - 8, 'text-anchor': 'middle' }, el('g', { class: 'ax' }, svg), lab);
      const hit = el('rect', { x: cx - slot / 2, y: top, width: slot, height: h - top - bottom, class: 'hit' }, svg);
      hover(hit, `<b>${lab} span${lab === '1' ? '' : 's'}</b><br>${fmt(r[1])} QA pairs (${(100 * r[1] / total).toFixed(1)}%)`);
    });
    el('line', { x1: left, x2: w - right, y1: y(0), y2: y(0), class: 'baseline' }, svg);
  }

  // ---------- result charts (camera-ready Table 2) ----------
  const ALL = 12, MH = 0, NL = 6;  // column offsets: S,B,J,IoU,IoP,IoG per split
  function mainRows(R) {
    return R.main.map((r) => {
      const ours = /Fine-tuned/.test(r.group);
      return {
        name: ours ? 'Ours (Qwen3-VL-4B, FT)' : r.model,
        group: /Blind/.test(r.group) ? 'blind' : /Closed/.test(r.group) ? 'closed' : ours ? 'ours' : 'open',
        v: r.v, m: r.m, raw: r,
      };
    });
  }
  const groupColor = (g) => (g === 'ours' ? C.ours : g === 'closed' ? C.closed : g === 'open' ? C.open : C.blind);

  function chartGap(host, R) {
    const rows = mainRows(R);
    const sighted = rows.filter((r) => r.group !== 'blind'), blind = rows.filter((r) => r.group === 'blind');
    const top = 14, left = 42, right = 14, plotH = 220, laneH = 40, bottom = 34;
    const { svg, w, h } = svgFor(host, top + plotH + laneH + bottom);
    const x0 = 1.9, x1 = 3.9, xs = (v) => left + ((v - x0) / (x1 - x0)) * (w - left - right);
    const y0 = 10, y1 = 50, ys = (v) => top + plotH - ((v - y0) / (y1 - y0)) * plotH;
    [10, 20, 30, 40, 50].forEach((t) => {
      el('line', { x1: left, x2: w - right, y1: ys(t), y2: ys(t), class: 'gridline' }, svg);
      el('text', { x: left - 6, y: ys(t) + 4, 'text-anchor': 'end' }, el('g', { class: 'ax' }, svg), t);
    });
    [2.0, 2.4, 2.8, 3.2, 3.6].forEach((t) => {
      el('line', { x1: xs(t), x2: xs(t), y1: top, y2: top + plotH + laneH, class: 'gridline' }, svg);
      el('text', { x: xs(t), y: top + plotH + laneH + 15, 'text-anchor': 'middle' }, el('g', { class: 'ax' }, svg), t.toFixed(1));
    });
    el('text', { x: (left + w - right) / 2, y: h - 2, 'text-anchor': 'middle', style: 'font-size:11.5px' }, svg, 'LLM-judge score (answering, 0–5)');
    el('text', { x: 12, y: top + plotH / 2, transform: `rotate(-90 12 ${top + plotH / 2})`, 'text-anchor': 'middle', style: 'font-size:11.5px' }, svg, 'mIoU % (grounding)');
    el('line', { x1: left, x2: w - right, y1: ys(45), y2: ys(45), class: 'ref-line' }, svg);
    el('text', { x: left + 6, y: ys(45) - 5, class: 'ref-text' }, svg, '45%');
    // blind lane: no video, so no grounding to plot
    const laneY = top + plotH + laneH / 2 + 4;
    el('rect', { x: left, y: top + plotH + 6, width: w - left - right, height: laneH - 10, rx: 6, fill: '#f5f7fa' }, svg);
    el('text', { x: left + 8, y: laneY + 4, style: 'font-size:10.5px;fill:#5f6b7c' }, svg, w > 420 ? 'blind LLMs (no evidence)' : 'blind');
    el('line', { x1: left, x2: w - right, y1: top + plotH, y2: top + plotH, class: 'baseline' }, svg);
    blind.forEach((r) => {
      const c = el('circle', { cx: xs(r.v[ALL + 2]), cy: laneY, r: 5.5, fill: '#fff', stroke: C.blind, 'stroke-width': 2 }, svg);
      hover(c, `<b>${r.name}</b> <span class="tip-sub">(blind)</span><br>J ${r.v[ALL + 2].toFixed(2)} &middot; no grounding`);
    });
    // Selective direct labels; every point also has a tooltip.
    const LABEL = { 'Ours (Qwen3-VL-4B, FT)': [0, -13, 'middle', 'Ours', 1], 'Claude-Sonnet-4.6': [9, 4, 'start', 'Claude', 1],
      'GPT-5.4-Mini': [0, 18, 'middle', 'GPT-5.4-Mini', 1], 'Qwen3-VL-4B': [-9, 4, 'end', 'Qwen3-VL-4B', 1],
      'InternVL3.5-4B': [9, 4, 'start', 'InternVL3.5-4B', 1], 'InternVL3.5-38B': [9, 4, 'start', 'InternVL3.5-38B', 0] };
    sighted.forEach((r) => {
      const cx = xs(r.v[ALL + 2]), cy = ys(r.v[ALL + 3]);
      const L = LABEL[r.name];
      if (L && (w > 380 || L[4])) {
        el('text', { x: cx + L[0], y: cy + L[1], 'text-anchor': L[2], class: r.group === 'ours' ? 'lbl-strong' : '', style: 'font-size:11px;pointer-events:none' }, svg, L[3]);
      }
      const d = el('circle', { cx, cy, r: r.group === 'ours' ? 7 : 5.5, fill: groupColor(r.group), stroke: C.surface, 'stroke-width': 2 }, svg);
      hover(d, `<b>${r.name}</b><br>J ${r.v[ALL + 2].toFixed(2)} &middot; mIoU ${r.v[ALL + 3].toFixed(1)}%`);
    });
    legend(host, [['dot', C.ours, 'Ours'], ['dot', C.closed, 'Closed-source MLLM'], ['dot', C.open, 'Open-source MLLM'], ['ring', C.blind, 'Blind LLM']]);
  }

  function chartNeedle(host, R) {
    const rows = mainRows(R).filter((r) => r.group !== 'blind')
      .sort((a, b) => b.v[MH + 3] - a.v[MH + 3]);
    const narrow = host.clientWidth < 520;
    const rowH = 23, top = 4, left = narrow ? 112 : 170, right = 16;
    const { svg, w } = svgFor(host, top + rows.length * rowH + 22);
    const xs = (v) => left + (v / 55) * (w - left - right);
    [0, 10, 20, 30, 40, 50].forEach((t) => {
      el('line', { x1: xs(t), x2: xs(t), y1: top, y2: top + rows.length * rowH, class: 'gridline' }, svg);
      el('text', { x: xs(t), y: top + rows.length * rowH + 15, 'text-anchor': 'middle' }, el('g', { class: 'ax' }, svg), t);
    });
    rows.forEach((r, i) => {
      const cy = top + i * rowH + rowH / 2, a = r.v[MH + 3], b = r.v[NL + 3];
      const short = narrow ? r.name.replace('Ours (Qwen3-VL-4B, FT)', 'Ours').replace('Gemini-3.1-Flash-Lite', 'Gemini-3.1-FL').replace('Claude-Sonnet-4.6', 'Claude-S-4.6') : r.name;
      el('text', { x: left - 8, y: cy + 4, 'text-anchor': 'end', class: r.group === 'ours' ? 'lbl-strong' : '', style: 'font-size:11.5px' }, svg, short);
      el('line', { x1: xs(b), x2: xs(a), y1: cy, y2: cy, stroke: '#d5dce6', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
      const cb = el('circle', { cx: xs(b), cy, r: 5, fill: C.needle, stroke: C.surface, 'stroke-width': 2 }, svg);
      const ca = el('circle', { cx: xs(a), cy, r: 5, fill: C.multi, stroke: C.surface, 'stroke-width': 2 }, svg);
      const t = `<b>${r.name}</b><br>Multi-hop mIoU ${a.toFixed(1)}% &middot; Needle ${b.toFixed(1)}%`;
      hover(cb, t); hover(ca, t);
    });
    legend(host, [['dot', C.multi, 'Multi-hop Reasoning'], ['dot', C.needle, 'Needle-in-a-Haystack']]);
  }

  // ---------- tables ----------
  function fmtCell(v, k) {
    if (v == null) return '&ndash;';
    return k === 2 ? v.toFixed(2) : v.toFixed(1);
  }
  function renderMain(R, split) {
    const tb = document.querySelector('#main-table tbody');
    const cap = document.getElementById('main-caption');
    if (!tb) return;
    const off = split * 6;
    const label = ['Multi-hop Reasoning (614 QA)', 'Needle-in-a-Haystack (436 QA)', 'All 1,050 test QA'][split];
    cap.textContent = `ProcObject-10K test split — ${label}.`;
    let html = '', last = null;
    const GROUP = { 'Blind LLM': 'Blind LLMs (question only)', 'Closed-source MLLMs': 'Closed-source MLLMs',
      'Open-source MLLMs': 'Open-source MLLMs', 'Object-centric Fine-tuned': 'Object-centric fine-tuned' };
    R.main.forEach((r) => {
      if (r.group !== last) { html += `<tr class="group-row"><td colspan="7">${GROUP[r.group] || r.group}</td></tr>`; last = r.group; }
      const ours = /Fine-tuned/.test(r.group);
      const name = ours ? '<span class="method-name">Ours</span> (Qwen3-VL-4B)' : r.model;
      const cells = [0, 1, 2, 3, 4, 5].map((k) => {
        const m = r.m[off + k];
        return `<td class="${m === 'best' ? 'best' : m === 'second' ? 'second' : ''}">${fmtCell(r.v[off + k], k)}</td>`;
      }).join('');
      html += `<tr class="${ours ? 'ours-row' : ''}"><td class="first">${name}</td>${cells}</tr>`;
    });
    tb.innerHTML = html;
  }
  const cleanName = (s) => s.replace('$^\\ddagger$', '&Dagger;').replace('$^\\dagger$', '&dagger;');
  function renderTransferTables(R) {
    const mh = document.querySelector('#mh-table tbody'), al = document.querySelector('#al-table tbody');
    if (mh) {
      let html = '', last;
      R.multihop.forEach((r) => {
        if (r.group && r.group !== last) { html += `<tr class="group-row"><td colspan="8">${r.group}</td></tr>`; last = r.group; }
        const ours = /ProcObject/.test(r.group || '');
        const nm = ours ? cleanName(r.model).replace('Qwen3-VL-4B', '<span class="method-name">Ours</span> (Qwen3-VL-4B)') : cleanName(r.model);
        const cells = r.v.map((v, k) => `<td class="${r.m[k] === 'best' ? 'best' : r.m[k] === 'second' ? 'second' : ''}">${v == null ? '&ndash;' : v.toFixed(1)}</td>`).join('');
        html += `<tr class="${ours && !/ddagger/.test(r.model) ? 'ours-row' : ''}"><td class="first">${nm}</td><td>${r.input}</td>${cells}</tr>`;
      });
      mh.innerHTML = html;
    }
    if (al) {
      let html = '', last;
      R.alfred.forEach((r) => {
        if (r.group !== last) { html += `<tr class="group-row"><td colspan="5">${r.group.replace('Flare', 'FLARE +')}</td></tr>`; last = r.group; }
        const ours = /Fine-tuned/.test(r.group);
        const nm = ours ? cleanName(r.model).replace('Qwen3-VL-4B', '<span class="method-name">Ours</span> (Qwen3-VL-4B)') : cleanName(r.model);
        const cells = r.v.map((v, k) => `<td class="${r.m[k] === 'best' ? 'best' : r.m[k] === 'second' ? 'second' : ''}">${v.toFixed(2)}</td>`).join('');
        html += `<tr class="${ours && !/ddagger/.test(r.model) ? 'ours-row' : ''}"><td class="first">${nm}</td>${cells}</tr>`;
      });
      al.innerHTML = html;
    }
  }
  function bars(id, title, rows, max, note, digits) {
    const host = document.getElementById(id);
    if (!host) return;
    host.innerHTML = `<div class="bars-title">${title}</div>` + rows.map(([cls, name, v]) =>
      `<div class="bar-row ${cls}"><span class="bar-name">${name}</span><span class="bar-track"><span class="bar-fill" style="width:${(100 * v / max).toFixed(1)}%"></span></span><span class="bar-val">${v.toFixed(digits)}</span></div>`).join('') +
      `<div class="bar-row bar-scale" aria-hidden="true"><span></span><span class="bar-axis"><i>0</i><i>${max}</i></span><span></span></div>` +
      (note ? `<p class="bars-note">${note}</p>` : '');
  }
  function renderTransferBars(R) {
    const mh = (n) => R.multihop.find((r) => r.model === n && (n !== 'Qwen3-VL-4B' || /Zero/.test(r.group)));
    const mhOurs = R.multihop.find((r) => r.model === 'Qwen3-VL-4B' && /ProcObject/.test(r.group));
    const mhOursG = R.multihop.find((r) => /ddagger/.test(r.model));
    const q = mh('Qwen3-VL-4B'), g = mh('GeLM-7B'), o4 = mh('GPT-4o');
    bars('bars-mh-iou', 'mIoU (%) &uarr;', [
      ['base', 'Qwen3-VL-4B', q.v[3]], ['other', 'GPT-4o', o4.v[3]], ['tgt', 'GeLM-7B (in-domain FT)', g.v[3]],
      ['ours2', 'Ours&Dagger; (L<sub>gen</sub> only)', mhOursG.v[3]], ['ours', 'Ours', mhOurs.v[3]]], 25, '', 1);
    bars('bars-mh-llm', 'LLM score (0&ndash;10) &uarr;', [
      ['base', 'Qwen3-VL-4B', q.v[5]], ['other', 'GPT-4o', o4.v[5]], ['tgt', 'GeLM-7B (in-domain FT)', g.v[5]],
      ['ours2', 'Ours&Dagger; (L<sub>gen</sub> only)', mhOursG.v[5]], ['ours', 'Ours', mhOurs.v[5]]], 10, '', 1);
    const al = (re) => R.alfred.find((r) => re.test(r.model) && r.group);
    const base = R.alfred.find((r) => r.model === 'FLARE+Qwen3-VL-4B' && /Zero/.test(r.group));
    const gpt4 = al(/FLARE\+GPT-4$/), oG = al(/ddagger/), oF = R.alfred.find((r) => r.model === 'FLARE+Qwen3-VL-4B' && /Fine-tuned/.test(r.group));
    bars('bars-al-unseen', 'Success rate, unseen (%) &uarr;', [
      ['base', 'FLARE + Qwen3-VL-4B', base.v[2]], ['other', 'FLARE + GPT-4', gpt4.v[2]],
      ['ours2', 'FLARE + Ours&Dagger;', oG.v[2]], ['ours', 'FLARE + Ours', oF.v[2]]], 50, '', 2);
    bars('bars-al-seen', 'Success rate, seen (%) &uarr;', [
      ['base', 'FLARE + Qwen3-VL-4B', base.v[0]], ['other', 'FLARE + GPT-4', gpt4.v[0]],
      ['ours2', 'FLARE + Ours&Dagger;', oG.v[0]], ['ours', 'FLARE + Ours', oF.v[0]]], 50, '', 2);
  }

  // ---------- boot ----------
  function renderAll() {
    const S = window.PROC_STATS, R = window.PROC_RESULTS;
    const run = (id, fn, data) => { const n = document.getElementById(id); if (n && data) fn(n, data); };
    run('chart-domains', chartDomains, S);
    run('chart-reasoning', chartReasoning, S);
    run('chart-duration', chartDuration, S);
    run('chart-spans', chartSpans, S);
    run('chart-gap', chartGap, R);
    run('chart-needle', chartNeedle, R);
  }
  document.addEventListener('DOMContentLoaded', () => {
    const R = window.PROC_RESULTS;
    renderAll();
    if (R) {
      renderMain(R, 2);
      renderTransferTables(R);
      renderTransferBars(R);
      const tabs = document.querySelectorAll('#result-tabs .button');
      tabs.forEach((b) => b.addEventListener('click', () => {
        tabs.forEach((x) => { x.classList.remove('is-selected', 'is-link'); x.setAttribute('aria-selected', 'false'); });
        b.classList.add('is-selected', 'is-link');
        b.setAttribute('aria-selected', 'true');
        renderMain(R, +b.dataset.split);
      }));
    }
    let lastW = window.innerWidth, timer;
    window.addEventListener('resize', () => {
      if (Math.abs(window.innerWidth - lastW) < 8) return;
      lastW = window.innerWidth;
      clearTimeout(timer);
      timer = setTimeout(renderAll, 150);
    });
  });
})();
