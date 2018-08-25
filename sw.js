
self.addEventListener('install', event => {
	event.waitUntil(
		caches.open('restaurant-reviews-v1').then(cache => {
			return cache.addAll([
				'/',
				'/index.html',
				'/css/styles.css',
				'/js/main.js',
				'/js/restaurant_info.js',
				'/js/dbhelper.js',
				'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
				'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js'
			])
		})
	)
})


self.addEventListener('fetch', event => {
	event.respondWith(
		caches.open('restaurant-reviews-v1').then(cache => {
			return cache.match(event.request).then(response => {
				return response || fetch(event.request).then(response => {
					cache.put(event.request, response.clone());
					return response;
				})
			})
		})
	)
})