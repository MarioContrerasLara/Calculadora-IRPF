const https = require('https');
const fs = require('fs');
const path = require('path');

const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const BASE = path.resolve(__dirname);

const SSL_KEY = process.env.SSL_KEY || '/home/mario/mario.gal/privkey.pem';
const SSL_CERT = process.env.SSL_CERT || '/home/mario/mario.gal/fullchain.pem';

const DOMAIN = 'mario.gal';

function validHost(host) {
    if (!host) return false;
    const h = host.split(':')[0].toLowerCase();
    return h === DOMAIN || h.endsWith('.' + DOMAIN);
}

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
};

const SECURITY_HEADERS = {
    'X-Content-Type-Options':    'nosniff',
    'X-Frame-Options':           'DENY',
    'Referrer-Policy':           'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy':   "default-src 'self'; " +
                                 "script-src 'self'; " +
                                 "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; " +
                                 "font-src 'self' https://fonts.gstatic.com; " +
                                 "img-src 'self' data:; " +
                                 "connect-src 'self'; " +
                                 "worker-src 'none'; " +
                                 "base-uri 'none'; " +
                                 "form-action 'none'; " +
                                 "frame-ancestors 'none'; " +
                                 "object-src 'none'",
    'Permissions-Policy':        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), ' +
                                 'accelerometer=(), gyroscope=(), magnetometer=(), midi=(), ' +
                                 'autoplay=(), encrypted-media=(), interest-cohort=()',
};

function handleRequest(req, res) {
    if (!validHost(req.headers.host)) {
        res.writeHead(403, SECURITY_HEADERS);
        res.end('Forbidden');
        return;
    }
    const safePath = path.normalize(req.url.split('?')[0]).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(BASE, safePath);

    if (filePath === BASE || filePath === BASE + path.sep) {
        filePath = path.join(BASE, 'index.html');
    }

    if (!filePath.startsWith(BASE)) {
        res.writeHead(403, SECURITY_HEADERS);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            const indexPath = path.join(filePath, 'index.html');
            fs.stat(indexPath, (err2, stat2) => {
                if (err2 || !stat2.isFile()) {
                    res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                } else {
                    serveFile(indexPath, res);
                }
            });
        } else {
            serveFile(filePath, res);
        }
    });
}

function serveFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, SECURITY_HEADERS);
            res.end('Internal Server Error');
            return;
        }
        const cacheHeader = ['.html', '.css', '.js'].includes(ext) || ext === '' ? { 'Cache-Control': 'no-cache, no-store, must-revalidate' } : {};
        res.writeHead(200, { ...SECURITY_HEADERS, ...cacheHeader, 'Content-Type': contentType });
        res.end(data);
    });
}

const key = fs.readFileSync(SSL_KEY);
const cert = fs.readFileSync(SSL_CERT);
https.createServer({
    key,
    cert,
    // TLS 1.3 only — refuse any client that negotiates TLS 1.2 or below.
    minVersion: 'TLSv1.3',
    maxVersion: 'TLSv1.3',
}, handleRequest).listen(HTTPS_PORT, () => {
    console.log(`HTTPS server running on https://0.0.0.0:${HTTPS_PORT}`);
});
