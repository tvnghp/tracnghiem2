const CACHE_NAME = 'quiz-cantho-v3-indexeddb-20250111';
const urlsToCache = [
  './',
  './index.html',
  './admin.html',
  './quiz.html',
  './styles.css',
  './mobile-enhancements.css',
  './mobile-touch.js',
  './config.js',
  './indexeddb-storage.js',
  './storage-wrapper.js',
  './logo.png',
  './topics.json',
  './manifest.json'
];

// Install event
self.addEventListener('install', function(event) {
  // Skip waiting to activate new service worker immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('✅ Service Worker: Opened cache', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - delete old caches
self.addEventListener('activate', function(event) {
  console.log('🔄 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        // Clone the request for Android compatibility
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(function(response) {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response for caching
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(function() {
          // Return offline page or fallback for Android
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      }
    )
  );
});

// Activate event
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});