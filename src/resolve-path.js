const path = require("path");
const fs = require("fs");
const { fileExist } = require("./file");

function parsePath(filepath, beRelativePath) {
  if (path.isAbsolute(filepath) && fileExist(filepath)) {
    return filepath;
  }

  let absoultePath =
    resolveRelativePath(filepath, beRelativePath || "") + getExtName(filepath);
  if (fileExist(absoultePath)) {
    return absoultePath;
  }

  // 同级目录是否有
  absoultePath = path.resolve(
    beRelativePath ? path.dirname(beRelativePath) : __dirname,
    filepath
  );
  if (fileExist(absoultePath)) {
    return absoultePath;
  }

  // node_modules 应该向上寻找node_modules
  absoultePath = path.resolve(__dirname, "../node_modules", filepath);
  if (fileExist(absoultePath)) {
    if (fs.lstatSync(absoultePath).isDirectory()) {
      const packagesJson = JSON.parse(
        fs.readFileSync(path.resolve(absoultePath, "package.json")).toString()
      );
      if (packagesJson.main) {
        return path.resolve(absoultePath, packagesJson.main);
      }
    } else {
      return absoultePath;
    }
  }
}

function resolveRelativePath(filepath, beRelativePath) {
  return path.resolve(path.dirname(beRelativePath), filepath);
}

function getExtName(filepath) {
  return path.extname(filepath) === "" ? ".js" : "";
}

module.exports = { parsePath };
