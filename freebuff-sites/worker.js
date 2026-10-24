// Entry Worker untuk Freebuff Sites.
// Aplikasi JadwalSDLC adalah SPA statis (Vite + React) yang menyimpan data di
// localStorage browser, sehingga Worker hanya perlu menyajikan aset hasil build.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/healthz') {
      return new Response('ok', {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }

    const response = await env.ASSETS.fetch(request)

    // Jangan cache HTML agar deploy baru langsung terpakai; aset ber-hash
    // (/assets/*) tetap boleh di-cache lama oleh browser.
    if (response.headers.get('content-type')?.includes('text/html')) {
      const headers = new Headers(response.headers)
      headers.set('cache-control', 'no-cache')
      return new Response(response.body, {
        status: response.status,
        headers,
      })
    }

    return response
  },
}
