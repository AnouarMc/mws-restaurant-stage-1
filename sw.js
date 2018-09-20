
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
	upgradeDb.createObjectStore('syncFavoriteStore')
});


self.addEventListener('fetch', event => {
	if(event.request.method === 'GET') {
		if(event.request.url.endsWith('restaurants')) {
			event.respondWith(responseFromIdb(event.request));
		}
		else {
			event.respondWith(responseFromCache(event.request));
		}
	}
	else { 	//put, post
	/*
		fetch(event.request).then(response => { return response.json(); })
		.then(restaurant => {
			dbPromise.then(db => {
				const tx = db.transaction('restaurants', 'readwrite');
				const store = tx.objectStore('restaurants');
				store.put(restaurant, restaurant.id);
			})
		})*/
	}
})


self.addEventListener('sync', function(event) {
  if (event.tag == 'sync-favorite') {
    event.waitUntil(
	  	dbPromise.then(db => {
	     	const tx = db.transaction('syncFavoriteStore');
			const favoriteStore = tx.objectStore('syncFavoriteStore');
			favoriteStore.getAll().then(favoriteChanges => {
				favoriteChanges.forEach(change => {
					const url = `http://localhost:1337/restaurants/${change.id}/?is_favorite=${change.action}`;
			        fetch(url, { method: 'PUT' }).then(response => { 
			          	if(response.ok) {			          		
			          		const txx = db.transaction('syncFavoriteStore', 'readwrite');
							const favoriteStorex = txx.objectStore('syncFavoriteStore');
							favoriteStorex.delete(change.id);
			        	}
			        });
				})
			})
		})

    );
  }
});




function responseFromIdb(request) {
	return dbPromise.then(db => {
     	const tx = db.transaction('restaurants');
		const store = tx.objectStore('restaurants');
    	return store.getAll().then(restaurants => {
    		if(restaurants.length)
      			return restaurants
      		else
      			return fetch(request).then(response => response.json())
          		.then(json => {
            		const tx = db.transaction('restaurants', 'readwrite');
					const store = tx.objectStore('restaurants');
					json.forEach(restaurant => {
						store.put(restaurant, restaurant.id);
					})
				
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
