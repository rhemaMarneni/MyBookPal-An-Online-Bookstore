const http = require('http');
const mysql = require('mysql2');
const port = 3000;
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
function updateCart(book_id, user_id, action) {
  if (!book_id || !user_id || !action || (action !== 'add' && action !== 'remove')) {
    console.error('Invalid parameters');
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
        // Here, you might want to log the error and handle it appropriately
        return;
      }

      // You can return a success message or log it as needed.
      console.log('Product added to the cart');
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
        // Handle the error appropriately if needed
        return;
      }

      if (result.affectedRows === 0) {
        // You can return an error message or log it as required
        console.log('Product not in the cart');
        return;
      }

      // You can return a success message or log it as needed.
      console.log('Product removed from the cart');

      connection.query(deleteQuery, [user_id, book_id], (err) => {
        if (err) {
          console.error('Error deleting from the cart: ' + err.stack);
          // Handle the error appropriately if needed
        }
      });
    });
  }
}


function updateBookQuantity(bookId, quantity, callback) {
  const updateQuery = `
    UPDATE BookListing
    SET Quantity = Quantity - ?
    WHERE BookID = ? AND Quantity >= ?;
  `;

  connection.query(updateQuery, [quantity, bookId, quantity], (err, result) => {
    if (err) {
      console.error('Error updating book quantity: ' + err.stack);
      return callback('Internal Server Error');
    }

    if (result.affectedRows === 1) {
      return callback(null, 'Book quantity updated');
    } else {
      return callback('Failed to update book quantity');
    }
  });
}

// Define the userWallets object globally
let userWallets = {};
function updateWallet(user_id, amount, action, callback) {
  if (!userWallets[user_id]) {
    userWallets[user_id] = 0; // Initialize the user's wallet if it doesn't exist
  }
  if (action === 'add') {
    userWallets[user_id] += amount; // Add to the user's wallet
  } else if (action === 'sub') {
    if (amount > userWallets[user_id]) {
      return callback('Insufficient wallet balance, please add balance to the wallet');
    }
    userWallets[user_id] -= amount; // Subtract from the user's wallet
  }
  const query = `
    UPDATE Wallet
    SET WalletBalance = ?
    WHERE UserID = ?
  `;
  connection.query(query, [userWallets[user_id], user_id], (err, result) => {
    if (err) {
      console.error('Error updating wallet: ' + err.stack);
      return callback('Internal Server Error');
    }
    if (result.affectedRows === 0) {
      return callback('User wallet not found');
    }
    return callback(null, 'Updated wallet for user');
  });
}

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

function getWalletBalance(userId, callback) {
  if (!userId || isNaN(userId)) {
    return callback('Invalid User ID');
  }

  const selectQuery = `
    SELECT WalletBalance from wallet where UserID = ?
  `;

  connection.query(selectQuery, [userId], (err, results) => {
    if (err) {
      return callback('Error querying the database');
    }

    if (results.length === 0) {
      return callback(`No wallet balance found for user ${userId}`);
    }

    const walletBalance = results[0].WalletBalance;
    return callback(null, walletBalance);
  });
}


function checkQuantity(bookId, quantity) {
  if (!bookId || isNaN(bookId) || !quantity || isNaN(quantity)) {
    console.error('Invalid parameters');
    return false; // Indicate that the quantity is not valid
  }

  const selectQuery = `
    SELECT * from BookListing where BookID = ? AND Quantity >= ?
  `;

  const results = connection.query(selectQuery, [bookId, quantity]);

  if (results.length > 0) {
    return true; // Quantity is available
  } else {
    return false; // Quantity is not available
  }
}


function computePrice(BookID, Quantity, callback) {
  if (!BookID || isNaN(BookID) || !Quantity || isNaN(Quantity)) {
    return callback('Invalid parameters');
  }

  const selectQuery = `
    SELECT Price, Quantity from BookListing where BookID = ? AND Quantity >= ?
  `;

  connection.query(selectQuery, [BookID, Quantity], (err, results) => {
    if (err) {
      return callback('Error querying the database');
    }

    if (results.length > 0) {
      const price = results[0].Price * Quantity;
      return callback(null, price);
    } else {
      return callback('Product not found or insufficient quantity');
    }
  });
}


function addToPurchaseHistory(UserID, BookID, Quantity, totalPrice, callback) {
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
        return callback(false); // Indicate an internal server error
      }
      if (result.affectedRows === 1) {
        return callback(true); // Indicate success
      } else {
        return callback(false); // Indicate failure
      }
    }
  );
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
      if (!checkQuantity(BookID, Quantity)) {
        return; 
      }
      // Calculate the total price for the products
      const totalPrice = computePrice(BookID, Quantity);
      if (totalPrice === 0) {
        return; 
      }
      // Check if the user has enough balance in their wallet
      const userWalletBalance = getWalletBalance(UserID);
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
  viewPurchaseHistory(req, res);
  purchaseProduct(req, res);
  //updateCart(BookID, UserID, action);
  //updateWallet(UserID, totalPrice,action);
  //getWalletBalance(UserID);
  //checkQuantity(bookId, quantity);
 // computePrice(BookID, Quantity);
  //addToPurchaseHistory(UserID, BookID, Quantity, totalPrice, callback);
  //updateBookQuantity(BookID, Quantity);
});

server.listen(port, () => {
  console.log(`Successfully started server on port ${port}.`);
});