const { readFile } = require("./file");
const parse = require("./parse");
const { parsePath } = require("./resolve-path");
const { ownkeys } = require("./util");

function buildDep(entry, beRelativePath, sources) {
  const entryModule = new Module(entry, beRelativePath, sources);
  transDepsPath(sources);
  sources.entry = entryModule.absoulutePath;

  return entryModule;
}

// 将依赖的路径转化成绝对路径
function transDepsPath(sources) {
  const { modules } = sources;
  const keys = ownkeys(modules);
  for (let i = 0; i < keys.length; i++) {
    const { deps } = modules[keys[i]];
    transDepPath(deps, sources);
  }
}

function transDepPath(deps, sources) {
  const { modules, mapModuleNameToId } = sources;
  for (let i = 0; i < deps.length; i++) {
    deps[i].module = modules[mapModuleNameToId[deps[i].path]];
  }
}

let id = 0;
class Module {
  constructor(path, beRelativePath, sources) {
    this.path = path;
    this.chunks = [];
    const absoulutePath = (this.absoulutePath = parsePath(
      path,
      beRelativePath
    ));
    if (sources.modules[absoulutePath]) {
      sources.mapModuleNameToId[path] = absoulutePath;
      return;
    }
    this.init(sources);
  }

  init(sources) {
    const { path, absoulutePath } = this;
    this.id = id++;
    this.code = readFile(absoulutePath);
    sources.modules[absoulutePath] = this;
    sources.mapModuleNameToId[path] = absoulutePath;
    const { deps } = parse(this);
    for (let i = 0; i < deps.length; i++) {
      new Module(deps[i].path, absoulutePath, sources);
    }
  }
}

class LoaderModule {
  constructor(absoulutePath, sources) {
    this.absoulutePath = absoulutePath;
  }
}

module.exports = buildDep;
