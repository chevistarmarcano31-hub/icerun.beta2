const CACHE_NAME = 'los-magos-del-tiempo-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/components.css',
  './css/hud.css',
  './css/levelup.css',
  './css/screens.css',
  './js/audio.js',
  './js/boss.js',
  './js/config.js',
  './js/customization.js',
  './js/enemy.js',
  './js/game.js',
  './js/gamepad.js',
  './js/input.js',
  './js/install.js',
  './js/player.js',
  './js/room.js',
  './js/save.js',
  './player.customize/personaje.1.png',
  './player.customize/personaje.2.png',
  './player.customize/personaje.3.png',
  './player.customize/personaje.4.png',
  './player.customize/personaje.5.png',
  './player.customize/personaje.6.png',
  './player.customize/personaje.7.png',
  './player.customize/personaje.8.png',
  './player.customize/personaje.9.png',
  './player.customize/personaje.10.png',
  './player.customize/personaje.11.png',
  './player.customize/personaje.12.png',
  './player.customize/personaje.13.png',
  './player.customize/personaje.14.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
