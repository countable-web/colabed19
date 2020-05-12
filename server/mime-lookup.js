// NOTE: This is where I started to regret not using Express.
const path = require("path");

const mime = {
  lookup: (extname) => {
    mimeType = "text/plain";
    if (extname === ".html") {
      mimeType = "text/html";
    } else if (extname === ".css") {
      mimeType = "text/css";
    } else if (extname === ".js" || extname === ".mjs") {
      mimeType = "text/javascript";
    }
    return mimeType;
  },
};

module.exports = mime;
