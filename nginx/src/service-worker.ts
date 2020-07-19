
self.addEventListener('activate', function(event) {
    console.log('activated');
});

//put files into cache
self.addEventListener('install', function(e: any) {
    e.waitUntil(
        caches.open('static').then(function(cache) {
            //use diffrent path if running on github: /2fa/nginx/html/
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
            ])
        })
    );
});

//serve files

self.addEventListener('fetch', function(event: any) {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
});
