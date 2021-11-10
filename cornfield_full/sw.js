const APP_CACHE = 'cornfield-cache-v70';
const LIB_CACHE = 'cornfield-lib-cache-v1';
const EXT_CACHE = 'cornfield-ext-cache';
const DEBUG = false;

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        new Promise(async (resolve, reject) => {
            const lib = caches.open(LIB_CACHE)
            const app = caches.open(APP_CACHE);
            const libAdd = (await lib).addAll([
                './images/weather_icon.jpg',
                './js/lib/three.js',
                './js/rain.js',
                './js/particles.js',
                './js/impacts.js',
                './js/corngeneration.js',
                './js/corn.js',
                './js/corn_worker.js',
                './js/corn_algo_doodle.js',
                './js/birds.js',
            ]);
            const appAdd = (await app).addAll([
                './',
                './index.html',
                './js/weathertick.js',
                './js/weatherdata.js',
            ]);
            await libAdd;
            await appAdd;
            resolve();
        })
    );
});

// Delete old app cache versions.
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames
                    .filter(cacheName => 
                        (/^cornfield-cache/.test(cacheName) && cacheName !== APP_CACHE)
                        || (/^cornfield-lib-cache/.test(cacheName) && cacheName !== LIB_CACHE)
                    ).map(cacheName => caches.delete(cacheName))
            )
        )
    );
});

self.addEventListener('fetch', async (evt) => {
    // Cache typekit responses to EXT_CACHE and app sources and weather data to APP_CACHE.
    // Try cache and if it fails, go for the network copy.
    const cacheName = /^https:\/\/[^\.]*\.?typekit\.net\//.test(evt.request.url) ? EXT_CACHE : LIB_CACHE;
    const res = fromCache(evt.request, cacheName).catch(() => fromCache(evt.request, APP_CACHE).catch(() => fromNetwork(evt.request, 180e3, cacheName)));
    if (DEBUG) console.log(evt.request.url, "read-through cache response", res);
    evt.respondWith(res);
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