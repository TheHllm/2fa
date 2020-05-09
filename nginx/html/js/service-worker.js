self.addEventListener('activate', function (event) {
    console.log('activated');
});
self.addEventListener('install', function (e) {
    e.waitUntil(caches.open('static').then(function (cache) {
        return cache.addAll([
            '/',
            '/favicon.ico',
            '/js/index.js',
            '/js/qr-scanner.min.js',
            '/js/qr-scanner-worker.min.js',
            '/index.html',
        ]);
    }));
});
self.addEventListener('fetch', function (event) {
    event.respondWith(caches.match(event.request).then(function (response) {
        return response || fetch(event.request);
    }));
});
