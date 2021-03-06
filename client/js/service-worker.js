const cacheName = 'main';
const now = Date.now();

const offlineCaches = [
	'/',
	'/service-worker.js',
];

self.addEventListener('install', event => {

	event.waitUntil((async () => {

		for(const key of await caches.keys()) {
			caches.delete(key);
		}

		const cache = await caches.open(cacheName);

		await cache.addAll(offlineCaches);

		self.skipWaiting();
	})());
});

self.addEventListener('activate', async event => {

	clients.claim();
});

self.addEventListener('fetch', async event => {

	event.respondWith((async () => {

		const match = await caches.match(event.request);

		// Return the cached response if we're offline or we're loading a non API resource
		if(match && (!navigator.onLine || !event.request.url.includes('/v2/'))) {
			return match;
		}

		const response = await fetch(event.request.clone());

		if(response && response.status == 200 && event.request.method == 'GET') {

			const cache = await caches.open(cacheName);

			cache.put(event.request, response.clone());
		}

		return response;
	})());
});

self.addEventListener('message', event => {

	if(!event.data || !event.data.action) {
		return event.ports[0].postMessage({action: '', data: now});
	}

	if(event.data.action == 'test') {
		event.ports[0].postMessage({action: event.data.action, response: 'test response'});
	}

	if(event.data.action == 'startTime') {
		event.ports[0].postMessage({action: event.data.action, response: now});
	}
});