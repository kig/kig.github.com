const CACHE = 'cornfield-cache';
const DEBUG = false;

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
    caches.open(CACHE).then((cache) => cache.addAll(['./music_1.m4a']));
});

self.addEventListener('fetch', async (evt) => {
    if (/^https:\/\/api\.openweathermap\.org\/data\//.test(evt.request.url)) {
        // Try network and if it fails, go for the cached copy.
        const res = fromNetwork(evt.request, 3e3, false).catch(() => fromCache(evt.request));
        if (DEBUG) console.log(evt.request.url, 'network-first response', res);
        evt.respondWith(res);
    } else {
        // Try cache and if it fails, go for the network copy.
        const res = fromCache(evt.request).catch(() => fromNetwork(evt.request, 180e3));
        if (DEBUG) console.log(evt.request.url, "read-through cache response", res);
        evt.respondWith(res);
    }
});


// Time limited network request. If the network fails or the response is not
// served before timeout, the promise is rejected.
function fromNetwork(request, timeout, addToCache = true) {
    if (DEBUG) console.log("fromNetwork", request.url);
    return new Promise(function (fulfill, reject) {
        // Reject in case of timeout.
        var timeoutId = setTimeout(reject, timeout);
        // Fulfill in case of success.
        fetch(request.clone()).then(function (response) {
            clearTimeout(timeoutId);
            if (addToCache && response.status < 400 && response.status !== 206) {
                caches.open(CACHE).then((cache) => cache.put(request.clone(), response.clone()));
            }
            fulfill(response.clone());
            // Reject also if network fetch rejects.
        }, reject);
    });
}

// Open the cache where the assets were stored and search for the requested
// resource. Notice that in case of no matching, the promise still resolves
// but it does with `undefined` as value.
function fromCache(request) {
    if (DEBUG) console.log("fromCache", request.url);
    return caches.open(CACHE).then(function (cache) {
        return cache.match(request.clone()).then(function (matching) {
            if (DEBUG) console.log("fromCache got", request.url, matching);
            return matching || Promise.reject('no-match');
        });
    });
}