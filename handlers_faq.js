const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const mysql = require('mysql');

// Database connection setup
const connection = mysql.createConnection({
    multipleStatements: true,
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'project',
});

connection.connect(err => {
    if (err) {
        console.error('Error connecting to the database: ' + err.stack);
        return;
    }
    console.log('Connected to the database');
});

// Function to serve index.html
exports.serveIndex = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    const indexPath = path.join(__dirname, 'public_faq', 'index.html');
    serveFile(res, indexPath, 'text/html');
};

// Function to serve static files
exports.serveStaticFiles = (req, res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    const fullPath = path.join(__dirname, 'public_faq', filePath);
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        // Add other mime types as needed
    };
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    serveFile(res, fullPath, contentType);
};
exports.handleNotFound = (req, res) => {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
};

// Helper function to serve files
function serveFile(res, filePath, contentType) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('Internal Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
};

exports.getStatisticsAndQueries = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Second query for detailed queries
    const querySql = `
    SELECT question,answer from faq;

    `;

    connection.query(querySql, (err, queryResults) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error fetching query details from the database');
            return;
        }

        // Send combined results
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({queries: queryResults }));
    });
};