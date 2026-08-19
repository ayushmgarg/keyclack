'use strict';
/**
 * Renders the stats dashboard column from aggregate data only
 * (totals, per-key counts, per-day counts, saved test results).
 * No typed content is ever stored or shown — counts only.
 */
window.StatsView = (function () {
  function fmt(n) { return (n || 0).toLocaleString(); }

  function lastNDays(daily, n) {
    const out = [];
    const d = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const day = new Date(d);
      day.setDate(d.getDate() - i);
      const key = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
      out.push({ key, label: String(day.getDate()), count: daily[key] || 0 });
    }
    return out;
  }

  function render(el, stats, sessionCount) {
    const totalToday = (() => {
      const d = new Date();
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      return stats.daily[key] || 0;
    })();

    const topKeys = Object.entries(stats.perKey || {})
      .map(([code, count]) => ({ label: window.keyLabel(parseInt(code, 10)), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
    const topMax = topKeys.length ? topKeys[0].count : 1;

    const days = lastNDays(stats.daily || {}, 14);
    const dayMax = Math.max(1, ...days.map((d) => d.count));

    const tests = (stats.typingTests || []).slice().reverse().slice(0, 6);

    el.innerHTML = `
      <div class="stat-cards">
        <div class="stat-card"><label>Total keystrokes</label><b>${fmt(stats.totalKeystrokes)}</b></div>
        <div class="stat-card"><label>Today</label><b>${fmt(totalToday)}</b></div>
        <div class="stat-card"><label>This session</label><b>${fmt(sessionCount)}</b></div>
        <div class="stat-card accent"><label>Best WPM</label><b>${fmt(stats.bestWpm)}</b></div>
      </div>

      <div class="stat-block">
        <div class="stat-head"><h3>Last 14 days</h3></div>
        <div class="daychart">
          ${days.map((d) => `
            <div class="daybar" title="${d.key}: ${fmt(d.count)}">
              <i style="height:${Math.round((d.count / dayMax) * 100)}%"></i>
              <span>${d.label}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="stat-block">
        <div class="stat-head"><h3>Most-used keys</h3><small>aggregate counts only</small></div>
        <div class="keybars">
          ${topKeys.length ? topKeys.map((k) => `
            <div class="keybar">
              <span class="kb-label">${k.label}</span>
              <div class="kb-track"><i style="width:${Math.round((k.count / topMax) * 100)}%"></i></div>
              <span class="kb-count">${fmt(k.count)}</span>
            </div>`).join('') : '<p class="muted">No keystrokes yet — start typing.</p>'}
        </div>
      </div>

      <div class="stat-block">
        <div class="stat-head"><h3>Recent tests</h3></div>
        ${tests.length ? `
          <table class="testtable">
            <thead><tr><th>WPM</th><th>Acc</th><th>Raw</th><th>Cons.</th><th>Mode</th><th>When</th></tr></thead>
            <tbody>
              ${tests.map((t) => `<tr>
                <td class="em">${t.wpm}</td><td>${t.accuracy}%</td><td>${t.raw}</td>
                <td>${t.consistency}%</td><td>${t.mode}s</td>
                <td class="muted">${new Date(t.at).toLocaleDateString()}</td>
              </tr>`).join('')}
            </tbody>
          </table>` : '<p class="muted">No tests yet — try the Typing Test tab.</p>'}
      </div>
    `;
  }

  return { render };
})();
