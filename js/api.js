/* Talking to the Apps Script backend (backend/Code.gs).
 *   RL.api.get(action, params)  GET  ?action=…            (fetch, JSONP fallback) → JSON
 *   RL.api.post(body)           POST text/plain JSON        (CORS, response readable) → JSON  [uploads, submit, grade]
 *   RL.api.beat(body)           POST text/plain JSON no-cors / sendBeacon (fire and forget)  [progress + where I am]
 *   RL.api.upload(file, who, onProgress) → { fileId, name, mime, size }   (chunked: 4 MiB pieces into Google Drive)
 * Nothing here knows about pages; app.js and teacher/dash.js use it. */
(function (root) {
  'use strict';
  var RL = root.RL = root.RL || {}, cfg = root.RL_CONFIG || {}, URL = cfg.backend || '';
  var A = RL.api = { enabled: !!URL, ok: null, listeners: [] };
  var cbN = 0;
  function qs(p) { return Object.keys(p).filter(function (k) { return p[k] != null; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]); }).join('&'); }
  function setOk(v) { if (A.ok !== v) { A.ok = v; A.listeners.forEach(function (fn) { try { fn(v); } catch (e) {} }); } }
  A.onStatus = function (fn) { A.listeners.push(fn); };
  function jsonp(p, timeout) {
    return new Promise(function (resolve, reject) {
      var name = '__rlcb' + (++cbN) + '_' + Date.now(), s = document.createElement('script'), done = false;
      root[name] = function (d) { done = true; clean(); resolve(d); };
      function clean() { try { delete root[name]; } catch (e) { root[name] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
      s.src = URL + '?' + qs(Object.assign({}, p, { callback: name }));
      s.onerror = function () { if (!done) { clean(); reject(new Error('network')); } };
      setTimeout(function () { if (!done) { clean(); reject(new Error('timeout')); } }, timeout || 20000);
      document.head.appendChild(s);
    });
  }
  A.get = function (action, params, timeout) {
    if (!URL) return Promise.reject(new Error('no backend'));
    var p = Object.assign({ action: action }, params || {});
    var ctl = root.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, timeout || 20000);
    return fetch(URL + '?' + qs(p), { credentials: 'omit', redirect: 'follow', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(tm); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .catch(function () { clearTimeout(tm); return jsonp(p, timeout); })
      .then(function (d) { setOk(true); return d; }, function (e) { setOk(false); throw e; });
  };
  A.post = function (body, timeout) {
    if (!URL) return Promise.reject(new Error('no backend'));
    var ctl = root.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, timeout || 120000);
    return fetch(URL, { method: 'POST', credentials: 'omit', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(tm); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (d) { setOk(true); return d; }, function (e) { clearTimeout(tm); setOk(false); throw e; });
  };
  A.beat = function (body, beacon) {
    if (!URL) return;
    var txt = JSON.stringify(body);
    if (beacon && navigator.sendBeacon) { try { if (navigator.sendBeacon(URL, new Blob([txt], { type: 'text/plain;charset=utf-8' }))) return; } catch (e) {} }
    try {
      fetch(URL, { method: 'POST', mode: 'no-cors', credentials: 'omit', keepalive: txt.length < 60000, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: txt })
        .then(function () { setOk(true); }, function () { setOk(false); });
    } catch (e) {}
  };

  /* ---- files ---- */
  var CHUNK = 4 * 1024 * 1024; // a multiple of 256 KiB (Google Drive's resumable-upload rule)
  function b64(buf) {
    var bytes = new Uint8Array(buf), s = '', step = 0x8000;
    for (var i = 0; i < bytes.length; i += step) s += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    return btoa(s);
  }
  function readSlice(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsArrayBuffer(blob); }); }
  /* who = { class, name, token }; mission = 'm01'; kind = photo | video | code | file */
  A.upload = function (blob, fileName, who, mission, kind, onProgress) {
    var size = blob.size, mime = blob.type || 'application/octet-stream';
    var base = { 'class': who.klass, name: who.name, token: who.token };
    function retry(fn, n) { return fn().catch(function (e) { if (n <= 0) throw e; return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return retry(fn, n - 1); }); }); }
    return A.post(Object.assign({ kind: 'upload-start', mission: mission, fileName: fileName, mime: mime, size: size, what: kind }, base)).then(function (st) {
      if (!st || !st.ok) throw new Error((st && st.error) || 'Upload could not start');
      var id = st.uploadId, offset = 0;
      function next() {
        if (offset >= size && size > 0) return Promise.reject(new Error('Upload did not finish'));
        var end = Math.min(size, offset + CHUNK);
        return readSlice(blob.slice(offset, end)).then(function (buf) {
          return retry(function () { return A.post(Object.assign({ kind: 'upload-chunk', uploadId: id, offset: offset, size: size, data: b64(buf) }, base)); }, 2);
        }).then(function (r) {
          if (!r || !r.ok) throw new Error((r && r.error) || 'Upload failed');
          offset = end; if (onProgress) onProgress(offset / size);
          if (r.done) return { fileId: r.fileId, name: fileName, mime: mime, size: size, kind: kind };
          return next();
        });
      }
      return next();
    });
  };
})(window);
