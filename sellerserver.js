const http = require("http");
const mysql = require("mysql2");
const url = require("url");
const qs = require("qs");
const nodemailer = require("nodemailer");
const notifiedBooks = new Set(); 

async function checkAndNotifyExpiredAuctions(connection) {
  //console.log("Checking and notifying expired auctions...");

  const nodemailer = require("nodemailer");

  // Create a nodemailer transporter using your email service credentials
  const transporter = nodemailer.createTransport({
    service: "gmail", // e.g., 'gmail'
    auth: {
      user: "bhargavichinthapatla99@gmail.com",
      pass: "wjjm iurq vemq rvrw",
    },
  });

  // Function to send email
  function sendEmail(to, subject, text) {
    const mailOptions = {
      from: "bhargavichinthapatla99@gmail.com", // Sender's email address
      to, // Receiver's email address
      subject, // Subject of the email
      text, // Email body in plain text
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  }

  // Example of using the function to send an email

  // Iterate through expired auctions and send emails
  const currentTime = new Date();
  try {
    const expiredAuctions = await getExpiredAuctions(currentTime, connection);
    console.log(expiredAuctions)

    const expiredAuctionsInfo = []; // Array to store information for expired auctions
   
    for (const auction of expiredAuctions) {
      // Check if the book has already been notified
      if (!notifiedBooks.has(auction.bookid)) {
        // Print seller email and book ID to the console
        console.log(
          `Seller Email: ${auction.email}, Book ID: ${auction.bookid}`
        );

        // Save information for the expired auction in the array
        expiredAuctionsInfo.push({
          bookid: auction.bookid,
          sellerid: auction.sellerid,
          email: auction.email,
          status:
            auction.currentbid >= auction.reserveprice
              ? "Successful"
              : "Not Successful",
        });

        if (auction.currentbid >= auction.reserveprice) {
          // Auction was successful
          console.log(
            `Auction for book (bookid: ${auction.bookid}) has successfully ended.`
          );
        } else {
          // Auction did not meet the reserve price
          console.log(
            `Auction for book (bookid: ${auction.bookid}) did not meet the reserve price, and the auction has ended. You can relist the book.`
          );

          // Notify the user that the book is not sold
          // await notifyAuctionFailure(auction);
        }

        // Add the book to the list of notified books
        notifiedBooks.add(auction.bookid);

        // Update the auction status to indicate that it has ended
        // await updateAuctionStatus(auction.auctionid);
      }
    }

    console.log("Expired Auctions Information:", expiredAuctionsInfo);

    for (const auction of expiredAuctionsInfo) {
      const subject = "Auction Completed";
      const text = `Dear seller, your auction for book ${auction.bookid} has completed. 
        Details: Reserve Price: ${auction.reserveprice}, Current Bid: ${auction.currentbid}`;

      sendEmail(auction.email, subject, text);
    }
  } catch (error) {
    console.error("Error checking and notifying expired auctions:", error);
  }
}

// Now you can call checkAndNotifyExpiredAuctions wherever needed in your code



// async function getExpiredAuctions(currentTime,connection) {
//     return new Promise((resolve, reject) => {
//       connection.query(
//         "SELECT a.bookid, a.reserveprice, a.currentbid, a.auctionstatus, " +
//           "b.sellerid, u.email " +
//           "FROM project.auction a " +
//           "JOIN project.booklisting b ON a.bookid = b.bookid " +
//           "JOIN project.customer u ON b.sellerid = u.userid " +
//           "WHERE a.enddatetime <= ? AND a.auctionstatus = 1",
//         [currentTime],
//         (err, results) => {
//           if (err) {
//             console.error("Error checking expired auctions:", err);
//             reject(err);
//           } else {
//             resolve(results);
//           }
//         }
//       );
//     });
//   }
// async function getExpiredAuctions(currentTime, connection) {
//   return new Promise((resolve, reject) => {
//     connection.query(
//       "SELECT a.bookid, a.reserveprice, a.currentbid, a.auctionstatus, " +
//       "b.sellerid, u.email " +
//       "FROM project.auction a " +
//       "JOIN project.booklisting b ON a.bookid = b.bookid " +
//       "JOIN project.customer u ON b.sellerid = u.userid " +
//       "WHERE a.enddatetime <= ? AND a.auctionstatus = 1",
//       [currentTime],
//       (err, results) => {
//         if (err) {
//           console.error("Error checking expired auctions:", err);
//           reject(err);
//         } else {
//           // Update auction status for auctions with current bid < reserve price
//           const auctionsToUpdate = results.filter(auction => auction.currentbid < auction.reserveprice);
        
//           if (auctionsToUpdate.length > 0) {
//             const auctionIds = auctionsToUpdate.map(auction => auction.bookid);
          
//             connection.query(
//               "UPDATE project.auction SET auctionstatus = 0 WHERE bookid IN (?)",
//               [auctionIds],
//               (updateErr, updateResults) => {
//                 if (updateErr) {
//                   console.error("Error updating auction status:", updateErr);
//                   reject(updateErr);
//                 } else {
//                   console.log(`Updated status for auctions with book IDs: ${auctionIds}`);
//                   resolve(results);
//                 }
//               }
//             );
//           } else {
//             resolve(results);
//           }
//         }
//       }
//     );
//   });
// }
// async function getExpiredAuctions(currentTime, connection) {
//   return new Promise((resolve, reject) => {
//     connection.query(
//       "SELECT a.bookid, a.reserveprice, a.currentbid, a.enddatetime, a.auctionstatus, " +
//       "b.sellerid, u.email " +
//       "FROM project.auction a " +
//       "JOIN project.booklisting b ON a.bookid = b.bookid " +
//       "JOIN project.customer u ON b.sellerid = u.userid " +
//       "WHERE a.enddatetime <= ? AND a.auctionstatus = 1",
//       [currentTime],
//       (err, results) => {
//         if (err) {
//           console.error("Error checking expired auctions:", err);
//           reject(err);
//         } else {
//           // Update auction status based on conditions
//           const updatePromises = results.map(auction => {
//             if (auction.currentbid < auction.reserveprice) {
//               return new Promise((resolveUpdate, rejectUpdate) => {
//                 connection.query(
//                   "UPDATE project.auction SET auctionstatus = 0 WHERE bookid = ?",
//                   [auction.bookid],
//                   (updateErr, updateResults) => {
//                     if (updateErr) {
//                       console.error("Error updating auction status:", updateErr);
//                       rejectUpdate(updateErr);
//                     } else {
//                       console.log(`Updated status for auction with BookID ${auction.bookid} to 0`);
//                       resolveUpdate();
//                     }
//                   }
//                 );
//               });
//             } else if (auction.currentbid > auction.reserveprice) {
//               console.log("status 2")
//               return new Promise((resolveUpdate, rejectUpdate) => {
//                 connection.query(
//                   "UPDATE project.auction SET auctionstatus = 2 WHERE bookid = ?",
//                   [auction.bookid],
//                   (updateErr, updateResults) => {
//                     if (updateErr) {
//                       console.error("Error updating auction status:", updateErr);
//                       rejectUpdate(updateErr);
//                     } else {
//                       console.log(`Updated status for auction with BookID ${auction.bookid} to 2`);
//                       resolveUpdate();
//                     }
//                   }
//                 );
//               });
//             } else {
//               return Promise.resolve();
//             }
//           });

//           Promise.all(updatePromises)
//             .then(() => resolve(results))
//             .catch(reject);
//         }
//       }
//     );
//   });
// }
async function getExpiredAuctions(currentTime, connection) {
return new Promise((resolve, reject) => {
  connection.query(
    "SELECT a.bookid, a.reserveprice, a.currentbid, a.enddatetime, a.auctionstatus, " +
    "b.sellerid, u.email " +
    "FROM project.auction a " +
    "JOIN project.booklisting b ON a.bookid = b.bookid " +
    "JOIN project.customer u ON b.sellerid = u.userid " +
    "WHERE a.enddatetime <= ? AND a.auctionstatus = 1",
    [currentTime],
    (err, results) => {
      if (err) {
        console.error("Error checking expired auctions:", err);
        reject(err);
      } else {
        // Update auction status based on conditions
        const updatePromises = results.map(auction => {
          if (auction.currentbid < auction.reserveprice) {
            return new Promise((resolveUpdate, rejectUpdate) => {
              connection.query(
                "UPDATE project.auction SET auctionstatus = 0 WHERE bookid = ?",
                [auction.bookid],
                (updateErr, updateResults) => {
                  if (updateErr) {
                    console.error("Error updating auction status:", updateErr);
                    rejectUpdate(updateErr);
                  } else {
                    console.log(`Updated status for auction with BookID ${auction.bookid} to 0`);
                    resolveUpdate();
                  }
                }
              );
            });
          } else if (auction.currentbid > auction.reserveprice) {
            console.log("status 2")
            return new Promise((resolveUpdate, rejectUpdate) => {
              connection.query(
                "UPDATE project.auction SET auctionstatus = 2 WHERE bookid = ?",
                [auction.bookid],
                (updateErr, updateResults) => {
                  if (updateErr) {
                    console.error("Error updating auction status:", updateErr);
                    rejectUpdate(updateErr);
                  } else {
                    console.log(`Updated status for auction with BookID ${auction.bookid} to 2`);

                    // Retrieve all bids for the particular book
                    connection.query(
                      "SELECT * FROM project.bids WHERE BookID = ?",
                      [auction.bookid],
                      (bidErr, bidResults) => {
                        if (bidErr) {
                          console.error("Error retrieving bids:", bidErr);
                          rejectUpdate(bidErr);
                        } else {
                          // Credit bid amounts to respective user wallets
                          const creditPromises = bidResults.map(bid => {
                            if (bid.UserID !== auction.BuyerID) {
                              return new Promise((resolveCredit, rejectCredit) => {
                                connection.query(
                                  "UPDATE project.wallet SET WalletBalance = WalletBalance + ? WHERE UserID = ?",
                                  [bid.MaxLimit, bid.UserID],
                                  (creditErr, creditResults) => {
                                    if (creditErr) {
                                      console.error("Error crediting wallet:", creditErr);
                                      rejectCredit(creditErr);
                                    } else {
                                      console.log(`Credited ${bid.PriceList} to UserID ${bid.UserID}'s wallet`);
                                      resolveCredit();
                                    }
                                  }
                                );
                              });
                            } else {
                              return Promise.resolve();
                            }
                          });

                          Promise.all(creditPromises)
                            .then(() => resolveUpdate())
                            .catch(rejectUpdate);
                        }
                      }
                    );
                  }
                }
              );
            });
          } else {
            return Promise.resolve();
          }
        });

        Promise.all(updatePromises)
          .then(() => resolve(results))
          .catch(reject);
      }
    }
  );
});
}

function createBookListing(req, res, params, body, contentType,connection) {
    let sellerid = params.id;
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
      res.end(JSON.stringify({ message: "Content-Type header is missing." }));
      return;
    }

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
            message: "Auction End Date cannot be earlier than Start Date",
          })
        );
        return;
      }

      const startdate = new Date(startdatetime);
      const currentDate = new Date();

      if (startdate < currentDate) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            message:
              "Auction Start Date cannot be earlier than Current Date",
          })
        );
        return;
      }
    }

    let bookID;

    connection.query(
      "INSERT INTO project.booklisting (sellerid, title, author, book_condition, price, genre, book_description, quantity, auction, photos) VALUES ( ?, ?,?, ?, ?, ?, ?, ?, ? ,?)",
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
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              message: "Could not fulfill insert request -- book listing",
            })
          );
          return;
        }

        bookID = result.insertId;

        if (auction === 1) {
            connection.query(
            "INSERT INTO project.Auction (bookid, sellerid, startdatetime, enddatetime, reserveprice, minimumincrement, auctionstatus) VALUES (?,?,?,?,?,?,?)",
            [
              bookID,
              sellerid,
              startdatetime,
              enddatetime,
              reserveprice,
              minimumincrement,
              1,
            ],
            (err) => {
              if (err) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    message:
                      "Could not fulfill insert request -- book auction",
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
  function formatDateTime(dateTimeString, format) {
    const date = new Date(dateTimeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
  
    const formattedDateTime = format
      .replace("YYYY", year)
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds);
  
    return formattedDateTime;
  }
  function GetBookListing(req, res, params,connection) {
    const sellerid = params.id;

    if (!sellerid) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ message: "Please login to view your listings" })
      );
      return;
    }

    connection.query(
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

  // function EditListing(req, res, params, body,connection) {
  //   body = JSON.parse(body);
  //   const bookid = params.bookid;
  //   const sellerid = params.sellerid;
  //   console.log(body)
    
  //   if (!bookid || !sellerid) {
  //     res.statusCode = 400;
  //     res.setHeader("Content-Type", "application/json");
  //     res.end(
  //       JSON.stringify({
  //         message: "Book ID and Seller ID are required in the request body.",
  //       })
  //     );
  //     return;
  //   }
  //   connection.query(
  //     "SELECT * FROM project.booklisting WHERE bookid = ? AND sellerid = ?",
  //     [bookid, sellerid],
  //     (err, results) => {
  //       if (err) {
  //         res.statusCode = 500;
  //         res.setHeader("Content-Type", "application/json");
  //         res.end(JSON.stringify({ message: "Internal Server Error." }));
  //         return;
  //       }

  //       if (results.length === 0) {
  //         res.statusCode = 404;
  //         res.setHeader("Content-Type", "application/json");
  //         res.end(
  //           JSON.stringify({
  //             message: "Login to edit a booklisting",
  //           })
  //         );
  //         return;
  //       }

  //       connection.query(
  //         "UPDATE project.booklisting SET title = ?, author = ?, book_condition = ?, price = ?, genre = ?, book_description = ?, quantity = ?, auction = ?, photos = ? WHERE bookid = ? AND sellerid = ?",
  //         [
  //           body.title,
  //           body.author,
  //           body.book_condition,
  //           body.price,
  //           body.genre,
  //           body.book_description,
  //           body.quantity,
  //           body.auction,
  //           body.photos,
  //           bookid,
  //           sellerid,
  //         ],
  //         (err) => {
  //           if (err) {
  //             res.statusCode = 500;
  //             res.setHeader("Content-Type", "application/json");
  //             res.end(
  //               JSON.stringify({
  //                 message:
  //                   "Internal Server Error (Booklisting update).",
  //               })
  //             );
  //             return;
  //           }

  //           if (body.auction === 1) {
  //             const timeFormat = "YYYY-MM-DD HH:mm:ss"; // Adjust the format as needed

  //   const formattedStartDateTime = formatDateTime(body.startdatetime, timeFormat);
  //   const formattedEndDateTime = formatDateTime(body.enddatetime, timeFormat);
  //             console.log("auction active")
  //               connection.query(
  //               "UPDATE project.Auction SET startdatetime = ?, enddatetime = ?, reserveprice = ?, minimumincrement = ? WHERE bookid = ? AND sellerid = ?",
  //               [
  //                 formattedStartDateTime,
  //                 formattedEndDateTime,
  //                 body.reserveprice,
  //                 body.minimumincrement,
  //                 bookid,
  //                 sellerid,
  //               ],
  //               (err) => {
  //                 if (err) {
  //                   res.statusCode = 500;
  //                   res.setHeader("Content-Type", "application/json");
  //                   res.end(
  //                     JSON.stringify({
  //                       message: "Internal Server Error (Auctions update).",
  //                     })
  //                   );
  //                   return;
  //                 }
  //                 res.statusCode = 200;
  //                 res.setHeader("Content-Type", "application/json");
  //                 res.end(
  //                   JSON.stringify({
  //                     message:
  //                       "Book and associated auctions updated successfully.",
  //                   })
  //                 );
  //               }
  //             );
  //           } else {
  //             res.statusCode = 200;
  //             res.setHeader("Content-Type", "application/json");
  //             res.end(
  //               JSON.stringify({ message: "Book updated successfully." })
  //             );
  //           }
  //         }
  //       );
  //     }
  //   );

  // }
  // function handleGetAuctionHistoryRequest(req, res, params,connection) {
  //   const bookid = params.bookid;

  //   if (!bookid) {
  //     res.statusCode = 400;
  //     res.setHeader("Content-Type", "application/json");
  //     res.end(
  //       JSON.stringify({
  //         message: "Please Login to view your auction history",
  //       })
  //     );
  //     return;
  //   }
  //   console.log("bookid is",bookid)
  //   connection.query(
  //     "SELECT * FROM project.bids WHERE bookid = ?",
  //     [bookid],
  //     (err, results) => {
  //       if (err) {
  //         res.statusCode = 500;
  //         res.setHeader("Content-Type", "application/json");
  //         res.end(JSON.stringify({ message: "Internal Server Error." }));
  //         return;
  //       }
  //       console.log("edfwaf",results)
  //       if (results.length === 0) {
  //         res.statusCode = 404;
  //         res.setHeader("Content-Type", "application/json");
  //         res.end(
  //           JSON.stringify({
  //             message:
  //               "No auction history found for the specified book.",
  //           })
  //         );
  //         return;
  //       }

  //       res.statusCode = 200;
  //       res.setHeader("Content-Type", "application/json");
  //       res.end(JSON.stringify(results));
  //     }
  //   );
  // }
  // function EditListing(req, res, params, body, connection) {
  //   body = JSON.parse(body);
  //   console.log("body is",body)
  //   const bookid = params.bookid;
  //   const sellerid = params.sellerid;
  
  //   if (!bookid || !sellerid) {
  //     res.statusCode = 400;
  //     res.setHeader("Content-Type", "application/json");
  //     res.end(
  //       JSON.stringify({
  //         message: "Book ID and Seller ID are required in the request body.",
  //       })
  //     );
  //     return;
  //   }
  
  //   connection.query(
  //     "SELECT * FROM project.booklisting WHERE bookid = ? AND sellerid = ?",
  //     [bookid, sellerid],
  //     (err, results) => {
  //       if (err) {
  //         res.statusCode = 500;
  //         res.setHeader("Content-Type", "application/json");
  //         res.end(JSON.stringify({ message: "Internal Server Error." }));
  //         return;
  //       }
  
  //       if (results.length === 0) {
  //         res.statusCode = 404;
  //         res.setHeader("Content-Type", "application/json");
  //         res.end(
  //           JSON.stringify({
  //             message: "Login to edit a booklisting",
  //           })
  //         );
  //         return;
  //       }
  
  //       const updateBookQuery =
  //         "UPDATE project.booklisting SET title = ?, author = ?, book_condition = ?, price = ?, genre = ?, book_description = ?, quantity = ?, auction = ?, photos = ? WHERE bookid = ? AND sellerid = ?";
  
  //       const updateAuctionQuery =
  //         "UPDATE project.Auction SET startdatetime = ?, enddatetime = ?, reserveprice = ?, minimumincrement = ?, AuctionStatus = ? WHERE bookid = ? AND sellerid = ?";
  
  //       const insertAuctionQuery =
  //         "INSERT INTO project.Auction (bookid, sellerid, startdatetime, enddatetime, reserveprice, minimumincrement,AuctionStatus) VALUES (?, ?, ?, ?, ?, ?)";
  
  //       const timeFormat = "YYYY-MM-DD HH:mm:ss"; // Adjust the format as needed
  
  //       const formattedStartDateTime = formatDateTime(body.startdatetime, timeFormat);
  //       const formattedEndDateTime = formatDateTime(body.enddatetime, timeFormat);
        
  //       connection.query(
  //         updateBookQuery,
  //         [
  //           body.title,
  //           body.author,
  //           body.book_condition,
  //           body.price,
  //           body.genre,
  //           body.book_description,
  //           body.quantity,
  //           body.auction,
  //           body.photos,
  //           bookid,
  //           sellerid,
  //         ],
  //         (err) => {
  //           if (err) {
  //             res.statusCode = 500;
  //             res.setHeader("Content-Type", "application/json");
  //             res.end(
  //               JSON.stringify({
  //                 message: "Internal Server Error (Booklisting update).",
  //               })
  //             );
  //             return;
  //           }
  
  //           if (body.auction === 1) {
  //             console.log("auction active",results[0]['auction']);
  //             console.log(updateAuctionQuery)
  //             if (results[0].auction === 1) {
  //               // Update existing auction entry
  //               console.log("sweff  wefgwerf")
  //               connection.query(
  //                 updateAuctionQuery,
  //                 [
  //                   formattedStartDateTime,
  //                   formattedEndDateTime,
  //                   body.reserveprice,
  //                   body.minimumincrement,
  //                   1,
  //                   bookid,
  //                   sellerid,
  //                 ],
  //                 (err) => {
  //                   if (err) {
  //                     res.statusCode = 500;
  //                     res.setHeader("Content-Type", "application/json");
  //                     res.end(
  //                       JSON.stringify({
  //                         message: "Internal Server Error (Auctions update).",
  //                       })
  //                     );
  //                     return;
  //                   }
  //                   res.statusCode = 200;
  //                   res.setHeader("Content-Type", "application/json");
  //                   res.end(
  //                     JSON.stringify({
  //                       message:
  //                         "Book and associated auctions updated successfully.",
  //                     })
  //                   );
  //                 }
  //               );
  //             } else {
  //               // Insert new auction entry
  //               connection.query(
  //                 insertAuctionQuery,
  //                 [
  //                   bookid,
  //                   sellerid,
  //                   formattedStartDateTime,
  //                   formattedEndDateTime,
  //                   body.reserveprice,
  //                   body.minimumincrement,
  //                   1
  //                 ],
  //                 (err) => {
  //                   if (err) {
  //                     res.statusCode = 500;
  //                     res.setHeader("Content-Type", "application/json");
  //                     res.end(
  //                       JSON.stringify({
  //                         message: "Internal Server Error (Auctions insert).",
  //                       })
  //                     );
  //                     return;
  //                   }
  //                   res.statusCode = 200;
  //                   res.setHeader("Content-Type", "application/json");
  //                   res.end(
  //                     JSON.stringify({
  //                       message:
  //                         "Book and associated auctions inserted successfully.",
  //                     })
  //                   );
  //                 }
  //               );
  //             }
  //           } else {
  //             res.statusCode = 200;
  //             res.setHeader("Content-Type", "application/json");
  //             res.end(
  //               JSON.stringify({ message: "Book updated successfully." })
  //             );
  //           }
  //         }
  //       );
  //     }
  //   );
  // }
  function EditListing(req, res, params, body, connection) {
    body = JSON.parse(body);
    console.log("body is", body);
    const bookid = params.bookid;
    const sellerid = params.sellerid;
  
    if (!bookid || !sellerid) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: "Book ID and Seller ID are required in the request body.",
        })
      );
      return;
    }
  
    connection.query(
      "SELECT * FROM project.booklisting WHERE bookid = ? AND sellerid = ?",
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
              message: "Login to edit a booklisting",
            })
          );
          return;
        }
  
        const updateBookQuery =
          "UPDATE project.booklisting SET title = ?, author = ?, book_condition = ?, price = ?, genre = ?, book_description = ?, quantity = ?, auction = ?, photos = ? WHERE bookid = ? AND sellerid = ?";
  
        const updateAuctionQuery =
          "UPDATE project.Auction SET startdatetime = ?, enddatetime = ?, reserveprice = ?, minimumincrement = ?, AuctionStatus = ? WHERE bookid = ? AND sellerid = ?";
  
        const insertAuctionQuery =
          "INSERT INTO project.Auction (bookid, sellerid, startdatetime, enddatetime, reserveprice, minimumincrement, AuctionStatus) VALUES (?, ?, ?, ?, ?, ?, ?)";
  
        const timeFormat = "YYYY-MM-DD HH:mm:ss"; // Adjust the format as needed
  
        const formattedStartDateTime = formatDateTime(
          body.startdatetime,
          timeFormat
        );
        const formattedEndDateTime = formatDateTime(
          body.enddatetime,
          timeFormat
        );
  
        connection.query(
          updateBookQuery,
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
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  message: "Internal Server Error (Booklisting update).",
                })
              );
              return;
            }
  
            if (body.auction === 1) {
              console.log("auction active", body.auction);
              console.log(updateAuctionQuery);
              if (body.auction === 1) {
                // Update existing auction entry
                console.log("sweff wefgwerf");
                connection.query(
                  updateAuctionQuery,
                  [
                    formattedStartDateTime,
                    formattedEndDateTime,
                    body.reserveprice,
                    body.minimumincrement,
                    1,
                    bookid,
                    sellerid, // Add sellerid to the query parameters
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
                      JSON.stringify({
                        message:
                          "Book and associated auctions updated successfully.",
                      })
                    );
                  }
                );
              } else {
                // Insert new auction entry
                connection.query(
                  insertAuctionQuery,
                  [
                    bookid,
                    sellerid,
                    formattedStartDateTime,
                    formattedEndDateTime,
                    body.reserveprice,
                    body.minimumincrement,
                    1,
                  ],
                  (err) => {
                    if (err) {
                      res.statusCode = 500;
                      res.setHeader("Content-Type", "application/json");
                      res.end(
                        JSON.stringify({
                          message: "Internal Server Error (Auctions insert).",
                        })
                      );
                      return;
                    }
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        message:
                          "Book and associated auctions inserted successfully.",
                      })
                    );
                  }
                );
              }
            } else {
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
  
  function handleGetAuctionHistoryRequest(req, res, params, connection) {
    const bookid = params.bookid;

    if (!bookid) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
            JSON.stringify({
                message: "Please Login to view your auction history",
            })
        );
        return;
    }

    connection.query(
        "SELECT b.BidID, b.UserID, c.FirstName, c.LastName, b.PriceList, b.MaxLimit, b.AutoBid FROM project.bids b JOIN project.customer c ON b.UserID = c.UserID WHERE b.bookid = ?",
        [bookid],
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
                        message: "No auction history found for the specified book.",
                    })
                );
                return;
            }
           // console.log("results are",results)
            // Map the PriceList to an array of prices
            results.forEach((bid) => {
                bid.PriceList = bid.PriceList.split(';').map(Number);
            });

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(results));
        }
    );
}


  function handleGetFilterAuctionsRequest(req, res, params,connection) {
    let sellerid = params.sellerid;
    let query =
      "SELECT * FROM project.booklisting b join project.Auction a on b.sellerid = a.sellerid  WHERE b.auction = 1 AND ";
    const conditions = [];

    for (const key in params) {
      if (key === "sellerid") {
        continue;
      }
      conditions.push(`${key} = '${params[key]}'`);
    }

    query += conditions.join(" AND ");
    query += " AND a.sellerid = " + sellerid;
    connection.query(query, (err, results) => {
      if (err) {
        //console.log(query);
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            message: "Invalid query - auction filter",
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
 function handleGetFilterListingsRequest(req, res, params,connection) {
    let query = "SELECT * FROM project.booklisting WHERE ";
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
    //console.log(query)
    connection.query(query, (err, results) => {
      if (err) {
        console.log(err);
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            message: "Invalid query for filter listings",
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
 function handlePutEditAuctionRequest(req, res, params, body,connection) {
    body = JSON.parse(body);
    const bookid = params.bookid;
    const sellerid = params.sellerid;

    if (!bookid || !sellerid) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: "Login to edit a listing",
        })
      );
      return;
    }

    connection.query(
      "SELECT * FROM project.Auction WHERE bookid = ? AND sellerid = ?",
      [bookid, sellerid],
      (err, results) => {
        if (err) {
          console.log(err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ message: "Query Error - Edit auction" }));
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

        connection.query(
          "UPDATE project.Auction SET startdatetime = ?, enddatetime = ?, reserveprice = ?, minimumincrement = ? WHERE bookid = ? AND sellerid = ?",
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
//  function handleDeleteListingRequest(req, res, params,connection) {
//     const bookid = params.bookid;
//     const sellerid = params.sellerid;
//     console.log("bookid and seller id is",bookid,sellerid)

//     if (!bookid) {
//       res.statusCode = 400;
//       res.setHeader("Content-Type", "application/json");
//       res.end(JSON.stringify({ message: "Book ID is missing." }));
//       return;
//     }

//     // First, delete the associated rows from the auctions table based on both bookid and sellerid
//     connection.query(
//       "DELETE FROM project.Auction WHERE bookid = ? AND sellerid = ?",
//       [bookid, sellerid],
//       (err) => {
//         if (err) {
//           res.statusCode = 500;
//           res.setHeader("Content-Type", "application/json");
//           res.end(
//             JSON.stringify({
//               message: "Query Error (Auctions deletion).",
//             })
//           );
//           return;
//         }

//         // Now, delete the row from the booklisting table based on bookid
//         connection.query(
//           "DELETE FROM project.booklisting WHERE bookid = ? AND sellerid = ?",
//           [bookid, sellerid],
//           (err) => {
//             if (err) {
//               res.statusCode = 500;
//               res.setHeader("Content-Type", "application/json");
//               res.end(
//                 JSON.stringify({
//                   message: "Internal Server Error (Booklisting deletion).",
//                 })
//               );
//               return;
//             }

//             // Successful deletion
//             res.statusCode = 200;
//             res.setHeader("Content-Type", "application/json");
//             res.end(
//               JSON.stringify({
//                 message:
//                   "Book and associated auctions deleted successfully.",
//               })
//             );
//           }
//         );
//       }
//     );
//   }
function handleDeleteListingRequest(req, res, params, connection) {
  const bookid = params.bookid;
  const sellerid = params.sellerid;
 // console.log("bookid and seller id is", bookid, sellerid);

  if (!bookid) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Book ID is missing." }));
    return;
  }

  // Check the auction status before deletion
  connection.query(
    "SELECT * FROM project.booklisting WHERE bookid = ? AND sellerid = ?",
    [bookid, sellerid],
    (err, auctionResults) => {
      if (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            message: "Query Error (Auction status check).",
          })
        );
        return;
      }

      // Check if the auction is active (status is 1)
      const isAuctionActive = auctionResults.length > 0 && auctionResults[0].Auction === 1;
     // console.log(auctionResults, isAuctionActive);

      // Proceed with deletion based on the auction status
      if (isAuctionActive) {
        // Delete the associated rows from the auctions table
        connection.query(
          "DELETE FROM project.Auction WHERE bookid = ? AND sellerid = ?",
          [bookid, sellerid],
          (err) => {
            if (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  message: "Query Error (Auctions deletion).",
                })
              );
              return;
            }

            // Now, delete the row from the booklisting table
            connection.query(
              "DELETE FROM project.booklisting WHERE bookid = ? AND sellerid = ?",
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
                    message: "Book and associated auctions deleted successfully.",
                  })
                );
              }
            );
          }
        );
      } else {
        // If the auction is not active, only delete from booklisting
        connection.query(
          "DELETE FROM project.booklisting WHERE bookid = ? AND sellerid = ?",
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
                message: "Book deleted successfully.",
              })
            );
          }
        );
      }
    }
  );
}


 function handleDeleteAuctionRequest(req, res, params,connection) {
    const bookid = params.bookid;
    const sellerid = params.sellerid;

    if (!bookid || !sellerid) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: "Login to delete an auction",
        })
      );
      return;
    }

    // First, delete the associated rows from the auctions table based on both bookid and sellerid
    connection.query(
      "DELETE FROM project.Auction WHERE bookid = ? AND sellerid = ?",
      [bookid, sellerid],
      (err) => {
        if (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              message: "Database query Error (Auctions deletion).",
            })
          );
          return;
        }

        // Next, update the auction status in the booklisting table to 0 (indicating no auction)
        connection.query(
          "UPDATE project.booklisting SET auction = 0 WHERE bookid = ? AND sellerid = ?",
          [bookid, sellerid],
          (err) => {
            if (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  message: "Query Error (Auction status update).",
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
  function handleRelistBookRequest(req, res, params, body,connection) {
    const bookid = params.bookid;
    const sellerid = params.sellerid;

    if (!bookid || !sellerid) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: "Login to relist the listing",
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
    connection.query(
      "UPDATE project.booklisting SET title = ?, author = ?, book_condition = ?, price = ?, genre = ?, book_description = ?, quantity = ?, auction = ?, photos = ? WHERE bookid = ? AND sellerid = ?",
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
            connection.query(
            "UPDATE project.Auction SET startdatetime = ?, enddatetime = ?, reserveprice = ?, minimumincrement = ? WHERE bookid = ? AND sellerid = ?",
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
  function sellerbookdetails(req,res,params,connection)
  {
    //   if (pathname.startsWith("/book") && req.method === "GET") {
        console.log("identified request");
        const bookId = params.id;
  
        // Query the database to retrieve book details along with auction details
        const query = `
          SELECT b.*, 
                 a.StartDateTime,
                 a.EndDateTime,
                 a.ReservePrice,
                 a.MinimumIncrement,
                 a.CurrentBid,
                 a.AuctionStatus,
                 a.BuyerID
            FROM booklisting b 
                 LEFT JOIN auction a ON b.BookID = a.BookID 
           WHERE b.BookID = ?;
        `;
      //console.log("query is",query)
       connection.query(query, [bookId], (err, results) => {
          if (err) {
            console.log("some db error");
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
                message: "No book found",
              })
            );
            return;
          }
  
          const bookDetails = results[0];
          //console.log("details are",bookDetails)
  
          // Check if Auction = 1 in booklisting
          if (bookDetails.Auction === 1 || bookDetails.Auction === '1') {
            // Include auction details
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(bookDetails));
          } else {
            // Exclude auction details
            const { Auction, ...bookListingDetails } = bookDetails;
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(bookListingDetails));
          }
        });
      } 
    
  module.exports = {
    createBookListing,
    GetBookListing,
    EditListing,
    handleGetAuctionHistoryRequest,
    handleGetFilterAuctionsRequest,
    handleGetFilterListingsRequest,
    handlePutEditAuctionRequest,
    handleDeleteListingRequest,
    handleDeleteAuctionRequest,
    handleRelistBookRequest,
    checkAndNotifyExpiredAuctions,
    sellerbookdetails
  }
