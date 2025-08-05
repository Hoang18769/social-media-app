const CACHE_NAME = 'pocpoc-v1';
const urlsToCache = [
  '/offline.html',
  '/pocpoc.png',
  '/manifest.json',
  '/home',
  '/search',
];

// Install - Cache static files only
self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('SW: Files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Cache failed:', error);
        throw error;
      })
  );
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  
  event.waitUntil(
    (async () => {
      try {
        await clients.claim();
        console.log('SW: Claimed clients');
        
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
        
        console.log('SW: Activated successfully');
        
        const clientList = await clients.matchAll();
        clientList.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            cacheName: CACHE_NAME
          });
        });
        
      } catch (error) {
        console.error('SW: Activation failed:', error);
        throw error;
      }
    })()
  );
});

// Fetch - CRITICAL: Skip ALL navigation requests to allow middleware
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  const url = new URL(event.request.url);
  
  // CRITICAL: Skip ALL navigation requests (HTML pages)
  // This allows Next.js middleware to handle routing and redirects
  if (event.request.mode === 'navigate') {
    console.log('SW: Skipping navigation request for middleware:', url.pathname);
    return; // Don't intercept ANY navigation requests
  }
  
  // Skip external URLs
  if (url.origin !== self.location.origin) {
    console.log('SW: Skipping external URL:', url.href);
    return;
  }
  
  // Skip file/upload URLs
  if (url.pathname.includes('/uploads/') || 
      url.pathname.includes('/attachments/') ||
      url.pathname.includes('/files/') ||
      url.searchParams.has('attachment') ||
      url.searchParams.has('file')) {
    console.log('SW: Skipping file/upload URL:', url.href);
    return;
  }
  
  // Only handle static assets (CSS, JS, fonts, images from _next/static)
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.match(/\.(js|css|woff|woff2|ico|png|jpg|jpeg|gif|svg|webp)$/) ||
      url.pathname === '/manifest.json' ||
      url.pathname === '/pocpoc.png') {
    event.respondWith(handleAssetRequest(event.request));
  } else if (url.pathname.startsWith('/api/')) {
    // Handle API requests
    event.respondWith(handleApiRequest(event.request));
  }
  // For everything else, let browser handle naturally (including middleware)
});

// Handle asset requests only
async function handleAssetRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful response
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('SW: Serving asset from cache:', request.url);
      return cachedResponse;
    }
    
    throw new Error('Asset not found');
    
  } catch (error) {
    console.log('SW: Asset request failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return fetch(request);
  }
}

// Handle API requests
async function handleApiRequest(request) {
  try {
    // Always try network first for API
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('SW: API request failed:', error);
    
    return new Response(JSON.stringify({
      error: 'Network unavailable'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('SW: Push event received:', event);
  
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Bạn có thông báo mới',
    icon: data.icon || '/pocpoc.png',
    badge: data.badge || '/pocpoc.png',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: data.actions || [
      { action: 'view', title: 'Xem' },
      { action: 'close', title: 'Đóng' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'PWA App', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  if (action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const hadWindowToFocus = clientList.some((windowClient) => {
          if (windowClient.url.includes(self.location.origin)) {
            windowClient.focus();
            windowClient.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: action || 'view',
              data: data
            });
            return true;
          }
          return false;
        });

        if (!hadWindowToFocus) {
          const url = data.url || '/home';
          return clients.openWindow(url);
        }
      })
  );
});

// Handle messages from main app
self.addEventListener('message', (event) => {
  console.log('SW: Message received:', event.data);
  
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'SIMULATE_PUSH':
      self.registration.showNotification(data.title || 'PWA App', {
        body: data.body || 'Bạn có thông báo mới',
        icon: data.icon || '/pocpoc.png',
        badge: data.badge || '/pocpoc.png',
        tag: data.tag || 'simulated',
        data: data.data || {},
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: data.actions || [
          { action: 'view', title: 'Xem' },
          { action: 'close', title: 'Đóng' }
        ]
      });
      break;
      
    case 'GET_CACHE_STATUS':
      caches.keys().then((cacheNames) => {
        event.ports[0].postMessage({
          type: 'CACHE_STATUS',
          cacheNames: cacheNames,
          currentCache: CACHE_NAME
        });
      });
      break;
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(Promise.resolve());
  }
});

console.log('SW: Service Worker loaded - All navigation requests skipped for middleware');