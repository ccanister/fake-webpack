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
    const { asyncDeps, syncDeps } = modules[keys[i]];
    transDepPath(asyncDeps, sources);
    transDepPath(syncDeps, sources);
  }
}

function transDepPath(deps, sources) {
  const { modules, mapModuleNameToId } = sources;
  for (let i = 0; i < deps.length; i++) {
    deps[i] = modules[mapModuleNameToId[deps[i]]];
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
    const { asyncDeps, syncDeps } = parse(this);
    for (let i = 0; i < syncDeps.length; i++) {
      new Module(syncDeps[i], absoulutePath, sources);
    }
    for (let i = 0; i < asyncDeps.length; i++) {
      new Module(asyncDeps[i], absoulutePath, sources);
    }
  }
}

module.exports = buildDep;
