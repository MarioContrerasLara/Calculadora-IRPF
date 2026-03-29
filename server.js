const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 443;
const BASE = path.resolve(__dirname);

const CERTS = {
    key:  fs.readFileSync('/home/mario/mario.gal/privkey1.pem'),
    cert: fs.readFileSync('/home/mario/mario.gal/fullchain1.pem'),
    minVersion: 'TLSv1.3',
    maxVersion: 'TLSv1.3',
};

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
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options':    'nosniff',
    'X-Frame-Options':           'DENY',
    'Referrer-Policy':           'strict-origin-when-cross-origin',
    'Content-Security-Policy':   "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
};

https.createServer(CERTS, (req, res) => {
    // Prevent path traversal
    const safePath = path.normalize(req.url.split('?')[0]).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(BASE, safePath);

    // Default to index.html
    if (filePath === BASE || filePath === BASE + path.sep) {
        filePath = path.join(BASE, 'index.html');
    }

    // Block access outside BASE
    if (!filePath.startsWith(BASE)) {
        res.writeHead(403, SECURITY_HEADERS);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            // Try appending index.html for directories
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
}).listen(PORT, () => {
    console.log(`HTTPS server running on port ${PORT}`);
});

function serveFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, SECURITY_HEADERS);
            res.end('Internal Server Error');
            return;
        }
        const cacheHeader = ['.css', '.js'].includes(path.extname(filePath).toLowerCase()) ? { 'Cache-Control': 'no-cache' } : {};
        res.writeHead(200, { ...SECURITY_HEADERS, ...cacheHeader, 'Content-Type': contentType });
        res.end(data);
    });
}
