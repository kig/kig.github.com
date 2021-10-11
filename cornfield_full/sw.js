const CACHE = 'cornfield-cache';

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll([
            './',
            './index.html',
            './js/lib/three.js',
            './js/weathertick.js',
            './js/weatherdata.js',
            './js/rain.js',
            './js/particles.js',
            './js/impacts.js',
            './js/corngeneration.js',
            './js/corn.js',
            './js/corn_worker.js',
            './js/corn_algo_doodle.js',
            './js/birds.js',
        ])),
    );
});

self.addEventListener('fetch', (evt) => {
    console.log('sw req', evt.request.url);
    if (/^https:\/\/api\.openweathermap\.org\/data\//.test(evt.request.url)) {
        // Try network and if it fails, go for the cached copy.
        evt.respondWith(fromNetwork(evt.request, 3e3).catch(() => fromCache(evt.request)));
    } else {
        // Try cache and if it fails, go for the network copy.
        evt.respondWith(fromCache(evt.request).catch(() => fromNetwork(evt.request, 180e3, false)));
    }
});


// Time limited network request. If the network fails or the response is not
// served before timeout, the promise is rejected.
function fromNetwork(request, timeout, addToCache=true) {
    return caches.open(CACHE).then(function (cache) {
        new Promise(function (fulfill, reject) {
            // Reject in case of timeout.
            var timeoutId = setTimeout(reject, timeout);
            // Fulfill in case of success.
            fetch(request).then(function (response) {
                clearTimeout(timeoutId);
                fulfill(response);
                if (addToCache && response.status < 400) {
                    cache.put(request, response.clone());
                }
                // Reject also if network fetch rejects.
            }, reject);
        });
    });
}

// Open the cache where the assets were stored and search for the requested
// resource. Notice that in case of no matching, the promise still resolves
// but it does with `undefined` as value.
function fromCache(request) {
    return caches.open(CACHE).then(function (cache) {
        return cache.match(request).then(function (matching) {
            return matching || Promise.reject('no-match');
        });
    });
}