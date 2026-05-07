const CACHE_NAME = 'eventhub-offline-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// 1. Install Event - Cache the static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache and caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch(error => {
      console.warn('Failed to cache static assets:', error);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).catch(error => {
      console.warn('Failed to clean up old caches:', error);
    })
  );
  self.clients.claim();
});

// 3. Fetch Event - Intercept network requests
self.addEventListener('fetch', (event) => {
  // Do not intercept API calls to your backend
  if (event.request.url.includes('/api/v1/')) {
    return;
  }

  event.respondWith(
    // Try the network first
    fetch(event.request).catch(() => {
      // If the network fails and the user is navigating to a page, serve the cached index.html
      // This allows your React app to load offline and display custom offline UI
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html').then(response => {
          return response || fetch('/index.html');
        }).catch(() => {
          // If even the fallback fails, return a basic offline page
          return new Response('<h1>Offline</h1><p>Please check your internet connection.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        });
      }
      // Otherwise, return any cached asset (like images/CSS)
      return caches.match(event.request).then(response => {
        return response || new Response('', { status: 404 });
      });
    })
  );
});

// 4. Handle Incoming Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'EventHub Alert', body: 'An event is starting soon!' };
  
  if (event.data) {
    data = event.data.json();
  }

  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' } // Store the URL so we can open it when clicked
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 5. Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});