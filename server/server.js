const http = require("http");
const fs = require("fs");
const path = require("path");
const mime = require("./mime-lookup.js");
const socketIO = require("socket.io");

const hostname = "127.0.0.1";
const port = 1337;

const readFile = (req, res, filename = req.url) => {
  fs.readFile(path.join(__dirname, "..", filename), (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.setHeader("Content-Type", mime.lookup(path.extname(filename)));
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

const io = socketIO(server);

io.on("connection", (socket) => {
  console.log("Socket connected.");
  socket.on("disconnect", () => {
    console.log("Socket disconnected.");
  });
  // "ping" and "pong" are reserved event names: https://github.com/socketio/socket.io/issues/2414#issuecomment-176727699.
  socket.on("bing", (message) => {
    // console.log(message);
    socket.broadcast.emit("bong", message);
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
