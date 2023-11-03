const http = require('http');
const mysql = require('mysql2');
const port = 3000;

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'heythere',
  database: 'project',
});

// Function to handle database connection
function connectToDatabase() {
  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database: ' + err.stack);
      return;
    }
    console.log('Connected to the database');
  });
}

// Function to view a user's cart
function viewUserCart(req, res) {
  if (req.method === 'GET' && req.url.startsWith('/view_cart')) {
    const queryParameters = new URLSearchParams(req.url.split('?')[1]);
    const userId = queryParameters.get('id');
    if (!userId || isNaN(userId)) {
      res.statusCode = 400; // Bad Request
      res.end('Invalid User ID');
      return;
    }

    const selectQuery = `
      SELECT C.*, BL.Title, BL.Price
      FROM Cart C
      JOIN BookListing BL ON C.BookID = BL.BookID
      WHERE C.UserID = ?
    `;

    connection.query(selectQuery, [userId], (err, results) => {
      if (err) {
        console.error('Error querying the database: ' + err.stack);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }

      if (results.length === 0) {
        res.statusCode = 404; // Not Found
        res.end(`Cart is empty for user_id ${userId}`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(results));
      }
    });
  }
}

// Function to update the cart
function updateCart(req, res) {
  if (req.method === 'POST' && req.url === '/update_cart') {
    let requestBody = '';
    req.on('data', (data) => {
      requestBody += data;
    });

    req.on('end', () => {
      const { book_id, user_id, action } = JSON.parse(requestBody);

      if (!book_id || !user_id || !action || (action !== 'add' && action !== 'remove')) {
        res.statusCode = 400; // Bad Request
        res.end('Invalid parameters');
        return;
      }

      if (action === 'add') {
        const updateQuery = `
          INSERT INTO Cart (UserID, BookID, Quantity)
          VALUES (?, ?, 1)
          ON DUPLICATE KEY UPDATE Quantity = Quantity + 1;
        `;

        connection.query(updateQuery, [user_id, book_id], (err) => {
          if (err) {
            console.error('Error updating the cart: ' + err.stack);
            res.statusCode = 500; 
            res.end('Error updating the cart');
            return;
          }

          res.statusCode = 200; // OK
          res.end('Product added to the cart');
        });
      } else if (action === 'remove') {
        const updateQuantityQuery = `
          UPDATE Cart
          SET Quantity = Quantity - 1
          WHERE UserID = ? AND BookID = ? AND Quantity > 0;
        `;

        const deleteQuery = `
          DELETE FROM Cart
          WHERE UserID = ? AND BookID = ? AND Quantity = 0;
        `;

        connection.query(updateQuantityQuery, [user_id, book_id], (err, result) => {
          if (err) {
            console.error('Error updating the cart: ' + err.stack);
            res.statusCode = 500; 
            res.end('Error updating the cart');
            return;
          }

          if (result.affectedRows === 0) {
            res.statusCode = 400; 
            res.end('Product not in the cart');
            return;
          }

          res.statusCode = 200; // OK
          res.end('Product removed from the cart');

          connection.query(deleteQuery, [user_id, book_id], (err) => {
            if (err) {
              console.error('Error deleting from the cart: ' + err.stack);
            }
          });
        });
      }
    });
  }
}

// Define the userWallets object globally
let userWallets = {};

function updateWallet(req, res) {
  if (req.method === 'PUT' && req.url === '/update_wallet') {
    let requestBody = '';
    req.on('data', (data) => {
      requestBody += data;
    });

    req.on('end', () => {
      const { user_id, amount, action } = JSON.parse(requestBody);

      if (!user_id || !amount || !action || (action !== 'add' && action !== 'sub')) {
        res.statusCode = 400; // Bad Request
        res.end('Invalid parameters');
        return;
      }

      if (!userWallets[user_id]) {
        userWallets[user_id] = 0; // Initialize the user's wallet if it doesn't exist
      }

      if (action === 'add') {
        userWallets[user_id] += amount; // Add to the user's wallet
      } else if (action === 'sub') {
        if (amount > userWallets[user_id]) {
          res.statusCode = 400; 
          res.end('Insufficient wallet balance, please add balance to the wallet');
          return;
        }
        userWallets[user_id] -= amount; // Subtract from the user's wallet
      }

      const query = `
        UPDATE Wallet
        SET WalletBalance = ?
        WHERE UserID = ?
      `;

      connection.query(
        query,
        [userWallets[user_id], user_id],
        (err, result) => {
          if (err) {
            console.error('Error updating wallet: ' + err.stack);
            res.statusCode = 500; 
            res.end('Internal Server Error');
            return;
          }

          if (result.affectedRows === 0) {
            res.statusCode = 404; 
            res.end('User wallet not found');
            return;
          }

          res.statusCode = 200; 
          res.end('Updated wallet for user');
          return;
        }
      );
    });
  }
}







const server = http.createServer((req, res) => {
  connectToDatabase();
  viewUserCart(req, res);
  updateCart(req, res);
  updateWallet(req, res);
});

server.listen(port, () => {
  console.log(`Successfully started server on port ${port}.`);
});
