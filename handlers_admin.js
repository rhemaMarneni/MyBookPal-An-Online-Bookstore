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

exports.serveIndex = (req, res) => {
    const indexPath = path.join(__dirname, 'public_admin', 'index.html');
    serveFile(res, indexPath, 'text/html');
};

// Function to serve static files
exports.serveStaticFiles = (req, res, filePath) => {
    const fullPath = path.join(__dirname, 'public_admin', filePath);
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
function serveFile(res, filePath, contentType) {
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
exports.getWaitApproval = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      const sql = 'select * from wait_approval';
      connection.query(sql, (err, result) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error fetching data from the database');
          console.error('Error fetching data from the database: ' + err);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
      });
    });
  };

exports.processApprovals = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    let body = '';
  req.on('data', chunk => {
      body += chunk.toString();
  });
  req.on('end', () => {
      const data = JSON.parse(body);
      const approvals = data.approvals;

      // Begin transaction
      connection.beginTransaction(err => {
          if (err) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Error starting transaction');
              return;
          }

          // Process approvals - insert into 'faq' table
          approvals.forEach(a_id => {
              const sql = `INSERT INTO faq (question, answer) SELECT question, answer FROM wait_approval WHERE a_id = ${a_id}`;
              connection.query(sql, (err, result) => {
                  if (err) {
                      connection.rollback(() => {
                          console.error('Error inserting into faq: ' + err);
                          res.writeHead(500, { 'Content-Type': 'text/plain' });
                          res.end('Error processing approvals');
                      });
                      return;
                  }
              });
          });

          // Delete all from 'wait_approval'
          const deleteSql = `DELETE FROM wait_approval`;
          connection.query(deleteSql, (err, result) => {
              if (err) {
                  connection.rollback(() => {
                      console.error('Error deleting from wait_approval: ' + err);
                      res.writeHead(500, { 'Content-Type': 'text/plain' });
                      res.end('Error processing approvals');
                  });
                  return;
              }

              // Commit transaction
              connection.commit(err => {
                  if (err) {
                      connection.rollback(() => {
                          console.error('Error committing transaction: ' + err);
                          res.writeHead(500, { 'Content-Type': 'text/plain' });
                          res.end('Error processing approvals');
                      });
                      return;
                  }

                  res.writeHead(200, { 'Content-Type': 'text/plain' });
                  res.end('Approvals processed successfully');
              });
          });
      });
  });
};

exports.handleNotFound = (req, res) => {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
};

exports.getStatisticsAndQueries = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        // Second query for detailed queries
        const querySql = `
        SELECT 
            sb.UserId,
            c.FirstName,
            c.LastName,
            AVG(fb.serv_rating) AS avg_serv_rating,
            AVG(fb.time_rating) AS avg_time_rating,
            SUM(fb.solved) / COUNT(fb.solved) * 100 AS solved_percentage
        FROM 
            solved_by sb
        JOIN 
            feedback fb ON sb.query_id = fb.query_id
        JOIN 
            customer c ON sb.UserId = c.UserID
        GROUP BY 
            sb.UserId;

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
exports.addrep = (req,res)=>{
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Handle POST request to '/queries'
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const formData = querystring.parse(body);
      const insertQuerySql = `update customer set userType="Customer Representative" where UserID=${formData.id};`;
       console.log(insertQuerySql);
      // First, insert into 'queries'
      connection.query(insertQuerySql, (err, result) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error inserting data into the queries table');
          console.error('Error inserting data into the queries table: ' + err);
        }else {
            if (result.affectedRows === 0) {
                // No rows affected, user ID does not exist
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('User ID not found');
            }else{
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('Query submitted successfully');
            }
        }
        });
    });
};
