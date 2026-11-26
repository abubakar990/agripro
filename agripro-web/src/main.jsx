import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// After a new deploy, a tab still running the previous build asks for page chunks
// (e.g. Reports-<oldhash>.js) that no longer exist. Reload once to pick up the new
// build instead of showing "Failed to fetch dynamically imported module".
// The timestamp guard stops a reload loop if the chunk is genuinely broken.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'agripro_chunk_reload_at';
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10_000) {
    event.preventDefault();
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
