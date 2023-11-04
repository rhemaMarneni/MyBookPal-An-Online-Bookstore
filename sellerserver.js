const http = require("http");
const mysql = require("mysql2");
const url = require("url");
const qs = require("qs");
const notifiedBooks = new Set(); // Create a set to track notified books
class WebServer {
  constructor() {
    this.port = process.env.PORT || 8081;
    this.hostname = "127.0.0.1";
    this.server = http.createServer(this.handleRequest.bind(this));
    this.dbCon = mysql.createConnection({
      host: "127.0.0.1",
      user: "root",
      password: "password",
      database: "book_catalog",
    });
    this.dbCon.connect((err) => {
      if (err) {
        console.error("Database not created " + err.stack);
        return;
      }
      console.log("Connected to database");
      this.startServer(() => {
        console.log("Server started");
      });
     
    });
    setInterval(() => {
      this.checkExpiredAuctions();
    }, 10 * 1000); 
    
    
  }
  

  async checkExpiredAuctions() {
    const currentTime = new Date();
    const expiredAuctions = await this.getExpiredAuctions(currentTime);
  
    expiredAuctions.forEach(async (auction) => {
      // Check if the book has already been notified
      if (!notifiedBooks.has(auction.bookid)) {
        if (auction.currentbid >= auction.reserveprice) {
          // Auction was successful
          console.log(`Auction for book  (bookid: ${auction.bookid}) has successfully ended.`);
        } else {
          // Auction did not meet the reserve price
          console.log(`Auction for book  (bookid: ${auction.bookid}) did not meet the reserve price and the auction has ended you can relist the book.`);
          
          // Notify the user that the book is not sold
          // await this.notifyAuctionFailure(auction);
        }
  
        // Add the book to the list of notified books
        notifiedBooks.add(auction.bookid);
  
        // Update the auction status to indicate that it has ended
        // await this.updateAuctionStatus(auction.auctionid);
      }
    });
  }
  
  //notification
  async getExpiredAuctions(currentTime) {
    return new Promise((resolve, reject) => {
      this.dbCon.query(
        "SELECT auctionid, bookid, sellerid, reserveprice, currentbid, auctionstatus " +
        "FROM book_catalog.auctions " +
        "WHERE enddatetime <= ? AND auctionstatus = 1",
        [currentTime],
        (err, results) => {
          if (err) {
            console.error("Error checking expired auctions:", err);
            reject(err);
          } else {
            resolve(results);
          }
        }
      );
    });
  }

  handleRequest(req, res) {
    const { method, headers } = req;
    const contentType = headers["content-type"];
    const { pathname } = url.parse(req.url, true);
    const myparams = url.parse(req.url, true).query;
    const params = qs.parse(myparams);
    console.log(pathname);
    console.log(params);

    if (Object.keys(params).length === 0) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Login to create a booklisting" }));
      return;
    }

    if (!["POST", "GET", "PUT", "DELETE"].includes(method)) {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Method not allowed." }));
      return;
    }

    if (!contentType) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Content-Type header is missing." }));
      return;
    }

    let body = "";

    req.on("data", (block) => {
      body += block.toString();
    });

    req.on("end", () => {
      //CREATE LISTING==============================================================================================================
      if (req.method === "POST" && pathname.startsWith("/book")) {
        let sellerid = params.id; //read userid (seller)
        //empty request body
        body = JSON.parse(body);
        if (body === "") {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "Request body is empty" }));
          return;
        }

        if (contentType !== "application/json") {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ message: "Content-Type header is missing." })
          );
          return;
        }

        //check for all book parameters
        const {
          title,
          author,
          book_condition,
          price,
          genre,
          book_description,
          quantity,
          auction,
          photos,
          startdatetime,
          enddatetime,
          reserveprice,
          minimumincrement,
        } = body;
        if (
          !sellerid ||
          !title ||
          !author ||
          !book_condition ||
          !price ||
          !genre ||
          !book_description ||
          !quantity
        ) {
          res.statusCode = 422;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ message: "Incomplete product information" })
          );
          return;
        }
        //check for all auction parameters, if selected
        if (auction === 1) {
          if (
            !startdatetime ||
            !enddatetime ||
            !reserveprice ||
            !minimumincrement
          ) {
            res.statusCode = 422;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ message: "Incomplete product information" })
            );
            return;
          }
          if (startdatetime > enddatetime) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                message: "Auction End Data cannot be earlier than Start Date",
              })
            );
            return;
          }
        }
        let bookID;
        //insert book listing
        this.dbCon.query(
          "INSERT INTO book_catalog.booklisting (sellerid, title, author, book_condition, price, genre, book_description, quantity, auction, photos) VALUES ( ?, ?,?, ?, ?, ?, ?, ?, ? ,?)",
          [
            sellerid,
            title,
            author,
            book_condition,
            price,
            genre,
            book_description,
            quantity,
            auction,
            photos,
          ],
          (err, result) => {
            if (err) {
              //console.error("Database error at insert book:", err);
              res.statusCode = 500;
              //res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  message:
                    "Could not fulfill book listing. Try checking if you are listing the same book twice.",
                })
              );
              return;
            }
            bookID = result.insertId;

            //insert auction -- status by default is true (is live)
            if (auction === 1) {
              this.dbCon.query(
                "INSERT INTO book_catalog.auctions (bookid, sellerid, startdatetime, enddatetime, reserveprice, minimumincrement) VALUES (?,?,?,?,?,?)",
                [
                  bookID,
                  sellerid,
                  startdatetime,
                  enddatetime,
                  reserveprice,
                  minimumincrement,
                ],
                (err) => {
                  if (err) {
                    console.error("Database error at insert auction:", err);
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        message:
                          "Internal Server Error. Could not fulfill request -- auction listing",
                      })
                    );
                    return;
                  }
                }
              );
            }

            res.statusCode = 201;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ message: "Listing added to catalog" }));
          }
        );
      }

      //VIEW LISTINGS==============================================================================================================
      else if (req.method === "GET" &&pathname.startsWith("/book/listing")) {
        const sellerid = params.id;
        if (!sellerid) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "Seller ID is missing." }));
          return;
        }

        // Query the database to retrieve book listings by seller ID
        this.dbCon.query(
          "SELECT * FROM booklisting WHERE sellerid = ?",
          [sellerid],
          (err, results) => {
            if (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ message: "Internal Server Error." }));
              return;
            }

            if (results.length === 0) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  message: "No book listings found for the seller.",
                })
              );
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(results));
          }
        );
      }

      //EDIT LISTING==============================================================================================================
      else if (req.method === "PUT" && pathname.startsWith("/book/editlisting")) {
        // Parse the request body as JSON
        body = JSON.parse(body);
        // Extract bookid and sellerid from the request body
        const bookid = params.bookid;
        const sellerid = params.sellerid;


        if (!bookid || !sellerid) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              message:
                "Book ID and Seller ID are required in the request body.",
            })
          );
          return;
        }

        // Check if the book listing with the specified bookid and sellerid exists
        this.dbCon.query(
          "SELECT * FROM book_catalog.booklisting WHERE bookid = ? AND sellerid = ?",
          [bookid, sellerid],
          (err, results) => {
            if (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ message: "Internal Server Error." }));
              return;
            }

            if (results.length === 0) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  message:
                    "Book listing not found for the specified bookid and sellerid.",
                })
              );
              return;
            }

            // Update the booklisting table based on bookid and sellerid
            this.dbCon.query(
              "UPDATE book_catalog.booklisting SET title = ?, author = ?, book_condition = ?, price = ?, genre = ?, book_description = ?, quantity = ?, auction = ?, photos = ? WHERE bookid = ? AND sellerid = ?",
              [
                body.title,
                body.author,
                body.book_condition,
                body.price,
                body.genre,
                body.book_description,
                body.quantity,
                body.auction,
                body.photos,
                bookid,
                sellerid,
              ],
              (err) => {
                if (err) {
                  console.error("Database error at insert book:", err);
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      message: "Internal Server Error (Booklisting update).",
                    })
                  );
                  return;
                }

                // Check if an auction record needs to be updated
                if (body.auction === 1) {
                  this.dbCon.query(
                    "UPDATE book_catalog.auctions SET startdatetime = ?, enddatetime = ?, reserveprice = ?, minimumincrement = ? WHERE bookid = ? AND sellerid = ?",
                    [
                      body.startdatetime,
                      body.enddatetime,
                      body.reserveprice,
                      body.minimumincrement,
                      bookid,
                      sellerid,
                    ],
                    (err) => {
                      if (err) {
                        console.error("Database error at insert book:", err);
                        res.statusCode = 500;
                        res.setHeader("Content-Type", "application/json");
                        res.end(
                          JSON.stringify({
                            message: "Internal Server Error (Auctions update).",
                          })
                        );
                        return;
                      }
                      // Successful update
                      res.statusCode = 200;
                      res.setHeader("Content-Type", "application/json");
                      res.end(
                        JSON.stringify({
                          message:
                            "Book and associated auctions updated successfully.",
                        })
                      );
                    }
                  );
                } else {
                  // Successful update (no auction update required)
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ message: "Book updated successfully." })
                  );
                }
              }
            );
          }
        );
      }

      //VIEW AUCTION HISTORY====================================================================================================
      else if (req.method === "GET" && pathname.startsWith("/auctionhistory")) {
        const sellerid = params.sellerid;
    
        if (!sellerid) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ message: "Seller ID is missing in the URL parameters." }));
            return;
        }
    
        // Query the database to retrieve auction history for the specified seller
        this.dbCon.query(
            "SELECT * FROM book_catalog.auctions WHERE sellerid = ?",
            [sellerid],
            (err, results) => {
                if (err) {
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ message: "Internal Server Error." }));
                    return;
                }
    
                if (results.length === 0) {
                    res.statusCode = 404;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ message: "No auction history found for the specified seller." }));
                    return;
                }
    
                // Return the auction history as JSON
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(results));
            }
        );
    }

      //FILTER AUCTIONS====================================================================================================
      else if (req.method === "GET" && pathname === "/book/filterauctions") {
        let sellerid = params.sellerid;
        let query =
          "SELECT * FROM book_catalog.booklisting b join book_catalog.auctions a on b.sellerid = a.sellerid  WHERE b.auction = 1 AND ";
        const conditions = [];

        for (const key in params) {
          if (key === "sellerid") {
            continue;
          }
          conditions.push(`${key} = '${params[key]}'`);
        }

        query += conditions.join(" AND ");
        query += " AND a.sellerid = " + sellerid;
        this.dbCon.query(query, (err, results) => {
          if (err) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                message: "Internal Server Error - Invalid query",
              })
            );
            return;
          }
          if (results.length === 0) {
            results = { message: "No such auctions available" };
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(results));
            return;
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(results));
        });
      }

      //FILTER LISTINGS====================================================================================================
      else if (req.method === "GET" && pathname === "/book/filterlistings") {
        let query = "SELECT * FROM book_catalog.booklisting WHERE ";
        const conditions = [];
        let sellerid = params.sellerid;

        for (const key in params) {
          if (key === "sellerid") {
            continue;
          }
          conditions.push(`${key} = '${params[key]}'`);
        }

        query += conditions.join(" AND ");
        query += " AND sellerid = " + sellerid;
        this.dbCon.query(query, (err, results) => {
          if (err) {
            console.log(err);
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                message: "Internal Server Error - Invalid query",
              })
            );
            return;
          }
          if (results.length === 0) {
            results = { message: "No such listings available" };
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(results));
            return;
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(results));
        });
      }

      //EDIT AUCTION====================================================================================================
      else if (req.method === "PUT" && pathname.startsWith("/book/editauction")) {
        body = JSON.parse(body);

       //const auctionid = params.auctionid;
        const bookid = params.bookid;
        const sellerid = params.sellerid;

        if (!bookid || !sellerid) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              message:
                "Book ID and Seller ID are required in the request body.",
            })
          );
          return;
        }

        // Check if the book listing with the specified bookid and sellerid exists
        this.dbCon.query(
          "SELECT * FROM book_catalog.auctions WHERE bookid = ? AND sellerid = ?",
          [bookid, sellerid],
          (err, results) => {
            if (err) {
              console.log(err)
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ message: "Internal Server Error." }));
              return;
            }

            if (results.length === 0) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  message:
                    "Auction not found for the specified bookid and sellerid.",
                })
              );
              return;
            }

            this.dbCon.query(
              "UPDATE book_catalog.auctions SET startdatetime = ?, enddatetime = ?, reserveprice = ?, minimumincrement = ? WHERE bookid = ? AND sellerid = ?",
              [
                body.startdatetime,
                body.enddatetime,
                body.reserveprice,
                body.minimumincrement,
                //auctionid,
                bookid,
                sellerid,
              ],
              (err) => {
                if (err) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      message: "Internal Server Error (Auctions update).",
                    })
                  );
                  return;
                }
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ message: "Auction updated successfully." })
                );
              }
            );
          }
        );
      }

      //DELETE LISTING===========================================================================================
      else if (req.method === "DELETE" && pathname.startsWith("/book/deletelisting")) {
        const bookid = params.bookid;
        const sellerid = params.sellerid;
        console.log(bookid, sellerid);

        if (!bookid) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "Book ID is missing." }));
          return;
        }

        // First, delete the associated rows from the auctions table based on both bookid and sellerid
        this.dbCon.query(
          "DELETE FROM book_catalog.auctions WHERE bookid = ? AND sellerid = ?",
          [bookid, sellerid],
          (err) => {
            if (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  message: "Internal Server Error (Auctions deletion).",
                })
              );
              return;
            }

            // Now, delete the row from the booklisting table based on bookid
            this.dbCon.query(
              "DELETE FROM book_catalog.booklisting WHERE bookid = ? AND sellerid = ?",
              [bookid, sellerid],
              (err) => {
                if (err) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      message: "Internal Server Error (Booklisting deletion).",
                    })
                  );
                  return;
                }

                // Successful deletion
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    message:
                      "Book and associated auctions deleted successfully.",
                  })
                );
              }
            );
          }
        );
      }

      //DELETE AUCTION ============================================================================================================
      else if (req.method === "DELETE" && pathname.startsWith("/book/deleteauction")) {
        const bookid = params.bookid;
        const sellerid = params.sellerid;

        if (!bookid || !sellerid) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              message:
                "Book ID and Seller ID are required in the URL parameters.",
            })
          );
          return;
        }

        // First, delete the associated rows from the auctions table based on both bookid and sellerid
        this.dbCon.query(
          "DELETE FROM book_catalog.auctions WHERE bookid = ? AND sellerid = ?",
          [bookid, sellerid],
          (err) => {
            if (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  message: "Internal Server Error (Auctions deletion).",
                })
              );
              return;
            }

            // Next, update the auction status in the booklisting table to 0 (indicating no auction)
            this.dbCon.query(
              "UPDATE book_catalog.booklisting SET auction = 0 WHERE bookid = ? AND sellerid = ?",
              [bookid, sellerid],
              (err) => {
                if (err) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      message: "Internal Server Error (Auction status update).",
                    })
                  );
                  return;
                }

                // Successful deletion and status update
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    message: "Auction deleted, and auction status updated.",
                  })
                );
              }
            );
          }
        );
      }

      //RELIST A BOOK
      else if (req.method === "PUT" && pathname.startsWith("/relist")) {
        const bookid = params.bookid;
        const sellerid = params.sellerid;

        if (!bookid || !sellerid) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              message:
                "Book ID and Seller ID are required in the URL parameters.",
            })
          );
          return;
        }

        // Parse the request body as JSON
        body = JSON.parse(body);

        // Extract book and auction details from the request body
        const {
          title,
          author,
          book_condition,
          price,
          genre,
          book_description,
          quantity,
          auction,
          photos,
          startdatetime,
          enddatetime,
          reserveprice,
          minimumincrement,
        } = body;

        // Update the booklisting table
        this.dbCon.query(
          "UPDATE book_catalog.booklisting SET title = ?, author = ?, book_condition = ?, price = ?, genre = ?, book_description = ?, quantity = ?, auction = ?, photos = ? WHERE bookid = ? AND sellerid = ?",
          [
            title,
            author,
            book_condition,
            price,
            genre,
            book_description,
            quantity,
            auction,
            photos,
            bookid,
            sellerid,
          ],
          (err) => {
            if (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  message: "Internal Server Error (Booklisting update).",
                })
              );
              return;
            }

            // Check if an auction record needs to be updated
            if (auction === 1) {
              this.dbCon.query(
                "UPDATE book_catalog.auctions SET startdatetime = ?, enddatetime = ?, reserveprice = ?, minimumincrement = ? WHERE bookid = ? AND sellerid = ?",
                [
                  startdatetime,
                  enddatetime,
                  reserveprice,
                  minimumincrement,
                  bookid,
                  sellerid,
                ],
                (err) => {
                  if (err) {
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        message: "Internal Server Error (Auctions update).",
                      })
                    );
                    return;
                  }
                  // Successful update
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      message:
                        "Book and associated auctions relisted successfully.",
                    })
                  );
                }
              );
            } else {
              // Successful update (no auction update required)
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({ message: "Book updated successfully." })
              );
            }
          }
        );
      } 
      else {
        //malformed URLs
        console.log(req.url);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ message: "Malformed URL" }));
      }
    });
  }

  startServer() {
    this.server.listen(this.port, () => {
      console.log(`Server is listening on port ${this.port}`);
    });
  }
}

const webServer = new WebServer();
module.exports = WebServer;
