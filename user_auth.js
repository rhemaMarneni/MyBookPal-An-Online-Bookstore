const http = require('http');
const mysql = require('mysql2');
const url = require('url');
const fs = require('fs');

// Create a MySQL database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'password',
    database: 'mybookpal',
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('MySQL Connection Error: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL database');
});

// Create an HTTP server
const server = http.createServer((req, res) => {
    const reqUrl = url.parse(req.url, true);
    const { pathname } = reqUrl;

    // Handle POST request to '/login'
    if (pathname === '/login' && req.method === 'POST') {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', () => {
            const formData = JSON.parse(data);
            const username = formData.username;
            const password = formData.password;
            console.log('login', username, password);

            // Check username and password against the database
            const query = 'SELECT * FROM CUSTOMER WHERE UserID = ? AND UserPassword = ?';
            db.query(query, [username, password], (err, results) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                } else {
                    console.log('login', err);
                    if (results.length > 0) {
                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end('Login Successful');
                    } else {
                        res.writeHead(401, { 'Content-Type': 'text/plain' });
                        res.end('Login Failed');
                    }
                }
            });
        });
    }

    // Handle POST request to '/register'
    else if (pathname === '/register' && req.method === 'POST') {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', () => {
            const formData = JSON.parse(data);
            const username = formData.username;
            const password = formData.password;
            const firstName = formData.first_name;
            const lastName = formData.last_name;
            const usertype = formData.user_type;
            const email = formData.email;
            const address = formData.address;
            const phone = formData.phone;

            // Validate phone number length
            const maxPhoneLength = 20; // This should match the length defined in your DB
            if (phone.length > maxPhoneLength) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Phone number is too long');
                return;
            }

            // Check if the username already exists in the database
            const usernameCheckQuery = 'SELECT UserID FROM CUSTOMER WHERE UserID = ?';
            db.query(usernameCheckQuery, [username], (err, results) => {
                if (err) {
                    console.log("Error checking username", err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Registration Failed');
                } else if (results.length > 0) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Username already exists');
                } else {
                    // Insert the new user into the database
                    const insertQuery = 'INSERT INTO CUSTOMER (UserID, FirstName, LastName, PhoneNumber, Email, UserAddress, UserPassword, UserType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                    db.query(insertQuery, [username, firstName, lastName, phone, email, address, password, usertype], (err) => {
                        if (err) {
                            console.log("Error inserting new user", err);
                            res.writeHead(500, { 'Content-Type': 'text/plain' });
                            res.end('Registration Failed');
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/plain' });
                            res.end('Registration Successful');
                        }
                    });
                }
            });
        });
    }

    // Handle PUT request to '/customers/:username'
    else if (req.method === 'PUT' && pathname.startsWith('/customers/')) {
        const Username = pathname.split('/')[2];
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', () => {
            try {
                const customer = JSON.parse(data);
                let update_customer = customer;
                db.query('UPDATE Customer SET FirstName = ?, LastName = ?, PhoneNumber = ?, Email = ?, UserAddress = ?, UserPassword = ?, UserType = ? WHERE UserID = ?', 
                         [update_customer.first_name, update_customer.last_name, update_customer.phone, update_customer.email, update_customer.address, update_customer.password, update_customer.user_type, Username], 
                         (err) => {
                    if (err) {
                        res.statusCode = 500;
                        res.end('Internal Server Error');
                    } else {
                        res.statusCode = 200;
                        res.end('Customer updated');
                    }
                });
            } catch (err) {
                res.statusCode = 400;
                res.end('Invalid request');
            }
        });
    }

    // Handle GET request for all customers
    else if (req.method === 'GET' && pathname === '/customers') {
        db.query('SELECT UserID, FirstName, LastName, PhoneNumber, Email, UserAddress, UserType FROM Customer', (err, rows) => {
            if (err) {
                res.statusCode = 500;
                res.end('Internal Server Error');
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(rows));
            }
        });
    }

    // Handle GET request for a specific customer
    else if (req.method === 'GET' && pathname.startsWith('/customers/')) {
        const Username = pathname.split('/')[2];
        db.query('SELECT UserID, FirstName, LastName, PhoneNumber, Email, UserAddress, UserType FROM Customer WHERE UserID = ?', [Username], (err, row) => {
            if (err) {
                res.statusCode = 500;
                res.end('Internal Server Error');
            } else if (!row) {
                res.statusCode = 404;
                res.end('Customer not found');
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(row));
            }
        });
    }

    // Handle GET request for books
    else if (req.method === 'GET' && pathname.startsWith('/get-books/')) {
        const queryParams = pathname.split('/')[2];
        try {
            const filterCriteria = JSON.parse(queryParams.filter);

            if (Object.keys(filterCriteria).length === 0) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Filter criteria cannot be empty');
                return;
            }
            const conditions = [];
            for (const key in filterCriteria) {
                if (filterCriteria.hasOwnProperty(key)) {
                    const value = filterCriteria[key];
                    conditions.push(`${key} = ${db.escape(value)}`);
                }
            }
            const whereClause = conditions.join(' AND ');
            const query = `SELECT * FROM BookListing WHERE ${whereClause}`;

            db.query(query, (err, results) => {
                if (err) {
                    console.error('Database error: ' + err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                } else {
                    if (results.length > 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(results));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('No books found with the specified criteria');
                    }
                }
            });
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid JSON request');
        }
    }

    // Handle all other GET requests
    else {
        fs.readFile('login.html', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('Internal Server Error');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    }
});

// Function to check password strength (if needed)
function isStrongPassword(password) {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[a-zA-Z0-9]).{8,}$/;
    return regex.test(password);
}

// Function to send SMS notification
function sendSMSNotification(phoneNumber, message) {
    twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber,
    });
}

// Start the server
const port = 3000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
