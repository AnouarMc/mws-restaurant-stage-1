/**
 * Register service worker
 */

if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
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


let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
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
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant);
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name;

  const f = restaurant.id;
  image.srcset = `./img/${f}.jpg 800w, ./img/${f}-600.jpg 600w, ./img/${f}-400.jpg 400w, ./img/${f}-300.jpg 300w`;
  image.sizes = "(max-width: 550px) 90vw, (max-width: 800px) 85vw, 40vw";


  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h4');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
  }
  else {
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
  }
  const button = document.createElement('button');
  button.textContent = 'Add review';
  button.className = 'add-review';
  container.appendChild(button);

  bindModal();
  bindRemoveButton();
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.setAttribute('tabindex', '0');

  const header = document.createElement('div');
  header.className = 'review-header';

  const name = document.createElement('p');
  name.innerHTML = review.name;
  header.appendChild(name);
  li.appendChild(header);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.createdAt).toLocaleDateString();
  date.className = 'review-date'
  header.appendChild(date);

  const remove = document.createElement('i');
  remove.setAttribute('data-id', review.id);
  remove.className = 'icon-trash';
  header.appendChild(remove);


  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = 'review-rating';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
  fixHeader();
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Fix header when its text breaks on multiple lines
 */

fixHeader = () => {
  const height = document.getElementsByTagName('header')[0].offsetHeight;
  document.getElementById('map-container').style.marginTop = height + 'px';
}

window.onresize = function(event) {
  fixHeader();
};

/**
 * Review form modal
 */
bindModal = () => {
  let beforeFocus;
  const modalBack = document.querySelector('.modal__back');
  const modal = document.querySelector('.modal');
  const modalContent = document.querySelector('.modal__content');
  const body = document.querySelector('body');

  document.querySelector('button').addEventListener('click', () => {
    beforeFocus = document.activeElement;
    setZindex(modal, modalBack, 2001)
    modalBack.classList.add('show-back');
    modal.classList.add('show-modal');
    body.classList.add('no-scroll');
  })

  modal.addEventListener('click', () => {
    modalBack.classList.remove('show-back');
    modal.classList.remove('show-modal');
    body.classList.remove('no-scroll');
    setTimeout(function() {
      setZindex(modal, modalBack, -2)
    }, 200);
    beforeFocus.focus();
  })

  modalContent.addEventListener('keydown', e => {
    const close = document.querySelector('.close__modal');
    //if tab key is tapped and current focus is on last element
    if(e.key == 'Tab' && document.activeElement == document.querySelector('.add-review[type="submit"]')) {
      //focus first element
      close.focus();
    }
    else if(e.key == 'Escape') {
      close.click();
    }
  })

  document.querySelector('.close__modal').addEventListener('click', () => {
    modalBack.classList.remove('show-back');
    modal.classList.remove('show-modal');
    body.classList.remove('no-scroll');
    setTimeout(function() {
      setZindex(modal, modalBack, -2)
    }, 200);
    beforeFocus.focus();
  })

  modalContent.addEventListener('click', e => {
    e.stopPropagation();
  })

  modalContent.addEventListener('submit', e => {
    e.preventDefault();
    const el = e.srcElement;
    let urlParams = new URLSearchParams(window.location.search);
    let restaurant_id = urlParams.get('id');
    if('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(sw => {
        const rev = {
          "restaurant_id": restaurant_id,
          "name": el.querySelector('#reviewer').value,
          "rating": parseInt(el.querySelector('input[name="rating"]:checked').value),
          "comments": el.querySelector('#review').value
        };
        dbPromise.then(db => {
            const tx = db.transaction('syncReviewsStore', 'readwrite');
            const store = tx.objectStore('syncReviewsStore');
            store.put(rev, rev.restaurant_id);
            return tx.complete;
        }).then(() => {
          const url = `http://localhost:1337/reviews/?restaurant_id=${rev.restaurant_id}`;
          caches.open('restaurant-reviews-v1').then(cache => {
            cache.match(url).then(r =>  r.json())
            .then(json => {
                json.push(rev);
                cache.put(url, new Response(JSON.stringify(json)));
              })
            })
          }).then(() => {
            const li = createReviewHTML(rev);
            document.querySelector('#reviews-list').appendChild(li);
            document.querySelector('.close__modal').click();
            return sw.sync.register('sync-reviews');
          })

      })
    }
  })
}


bindRemoveButton = () => {
  document.querySelectorAll('.icon-trash').forEach(icon => {
    icon.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      let urlParams = new URLSearchParams(window.location.search);
      let restaurant_id = urlParams.get('id');
      if('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(sw => {
          const rev = { id: id };
          dbPromise.then(db => {
            const tx = db.transaction('syncReviewsStore', 'readwrite');
            const store = tx.objectStore('syncReviewsStore');
            store.put(rev, rev.id);
            return tx.complete;
          }).then(() => {
            const url = `http://localhost:1337/reviews/?restaurant_id=${restaurant_id}`;
            caches.open('restaurant-reviews-v1').then(cache => {
              cache.match(url).then(r =>  r.json())
              .then(json => {
                json = json.filter(r => r.id != id);
                cache.put(url, new Response(JSON.stringify(json)));
              })
            })
          }).then(() => {
            e.target.closest('li').remove();
            return sw.sync.register('sync-reviews');
          })
        })
      }
    })
  })
}

setZindex = (modal, back, value) => {
  back.style = 'z-index:' + value
  modal.style = 'z-index: ' + parseInt(value + 1);
}


