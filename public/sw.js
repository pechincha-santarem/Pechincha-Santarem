/* eslint-disable no-restricted-globals */

// Ativa imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// IMPORTANTE:
// - não interceptar requests não-GET
// - NÃO interceptar navegação (HTML) -> evita "baixar página" no Chrome Android
// - nunca "rejeitar" sem responder
// - se falhar fetch (offline/erro), tenta cache; se não tiver, responde 504 (mas responde!)
self.addEventListener('fetch', (event) => {
  const req = event.request

  if (req.method !== 'GET') return

  // ✅ CRÍTICO: não mexer em navegação do app (HTML)
  // Isso evita o Chrome tratar como download quando há fallback.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req))
    return
  }

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req)
        return res
      } catch (err) {
        // fallback: cache (se existir)
        const cached = await caches.match(req)
        if (cached) return cached

        // fallback final: resposta válida (evita "Failed to fetch" sem Response)
        return new Response('Offline or fetch failed', {
          status: 504,
          headers: { 'Content-Type': 'text/plain' },
        })
      }
    })()
  )
})
