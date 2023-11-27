const http = require('http');
const mysql = require('mysql2');
const port = 3000;
const moment = require('moment');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '-',
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

//Function to update the products in the cart - called when user wants to add/delete the products in cart or when the user checksout the cart
function updateCart(book_id, user_id, action) {
  console.log(`Updating cart for book_id: ${book_id}, user_id: ${user_id}, action: ${action}`);
  return new Promise((resolve, reject) => {
    if (!book_id || !user_id || !action || (action !== 'add' && action !== 'remove')) {
      console.error('Invalid parameters for updating cart');
      reject({ statusCode: 400, message: 'Invalid parameters' });
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
          reject({ statusCode: 500, message: 'Error updating the cart' });
          return;
        }

        console.log('Product added to the cart');
        resolve({ statusCode: 200, message: 'Product added to the cart' });
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
          reject({ statusCode: 500, message: 'Error updating the cart' });
          return;
        }

        if (result.affectedRows === 0) {
          console.log('Product not in the cart');
          reject({ statusCode: 400, message: 'Product not in the cart' });
          return;
        }

        console.log('Product removed from the cart');
        resolve({ statusCode: 200, message: 'Product removed from the cart' });

        connection.query(deleteQuery, [user_id, book_id], (err) => {
          if (err) {
            console.error('Error deleting from the cart: ' + err.stack);
          }
        });
      });
    }
  });
}

//Function to update the wallet value of the user - called when the user adds the amount or makes a purchase
const userWallets = {}
function updateWallet(user_id, amount, action) {
  console.log(`Updating wallet for user_id: ${user_id}, amount: ${amount}, action: ${action}`);
  return new Promise((resolve, reject) => {
    if (!user_id || !amount || !action || (action !== 'add' && action !== 'sub')) {
      console.error('Invalid parameters for updating wallet');
      reject({ statusCode: 400, message: 'Invalid parameters' });
      return;
    }

    // Fetch the current wallet balance from the database
    connection.query('SELECT WalletBalance FROM Wallet WHERE UserID = ?', [user_id], (err, results) => {
      if (err) {
        console.error('Error fetching wallet balance: ' + err.stack);
        reject({ statusCode: 500, message: 'Error fetching wallet balance' });
        return;
      }

      if (results.length === 0) {
        console.log('User wallet not found');
        reject({ statusCode: 404, message: 'User wallet not found' });
        return;
      }

      let currentBalance = results[0].WalletBalance;
      userWallets[user_id] = currentBalance; // Synchronize with the database

      if (action === 'add') {
        userWallets[user_id] += amount;
      } else if (action === 'sub') {
        if (amount > userWallets[user_id]) {
          console.log('Insufficient wallet balance, please add balance to the wallet');
          reject({ statusCode: 400, message: 'Insufficient wallet balance, please add balance to the wallet' });
          return;
        }
        userWallets[user_id] -= amount;
      }

      // Update the wallet balance in the database
      connection.query(
        'UPDATE Wallet SET WalletBalance = ? WHERE UserID = ?',
        [userWallets[user_id], user_id],
        (err, result) => {
          if (err) {
            console.error('Error updating wallet: ' + err.stack);
            reject({ statusCode: 500, message: 'Internal Server Error' });
            return;
          }

          if (result.affectedRows === 0) {
            console.log('User wallet not found');
            reject({ statusCode: 404, message: 'User wallet not found' });
            return;
          }

          console.log('Wallet updated successfully');
          resolve({ statusCode: 200, message: 'Updated wallet for user' });
        }
      );
    });
  });
}

//Function to update the book quantity in the inventory table to reduce the quantity after the user's purchase is successful.  
function updateBookQuantity(bookId, quantity) {
  console.log(`Updating book quantity for bookId: ${bookId}, quantity: ${quantity}`);
  return new Promise((resolve, reject) => {
    if (!bookId || !quantity || isNaN(quantity)) {
      console.error('Invalid parameters for updating book quantity');
      reject({ statusCode: 400, message: 'Invalid parameters' });
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
        reject({ statusCode: 500, message: 'Internal Server Error' });
        return;
      }

      if (result.affectedRows === 1) {
        console.log('Book quantity updated successfully');
        resolve({ statusCode: 200, message: 'Book quantity updated' });
      } else {
        console.log('Failed to update book quantity');
        reject({ statusCode: 400, message: 'Failed to update book quantity' });
      }
    });
  });
}

//Function is called after the user's purchase is succesful and it is added to their purchase history.
function addToPurchaseHistory(UserID, BookID, Quantity, totalPrice) {
  return new Promise((resolve, reject) => {
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
          reject({ statusCode: 500, message: 'Internal Server Error' });
          return;
        }

        if (result.affectedRows === 1) {
          resolve({ statusCode: 200, message: 'Product added to PurchaseHistory' });
        } else {
          reject({ statusCode: 500, message: 'Failed to add product to PurchaseHistory' });
        }
      }
    );
  });
}

//Function is called once the user qualifies certain checks and to make his purchase successful.
function performPurchase(UserID, BookID, Quantity, totalPrice) {
  console.log(`Performing purchase for UserID: ${UserID}, BookID: ${BookID}, Quantity: ${Quantity}, totalPrice: ${totalPrice}`);
  return new Promise((resolve, reject) => {
    connection.beginTransaction(err => {
      if (err) {
        console.error('Error starting transaction: ' + err.stack);
        reject({ statusCode: 500, message: 'Error starting transaction', error: err });
        return;
      }

      updateCart(BookID, UserID, 'remove')
        .then(cartResult => {
          console.log('Cart update result:', cartResult);
          return updateWallet(UserID, totalPrice, 'sub');
        })
        .then(walletResult => {
          console.log('Wallet update result:', walletResult);
          return updateBookQuantity(BookID, Quantity);
        })
        .then(bookQuantityResult => {
          console.log('Book quantity update result:', bookQuantityResult);
          return addToPurchaseHistory(UserID, BookID, Quantity, totalPrice);
        })
        .then(purchaseHistoryResult => {
          console.log('Purchase history update result:', purchaseHistoryResult);
          connection.commit(err => {
            if (err) {
              connection.rollback(() => reject({ statusCode: 500, message: 'Error committing transaction', error: err }));
            } else {
              console.log('Purchase completed successfully');
              resolve({
                statusCode: 200,
                message: 'Purchase completed successfully',
                // Additional details if needed
              });
            }
          });
        })
        .catch(error => {
          connection.rollback(() => {
            console.error('Error during purchase: ' + error);
            reject({ statusCode: 500, message: 'Error during purchase', error });
          });
        });
    });
  });
}

//Verify if the inventory has sufficient stock that user intends to make a purchase
function checkQuantity(bookId, quantity) {
  return new Promise((resolve, reject) => {
    console.log('Checking quantity for BookID:', bookId, 'Quantity:', quantity);
    const selectQuery = 'SELECT * from BookListing where BookID = ? AND Quantity >= ?';
    connection.query(selectQuery, [bookId, quantity], (err, results) => {
      if (err) {
        console.error('Error querying the database: ' + err.stack);
        reject({ statusCode: 500, message: 'Internal Server Error' });
        return;
      }
      console.log('Check Quantity results:', results);
      const available = results.length > 0;
      resolve({ available });
      if (!available) {
        console.log(`Insufficient quantity for BookID ${bookId}`);
      }
    });
  });
}

//Computes and returns the final purchase value for the products that are being checked out
function computePrice(bookId, quantity) {
  return new Promise((resolve, reject) => {
    console.log('Computing price for BookID:', bookId, 'Quantity:', quantity);

    const selectQuery = 'SELECT Price, Quantity from BookListing where BookID = ? AND Quantity >= ?';

    connection.query(selectQuery, [bookId, quantity], (err, results) => {
      if (err) {
        console.error('Error querying the database: ' + err.stack);
        reject({ statusCode: 500, message: 'Internal Server Error' });
        return;
      }

      console.log('Compute Price results:', results);

      if (results.length > 0) {
        const price = results[0].Price * quantity;
        console.log('Computed Price:', price);
        resolve({ total_price: price });
      } else {
        console.log(`Product not found or insufficient quantity for BookID ${bookId}`);
        reject({ statusCode: 404, message: 'Product not found or insufficient quantity' });
      }
    });
  });
}

//Function to get the user's wallet amount - Used when user intends to make a purchase
function getWalletBalance(userId) {
  return new Promise((resolve, reject) => {
    console.log('Fetching wallet balance for UserID:', userId);
    const selectQuery = 'SELECT WalletBalance FROM wallet WHERE UserID = ?';
    connection.query(selectQuery, [userId], (err, results) => {
      if (err) {
        console.error('Error querying the database: ' + err.stack);
        reject({ statusCode: 500, message: 'Internal Server Error' });
        return;
      }

      console.log('Wallet balance query results:', results);

      if (results[0]) {
        const walletBalance = results[0].WalletBalance;
        console.log('Wallet balance for UserID', userId, ':', walletBalance);
        resolve({ balance: walletBalance });
      } else {
        console.log(`No wallet balance found for user ${userId}`);
        reject({ statusCode: 404, message: `No wallet balance found for user ${userId}` });
      }
    });
  });
}

//Function called when a http request is initiated to checkout from the cart
function purchaseProduct(req, res) {
  console.log('Received a purchase request');
  let requestBody = '';

  req.on('data', (data) => {
    requestBody += data;
  });

  req.on('end', () => {
    let parsedBody;

    try {
      parsedBody = JSON.parse(requestBody);
      console.log('Request body parsed:', parsedBody);
    } catch (error) {
      console.error('Error parsing request body:', error);
      res.statusCode = 400;
      res.end('Invalid JSON format in request body');
      return;
    }

    // Check if the request body is an array
    if (!Array.isArray(parsedBody)) {
      res.statusCode = 400;
      res.end('Invalid JSON format. Expecting an array of products.');
      return;
    }

    let totalPurchaseValue = 0; // Variable to store the total purchase value

    const purchasePromises = parsedBody.map((product) => {
      const { UserID, BookID, Quantity } = product;

      return checkQuantity(BookID, Quantity)
        .then(() => computePrice(BookID, Quantity))
        .then((result) => {
          totalPurchaseValue += result.total_price; // Accumulate total purchase value
          return { UserID, BookID, Quantity, totalPrice: result.total_price }; // Include totalPrice in the resolved object
        });
    });

    let products; // Define products variable in the outer scope

    Promise.all(purchasePromises)
      .then((resolvedProducts) => {
        products = resolvedProducts; // Assign to outer scope variable
        return getWalletBalance(products[0].UserID, totalPurchaseValue);
      })
      .then((userWalletBalance) => {
        console.log('User wallet balance:', userWalletBalance);
        if (userWalletBalance.balance < totalPurchaseValue) {
          console.log('Insufficient wallet balance');
          throw { statusCode: 400, message: 'Insufficient wallet balance' };
        }

        // Now proceed with the individual product purchases
        const productPurchasePromises = products.map((product) => {
          const { UserID, BookID, Quantity, totalPrice } = product;

          return performPurchase(UserID, BookID, Quantity, totalPrice);
        });

        return Promise.all(productPurchasePromises);
      })
      .then(() => {
        console.log('All purchases successful');
        res.statusCode = 200;
        res.end('All purchases successful');
      })
      .catch((error) => {
        console.error('Error during purchases:', error);
        res.statusCode = error.statusCode || 500;
        res.end(JSON.stringify({ error: error.message || 'Internal Server Error' }));
      });
  });
}

// Function to view a user's cart
function viewUserCart(req, res) {
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

  new Promise((resolve, reject) => {
    connection.query(selectQuery, [userId], (err, results) => {
      if (err) {
        console.error('Error querying the database: ' + err.stack);
        reject(err);
        return;
      }

      resolve(results);
    });
  })
    .then((results) => {
      if (results.length === 0) {
        res.statusCode = 404; // Not Found
        res.end(`Cart is empty for user_id ${userId}`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(results));
      }
    })
    .catch((error) => {
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
}

// Function called when the user wants to check his past purchase history
function viewPurchaseHistory(req, res) {
  if (req.method === 'GET' && req.url.startsWith('/purchase_history')) {
    const queryParameters = new URLSearchParams(req.url.split('?')[1]);
    const userId = queryParameters.get('id');

    if (!userId || isNaN(userId)) {
      res.statusCode = 400; // Bad Request
      res.end('Invalid User ID');
      return;
    }

    const selectQuery = 'SELECT * from PurchaseHistory where UserID = ?';

    new Promise((resolve, reject) => {
      connection.query(selectQuery, [userId], (err, results) => {
        if (err) {
          console.error('Error querying the database: ' + err.stack);
          reject(err);
          return;
        }

        resolve(results);
      });
    })
      .then((results) => {
        if (results.length === 0) {
          res.statusCode = 404; // Not Found
          res.end(`There are no previous orders for user ${userId}`);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(results));
        }
      })
      .catch((error) => {
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
  }
}

const server = http.createServer((req, res) => {
  console.log(`Received request: ${req.method} ${req.url}`);

  if (req.method === 'GET' && req.url.startsWith('/view_cart')) {
    viewUserCart(req, res);
  } else if (req.method === 'POST' && req.url.startsWith('/purchase_product')) {
    purchaseProduct(req, res);
  } else if (req.method === 'GET' && req.url.startsWith('/purchase_history')) {
    viewPurchaseHistory(req, res);
  } 
  else {
    console.log('Invalid request endpoint or method');
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`Successfully started server on port ${port}.`);
});
connectToDatabase();