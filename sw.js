/*
 * Service worker "primero la red": siempre intenta traer la versión más nueva
 * de la página; si no hay internet, abre la última que guardó. Los datos de
 * Google Sheets NO pasan por aquí (van directo a Google).
 */
var CACHE = 'wishlist-navidad-v3';
var BASICOS = ['./', './index.html', './config.js', './manifest.webmanifest', './icons/icon.svg', './icons/apple-touch-icon.png', './img/hogwarts.png', './img/zelda.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(BASICOS.map(function (u) {
      return c.add(new Request(u, { cache: 'reload' })).catch(function () { return null; });
    }));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(primeroLaRed(e, req));
});

function primeroLaRed(e, req) {
  return caches.open(CACHE).then(function (cache) {
    var fresca = new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' });
    return conLimite(fetch(fresca), 7000).then(function (resp) {
      if (resp && resp.ok) e.waitUntil(cache.put(req.url, resp.clone()));
      return resp;
    }).catch(function (err) {
      return cache.match(req.url, { ignoreSearch: true }).then(function (guardada) {
        if (guardada) return guardada;
        if (req.mode === 'navigate') {
          return cache.match('./index.html').then(function (r) { return r || cache.match('./'); }).then(function (r) {
            if (r) return r;
            throw err;
          });
        }
        throw err;
      });
    });
  });
}

function conLimite(promesa, ms) {
  return new Promise(function (ok, mal) {
    var t = setTimeout(function () { mal(new Error('timeout')); }, ms);
    promesa.then(function (r) { clearTimeout(t); ok(r); }, function (er) { clearTimeout(t); mal(er); });
  });
}
