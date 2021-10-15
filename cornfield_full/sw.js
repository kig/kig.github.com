const APP_CACHE = 'cornfield-cache-v37';
const EXT_CACHE = 'cornfield-ext-cache';
const DEBUG = false;

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(APP_CACHE).then((cache) => cache.addAll([
            './',
            './index.html',
            './images/weather_icon.jpg',
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

// Delete old app cache versions.
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames
                    .filter(cacheName => /^cornfield-cache/.test(cacheName) && cacheName !== APP_CACHE)
                    .map(cacheName => caches.delete(cacheName))
            )
        )
    );
});

self.addEventListener('fetch', async (evt) => {
    if (/^https:\/\/api\.openweathermap\.org\/data\//.test(evt.request.url)) {
        // Cache weather responses to EXT_CACHE.
        // Try network and if it fails, go for the cached copy.
        const res = fromNetwork(evt.request, 3e3, EXT_CACHE).catch(() => fromCache(evt.request, EXT_CACHE));
        if (DEBUG) console.log(evt.request.url, 'network-first response', res);
        evt.respondWith(res);
    } else {
        // Cache typekit responses to EXT_CACHE and app sources to APP_CACHE.
        // Try cache and if it fails, go for the network copy.
        const cacheName = /^https:\/\/[^\.]*\.?typekit\.net\//.test(evt.request.url) ? EXT_CACHE : APP_CACHE;
        const res = fromCache(evt.request, cacheName).catch(() => fromNetwork(evt.request, 180e3, cacheName));
        if (DEBUG) console.log(evt.request.url, "read-through cache response", res);
        evt.respondWith(res);
    }
});


// Time limited network request. If the network fails or the response is not
// served before timeout, the promise is rejected.
function fromNetwork(request, timeout, cacheName, addToCache = true) {
    if (DEBUG) console.log("fromNetwork", request.url, cacheName);
    return new Promise(function (fulfill, reject) {
        // Reject in case of timeout.
        var timeoutId = setTimeout(reject, timeout);
        // Fulfill in case of success.
        fetch(request.clone()).then(function (response) {
            clearTimeout(timeoutId);
            if (addToCache && response.status < 400 && response.status !== 206) {
                caches.open(cacheName).then((cache) => cache.put(request.clone(), response.clone()));
            }
            fulfill(response.clone());
            // Reject also if network fetch rejects.
        }, reject);
    });
}

// Open the cache where the assets were stored and search for the requested
// resource. Notice that in case of no matching, the promise still resolves
// but it does with `undefined` as value.
function fromCache(request, cacheName) {
    if (DEBUG) console.log("fromCache", request.url, cacheName);
    return caches.open(cacheName).then(function (cache) {
        return cache.match(request.clone()).then(function (matching) {
            if (DEBUG) console.log("fromCache got", request.url, matching);
            return matching || Promise.reject('no-match');
        });
    });
}