const http = require('http');
const url = require('url');
const handlers = require('./Faq_handler'); // Importing handlers

const port = 8081;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    if (req.method === 'GET' && path === '/') {
        handlers.serveIndex(req, res);
    } else if (req.method === 'GET' && path.match('\.html$') || path.match('\.js$')) {
        handlers.serveStaticFiles(req, res, path);
    } else if (req.method === 'GET' && path.startsWith('/assets_faq')) {
        handlers.serveStaticFiles(req, res, path);
    } else if (req.method === 'GET' && path === '/faq') {
        handlers.getStatisticsAndQueries(req, res);
    } 
    else {
        handlers.handleNotFound(req, res);
    }
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});