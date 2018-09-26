/**
 * Register service worker
 */

if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
 
const dbPromise = idb.open('restaurant-reviews-dbv1', 1, upgradeDb => {
  if (!upgradeDb.objectStoreNames.contains('restaurants')) {
    upgradeDb.createObjectStore('restaurants');
  }
  if (!upgradeDb.objectStoreNames.contains('syncFavoriteStore')) {
    upgradeDb.createObjectStore('syncFavoriteStore');
  }
  if(!upgradeDb.objectStoreNames.contains('syncReviewsStore')) {
    upgradeDb.createObjectStore('syncReviewsStore');
  }
});


let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});


/**
 * Bind Click event to bookmark buttons
 */
bookmarkClick = () => {

  const bookmark = document.querySelectorAll('.icon-heart');
  bookmark.forEach(icon => {
    icon.addEventListener('click', (e) => {
      const el = e.target;
      const id = el.getAttribute('data-id');
      const action = !el.classList.contains('active');
      if('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(sw => {
          const favRest = { id: id, action: action };
          dbPromise.then(db => {
            const tx = db.transaction('syncFavoriteStore', 'readwrite');
            const store = tx.objectStore('syncFavoriteStore');
            store.put(favRest, favRest.id);
            return tx.complete;
          }).then(() => {
            dbPromise.then(db => {
              const tx1  = db.transaction('restaurants', 'readwrite');
              const store = tx1.objectStore('restaurants');
              store.get(parseInt(favRest.id)).then(restaurant => {
                restaurant.is_favorite = favRest.action;
                store.put(restaurant, restaurant.id);
              })
              return tx1.complete;
            })
            }).then(() => {
              el.classList.toggle('active');
              return sw.sync.register('sync-favorite');
            })//.then(() => alert('syncingg'))
        })
      }
    })
  })
}
/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
      bookmarkClick();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoiYW5vdWFybWMiLCJhIjoiY2prOHcxZHdpMDkzdjNrb2l3OXZyOHByZyJ9.nAxndXW1e93fdKP61wVR5Q',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Image of ${restaurant.name} restaurant`;

  const f = restaurant.id;
  image.srcset = `./img/${f}.jpg 800w, ./img/${f}-600.jpg 600w, ./img/${f}-400.jpg 400w, ./img/${f}-300.jpg 300w`;
  image.sizes = "(max-width: 550px) 100vw, (max-width: 800px) 50vw, 33.33vw";
  li.append(image);

  const nameBookmarkContainer = document.createElement('div');
  nameBookmarkContainer.className = 'flex-container';

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  nameBookmarkContainer.append(name);

  const bookmark = document.createElement('span');
  bookmark.className = 'icon-heart';
  bookmark.setAttribute('data-id', restaurant.id);
  if(restaurant.is_favorite != undefined && restaurant.is_favorite.toString() == 'true')
    bookmark.classList.add('active');
  nameBookmarkContainer.append(bookmark);

  li.append(nameBookmarkContainer);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute('aria-label', `View details of the restaurant ${restaurant.name}`);
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

} 
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

