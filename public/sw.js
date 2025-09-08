const CACHE_NAME = 'costeno-sales-v1';
const OFFLINE_URL = '/offline';

// Assets to cache for offline functionality
const urlsToCache = [
  '/',
  '/dashboard',
  '/build/assets/app.js',
  '/build/assets/app.css',
  '/manifest.json',
  OFFLINE_URL
];

// Install event - cache essential resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API requests with network-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request)
            .then(response => {
              if (response) {
                return response;
              }
              // Return offline page for failed API requests
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request)
            .then(response => {
              return response || caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Default cache-first strategy for other requests
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-dashboard') {
    event.waitUntil(syncDashboardData());
  }
});

// Handle push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva actualización disponible',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Costeno Sales V2', options)
  );
});

// Sync dashboard data when connection is restored
async function syncDashboardData() {
  try {
    const response = await fetch('/api/dashboard/data/today');
    if (response.ok) {
      console.log('Dashboard data synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync dashboard data:', error);
  }
}