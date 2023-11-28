const http = require("http");
const mysql = require("mysql2");
const url = require("url");
const qs = require("qs");
const cors = require("cors");

class WebServer {
  constructor() {
    this.port = 8081;
    this.hostname = "127.0.0.1";
    this.server = http.createServer(this.handleRequest.bind(this));
    this.dbCon = mysql.createConnection({
      host: "127.0.0.1",
      user: "root",
      password: "password",
      database: "project",
    });

    this.dbCon.connect((err) => {
      if (err) {
        console.error("Database not created " + err.stack);
        return;
      }
      console.log("Connected to database");
      this.startServer(() => {
        console.log("Server started on port " + this.port);
      });
    });
  }

  startServer() {
    this.server.listen(this.port, () => {
      console.log(`Server is listening on port ${this.port}`);
    });
  }

  handleRequest(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    console.log("handling request");
    // Parse the URL
    const { method, headers } = req;
    const contentType = headers["content-type"];
    const { pathname } = url.parse(req.url, true);
    const myparams = url.parse(req.url, true).query;
    const params = qs.parse(myparams);
    console.log("before request");

    let body = "";

    req.on("data", (block) => {
      body += block.toString();
    });
    req.on("end", () => {
      console.log("looking for request");
      if (pathname.startsWith("/book") && req.method === "GET") {
        console.log("identified request");
        const bookId = params.id;
        // Query the database to retrieve a bookID
        this.dbCon.query(
          "SELECT * FROM booklisting WHERE bookID = ?",
          [bookId],
          (err, results) => {
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
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(results));
          }
        );
      } else {
        console.log("what request?");
        // Return a 404 response for other paths
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      }
    });
  }
}

const webServer = new WebServer();