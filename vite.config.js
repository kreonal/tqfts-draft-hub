import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Runs api/espn-sync.js directly inside the Vite dev server, so local dev
// works with a plain `vite` process — no Vercel CLI/account needed. Vercel
// itself picks up the same file natively via its /api convention at deploy
// time; this middleware only exists for dev.
function espnApiDevMiddleware() {
  return {
    name: "espn-api-dev-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/api/espn-sync")) return next();
        try {
          const { default: handler } = await server.ssrLoadModule("/api/espn-sync.js");
          const url = new URL(req.url, "http://localhost");
          const query = Object.fromEntries(url.searchParams);
          await handler(
            { query },
            {
              _status: 200,
              status(code) { this._status = code; return this; },
              setHeader: res.setHeader.bind(res),
              json(payload) {
                res.statusCode = this._status;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(payload));
              },
            }
          );
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: String(err?.message || err) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Third arg "" loads all env vars (not just VITE_-prefixed) so the dev
  // middleware above can read ESPN_LEAGUE_ID etc., matching how Vercel
  // injects them for the real serverless function in production.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [react(), espnApiDevMiddleware()],
  };
});
