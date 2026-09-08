// Service Worker for GigsManager
// Provides offline support and intelligent caching strategies

const CACHE_NAME = 'gigs-manager-v1.28.21';
const STATIC_CACHE = 'gigs-manager-static-v3';
const DYNAMIC_CACHE = 'gigs-manager-dynamic-v3';
const LONG_TERM_CACHE = 'gigs-manager-longterm-v3';

// Static assets that should be cached on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/browserconfig.xml',
];

// Install event - cache static assets
// Assets are cached individually with per-item error handling so that a single
// failure (offline, quota, aborted hard refresh) can never fail installation
// and leave the new worker stuck.
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        console.log('Caching static assets');
        await Promise.all(
          STATIC_ASSETS.map(async (asset) => {
            try {
              await cache.add(asset);
            } catch (err) {
              console.warn('SW: failed to cache static asset during install:', asset, err);
            }
          })
        );
      } catch (err) {
        console.warn('SW: install caching skipped:', err);
      }
    })()
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== LONG_TERM_CACHE
          ) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).catch((err) => {
      console.warn('SW: cache cleanup failed:', err);
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { destination, method, url } = request;

  // Only cache GET requests
  if (method !== 'GET') {
    return;
  }

  // Skip chrome extensions and non-http protocols
  if (!url.startsWith('http')) {
    return;
  }

  // Never intercept Next.js build assets or app documents.
  // Caching these is what causes stale chunk URLs and MIME/404 failures after deploys.
  if (
    destination === 'document' ||
    destination === 'script' ||
    destination === 'style' ||
    url.includes('/_next/')
  ) {
    return;
  }

  // Strategy 1: Icons and static assets - cache first, long-term
  if (
    url.includes('/favicon') ||
    url.includes('/icon-') ||
    url.includes('/apple-touch-icon') ||
    url.includes('/browserconfig')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok && destination === 'image') {
            const cloned = response.clone();
            caches.open(LONG_TERM_CACHE).then((cache) => {
              cache.put(request, cloned);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Strategy 2: Images - cache first with fallback
  if (destination === 'image') {
    event.respondWith(
      caches
        .match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              const cloned = response.clone();
              caches
                .open(DYNAMIC_CACHE)
                .then((cache) => cache.put(request, cloned))
                .catch(() => {});
              return response;
            })
            .catch(() => {
              // Return a placeholder or cached version if available
              return caches.match(request).catch(() => {
                return new Response('Image not available offline', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({
                    'Content-Type': 'text/plain',
                  }),
                });
              });
            });
        })
        .catch(() => {
          // A Cache API failure must never block or break the request -
          // fall back to the network and degrade gracefully.
          return fetch(request).catch(() => new Response('', {
            status: 503,
            statusText: 'Service Unavailable',
          }));
        })
    );
    return;
  }

  // Strategy 3: API calls - network first with intelligent fallback
  // Skip API interception on local dev hosts: SW fetch failures surface as false
  // "Offline - cached data unavailable" while Next.js dev / DB are actually up.
  if (url.includes('/api/')) {
    try {
      const u = new URL(url);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        return;
      }
    } catch {
      return;
    }
    event.respondWith(
      fetch(request)
        .then((response) => {
          const contentType = response.headers.get('content-type') || '';
          const isHtmlResponse = contentType.includes('text/html');

          // API routes should not return HTML error pages to app fetchers.
          // Convert them into JSON so the client can handle gracefully.
          if (isHtmlResponse) {
            return new Response(
              JSON.stringify({
                error: 'Service temporarily unavailable',
                type: 'unexpected_html_response',
              }),
              {
                status: response.status >= 400 ? response.status : 503,
                headers: new Headers({
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-store',
                }),
              }
            );
          }

          // Cache successful responses
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches
              .open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, cloned))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => {
          // Network error - try cached response first
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // No cache available - return appropriate error
            const errorMsg = 'Unable to load data. Please check your connection and try again.';
            return new Response(
              JSON.stringify({ error: errorMsg }),
              {
                status: 503,
                headers: new Headers({
                  'Content-Type': 'application/json',
                }),
              }
            );
          });
        })
    );
    return;
  }

  // Strategy 4: Other assets - network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const cloned = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, cloned))
          .catch(() => {});
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline page or error
          return caches.match('/').catch(() => {
            return new Response('Offline - page not available', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
        });
      })
  );
});

// Message handler for cache clearing
// Errors are caught and logged so cache revalidation problems can never throw
// inside (and stall) the worker's event loop.
self.addEventListener('message', (event) => {
  try {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    if (event.data && event.data.type === 'CLEAR_CACHE') {
      caches
        .keys()
        .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
        .catch((err) => console.warn('SW: failed to clear caches:', err))
        .finally(() => {
          if (event.source) {
            event.source.postMessage({ type: 'CACHE_CLEARED' });
          }
        });
    }
  } catch (err) {
    console.warn('SW: message handler error:', err);
  }
});

console.log('Service Worker script loaded');
