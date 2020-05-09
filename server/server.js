const http = require("http");
// const url = require("url");
const fs = require("fs");
const path = require("path");

const hostname = "127.0.0.1";
const port = 1337;

const readFile = (req, res, filename = req.url) => {
  fs.readFile(path.join(__dirname, "..", filename), (err,data) => {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  if (req.url === "/") {
    readFile(req, res, "index.html");
  } else {
    readFile(req, res);
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});