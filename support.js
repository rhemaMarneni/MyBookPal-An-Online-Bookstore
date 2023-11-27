const http = require('http');
const mysql = require('mysql2');
const port = 6000;
const moment = require('moment');

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

//Function to get the user's wallet amount - Used when user intends to make a purchase
function getWalletBalance(req, res) {
    if (req.method === 'GET' && req.url.startsWith('/wallet_balance')) {
      const queryParameters = new URLSearchParams(req.url.split('?')[1]);
      const userId = queryParameters.get('id');
      if (!userId || isNaN(userId)) {
        res.statusCode = 400;
        res.end('Invalid User ID');
        return;
      }
      const selectQuery = `
        SELECT WalletBalance from wallet where UserID = ?
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
          res.end(`No wallet balance found for user ${userId}`);
        } else {
          const walletBalance = results[0].WalletBalance;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ balance: walletBalance }));
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
          } else {
            userWallets[user_id] -= amount; // Subtract from the user's wallet
          }
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
  
 //To view the purchase history of the user 
function viewPurchaseHistory(req, res) {
  if (req.method === 'GET' && req.url.startsWith('/purchase_history')) {
    const queryParameters = new URLSearchParams(req.url.split('?')[1]);
    const userId = queryParameters.get('id');
    if (!userId || isNaN(userId)) {
      res.statusCode = 400; // Bad Request
      res.end('Invalid User ID');
      return;
    }
    const selectQuery = `
      SELECT * from PurchaseHistory where UserID = ?
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
        res.end(`There are no previous order for user ${userId}`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(results));
      }
    });
  }
}

//Verify if the inventory has sufficient stock that user intends to make a purchase
function checkQuantity(req, res) {
  if (req.method === 'GET' && req.url.startsWith('/check_quantity')) {
    const queryParameters = new URLSearchParams(req.url.split('?')[1]);
    const bookId = queryParameters.get('book_id');
    const quantity = queryParameters.get('quantity');
    if (!bookId || isNaN(bookId) || !quantity || isNaN(quantity)) {
      res.statusCode = 400;
      res.end('Invalid parameters');
      return;
    }
    const selectQuery = `
      SELECT * from BookListing where BookID = ? AND Quantity >= ?
    `;

    connection.query(selectQuery, [bookId, quantity], (err, results) => {
      if (err) {
        console.error('Error querying the database: ' + err.stack);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }

      if (results.length > 0) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ available: true }));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ available: false }));
      }
    });
  }
}

//Computes and returns the final purchase value for the products that are being checked out
function computePrice(req, res) {
  if (req.method === 'GET' && req.url.startsWith('/compute_price')) {
    const queryParameters = new URLSearchParams(req.url.split('?')[1]);
    const bookId = queryParameters.get('book_id');
    const quantity = queryParameters.get('quantity');
    if (!bookId || isNaN(bookId) || !quantity || isNaN(quantity)) {
      res.statusCode = 400;
      res.end('Invalid parameters');
      return;
    }
    const selectQuery = `
      SELECT Price, Quantity from BookListing where BookID = ? AND Quantity >= ?
    `;

    connection.query(selectQuery, [bookId, quantity], (err, results) => {
      if (err) {
        console.error('Error querying the database: ' + err.stack);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }

      if (results.length > 0) {
        const price = results[0].Price * quantity;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ total_price: price }));
      } else {
        res.statusCode = 404; // Not Found
        res.end('Product not found or insufficient quantity');
      }
    });
  }
}

//Product is added to that user's purchase history once the purchase is successful
function addToPurchaseHistory(req, res) {
  if (req.method === 'POST' && req.url === '/add_to_purchase_history') {
    let requestBody = '';
    req.on('data', (data) => {
      requestBody += data;
    });
    req.on('end', () => {
      const { UserID, BookID, Quantity, totalPrice } = JSON.parse(requestBody);
      if (!UserID || !BookID || !Quantity || !totalPrice) {
        res.statusCode = 400; // Bad Request
        res.end('Invalid parameters');
        return;
      }
      // Get the current time in the format 'YYYY-MM-DD HH:MM:SS'
      const paymentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');

      const insertQuery = `
        INSERT INTO PurchaseHistory (UserID, Amount, PaymentDateTime, BookID, Quantity)
        VALUES (?, ?, ?, ?, ?)
      `;

      connection.query(
        insertQuery,
        [UserID, totalPrice, paymentDateTime, BookID, Quantity],
        (err, result) => {
          if (err) {
            console.error('Error inserting into PurchaseHistory: ' + err.stack);
            res.statusCode = 500; // Internal Server Error
            res.end('Error adding product to PurchaseHistory');
            return;
          }

          if (result.affectedRows === 1) {
            res.statusCode = 200; // OK
            res.end('Product added to PurchaseHistory');
          } else {
            res.statusCode = 500; // Internal Server Error
            res.end('Failed to add product to PurchaseHistory');
          }
        }
      );
    });
  }
}

//Book Quantity is reduced in the inventory for the selected products when purchase is successful
function updateBookQuantity(req, res) {
    if (req.method === 'PUT' && req.url === '/update_book_quantity') {
      let requestBody = '';
      req.on('data', (data) => {
        requestBody += data;
      });
  
      req.on('end', () => {
        const { bookId, quantity } = JSON.parse(requestBody);
  
        if (!bookId || !quantity || isNaN(quantity)) {
          res.statusCode = 400; // Bad Request
          res.end('Invalid parameters');
          return;
        }
  
        const updateQuery = `
          UPDATE BookListing
          SET Quantity = Quantity - ?
          WHERE BookID = ? AND Quantity >= ?;
        `;
  
        connection.query(updateQuery, [quantity, bookId, quantity], (err, result) => {
          if (err) {
            console.error('Error updating book quantity: ' + err.stack);
            res.statusCode = 500; // Internal Server Error
            res.end('Internal Server Error');
            return;
          }
  
          if (result.affectedRows === 1) {
            res.statusCode = 200; // OK
            res.end('Book quantity updated');
          } else {
            res.statusCode = 400; // Bad Request
            res.end('Failed to update book quantity');
          }
        });
      });
    }
}

function performPurchase(UserID, BookID, Quantity, totalPrice) {
  // Empty the user's cart
  const cartUpdateResult = updateCart(BookID, UserID, 'remove');
  // Deduct amount from the user's wallet
  const walletUpdateResult = updateWallet(UserID, totalPrice, 'sub');
  // Add the product to purchase history
  const updateBookListing = updateBookQuantity(BookID, Quantity);
  const historyUpdateResult = addToPurchaseHistory(UserID, BookID, Quantity, totalPrice);
  // Check if all actions were successful
  return cartUpdateResult && walletUpdateResult && updateBookListing &&  historyUpdateResult;
}

function purchaseProduct(req, res) {
  if (req.method === 'POST' && req.url === '/purchase_product') {
    let requestBody = '';
    req.on('data', (data) => {
      requestBody += data;
    });

    req.on('end', () => {
      const { UserID, BookID, Quantity } = JSON.parse(requestBody);
      if (!UserID || !BookID || !Quantity) {
        res.statusCode = 400; // Bad Request
        res.end('Invalid parameters');
        return;
      }
      // Check if the requested quantity is available in the BookListing
      if (!checkQuantity(req, res)) {
        return; 
      }
      // Calculate the total price for the products
      const totalPrice = computePrice(req, res, BookID, Quantity);
      if (totalPrice === null) {
        return; 
      }
      // Check if the user has enough balance in their wallet
      const userWalletBalance = getWalletBalance(req, res, UserID);
      if (userWalletBalance < totalPrice) {
        res.statusCode = 400; // Bad Request
        res.end('Insufficient wallet balance');
        return;
      }
      // Perform the purchase operation (Update tables and add to PurchaseHistory)
      const purchaseSuccess = performPurchase(UserID, BookID, Quantity, totalPrice);
      if (purchaseSuccess) {
        res.statusCode = 200;
        res.end(JSON.stringify({ message: 'Purchase successful' }));
      } else {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Purchase failed' }));
      }
    });
  }
}

const server = http.createServer((req, res) => {
  connectToDatabase();
  viewUserCart(req, res);
  updateCart(req, res);
  updateWallet(req, res);
  viewPurchaseHistory(req, res);
  getWalletBalance(req, res);
  checkQuantity(req, res);
  computePrice(req, res);
  addToPurchaseHistory(req, res);
  purchaseProduct(req, res);
  updateBookQuantity(req, res);
});

server.listen(port, () => {
  console.log(`Successfully started server on port ${port}.`);
});