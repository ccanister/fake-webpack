const babylon = require("babylon");
const traverse = require("@babel/traverse").default;

module.exports = function parse(module) {
  const { code } = module;
  const ast = babylon.parse(code, {
    sourceType: "module",
    plugins: ["dynamicImport"],
  });
  const syncDeps = new Set();
  const asyncDeps = new Set();
  traverse(ast, {
    ImportDeclaration(path) {
      syncDeps.add(path.node.source.value);
      module.esModule = true;
    },
    CallExpression(path) {
      if (path.node.callee.name === "require") {
        const name = path.node.arguments[0].value;
        syncDeps.add(name);
      }
    },
    ExportDefaultDeclaration() {
      module.esModule = true;
    },
    ExportNamedDeclaration() {
      module.esModule = true;
    },
    Import(path) {
      asyncDeps.add(path.parent.arguments[0].value);
    },
  });

  module.ast = ast;
  module.asyncDeps = Array.from(asyncDeps).map((path) => new Dep(path));
  module.syncDeps = Array.from(syncDeps).map((path) => new Dep(path));
  module.deps = module.asyncDeps.concat(module.syncDeps);

  return module;
};

class Dep {
  constructor(path) {
    this.module = null;
    this.path = path;
  }
}
