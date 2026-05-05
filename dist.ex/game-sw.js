const CACHE_NAME = 'game-preview-cache-v2';
let filesMap = new Map();

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SET_FILES') {
    filesMap.clear();
    const files = event.data.files;
    
    for (const item of files) {
        filesMap.set(item.path, item.file);
    }
    
    if (event.ports && event.ports[0]) {
       event.ports[0].postMessage({ status: 'ok' });
    }
  }
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // We want to intercept requests that match files in our map
  // This handles both /local-game/ paths and absolute paths from Vite (like /assets/...)
  
  let virtualPath = decodeURIComponent(url.pathname).replace(/^\/local-game\//, '').replace(/^\//, '');
  
  if (virtualPath === '') {
      virtualPath = 'index.html';
  }

  // Exact match
  let file = filesMap.get(virtualPath);
  
  // Fuzzy match fallback
  if (!file) {
      const vLower = virtualPath.toLowerCase();
      for (const [key, val] of filesMap.entries()) {
          const kLower = key.toLowerCase();
          if (kLower === vLower || kLower.endsWith('/' + vLower) || vLower.endsWith('/' + kLower) || kLower === vLower.replace(/^.*?assets\//, 'assets/')) {
              file = val;
              break;
          }
      }
  }
  
  if (file) {
    let type = file.type;
    if (!type) {
       if (virtualPath.endsWith('.js') || virtualPath.endsWith('.mjs')) type = 'application/javascript';
       else if (virtualPath.endsWith('.css')) type = 'text/css';
       else if (virtualPath.endsWith('.svg')) type = 'image/svg+xml';
       else if (virtualPath.endsWith('.json')) type = 'application/json';
       else if (virtualPath.endsWith('.html')) type = 'text/html';
       else type = 'text/plain';
    }
    
    if (type === 'text/html') {
      const clone = file.slice(0, file.size, file.type);
      event.respondWith(
        clone.text().then(text => {
          const inject = `<script>
            if (navigator.serviceWorker) {
              navigator.serviceWorker.register = function() {
                console.log("[Proxy SW] Blocked guest game from overriding the Local Preview Service Worker.");
                return new Promise(() => {}); // Never resolves, simulating pending registration
              };
            }
          </script>`;
          if (text.includes('<head>')) {
            text = text.replace('<head>', '<head>' + inject);
          } else {
            text = inject + text;
          }
          return new Response(text, {
            headers: {
              'Content-Type': type,
              'Access-Control-Allow-Origin': '*'
            }
          });
        })
      );
    } else {
      const response = new Response(file, {
        headers: {
          'Content-Type': type,
          'Access-Control-Allow-Origin': '*'
        }
      });
      event.respondWith(response);
    }
  } else if (url.pathname.startsWith('/local-game/')) {
    // If it starts with local-game but not found in map, it should return 404
    event.respondWith(new Response('File Not Found in local preview (' + virtualPath + ')', { status: 404 }));
  }
  // Otherwise, let the browser handle it normally (e.g. for /src/App.tsx)
});
