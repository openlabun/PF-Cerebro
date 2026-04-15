import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeBasePath(basePath) {
  const raw = String(basePath || '/simulation/pvp/').trim()
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function pvpWebhookReceiverPlugin(basePath) {
  const eventStore = []
  const normalizedBasePath = normalizeBasePath(basePath)
  const webhookPath = `${normalizedBasePath}api/webhooks`
  const webhookEventsPath = `${normalizedBasePath}api/webhooks/events`

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

        if (req.method === 'POST' && url === webhookPath) {
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

        if (req.method === 'GET' && url.startsWith(webhookEventsPath)) {
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

export default defineConfig(() => {
  const basePath = normalizeBasePath(process.env.VITE_APP_BASE_PATH)

  return {
    base: basePath,
    plugins: [react(), pvpWebhookReceiverPlugin(basePath)],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setupTests.js',
      globals: true,
    },
  }
})
