/* Storage namespace. All of Ryan's course sites live at the same web address (rmcathcart-lab.github.io), so browsers
 * give them ONE shared localStorage. This file must be the first script on every page: it keeps this site's keys
 * under 'rl/' so the robotics site and the math sites never overwrite each other's sign-ins or teacher keys. */
(function () {
  var P = 'rl/';
  var S = window.Storage && window.Storage.prototype;
  if (!S || S.__hwNs) return;
  var get = S.getItem, set = S.setItem, rem = S.removeItem, key = S.key;
  S.getItem = function (k) { return get.call(this, P + k); };
  S.setItem = function (k, v) { return set.call(this, P + k, v); };
  S.removeItem = function (k) { return rem.call(this, P + k); };
  S.clear = function () {
    var mine = [];
    for (var i = 0; i < this.length; i++) { var k = key.call(this, i); if (k && k.indexOf(P) === 0) mine.push(k); }
    for (var j = 0; j < mine.length; j++) rem.call(this, mine[j]);
  };
  S.__hwNs = P;
  window.HW_STORAGE_NS = P;
})();

/* Light or dark display (the switch at the bottom of the home page). Applied before the page draws so it doesn't flash.
 * Saved per device as rl/theme: 'light' | 'dark' (dark is the default). */
(function () {
  var RL = window.RL = window.RL || {};
  function saved() { try { return localStorage.getItem('theme'); } catch (e) { return null; } }
  RL.theme = function () { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; };
  RL.setTheme = function (t) {
    t = t === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'light' ? '#f3f6fa' : '#070d17');
    try { localStorage.setItem('theme', t); } catch (e) {}
  };
  document.documentElement.setAttribute('data-theme', saved() === 'light' ? 'light' : 'dark');
  /* the Dark | Light switch */
  RL.themeSwitch = function () {
    var w = document.createElement('div'); w.className = 'theme-switch'; w.setAttribute('role', 'group'); w.setAttribute('aria-label', 'Display');
    [['dark', 'Dark', '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'], ['light', 'Light', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>']].forEach(function (x) {
      var b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + x[2] + '</svg>' + x[1];
      b.setAttribute('aria-pressed', RL.theme() === x[0] ? 'true' : 'false');
      b.addEventListener('click', function () { RL.setTheme(x[0]); [].forEach.call(w.children, function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); });
      w.appendChild(b);
    });
    return w;
  };
  /* the Robotics Lab robot head (favicon + home button) */
  RL.ROBOT = '<svg class="robot" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="10" fill="#070d17"/><path d="M32 18v-7" stroke="#22d3ee" stroke-width="3"/><circle cx="32" cy="8.5" r="4.5" fill="#ff8a3d"/><rect x="7" y="28" width="6" height="13" rx="2" fill="#22d3ee"/><rect x="51" y="28" width="6" height="13" rx="2" fill="#22d3ee"/><rect x="12" y="17" width="40" height="36" rx="7" fill="#22d3ee"/><rect x="19" y="26" width="10" height="10" rx="2.5" fill="#070d17"/><rect x="35" y="26" width="10" height="10" rx="2.5" fill="#070d17"/><circle cx="26.5" cy="28.5" r="1.8" fill="#22d3ee"/><circle cx="42.5" cy="28.5" r="1.8" fill="#22d3ee"/><rect x="23" y="42" width="18" height="4.5" rx="1.5" fill="#070d17"/></svg>';
})();
