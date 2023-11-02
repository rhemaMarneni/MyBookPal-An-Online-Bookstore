const http = require('http');
const mysql = require('mysql2');
const url = require('url');
const crypto = require('crypto');

const port = 3000;

// Create a connection to your MySQL database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'libraryManagement',
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database: ' + err.stack);
    return;
  }
  console.log('Connected to the database');
});

function generateUniqueKeyCode() {
    let keyCode;
    do {
      keyCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    } while (!isKeyCodeUnique(keyCode));
    return keyCode;
  }
  
  function isKeyCodeUnique(keyCode) {
    return new Promise((resolve, reject) => {
      connection.query('SELECT COUNT(*) AS count FROM BookLending WHERE keyCode = ?', [keyCode], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results[0].count === 0);
        }
      });
    });
  }

  function isKeyCodeValid(providedKeyCode, lendingResults) {
    const matchingKeyCode = lendingResults.find((item) => item.keyCode === providedKeyCode);
    return !!matchingKeyCode;
  }

const server = http.createServer((req, res) => {
    const reqUrl = url.parse(req.url, true);
    if (req.url === '/books/availableLending' && req.method === 'GET') {
        const query = 'SELECT * FROM BookListing WHERE Book_condition = ? AND Quantity > 0';
        connection.query(query, ['old'], (err, results) => {
          if (err) {
            console.error('Error querying the database: ' + err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(results));
        });
      } 
    else if (req.method === 'POST' && reqUrl.pathname.startsWith('/books/borrow')) {
      //const bookID = parseInt(reqUrl.pathname.replace('/books/borrow', ''));
      // Check if the book with the given BookID exists and has a 'Book_condition' of 'old'
      const queryParams = new URLSearchParams(reqUrl.query);
      const Title = queryParams.get('Title');
      connection.query(
        'SELECT * FROM BookListing WHERE Title = ? AND Book_condition = ? AND Quantity > 0',
        [Title, 'old'],
        (err, results) => {
          if (err) {
            console.error('Error querying the database: ' + err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
            return;
          }

          if (results.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Book not found or not available for borrowing' }));
            return;
          }

          // Insert a new record into the BookLending table
          const lendingStartDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const lendingEndDate = new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ');
          const authenticatedUserId = 1;
          const keyCode = generateUniqueKeyCode();

          connection.query(
            'INSERT INTO BookLending (BorrowerUserID, BookID, LendingStartDate, LendingEndDate, LateFee, keyCode) VALUES (?, ?, ?, ?, ?, ?)',
            [authenticatedUserId, results[0].BookID, lendingStartDate, lendingEndDate, 0, keyCode],
            (err) => {
              if (err) {
                console.error('Error inserting into the BookLending table: ' + err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error' }));
                return;
              }

              // Update the quantity in the BookListing table
              connection.query(
                'UPDATE BookListing SET Quantity = Quantity - 1 WHERE BookID = ?',
                [results[0].BookID],
                (err) => {
                  if (err) {
                    console.error('Error updating the quantity in the BookListing table: ' + err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal Server Error' }));
                    return;
                  }

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ message: 'Book borrowed successfully', keyCode: keyCode }));
                }
              );
            }
          );
        }
      );
    } 
    else if (req.method === 'POST' && reqUrl.pathname.startsWith('/books/return')) {
        //const bookID = parseInt(reqUrl.pathname.replace('/books/return/', ''));
        const queryParams = new URLSearchParams(reqUrl.query);
        const Title = queryParams.get('Title');
        //const Book_condition = queryParams.get('Book_condition');

        // Check if the book with the given BookID exists and is currently lent
        connection.query(
          'SELECT * FROM BookLending WHERE BookID = (SELECT BookID FROM BookListing WHERE Title = ? AND Book_Condition = ?) AND LendingStartDate <= CURDATE() AND BorrowerUserID = 1',
          [Title, 'old'],
          async (err, lendingResults) => {
            if (err) {
              console.error('Error querying the BookLending table: ' + err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Internal Server Error' }));
              return;
            }
  
            if (lendingResults.length === 0) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Book not found or not eligible for return' }));
              return;
            }
  
            // Parse the request body to get the provided keyCode
            let requestBody = '';
            req.on('data', (chunk) => {
              requestBody += chunk;
            });
  
            req.on('end', async () => {
              const { keyCode } = JSON.parse(requestBody);
  
                if (!keyCode || !isKeyCodeValid(keyCode, lendingResults)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid or missing keyCode. Try again.' }));
                    return;
                }
  
              // Calculate late fee
              const lendingEndDate = new Date(lendingResults[0].LendingEndDate);
              const now = new Date();
              const timeDifference = now - lendingEndDate;
              const daysLate = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
              let lateFee = daysLate * 5; // $5 late fee per day
              if(timeDifference < 0){
                lateFee = 0;
              }
  
              // Update late fee in BookLending table
              connection.query(
                'UPDATE BookLending SET LateFee = ? WHERE BookID = ?',
                [lateFee, lendingResults[0].BookID],
                (err) => {
                  if (err) {
                    console.error('Error updating the late fee in the BookLending table: ' + err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal Server Error' }));
                    return;
                  }
  
                  // Update the quantity in the BookListing table
                  connection.query(
                    'UPDATE BookListing SET Quantity = Quantity + 1 WHERE BookID = ?',
                    [lendingResults[0].BookID],
                    (err) => {
                      if (err) {
                        console.error('Error updating the quantity in the BookListing table: ' + err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Internal Server Error' }));
                        return;
                      }
  
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ message: 'Book returned successfully', lateFee: lateFee }));
                    }
                  );
                }
              );
            });
          }
        ); 
    } 
    else if (req.method === 'GET' && reqUrl.pathname === '/books/borrowed') {
        const userID = 1; // Replace with the actual UserID of the user

        // Query the database to retrieve books borrowed by the user
        connection.query(
        'SELECT bl.Title, bl.Author, bl.Genre, bl.Book_condition, bll.LendingStartDate, bll.LendingEndDate, bll.LateFee, bll.keyCode FROM BookListing bl ' +
        'INNER JOIN BookLending bll ON bl.BookID = bll.BookID ' +
        'WHERE bll.BorrowerUserID = ?',
        [userID],
        (err, results) => {
            if (err) {
            console.error('Error querying the database: ' + err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
            return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results));
        }
        );
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Start the server
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
  
  // Close the database connection on server shutdown
process.on('SIGINT', () => {
    connection.end((err) => {
        if (err) console.error('Error closing the database connection:', err);
        process.exit();
    });
});
  