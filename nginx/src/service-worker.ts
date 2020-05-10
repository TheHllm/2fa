self.addEventListener('activate', function(event) {
    console.log('activated');
});

self.addEventListener('install', function(e: any) {
    e.waitUntil(
        caches.open('static').then(function(cache) {
            return cache.addAll([
            '/',
            '/favicon.ico',
            '/assets/images/svg/trashcan.svg',
            '/assets/images/svg/link-external.svg',
            '/assets/images/svg/link-external-green.svg',
            '/js/index.js',
            '/js/qr-scanner.min.js',
            '/js/qr-scanner-worker.min.js',
            '/index.html',
            ])
        })
    );
});


self.addEventListener('fetch', function(event: any) {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
});
