import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service Worker registration with auto-cleanup of old caches
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // First, unregister any old service workers to clear stale cache
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const sw = registration.active || registration.waiting || registration.installing;
        // If the SW is an old version (no version comment), unregister it
        if (sw && sw.scriptURL.includes('/sw.js')) {
          // Only re-register with our latest version
          await registration.update();
        }
      }

      // Clear all old caches named huevos-togo-v1
      const keys = await caches.keys();
      for (const key of keys) {
        if (key !== 'huevos-togo-v2') {
          await caches.delete(key);
          console.log('Deleted old cache:', key);
        }
      }

      // Register the new service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', reg.scope);
    } catch (err) {
      console.log('SW registration failed:', err);
    }
  });
}
