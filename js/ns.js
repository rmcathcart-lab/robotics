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
