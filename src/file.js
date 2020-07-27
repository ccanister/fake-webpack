const fs = require("fs");
const path = require("path");

function readFile(path) {
  return fs.readFileSync(path).toString();
}

function writeFile(filename, buffer) {
  if (!fileExist("dist")) {
    fs.mkdirSync("dist");
  }
  const filepath = path.join("dist", `${filename}.js`);

  fs.writeFile(filepath, buffer.join(""), function (error) {
    if (error) {
      console.error(error);
    }
  });
}

function fileExist(path) {
  return fs.existsSync(path);
}

module.exports = { readFile, writeFile, fileExist };
