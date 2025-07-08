// public/sw.js - Fixed version with proper asset handling
const CACHE_NAME = 'pocpoc-v1';
const urlsToCache = [
  '/home',
  '/offline.html',
  '/pocpoc.png',
  '/manifest.json'
];

// Install - Cache static files
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

// Fetch - với logic exclude root path và external URLs
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  const url = new URL(event.request.url);
  
  // IMPORTANT: Skip root path để server middleware xử lý redirect
  if (url.pathname === '/') {
    console.log('SW: Skipping root path, let server handle redirect');
    return; // Không intercept, để browser fetch bình thường
  }
  
  // IMPORTANT: Skip external URLs (like image uploads from other domains)
  if (url.origin !== self.location.origin) {
    console.log('SW: Skipping external URL:', url.href);
    return; // Không intercept external URLs
  }
  
  // IMPORTANT: Skip URLs có chứa upload path hoặc attachment
  if (url.pathname.includes('/uploads/') || 
      url.pathname.includes('/attachments/') ||
      url.pathname.includes('/files/') ||
      url.searchParams.has('attachment') ||
      url.searchParams.has('file')) {
    console.log('SW: Skipping file/upload URL:', url.href);
    return; // Không intercept file URLs
  }
  
  // Handle other requests
  if (event.request.mode === 'navigate') {
    // HTML pages - Network first
    event.respondWith(handleNavigateRequest(event.request));
  } else if (url.pathname.match(/\.(js|css|woff|woff2|ico)$/)) {
    // Static assets (chỉ JS, CSS, fonts) - Network first for better reliability
    event.respondWith(handleAssetRequest(event.request));
  } else {
    // API requests - Network first
    event.respondWith(handleApiRequest(event.request));
  }
});

// Handle navigation requests (HTML pages) - không bao gồm root
async function handleNavigateRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful response
      if (networkResponse.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('SW: Network failed, trying cache:', error);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Last resort
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle asset requests (CSS, JS, fonts ONLY) - KHÔNG bao gồm hình ảnh
async function handleAssetRequest(request) {
  try {
    // Try network first for assets to ensure fresh content
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
    
    // If both fail, let the request fail naturally
    throw new Error('Asset not found in network or cache');
    
  } catch (error) {
    console.log('SW: Asset request failed, trying cache:', error);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('SW: Serving asset from cache after network failure:', request.url);
      return cachedResponse;
    }
    
    // If asset not found anywhere, let browser handle naturally
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
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
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

console.log('SW: Service Worker loaded - Root path và image URLs excluded');