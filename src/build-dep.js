const { readFile } = require("./file");
const parse = require("./parse");
const { parsePath } = require("./resolve-path");
const { ownkeys } = require("./util");

async function buildDep(entry, beRelativePath, sources) {
  const entryModule = await dispatchModule(entry, beRelativePath, sources);
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

async function dispatchModule(path, beRelativePath, sources) {
  let module;
  if (path.match(/!/)) {
    module = new LoaderModule(path, beRelativePath);
  } else {
    module = new Module(path, beRelativePath);
  }
  const absoulutePath = module.absoulutePath;
  if (sources.modules[absoulutePath]) {
    sources.mapModuleNameToId[path] = absoulutePath;
    return null;
  }
  await module.init(sources);
  return module;
}

let id = 0;
class Module {
  constructor(path, beRelativePath) {
    this.chunks = [];
    this.setPath(path, beRelativePath);
  }

  setPath(path, beRelativePath) {
    this.path = path;
    return (this.absoulutePath = parsePath(path, beRelativePath));
  }

  async init(sources) {
    const { path, absoulutePath } = this;
    this.id = id++;
    this.code = await this.readCode(absoulutePath);
    sources.modules[absoulutePath] = this;
    sources.mapModuleNameToId[path] = absoulutePath;
    const { deps } = parse(this);
    for (let i = 0; i < deps.length; i++) {
      const depPath = deps[i].path;
      await dispatchModule(depPath, absoulutePath, sources);
    }
  }

  async readCode() {
    return readFile(this.absoulutePath);
  }
}

class LoaderModule extends Module {
  constructor(path, beRelativePath, sources) {
    super(path, beRelativePath, sources);
  }

  setPath(path, beRelativePath) {
    const loaderNames = path.split("!");
    const contentPath = loaderNames.pop();
    const loaderPaths = loaderNames.map((name) => parsePath(name));
    const contentAbsolutePath = parsePath(contentPath, beRelativePath);
    this.path = path;
    this.contentAbsolutePath = contentAbsolutePath;
    this.loaderPaths = loaderPaths;
    return (this.absoulutePath = [...loaderPaths, contentAbsolutePath].join(
      "!"
    ));
  }

  async readCode() {
    return await this.executeLoader();
  }

  executeLoader() {
    const { loaderPaths, contentAbsolutePath, absoulutePath: request } = this;
    const content = readFile(contentAbsolutePath);
    const self = this;
    return new Promise((resolve) => {
      const loaderFuns = [];
      for (let i = loaderPaths.length - 1; i >= 0; i--) {
        loaderFuns.push(require(loaderPaths[i]));
      }
      let remainingRequest = this.popRequest(request);
      let currentRequest = request;

      // 改成变量声明的箭头函数，会报undefined错误，可能是变量提升
      function nextLoader(content, needPop) {
        if (needPop) {
          remainingRequest = self.popRequest(remainingRequest);
          currentRequest = self.popRequest(currentRequest);
        }
        if (!loaderFuns.length) {
          resolve(content);
          return;
        }
        let isAsync = false;
        const context = {
          callback: (error, content) => {
            if (error) {
              throw error;
            }
            return nextLoader(content, true);
          },
          async: function () {
            isAsync = true;
            return this.callback;
          },
          remainingRequest,
          currentRequest,
        };

        const resp = loaderFuns.pop().call(context, content);
        if (!isAsync) {
          nextLoader(resp, true);
        }
      }

      nextLoader(content, false);
    });
  }

  popRequest(request) {
    const requests = request.split("!");
    requests.pop();
    return requests.join("!");
  }
}

module.exports = buildDep;
