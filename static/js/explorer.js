// QA Explorer + the five-type teaser cards.
// Data: window.PROC_EXPLORER (tools/make_explorer.py): test questions, ground-truth
// evidence, and saved benchmark predictions of four models.
(function () {
  'use strict';

  const MODELS = [
    { key: 'ours', name: 'Ours', short: 'Ours', color: '#2a78d6' },
    { key: 'qwen4b', name: 'Qwen3-VL-4B', short: 'Qwen3-VL-4B', color: '#eb6834' },
    { key: 'gpt', name: 'GPT-5.4-Mini', short: 'GPT-5.4-Mini', color: '#1baf7a' },
    { key: 'claude', name: 'Claude-Sonnet-4.6', short: 'Claude-4.6', color: '#4a3aa7' },
  ];
  const GT_COLOR = '#3d4a5c';
  const TYPES = {
    'Precondition Grounding': {
      count: '2,234', desc: 'Which object states must already hold before a step can begin.',
      tpl: 'How does the <em>object</em> change before <em>step</em> begins?' },
    'Object State Evolution': {
      count: '2,522', desc: 'How an object changes across several consecutive steps.',
      tpl: 'How does the state of the <em>object</em> change from <em>step A</em> to <em>step B</em>?' },
    'Counterfactual Reasoning': {
      count: '2,676', desc: 'What would go wrong later if a step on the object were skipped.',
      tpl: 'What would happen later if <em>step</em> were not performed on the <em>object</em>?' },
    'Mistake Recognition': {
      count: '1,343', desc: 'A wrong action or state of an object, and why it breaks the procedure.',
      tpl: 'What mistake occurs on the <em>object</em>, and why is it a mistake?' },
    'Readiness Assessment': {
      count: '1,747', desc: 'Whether an object is ready for the next step, from visible cues.',
      tpl: 'Before <em>step</em> begins, is the <em>object</em> ready, and what visible cues show this?' },
  };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pctIoU = (v) => `${Math.round(100 * v)}%`;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtSpan = (s) => `${(+s[0]).toFixed(s[0] % 1 ? 1 : 0)}–${(+s[1]).toFixed(s[1] % 1 ? 1 : 0)} s`;

  document.addEventListener('DOMContentLoaded', () => {
    const DATA = window.PROC_EXPLORER;
    if (!DATA || !DATA.length) return;

    // ---------- teaser: one card per type ----------
    const grid = document.getElementById('type-grid');
    if (grid) {
      Object.keys(TYPES).forEach((t) => {
        const i = DATA.findIndex((d) => d.qa_type === t), d = DATA[i], info = TYPES[t];
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'type-card';
        card.dataset.type = t;
        card.innerHTML = `
          <div class="tc-head"><span class="tc-name">${t}</span><span class="tc-count">${info.count} QA pairs</span></div>
          <div class="tc-img"><img src="${d.poster}" alt="${esc(d.task)} (${d.source})" loading="lazy"></div>
          <div class="tc-body">
            <span class="tc-desc">${info.desc}</span>
            <span class="tc-template">${info.tpl}</span>
            <span class="tc-cta">See an example &rarr;</span>
          </div>`;
        card.addEventListener('click', () => {
          select(i, true);
          document.getElementById('ex-picker').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        });
        grid.appendChild(card);
      });
    }

    // ---------- explorer ----------
    const video = document.getElementById('ex-video');
    const picker = document.getElementById('ex-picker');
    const tl = document.getElementById('ex-timeline');
    const playBtn = document.getElementById('ex-play');
    const timeEl = document.getElementById('ex-time');
    let cur = null, rate = 2, raf = null, visible = false, userPaused = false;

    DATA.forEach((d, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ex-pick';
      b.dataset.type = d.qa_type;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'ex-panel');
      b.title = `${d.qa_type} · ${d.task} (${d.source})`;
      b.innerHTML = `<img src="${d.poster}" alt="" loading="lazy"><span>${esc(d.short)}</span>`;
      b.addEventListener('click', () => select(i, true));
      picker.appendChild(b);
    });

    function ticks(dur) {
      const step = dur > 120 ? 30 : dur > 50 ? 10 : 5, out = [];
      for (let t = 0; t <= dur + 1e-6; t += step) out.push(t);
      return out;
    }
    function buildTimeline(d) {
      const pct = (t) => `${(100 * Math.min(t, d.duration) / d.duration).toFixed(3)}%`;
      const spanHtml = (spans, color) => spans.map((s) =>
        `<span class="ex-span" data-s="${s[0]}" data-e="${s[1]}" style="left:${pct(s[0])};width:calc(${pct(s[1])} - ${pct(s[0])});background:${color}"></span>`).join('');
      let html = `<div class="ex-row is-gt"><span class="ex-row-name"><i style="background:${GT_COLOR}"></i>Ground truth</span>
        <span class="ex-track">${spanHtml(d.evidence, GT_COLOR)}</span><span class="ex-iou is-na">IoU</span></div>`;
      MODELS.forEach((m) => {
        const p = d.models[m.key];
        html += `<div class="ex-row" data-model="${m.key}"><span class="ex-row-name" title="${m.name}"><i style="background:${m.color}"></i><span class="nm-long">${m.name}</span><span class="nm-short">${m.short}</span></span>
          <span class="ex-track">${spanHtml(p.evidence, m.color)}</span><span class="ex-iou">${pctIoU(p.iou)}</span></div>`;
      });
      html += `<div class="ex-layer">${d.evidence.map((s) => `<span class="ex-wash" style="left:${pct(s[0])};width:calc(${pct(s[1])} - ${pct(s[0])})"></span>`).join('')}
        <span class="ex-playhead" id="ex-playhead" style="left:0%"></span></div>
        <div class="ex-axis">${ticks(d.duration).map((t) => `<span style="left:${pct(t)}">${t}</span>`).join('')}<span class="ex-axis-unit">s</span></div>`;
      tl.innerHTML = html;
      tl.querySelectorAll('.ex-span').forEach((s) => {
        const row = s.closest('.ex-row'), m = MODELS.find((x) => x.key === row.dataset.model);
        const name = m ? m.name : 'Ground truth';
        s.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && window.ProcTip) window.ProcTip.show(e, `<b>${name}</b><br>${fmtSpan([+s.dataset.s, +s.dataset.e])}`); });
        s.addEventListener('pointerleave', () => window.ProcTip && window.ProcTip.hide());
      });
    }
    function buildAnswers(d) {
      document.getElementById('ex-qtype').dataset.type = d.qa_type;
      document.getElementById('ex-qtype').innerHTML =
        `<span class="qt">${d.qa_type}</span><span class="qr">${d.reasoning}</span>`;
      document.getElementById('ex-question').textContent = d.question;
      document.getElementById('ex-answer').innerHTML =
        `${esc(d.answer)} <span class="ev-inline">(evidence: ${d.evidence.map(fmtSpan).join(', ')})</span>`;
      document.getElementById('ex-blind').textContent = d.blind;
      const box = document.getElementById('ex-answers');
      box.innerHTML = MODELS.map((m) => {
        const p = d.models[m.key];
        return `<div class="ex-ans" style="--c:${m.color}"><div class="ex-ans-head"><span>${m.name}</span>
          <span class="iou-pill">IoU ${pctIoU(p.iou)}</span></div><p class="is-clamped">${esc(p.answer)}</p>
          <button type="button" class="ex-more" hidden>more</button></div>`;
      }).join('');
      box.querySelectorAll('.ex-ans').forEach((a) => {
        const p = a.querySelector('p'), btn = a.querySelector('.ex-more');
        requestAnimationFrame(() => {
          if (p.scrollHeight > p.clientHeight + 2) btn.hidden = false;
        });
        btn.addEventListener('click', () => {
          const open = p.classList.toggle('is-clamped');
          btn.textContent = open ? 'more' : 'less';
        });
      });
      document.getElementById('ex-badges').innerHTML =
        `<span>${d.source}</span><span>${d.view}</span><span>${esc(d.task)}</span>`;
    }
    function select(i, play) {
      if (cur === i) { if (play) startPlay(); return; }
      cur = i;
      const d = DATA[i];
      picker.querySelectorAll('.ex-pick').forEach((b, k) => {
        b.classList.toggle('is-active', k === i);
        b.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
      video.poster = d.poster;
      video.src = d.video;
      video.load();
      video.playbackRate = rate;
      buildTimeline(d);
      buildAnswers(d);
      updateHead();
      if (play) { userPaused = false; startPlay(); }
    }
    function startPlay() {
      video.playbackRate = rate;
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    }
    function updateHead() {
      const d = DATA[cur], t = video.currentTime || 0;
      const head = document.getElementById('ex-playhead');
      if (head) head.style.left = `${(100 * Math.min(t, d.duration) / d.duration).toFixed(3)}%`;
      timeEl.textContent = `${t.toFixed(1)} / ${d.duration.toFixed(1)} s`;
      tl.querySelectorAll('.ex-span').forEach((s) => {
        s.classList.toggle('is-live', t >= +s.dataset.s && t <= +s.dataset.e);
      });
    }
    function loop() { updateHead(); raf = video.paused ? null : requestAnimationFrame(loop); }
    video.addEventListener('play', () => { playBtn.innerHTML = window.PROC_ICONS.pause; if (!raf) raf = requestAnimationFrame(loop); });
    video.addEventListener('pause', () => { playBtn.innerHTML = window.PROC_ICONS.play; updateHead(); });
    video.addEventListener('seeked', updateHead);
    video.addEventListener('loadedmetadata', () => { video.playbackRate = rate; updateHead(); });
    video.addEventListener('ended', () => { video.currentTime = 0; startPlay(); });
    playBtn.addEventListener('click', () => {
      if (video.paused) { userPaused = false; startPlay(); } else { userPaused = true; video.pause(); }
    });
    document.querySelectorAll('.ex-speed button').forEach((b) => b.addEventListener('click', () => {
      rate = +b.dataset.rate;
      video.playbackRate = rate;
      document.querySelectorAll('.ex-speed button').forEach((x) => {
        x.classList.toggle('is-on', x === b);
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
    }));

    // Seek by clicking / dragging anywhere on the timeline tracks.
    function seekFrom(e) {
      const track = tl.querySelector('.ex-track');
      if (!track) return;
      const r = track.getBoundingClientRect(), d = DATA[cur];
      const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      video.currentTime = f * d.duration;
      updateHead();
    }
    let dragging = false;
    tl.addEventListener('pointerdown', (e) => { dragging = true; tl.setPointerCapture(e.pointerId); seekFrom(e); });
    tl.addEventListener('pointermove', (e) => { if (dragging) seekFrom(e); });
    tl.addEventListener('pointerup', () => { dragging = false; });

    // Autoplay only while the explorer is on screen.
    const panel = document.getElementById('ex-panel');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((e) => {
        visible = e.isIntersecting;
        if (visible && !userPaused && !reduceMotion) startPlay(); else if (!visible) video.pause();
      }), { threshold: 0.3 }).observe(panel);
    }
    select(0, false);
  });
})();
