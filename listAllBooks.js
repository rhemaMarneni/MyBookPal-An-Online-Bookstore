const http = require('http');
const mysql = require('mysql2');

const port = 3000;

// Create a connection to your MySQL database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
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
const server = http.createServer((req, res) => {

  //localhost:3000/books
  if (req.method === 'GET' && req.url === '/books') {
    const selectQuery = 'SELECT * FROM BookListing'
    connection.query(selectQuery, (err, results) => {
      if (err) {
        console.error('Error querying the database: ' + err.stack);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;

      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(results));

    });
  }



  //'localhost:3000/books/search?keyword=man
  else if (req.method === 'GET' && req.url.startsWith('/books/search')) {

    const userKeyword = req.url.split('?')[1]?.split('=')[1];
    const searchQuery = `
    SELECT * FROM BookListing
    WHERE Title LIKE ? OR Author LIKE ? OR Book_description LIKE ?;
  `;
    const keywordParam = `%${userKeyword}%`;
    // console.log(keywordParam)
    connection.query(searchQuery, [keywordParam, keywordParam, keywordParam], (err, results) => {
      if (err) {
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      if (results.length === 0) {
        res.statusCode = 404;
        res.end('No matching books found');
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(results));
      }
    });
  }



  //'localhost:3000/books/order?price=<10,order=low-High'
  //'localhost:3000/books/order?price=<10 -> default order high-low
  else if (req.method === 'GET' && req.url.startsWith('/books/order')) {

    const features = req.url.split('?')[1]?.split(',')
    let priceFeatures = features[0].split('=').pop();
    let orderFeatures = NaN;
    if (features.length > 1) {
      orderFeatures = features[1].split('=')[1]?.split('-');
    }
    let operator = decodeURIComponent(priceFeatures.slice(0, 3));
    let value = parseInt(priceFeatures.slice(3));
    // console.log('operator: ', operator)
    // console.log('value: ', value)
    let selectQuery = 'SELECT * FROM  BookListing WHERE PRICE '
    selectQuery += operator
    selectQuery += ' '
    selectQuery += parseInt(value)
    selectQuery += ' ORDER BY'
    // console.log(selectQuery)

    if (orderFeatures[0] === 'low') {
      selectQuery += ' Price ASC'
    } else {
      selectQuery += ' Price DESC'
    }
    selectQuery += ';'
    // console.log(selectQuery)
    connection.query(selectQuery, (err, results) => {
      if (err) {
        console.error('Error querying the database: ' + err.stack);
        res.statusCode = 500
        res.end('Internal Server Error');
        return;
      }
      if (results.length === 0) {
        res.statusCode = 404;
        res.end('No matching books found');
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(results));
      }
    });
  }

  //'localhost:3000/books/filter?feature=feature1,feature2&price=<50,order=low-High'
  //'localhost:3000/books/filter?feature=feature1,feature2&price=<50' -> default order High-low
  //'localhost:3000/books/filter?feature=feature1,feature2 -> show all books with the given filters
  else if (req.method === 'GET' && req.url.startsWith('/books/filter')) {
    let selectQuery;
    if (req.url.includes('&')) {
      let params = req.url.split('?')[1]?.split('&')
      // console.log(params)
      let features = params[0].split('=')[1]?.split(',');
      // console.log(features)

      let sorting = params[1].split(',')
      // console.log(sorting)
      let priceFeatures = sorting[0].split('=').pop();
      let orderFeatures = NaN;
      if (sorting.length > 1) {
        orderFeatures = sorting[1].split('=')[1]?.split('-');
      }
      let operator = decodeURIComponent(priceFeatures.slice(0, 3));
      let value = parseInt(priceFeatures.slice(3));
      // console.log('operator: ', operator)
      // console.log('value: ', value)

      selectQuery = 'SELECT * FROM BookListing WHERE';
      if (features && features.length > 0) {
        selectQuery += ' ';
        features.forEach((feature, index) => {
          if (index > 0) {
            selectQuery += ' OR ';
          }
          selectQuery += `(Author = '${feature}' OR Book_condition = '${feature}' OR Genre = '${feature}')`;
        });
        selectQuery += ' AND Price ';
      }

      selectQuery += operator
      selectQuery += ' '
      selectQuery += parseInt(value)

      selectQuery += ' ORDER BY'
      // console.log(selectQuery)

      if (orderFeatures[0] === 'low') {
        selectQuery += ' Price ASC'
      } else {
        selectQuery += ' Price DESC'
      }
      selectQuery += ';'

    } else {
      let features = req.url.split('=')[1]?.split(',');
      // console.log(features)
      selectQuery = 'SELECT * FROM BookListing WHERE';
      if (features && features.length > 0) {
        selectQuery += ' ';
        features.forEach((feature, index) => {
          if (index > 0) {
            selectQuery += ' OR ';
          }
          selectQuery += `(Author = '${feature}' OR Book_condition = '${feature}' OR Genre = '${feature}')`;
        });
        selectQuery += ';';
      }
    }
    // console.log(selectQuery);

    connection.query(selectQuery, (err, results) => {
      if (err) {
        console.error('Error querying the database: ' + err.stack);
        res.statusCode = 500
        res.end('Internal Server Error');
        return;
      }
      if (results.length === 0) {
        res.statusCode = 404;
        res.end('No matching books found');
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(results));
      }
    });

  }

  //'localhost:3000/books/{id}
  else if (req.method === 'GET' && req.url.startsWith('/books/')) {
    const bookId = parseInt(req.url.split('/').pop());
    if (isNaN(bookId)) {
      res.statusCode = 400;
      res.end('Invalid Book ID');
      return;
    }

    const selectQuery = 'SELECT * FROM BookListing WHERE BookID = ?';
    connection.query(selectQuery, [bookId], (err, results) => {
      if (err) {
        console.error('Error querying the database: ' + err.stack);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      if (results.length === 0) {
        res.statusCode = 404;
        res.end('Book not found');
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(results[0]));
      }
    });
  }

  //localhost:3000/books/1
  else if (req.method === 'POST' && req.url.startsWith('/books/')) {
    const userId = parseInt(req.url.split('/').pop());
    // console.log(userId);
    const selectQuery = `SELECT is_admin FROM CustomerRepresentative WHERE user_id = ?`;
    connection.query(selectQuery, [userId], (selecterror, results) => {
      if (selecterror) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          error: 'Database error.'
        }));
      } else if (results.length === 1 && results[0].is_admin === 1) {
        let data = '';

        req.on('data', (chunk) => {
          data += chunk;
        });

        req.on('end', () => {
          try {
            const newBook = JSON.parse(data);
            const insertQuery = 'INSERT INTO BookListing (Title, Author, Book_condition, Price, Genre, Book_description, Quantity, Auction, Photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

            connection.query(
              insertQuery,
              [
                newBook.Title,
                newBook.Author,
                newBook.Book_condition,
                newBook.Price,
                newBook.Genre,
                newBook.Book_description,
                newBook.Quantity,
                newBook.Auction,
                newBook.Photos,
              ],
              (inserterror) => {
                if (inserterror) {
                  res.writeHead(500, {
                    'Content-Type': 'application/json'
                  });
                  res.end(JSON.stringify({
                    error: 'Book Insertion failed.'
                  }));
                } else {
                  res.writeHead(200, {
                    'Content-Type': 'application/json'
                  });
                  res.end(JSON.stringify({
                    message: 'Book added successfully.'
                  }));
                }
              }
            );
          } catch (e) {
            res.statusCode = 400;
            res.end('Malformed JSON');
          }

        });
      } else {
        res.writeHead(403, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          error: 'Permission denied. User is not an admin.'
        }));
      }
    });
  }

  // UPDATE OPERATIONS
  else if (req.method === 'PATCH' && req.url.startsWith('/updatebook')) {
    const userDetails = req.url.split('?')[1]?.split('&');
    // console.log(userDetails)
    const bookId = parseInt(userDetails[1].split('=')[1])
    const userId = parseInt(userDetails[0].split('=')[1])
    // console.log(userId)
    // console.log(bookId)
    if (isNaN(bookId)) {
      res.statusCode = 400;
      res.end('Invalid Book ID');
      return;
    }
    const checkQuery = `SELECT * FROM BookListing Where BookId =?`
    connection.query(checkQuery, [bookId], (checkerr, checkresult) => {
      if (checkerr) {
        console.error('Error querying the database: ' + err.stack);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      if (checkresult.length === 0) {
        res.statusCode = 404;
        res.end('Book not found');
      } else {
        const selectQuery = `SELECT is_admin FROM CustomerRepresentative WHERE user_id = ?`;
        connection.query(selectQuery, [userId], (selecterror, results) => {
          if (selecterror) {
            res.writeHead(500, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              error: 'Database error.'
            }));
          } else if (results.length === 1 && results[0].is_admin === 1) {
            let data = '';

            req.on('data', (chunk) => {
              data += chunk;
            });

            req.on('end', () => {
              try {
                const updateData = JSON.parse(data)
                let updateQuery = 'UPDATE BookListing SET ';
                const updateParams = [];

                for (const key in updateData) {
                  updateQuery += `${key} = ?, `;
                  updateParams.push(updateData[key]);
                }

                // Remove the trailing comma and space
                updateQuery = updateQuery.slice(0, -2);

                updateQuery += ' WHERE BookID = ?';
                updateParams.push(bookId);
                connection.query(updateQuery, updateParams, (updateerr) => {
                  if (updateerr) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({
                      error: 'Book update failed.'
                    }));
                  } else {
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      message: 'Book updated successfully.'
                    }));
                  }
                });
              } catch (e) {
                res.statusCode = 400;
                res.end('Malformed JSON');
              }

            });
          } else {
            res.writeHead(403, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              error: 'Permission denied. User is not an admin.'
            }));
          }
        });
      }
    });
  }

  //DELETE OPERATIONS
  //DELETE OPERATIONS
  //http://localhost:3000/deletebook?userId=<UserID>&bookId=<BookID>
  else if (req.method === 'DELETE' && req.url.startsWith('/deletebook')) {
    const userDetails = req.url.split('?')[1]?.split('&');
    // console.log(userDetails)
    const bookId = parseInt(userDetails[1].split('=')[1])
    const userId = parseInt(userDetails[0].split('=')[1])
    // console.log(userId)
    // console.log(bookId)

    if (isNaN(bookId)) {
      res.statusCode = 400;
      res.end('Invalid Book ID');
      return;
    }
    const checkQuery = `SELECT * FROM BookListing Where BookId =?`
    connection.query(checkQuery, [bookId], (checkerr, checkresult) => {
      if (checkerr) {
        console.error('Error querying the database: ' + err.stack);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      if (checkresult.length === 0) {
        res.statusCode = 404;
        res.end('Book not found');
      } else {
        const selectQuery = `SELECT is_admin FROM CustomerRepresentative WHERE user_id = ?`;
        connection.query(selectQuery, [userId], (error, results) => {
          if (error) {
            res.writeHead(500, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              error: 'Database error.'
            }));
          } else if (results.length === 1 && results[0].is_admin === 1) {
            const deleteQuery = `DELETE FROM BookListing WHERE BookID = ?`
            connection.query(deleteQuery, [bookId], (error, foundBook) => {
              if (error) {
                res.writeHead(500, {
                  'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                  error: 'Book deletion failed.'
                }));
              }
              if (foundBook.length === 0) {
                res.statusCode = 404;
                res.end('Book not found');
              } else {
                res.writeHead(200, {
                  'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                  message: 'Book deleted successfully.'
                }));
              }

            });

          } else {
            res.writeHead(403, {
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
              error: 'Permission denied. User is not an admin.'
            }));
          }
        });
      }
    });
  } else if (req.method === 'DELETE' && req.url.startsWith('/all/')) {
    const userId = parseInt(req.url.split('/').pop());
    const selectQuery = `SELECT is_admin FROM CustomerRepresentative WHERE user_id = ?`;
    connection.query(selectQuery, [userId], (error, results) => {
      if (error) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          error: 'Database error.'
        }));
      } else if (results.length === 1 && results[0].is_admin === 1) {
        const deleteQuery = `DELETE FROM BookListing;`
        connection.query(deleteQuery, (error, results) => {
          if (error) {
            res.statusCode = 500;
            res.end('Internal Server Error');
            return;
          }
          res.statusCode = 200;
          res.end('ALL Books deleted');
        });
      } else {
        res.writeHead(403, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          error: 'Permission denied. User is not an admin.'
        }));
      }
    });
  }

});
server.listen(port, () => {
  console.log(`Successfully started server on port ${port}.`);
});