// Vercel Serverless Function: proxy to backend private-image endpoint
// This file proxies any request to /api/github-image/<path...> to
// https://art-with-sucha.onrender.com/api/github-image/<path...>

export default async function handler(req, res) {
  try {
    const path = req.query.path;
    const joined = Array.isArray(path) ? path.join('/') : path || '';
    const target = `https://art-with-sucha.onrender.com/api/github-image/${joined}`;

    // Forward headers (but do not forward host)
    const forwardedHeaders = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!v) continue;
      const key = k.toLowerCase();
      if (key === 'host') continue;
      // Avoid forwarding any incoming cookie that might include secrets
      if (key === 'cookie') continue;
      forwardedHeaders[k] = v;
    }

    const backendRes = await fetch(target, {
      method: req.method,
      headers: forwardedHeaders,
    });

    // Copy status and selected headers
    res.status(backendRes.status);
    backendRes.headers.forEach((value, name) => {
      // Do not forward hop-by-hop headers
      const lower = name.toLowerCase();
      if (['connection', 'keep-alive', 'transfer-encoding', 'upgrade'].includes(lower)) return;
      // Vercel will set its own cache-control for static assets; preserve sensible caching from backend
      res.setHeader(name, value);
    });

    // Stream body
    const arrayBuffer = await backendRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('proxy error', err);
    res.status(502).send('Bad Gateway');
  }
}
