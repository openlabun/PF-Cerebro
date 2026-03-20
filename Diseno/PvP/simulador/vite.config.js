import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function pvpWebhookReceiverPlugin() {
  const eventStore = []

  function writeJson(res, statusCode, payload) {
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
  }

  function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
      let raw = ''
      req.on('data', (chunk) => {
        raw += chunk
      })
      req.on('end', () => {
        if (!raw) {
          resolve({})
          return
        }

        try {
          resolve(JSON.parse(raw))
        } catch (error) {
          reject(error)
        }
      })
      req.on('error', reject)
    })
  }

  return {
    name: 'pvp-webhook-receiver',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        if (req.method === 'POST' && url === '/simulation/pvp/api/webhooks') {
          try {
            const payload = await parseJsonBody(req)
            eventStore.unshift({
              ...payload,
              receivedAt: new Date().toISOString(),
            })
            if (eventStore.length > 200) eventStore.length = 200
            writeJson(res, 200, { ok: true })
          } catch {
            writeJson(res, 400, { ok: false, message: 'Invalid webhook payload' })
          }
          return
        }

        if (req.method === 'GET' && url.startsWith('/simulation/pvp/api/webhooks/events')) {
          const requestUrl = new URL(url, 'http://localhost')
          const matchId = requestUrl.searchParams.get('matchId')
          const filtered = matchId ? eventStore.filter((event) => event.matchId === matchId) : eventStore
          writeJson(res, 200, { items: filtered.slice(0, 50) })
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  base: '/simulation/pvp/',
  plugins: [react(), pvpWebhookReceiverPlugin()],
})
