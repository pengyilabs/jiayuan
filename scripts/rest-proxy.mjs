// Proxy mínimo: expone PostgREST bajo /rest/v1 (como el gateway de Supabase) para que
// supabase-js funcione contra un PostgREST "pelado" en local/CI.
import http from 'node:http';

const [, , listenPort = '54399', targetPort = '3001'] = process.argv;

http
  .createServer((req, res) => {
    const path = (req.url ?? '/').replace(/^\/rest\/v1/, '') || '/';
    const upstream = http.request(
      {
        host: '127.0.0.1',
        port: Number(targetPort),
        path,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
      },
      response => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('error', error => {
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end(String(error));
    });
    req.pipe(upstream);
  })
  .listen(Number(listenPort), '127.0.0.1', () => {
    console.log(`rest-proxy :${listenPort} → PostgREST :${targetPort}`);
  });
