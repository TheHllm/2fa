self.addEventListener('activate', function (event) {
    console.log('activated');
});
self.addEventListener('install', function (e) {
    e.waitUntil(caches.open('static').then(function (cache) {
        var prepend = self.location.hostname.includes("github.io") ? "/2fa/nginx/html/" : "";
        return cache.addAll([
            prepend + '/',
            prepend + '/favicon.ico',
            prepend + '/assets/images/svg/trashcan.svg',
            prepend + '/assets/images/svg/link-external.svg',
            prepend + '/assets/images/svg/link-external-green.svg',
            prepend + '/js/index.js',
            prepend + '/js/qr-scanner.min.js',
            prepend + '/js/qr-scanner-worker.min.js',
            prepend + '/index.html',
        ]);
    }));
});
self.addEventListener('fetch', function (event) {
    event.respondWith(caches.match(event.request).then(function (response) {
        return response || fetch(event.request);
    }));
});
