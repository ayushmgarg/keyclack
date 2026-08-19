'use strict';
/**
 * Monkeytype-style timed typing test. Renders its own DOM into a container.
 * Uses the window's DOM keyboard events for characters (accurate text);
 * keystroke *sounds* come from the global hook, so nothing is played here.
 */
window.TypingTest = (function () {
  let root, wordsEl, caretHost;
  let text = '';        // full target string
  let typed = [];       // typed chars, index-aligned with text
  let pos = 0;
  let mode = 30;        // seconds
  let started = false;
  let finished = false;
  let timeLeft = 30;
  let timer = null;
  let startTs = 0;
  let correct = 0, incorrect = 0;
  let perSecWpm = [];
  let lastSampleChars = 0;
  let onFinish = null;
  let active = false;

  function pickText(nWords) {
    const pool = window.WORD_POOL;
    const out = [];
    for (let i = 0; i < nWords; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
    return out.join(' ');
  }

  function render() {
    root.innerHTML = `
      <div class="tt-bar">
        <div class="tt-modes">
          ${[15, 30, 60].map((m) => `<button class="tt-mode ${m === mode ? 'on' : ''}" data-mode="${m}">${m}s</button>`).join('')}
        </div>
        <div class="tt-live">
          <span class="tt-time">${timeLeft}s</span>
          <span class="tt-wpm">0 wpm</span>
          <button class="tt-restart" title="Restart (Tab)">↻ Restart</button>
        </div>
      </div>
      <div class="tt-words" tabindex="0"></div>
      <div class="tt-hint">Click the text and start typing. Test begins on your first keypress.</div>
      <div class="tt-results" hidden></div>
    `;
    wordsEl = root.querySelector('.tt-words');
    renderWords();
    root.querySelectorAll('.tt-mode').forEach((b) =>
      b.addEventListener('click', () => setMode(parseInt(b.dataset.mode, 10))));
    root.querySelector('.tt-restart').addEventListener('click', () => reset());
    wordsEl.addEventListener('click', () => wordsEl.focus());
  }

  function renderWords() {
    let html = '';
    for (let i = 0; i < text.length; i++) {
      let cls = 'c';
      if (i < pos) cls += typed[i] === text[i] ? ' ok' : ' bad';
      if (i === pos) cls += ' cur';
      const ch = text[i] === ' ' ? '&nbsp;' : text[i];
      html += `<span class="${cls}">${ch}</span>`;
    }
    wordsEl.innerHTML = html;
    const cur = wordsEl.querySelector('.cur');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  function setMode(m) {
    mode = m;
    reset();
    root.querySelectorAll('.tt-mode').forEach((b) => b.classList.toggle('on', parseInt(b.dataset.mode, 10) === m));
  }

  function reset() {
    clearInterval(timer);
    text = pickText(80);
    typed = [];
    pos = 0;
    started = false;
    finished = false;
    timeLeft = mode;
    correct = 0; incorrect = 0;
    perSecWpm = [];
    lastSampleChars = 0;
    root.querySelector('.tt-results').hidden = true;
    root.querySelector('.tt-words').hidden = false;
    root.querySelector('.tt-hint').hidden = false;
    updateLive();
    renderWords();
  }

  function begin() {
    started = true;
    startTs = Date.now();
    root.querySelector('.tt-hint').hidden = true;
    timer = setInterval(tick, 100);
  }

  function tick() {
    const elapsed = (Date.now() - startTs) / 1000;
    timeLeft = Math.max(0, mode - elapsed);
    // sample per-second wpm for consistency
    const sec = Math.floor(elapsed);
    if (sec >= perSecWpm.length + 1) {
      const deltaChars = correct - lastSampleChars;
      lastSampleChars = correct;
      perSecWpm.push((deltaChars / 5) * 60);
    }
    updateLive();
    if (timeLeft <= 0) finish();
  }

  function liveWpm() {
    const min = (Date.now() - startTs) / 60000;
    return min > 0 ? Math.round((correct / 5) / min) : 0;
  }

  function updateLive() {
    const t = root.querySelector('.tt-time');
    const w = root.querySelector('.tt-wpm');
    if (t) t.textContent = Math.ceil(timeLeft) + 's';
    if (w) w.textContent = (started ? liveWpm() : 0) + ' wpm';
  }

  function finish() {
    clearInterval(timer);
    finished = true;
    const totalTyped = correct + incorrect;
    const min = mode / 60;
    const wpm = Math.round((correct / 5) / min);
    const raw = Math.round((totalTyped / 5) / min);
    const accuracy = totalTyped ? Math.round((correct / totalTyped) * 100) : 100;
    const mean = perSecWpm.reduce((a, b) => a + b, 0) / (perSecWpm.length || 1);
    const variance = perSecWpm.reduce((a, b) => a + (b - mean) ** 2, 0) / (perSecWpm.length || 1);
    const stdev = Math.sqrt(variance);
    const consistency = mean > 0 ? Math.max(0, Math.round((1 - stdev / mean) * 100)) : 0;
    const result = { mode, wpm, raw, accuracy, consistency };

    const box = root.querySelector('.tt-results');
    box.hidden = false;
    root.querySelector('.tt-words').hidden = true;
    box.innerHTML = `
      <div class="tt-res-main">
        <div class="tt-res-big"><span>${wpm}</span><label>wpm</label></div>
        <div class="tt-res-big"><span>${accuracy}%</span><label>acc</label></div>
      </div>
      <div class="tt-res-row">
        <div><b>${raw}</b><span>raw</span></div>
        <div><b>${consistency}%</b><span>consistency</span></div>
        <div><b>${mode}s</b><span>mode</span></div>
        <div><b>${correct}</b><span>chars</span></div>
      </div>
      <button class="tt-again">Type again</button>
    `;
    box.querySelector('.tt-again').addEventListener('click', () => reset());
    if (onFinish) onFinish(result);
  }

  function handleKey(e) {
    if (!active || finished) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Tab') { e.preventDefault(); reset(); return; }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (pos > 0) {
        pos--;
        if (typed[pos] === text[pos]) correct--; else if (typed[pos] != null) incorrect--;
        typed[pos] = null;
        renderWords();
      }
      return;
    }
    let ch = e.key;
    if (ch === ' ') e.preventDefault();
    if (ch.length !== 1) return; // ignore non-printable
    if (!started) begin();
    if (pos >= text.length) return;
    typed[pos] = ch;
    if (ch === text[pos]) correct++; else incorrect++;
    pos++;
    if (pos >= text.length) { finish(); return; }
    renderWords();
  }

  return {
    mount(container, opts) {
      root = container;
      onFinish = opts && opts.onFinish;
      mode = 30; timeLeft = 30;
      text = pickText(80);
      render();
      window.addEventListener('keydown', handleKey);
    },
    setActive(v) { active = v; if (v && wordsEl) wordsEl.focus(); },
    reset,
  };
})();
