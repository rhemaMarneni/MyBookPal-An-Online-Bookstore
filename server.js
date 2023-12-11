//start of the init server
const http = require('http');
const url = require('url');
const mysql = require('mysql2');
const fs = require('fs'); // Add this line
const path = require('path'); // Add this line
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
let user_id = 0;

// JWT Secret Key
const JWT_SECRET_KEY = 'TRaKtr75iER4atLU';

const { listAvailableBooks, borrowBooks, returnBooks, borrowedBooks } = require('./bookLending.js');
const { checkReservedBooks, newSubscription, cancelSubscription, getSubscriptions, 
  getNotificationPreferences, updateNotificationPreferences,fetchOutOfStockBooks  } = require('./notificationRequests.js');
const { getAllBooks, searchBooks, orderBooks, filterBooks, getBook,
 newBook, updateBook, deleteBook, deleteAll, sortBooks } = require('./listAllBooksServer.js');
const { handleRegister, handleUpdateCustomer, handleGetAllCustomers, 
 handleGetCustomer, handleGetBooks, getUserIDFromDatabase } = require('./user_auth_jwt.js');
const { createBookListing, GetBookListing, EditListing, handleGetAuctionHistoryRequest, 
  handleGetFilterAuctionsRequest, handleGetFilterListingsRequest, handlePutEditAuctionRequest,
  handleDeleteListingRequest, handleDeleteAuctionRequest, handleRelistBookRequest,checkAndNotifyExpiredAuctions,sellerbookdetails} = require('./sellerserver.js');
const showBookDetails = require("./bookdetails.js");
const handlers = require('./handler');
const { viewUserCart, addBalancetoWallet, purchaseProduct, addToCart, viewPurchaseHistory,
  deleteFromCart, getbookdetails, fetchWalletBalance, deleteItemFromCart, placeBid} = require('./purchase.js');
  const handlers_rep = require('./handlers_rep');
  const handlers_admin = require('./handlers_admin');
  const handlers_faq = require('./handlers_faq');

//Create a connection to your MySQL database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'project',
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database: ' + err.stack);
    return;
  }
  console.log('Connected to the database');
});

function serveFile(filePath, contentType, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            res.writeHead(500);
            res.end('Server Error');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
    }

const port = 3000;

// Schedule the function to run every 5 minutes
cron.schedule('*/1 * * * *', () => {
  //console.log('Checking for available books and sending notifications...');
  checkReservedBooks(connection);
});
// setInterval(() => {
//   checkAndNotifyExpiredAuctions(connection);
// }, 60 * 1000);

const server = http.createServer((req, res) => {
  const reqUrl = url.parse(req.url, true);
  const {
    pathname
  } = reqUrl;
  const qs = require("qs");
  const myparams = reqUrl.query || {};
  const params = qs.parse(myparams);
  //Shashwenth
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === 'GET' && (path.match('\.html$'))) {
    const filePath = 'success.html';
    serveStaticFiles(req, res, filePath);
}
  else if (req.method === 'GET' && reqUrl.pathname.startsWith('/books/availableLending')) {
    listAvailableBooks(connection, req, res)
  } else if (reqUrl.pathname.startsWith("/displaybook") && req.method === "GET") {
    showBookDetails(req,res,params, connection);
  } 
  // User Auth //
  else if ( (pathname === '/login') && req.method === 'POST') {
    console.log('Inside login POST');
    handleLogin(req, res, connection);
} else if ( (pathname === '/login' || pathname === '/' ) && req.method === 'GET') {
    console.log('Inside login GET');
    // console.log('res:', res);
    serveFile('login.html', 'text/html', res, connection);
}
else if ( (pathname === '/register' ) && req.method === 'GET') {
    console.log('Inside register GET');
    // console.log('res:', res);
    serveFile('createacc.html', 'text/html', res, connection);} 
else if (pathname === '/register' && req.method === 'POST') {
    console.log('Inside register');
    handleRegister(req, res, connection);
} else if (req.method === 'PUT' && pathname.startsWith('/customers/')) {
    verifyToken(req, res, () => handleUpdateCustomer(req, res, pathname, connection));
} else if (req.method === 'GET' && pathname === '/customers') {
    console.log('/customers true');
    verifyToken(req, res, () => handleGetAllCustomers(req, res, connection));
} else if (req.method === 'GET' && pathname.startsWith('/customers/')) {
    console.log("Pathname before verifyToken:", pathname);
    verifyToken(req, res, () => {
        console.log("Inside verifyToken. Pathname:", pathname);
        handleGetCustomer(req, res, pathname, connection);
    });
} else if (req.method === 'GET' && pathname.startsWith('/get-books/')) {
    verifyToken(req, res, () => handleGetBooks(req, res, pathname, connection));}
  else if (reqUrl.pathname.startsWith("/displaybook") && req.method === "GET") {
    showBookDetails(req,res,params, connection);
  } else if (req.method === 'POST' && reqUrl.pathname.startsWith('/books/borrow')) {
    const queryParams = new URLSearchParams(reqUrl.query);
    const Title = queryParams.get('Title');
    borrowBooks(connection, req, res, Title);
  } else if (req.method === 'POST' && reqUrl.pathname.startsWith('/books/return')) {
    const queryParams = new URLSearchParams(reqUrl.query);
    const Title = queryParams.get('Title');
    returnBooks(connection, req, res, Title);
  } else if (req.method === 'GET' && reqUrl.pathname === '/books/borrowed') {
    borrowedBooks(connection, req, res);
  } else if (req.method === 'POST' && reqUrl.pathname.startsWith('/books/subscribe')) {
    const queryParams = new URLSearchParams(reqUrl.query);
    const Title = queryParams.get('Title');
    const Book_condition = queryParams.get('Book_condition');
    newSubscription(connection, req, res, Title, Book_condition);
  } else if (req.method === 'DELETE' && reqUrl.pathname.startsWith('/books/unsubscribe')) {
    const queryParams = new URLSearchParams(reqUrl.query);
    const Title = queryParams.get('Title');
    const Book_condition = queryParams.get('Book_condition');
    cancelSubscription(connection, req, res, Title, Book_condition);
  } else if (req.method === 'GET' && reqUrl.pathname === '/notifications') {
    getSubscriptions(connection, req, res);
  } else if (req.method === 'GET' && reqUrl.pathname === '/notifications/preferences') {
    getNotificationPreferences(connection, req, res);
  } else if (req.method === 'POST' && reqUrl.pathname === '/notifications/preferences') {
    updateNotificationPreferences(connection, req, res);
  } else if (req.method === 'GET' && req.url === '/books') {
  //  console.log(req);
  getAllBooks(connection, req, res);
    // verifyToken(req, res, () => getAllBooks(connection, req, res));
  } else if (req.method === 'GET' && req.url.startsWith('/books/search')) {
    searchBooks(connection, req, res);
  } else if (req.method === 'GET' && req.url.startsWith('/books/order')) {
    orderBooks(connection, req, res);
  } else if (req.method === 'GET' && req.url.startsWith('/books/filter')) {
    filterBooks(connection, req, res);
  } else if (req.method === 'GET' && req.url.startsWith('/books/sort')) {
    sortBooks(connection, req, res);
  } else if (req.method === 'GET' && req.url.startsWith('/books/')) {
    getBook(connection, req, res);
  } else if (req.method === 'POST' && req.url.startsWith('/books/')) {
    newBook(connection, req, res);
  } else if (req.method === 'PATCH' && req.url.startsWith('/updatebook')) {
    updateBook(connection, req, res);
  } else if (req.method === 'DELETE' && req.url.startsWith('/deletebook')) {
    deleteBook(connection, req, res);
  } else if (req.method === 'DELETE' && req.url.startsWith('/all/')) {
    deleteAll(connection, req, res);
  } 
  else if (req.method === 'GET' && req.url.startsWith('/view_cart')) {
    viewUserCart(connection, req, res);
  } else if (req.method === 'GET' && req.url.startsWith('/cart_value')) {
    cartvalue(connection, req, res);
  }
  else if (req.method === 'GET' && req.url.startsWith('/get_book_details')) {
    getbookdetails(connection, req, res);
  } else if (req.method === 'POST' && req.url.startsWith('/add_wallet_amount')) {
    addBalancetoWallet(connection, req, res);
  } else if (req.method === 'GET' && req.url.startsWith('/wallet_balance')) {
    fetchWalletBalance(connection, req, res);
  }else if (req.method === 'DELETE' && req.url.startsWith('/delete_item_from_cart')) {
    deleteItemFromCart(connection, req, res);
  } else if (req.method === 'POST' && req.url.startsWith('/purchase_product')) {
    purchaseProduct(connection, req, res);
  } else if (req.method === 'POST' && req.url.startsWith('/add_cart')) {
    addToCart(connection, req, res);
  } else if (req.method === 'GET' && req.url.startsWith('/purchase_history')) {
    viewPurchaseHistory(connection, req, res);
  } else if (req.method === 'DELETE' && req.url.startsWith('/delete_from_cart')) {
    deleteFromCart(connection, req, res);
  }
  else if (req.method === 'GET' && pathname.startsWith('/get-books/')) {
    handleGetBooks(connection, req, res, pathname);
  } 
  else if (req.method === "PUT" && pathname.startsWith("/book/editlisting")) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {EditListing(req, res, params, body, connection);  });
  }
  else if (req.method === "POST" && pathname.startsWith("/book")) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      createBookListing(req, res, params, body, "application/json", connection);
    }); }
   else if (req.method === "GET" && pathname.startsWith("/book/listing")) {
    GetBookListing(req, res, params, connection);
  }  else if (req.method === "GET" && pathname.startsWith("/auctionhistory")) {
    handleGetAuctionHistoryRequest(req, res, params, connection);
  } else if (req.method === "GET" && pathname === "/book/filterauctions") {
    handleGetFilterAuctionsRequest(req, res, params, connection);
  } else if (req.method === "GET" && pathname === "/book/filterlistings") {
    handleGetFilterListingsRequest(req, res, params, connection);
  } else if (req.method === "PUT" && pathname.startsWith("/book/editauction")) {

    handlePutEditAuctionRequest(req, res, params, body,connection);
  } else if (req.method === "POST" && pathname.startsWith("/book/placeBid")) {
    placeBid(connection, req, res);

  } else if (req.method === "DELETE" && pathname.startsWith("/book/deletelisting")) {
    handleDeleteListingRequest(req, res, params, connection);
  } else if (req.method === "DELETE" && pathname.startsWith("/book/deleteauction")) {
    handleDeleteAuctionRequest(req, res, params, connection);
  } else if (req.method === "PUT" && pathname.startsWith("/relist")) {
    handleRelistBookRequest(req, res, params, body, connection);
  } //Shashwenth Code
  else if (req.method === 'GET' && path === '/') {
    handlers.serveIndex(req, res);
  } else if (req.method === 'GET' && path.match('\.html$') || path.match('\.js$')) {
    handlers.serveStaticFiles(req, res, path);
  } else if (req.method === 'GET' && path.startsWith('/assets')) {
    handlers.serveStaticFiles(req, res, path);
  } else if (req.method === 'POST' && req.url === '/queries') {
    handlers.postQueries(req, res);
  } else if (req.method === 'GET' && path === '/notifications-CR') {
    handlers.getNotifications(req, res);
  } else if (req.method === 'GET' && path === '/view_history') {
    handlers.getViewHistory(req, res);
  } else if (req.method === 'POST' && path === '/submit-feedback') {
    console.log("submission");
    handlers.updatefeedback(req, res);
  } else if (req.method === 'POST' && path === '/delete-notifications') {
    console.log("Inside 1");
    handlers.deleteNotifications(req, res);
  }else if (req.method === 'GET' && req.url === '/OutOfStockBooks') {
    fetchOutOfStockBooks(connection,req,res);
  }
  else if (req.method === "GET" && pathname.startsWith("/book") )  {

    sellerbookdetails(req,res,params,connection)
  }else if (req.method === 'GET' && path.startsWith('/assets_rep')) {
    handlers_rep.serveStaticFiles(req, res, path);
} else if (req.method === 'POST' && path === '/notifications') {
  handlers_rep.postNotifications(req, res);
}  
else if (req.method === 'GET' && path === '/queries') {
  // console.log("inside query get");
  handlers_rep.getQueries(req, res);
} 

else if (req.method === 'GET' && path === '/get_statistics_and_queries') {
  // console.log("inside get_statistics_and_queries");
  handlers_rep.getStatisticsAndQueries(req, res);
}
else if (req.method === 'POST' && path === '/process_approvals') {
  handlers_rep.processApprovals(req, res);
} else if (req.method === 'GET' && path === '/customer_details') {
  handlers_rep.getCustomerDetails(req, res);
} else if (req.method === 'POST' && path === '/update_customer') {
  handlers_rep.updateCustomer(req, res);
} else if (req.method === 'GET' && path === '/get_user_details') {
    console.log("Success");
    handlers_rep.getUserDetails(req, res);
}  else if (req.method === 'POST' && path === '/get_user_details') {
    console.log("Success");
    handlers_rep.getUserDetails(req, res);
}else if (req.method === 'POST' && path === '/update_user_details') {
  handlers_rep.updateUserDetails(req, res);
} 
else if (req.method === 'GET' && path.startsWith('/assets_admin')) {
  handlers_admin.serveStaticFiles(req, res, path);
}  else if (req.method === 'GET' && req.url === '/wait_approval') {
  handlers_admin.getWaitApproval(req, res);
} else if (req.method === 'POST' && req.url === '/process_approvals') {
  handlers_admin.processApprovals(req, res);
} 
else if (req.method === 'GET' && path === '/get_statistics_and_queries') {
  handlers_admin.getStatisticsAndQueries(req, res);
}
else if (req.method === 'POST' && req.url === '/add_rep') {
  handlers_admin.addrep(req,res);
}
else if (req.method === 'GET' && path.startsWith('/assets_faq')) {
  handlers_faq.serveStaticFiles(req, res, path);
} else if (req.method === 'GET' && path === '/faq') {
  handlers_faq.getStatisticsAndQueries(req, res);
} 
  else {
    res.writeHead(404, {
      'Content-Type': 'text/plain'
    });
    res.end('Not Found');
  }
});


async function verifyToken(req, res, next) {
    const bearerHeader = req.headers['Authorization'];
    console.log('token:', bearerHeader);
    if (typeof bearerHeader !== 'undefined') {
        const token = bearerHeader.split(' ')[1];
        try {
            const decoded = await jwt.verify(token, JWT_SECRET_KEY);
            console.log("Decode token:", decoded);
            const userID = await getUserIDFromDatabase(decoded.emailid);
            console.log("User ID:", userID);
            req.user_id = userID;
            console.log("CHECK req", req);
            next();
        } catch (err) {
            console.log("Error:", err);
            res.writeHead(err.name === 'JsonWebTokenError' ? 403 : 401);
            res.end('Invalid or expired token');
        }
    } else {
        res.writeHead(401);
        res.end('Unauthorized');
    }
}
function serveStaticFiles(req, res, filePath) {
  const fileExtension = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.js': 'text/javascript',
  }[fileExtension] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

function handleLogin(req, res) {
    let body = '';
 
 
    req.on('data', chunk => {
        body += chunk.toString();
    });
 
 
    req.on('end', () => {
        const { emailid, password } = JSON.parse(body);
        
        console.log(emailid, password);
        const query = 'SELECT * FROM CUSTOMER WHERE Email = ? AND UserPassword = ?';
        connection.query(query, [emailid, password], (err, results) => {
            if (err || results.length === 0) {
                console.log("Error",err);
                res.writeHead(401);
                res.end('Login failed');
                return;
            }
            // console.log("CHECK::",err);
            const token = jwt.sign({ emailid }, JWT_SECRET_KEY, { expiresIn: '48h' });
            console.log("token :", token);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            let userType = results[0].UserType;
            console.log("userType :", userType);
            res.end(JSON.stringify({ token,userType }));
        });
    });
 }

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

process.on('SIGINT', () => {
  connection.end((err) => {
    if (err) console.error('Error closing the database connection:', err);
    process.exit();
  });
});
