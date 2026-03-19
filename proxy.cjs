// proxy.cjs - local CORS proxy for ESPN APIs
// Usage: node proxy.cjs   (keep running in a separate terminal)
// App calls: http://localhost:3001/proxy?url=https://site.api.espn.com/...

const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = 3001;

// Only ESPN domains - NHL's own API blocks proxies regardless of headers
const ALLOWED_HOSTS = [
  "site.api.espn.com",
  "sports.core.api.espn.com",
  "cdn.espn.com",
  "api.nhle.com",
  "api-web.nhle.com",
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "identity",
  "Referer": "https://www.espn.com/",
  "Origin": "https://www.espn.com",
  "Cache-Control": "no-cache",
};

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const target = reqUrl.searchParams.get("url");

  if (!target) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing ?url= parameter" }));
    return;
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Invalid URL: ${target}` }));
    return;
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Host "${parsed.hostname}" not allowed. Allowed: ${ALLOWED_HOSTS.join(", ")}` }));
    return;
  }

  console.log(`[proxy] -> ${parsed.hostname}${parsed.pathname}`);

  let bodyData = Buffer.alloc(0);
  req.on("data", (chunk) => {
    bodyData = Buffer.concat([bodyData, chunk]);
  });

  req.on("end", () => {
    const isPost = req.method === "POST";
    const fwdHeaders = { ...HEADERS };

    if (req.headers["content-type"]) {
      fwdHeaders["content-type"] = req.headers["content-type"];
    }

    if (isPost && bodyData.length) {
      fwdHeaders["content-length"] = String(bodyData.length);
    }

    const proxyReq = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: isPost ? "POST" : "GET",
        headers: fwdHeaders,
      },
      (proxyRes) => {
        const status = proxyRes.statusCode ?? 200;
        if (status !== 200) {
          console.warn(`[proxy] upstream ${status} from ${parsed.hostname}${parsed.pathname}`);
        }

        res.writeHead(status, {
          "Content-Type": proxyRes.headers["content-type"] ?? "application/json",
        });
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", (err) => {
      console.error("[proxy] error:", err.message);
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    if (isPost && bodyData.length) {
      proxyReq.write(bodyData);
    }

    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`\nNHL Predictor proxy running on http://localhost:${PORT}`);
  console.log(`Allowed hosts: ${ALLOWED_HOSTS.join(", ")}\n`);
});
