
importScripts('js/idb.js');


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
				'/js/idb.js',
				'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
				'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js'
			])
		})
	)
});

const dbPromise = idb.open('restaurant-reviews-dbv1', 1, upgradeDb => {
	upgradeDb.createObjectStore('restaurants');
});


self.addEventListener('fetch', event => {
	if(event.request.url.endsWith('restaurants')) {
		event.respondWith(responseFromIdb(event.request));
	}
	else {
		event.respondWith(responseFromCache(event.request));
	}
})

function responseFromIdb(request) {
	return dbPromise.then(db => {
     	const tx = db.transaction('restaurants');
		const store = tx.objectStore('restaurants');
    	return store.get('restaurants').then(restaurants => {
      		return restaurants || fetch(request).then(response => response.json())
          	.then(json => {
            	const tx = db.transaction('restaurants', 'readwrite');
				const store = tx.objectStore('restaurants');
				store.put(json, 'restaurants');
            	return json;
          	})
    	}).then(response => new Response(JSON.stringify(response)))
    });
}


function responseFromCache(request) {
	return caches.open('restaurant-reviews-v1').then(cache => {
		return cache.match(request).then(response => {
			return response || fetch(request).then(response => {
				cache.put(request, response.clone());
				return response;
			})
		})
	})
}
