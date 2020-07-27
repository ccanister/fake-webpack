const { readFile } = require("./file");
const parse = require("./parse");
const { parsePath } = require("./resolve-path");

let id = 0;
class Module {
  constructor(path, beRelativePath, sources) {
    this.path = path;
    this.absoulutePath = parsePath(path, beRelativePath);
    this.init(sources);
  }

  init(sources) {
    const { path, absoulutePath } = this;
    this.id = id++;
    this.code = readFile(absoulutePath);
    sources.modules[absoulutePath] = this;
    sources.mapModuleNameToId[path] = absoulutePath;
    const { asyncDeps, syncDeps } = parse(this);
    for (let i = 0; i < syncDeps.length; i++) {
      new Module(syncDeps[i], absoulutePath, sources);
    }
  }
}

module.exports = Module;