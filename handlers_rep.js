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
    const indexPath = path.join(__dirname, 'public_rep', 'index.html');
    serveFile(res, indexPath, 'text/html');
};

// Function to serve static files
exports.serveStaticFiles = (req, res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    const fullPath = path.join(__dirname, 'public_rep', filePath);
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

// Function to get queries
exports.getQueries = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    const sql = 'SELECT * FROM queries';
    connection.query(sql, (err, results) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error fetching data from the database');
        } else {
            console.log("Inside Queries",results);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results));
        }
    });
};

// Function to post notifications
exports.postNotifications = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      const formData = querystring.parse(body);
      const userId = formData.userId; 
      const question = formData.question;
      const answer = formData.answer;
      const query_id = formData.query_id;
      const cust_rep_id = formData.cust_rep_id;
      console.log(userId);
      console.log(question);
      if (!userId || !question) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing parameters');
        return;
      }

      const faqData = {
        id: userId,
        question: question,
      };

      const sql = `
  INSERT INTO notifications (userid, question, answer,query_id) VALUES (${userId}, "${question}", "${answer}",${query_id});
  update query_history set answer="${answer}",status="Resolved" where query_id=${query_id};
  DELETE FROM queries WHERE query_id=${query_id}; insert into wait_approval(question, answer) values ("${question}","${answer}");
  insert into solved_by(UserId,query_id) values(${cust_rep_id},${query_id});
`;
console.log(sql);
connection.query(sql, (err, result) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error inserting data into the database');
          console.error('Error inserting data into the database: ' + err);
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Data inserted and delted from query successfully into notifications');
        }
      });
    });
};
exports.getNotifications = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    const sql = 'SELECT * FROM notifications';
    connection.query(sql, (err, results) => {
        console.log(results);
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error fetching data from the database');
        console.error('Error fetching data from the database: ' + err);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      }
    });
};

// Function to view history
exports.getViewHistory = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    const sql = 'SELECT * FROM query_history';
    connection.query(sql, (err, results) => {
        console.log(results);
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error fetching data from the database');
        console.error('Error fetching data from the database: ' + err);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      }
    });
    // Implementation for viewing history
    // Similar to your original GET '/view_history' logic
};

// Function to get customer details
exports.getCustomerDetails = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    const sql = 'SELECT * FROM customer where userType="customer"';
    connection.query(sql, (err, results) => {
        console.log(results);
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error fetching data from the database');
        console.error('Error fetching data from the database: ' + err);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      }
    });
    // Implementation for getting customer details
    // Similar to your original GET '/customer_details' logic
};


// Function to update customer
exports.updateCustomer = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    let body = '';
  req.on('data', chunk => {
      body += chunk.toString();
  });
  req.on('end', () => {
      const formData = JSON.parse(body);
      const userId = formData.userId;
      const updates = [];
      console.log(userId);
      // Constructing dynamic query based on provided fields
      for (const key in formData) {
          if (formData.hasOwnProperty(key) && key !== 'userId') {
              updates.push(`${key} = ${mysql.escape(formData[key])}`);
          }
      }

      if (updates.length > 0) {
          const sql = `UPDATE users SET ${updates.join(', ')} WHERE UserID = ${mysql.escape(userId)}`;
          console.log(sql);
          connection.query(sql, (err, result) => {
              if (err) {
                  res.writeHead(500, { 'Content-Type': 'text/plain' });
                  res.end('Error updating data in the database');
                  console.error('Error updating data in the database: ' + err);
              } else {
                  res.writeHead(200, { 'Content-Type': 'text/plain' });
                  res.end('User updated successfully');
              }
          });
      } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('No data provided for update');
      }
  });
  // Implementation for updating customer
    // Similar to your original POST '/update_customer' logic
};

// Function to get user details
exports.getUserDetails = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    let body = '';
  req.on('data', chunk => {
      body += chunk.toString();
  });
  req.on('end', () => {
      const formData = querystring.parse(body);
      const userId = formData.userId;
      const sql = `SELECT * FROM customer WHERE UserID = ${userId}`;
      console.log(sql);
      connection.query(sql, (err, results) => {
        console.log(results);
          if (err) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Error fetching user details from the database');
          } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(results[0]));
          }
      });
  });
  // Implementation for getting user details
    // Similar to your original GET '/get_user_details' logic
};


// Function to update user details
exports.updateUserDetails = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        const formData = querystring.parse(body);
        const userId = formData.userId;
        // Construct the SQL query based on which fields are provided
        let sql = 'UPDATE customer SET ';
        const updateFields = [];
        if (formData.firstName) {
            updateFields.push(`FirstName = '${formData.firstName}'`);
        }
        if (formData.lastName) {
            updateFields.push(`LastName = '${formData.lastName}'`);
        }
        if (formData.phoneNumber) {
          updateFields.push(`PhoneNumber = ${formData.phoneNumber}`);
      }
      if (formData.email) {
        updateFields.push(`Email = '${formData.email}'`);
    }
    if (formData.userAddress) {
      updateFields.push(`UserAddress = '${formData.userAddress}'`);
  }
  
        
        sql += updateFields.join(', ');
        sql += ` WHERE UserID = ${userId};`;
        console.log(sql);
        connection.query(sql, (err, result) => {
          // console.log(result.length);
          console.log(err);
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error updating user details in the database');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('User details updated successfully');
            }
        });
    });
    // Implementation for updating user details
    // Similar to your original PATCH '/update_user_details' logic
};

// Function to handle 404 Not Found
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
// exports.getStatisticsAndQueries = (req, res) => {
//     const userId = 1; // Replace with the actual user ID or retrieve from the request
//     const statsSql = `
//         SELECT 
//             AVG(f.serv_rating) AS avg_serv_rating, 
//             AVG(f.time_rating) AS avg_time_rating, 
//             SUM(f.solved) / COUNT(f.solved) * 100 AS solved_percentage
//         FROM 
//             solved_by s 
//         JOIN 
//             feedback f ON f.query_id = s.query_id 
//         WHERE 
//             s.UserId = ${mysql.escape(userId)};
//     `;
//     console.log(statsSql)
//     const querySql = `
//         SELECT 
//             f.serv_rating, f.time_rating, f.solved 
//         FROM 
//             solved_by s 
//         JOIN 
//             feedback f ON f.query_id = s.query_id 
//         WHERE 
//             s.UserId = ${mysql.escape(userId)} 
//         ORDER BY 
//             f.serv_rating DESC;
//     `;
//     console.log(querySql)
//     connection.query(`${statsSql}; ${querySql}`, (err, results) => {
//         if (err) {
//             res.writeHead(500, { 'Content-Type': 'text/plain' });
//             res.end('Error fetching data from the database');
//             console.error('Error fetching data from the database: ' + err);
//         } else {
//             const stats = results[0][0];
//             const queries = results[1];
//             res.writeHead(200, { 'Content-Type': 'application/json' });
//             res.end(JSON.stringify({ stats, queries }));
//         }
//     });
// };

exports.getStatisticsAndQueries = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    const userId = 1; // Replace with the actual user ID or retrieve from the request

    // First query for statistics
    const statsSql = `
        SELECT 
            AVG(f.serv_rating) AS avg_serv_rating, 
            AVG(f.time_rating) AS avg_time_rating, 
            SUM(f.solved) / COUNT(f.solved) * 100 AS solved_percentage
        FROM 
            solved_by s 
        JOIN 
            feedback f ON f.query_id = s.query_id 
        WHERE 
            s.UserId = ${mysql.escape(userId)};
    `;

    connection.query(statsSql, (err, statsResults) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error fetching statistics from the database');
            return; // Stop execution if there's an error
        }

        // Second query for detailed queries
        const querySql = `
            SELECT 
                f.serv_rating, f.time_rating, f.solved ,f.comment
            FROM 
                solved_by s 
            JOIN 
                feedback f ON f.query_id = s.query_id 
            WHERE 
                s.UserId = ${mysql.escape(userId)} 
            ORDER BY 
                f.serv_rating DESC;
        `;

        connection.query(querySql, (err, queryResults) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error fetching query details from the database');
                return;
            }
            if (queryResults.length == 0){
              res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('No Performance Recorded');
            }
            else{
              console.log("Results:",queryResults);
            // Send combined results
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ stats: statsResults[0], queries: queryResults }));
            }
            
        });
    });
};
