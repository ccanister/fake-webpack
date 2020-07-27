const Module = require("./module");
const rewriteCode = require("./rewrite-code");
const buildOuptut = require("./build-output");

class Compiler {
  constructor(entry) {
    const sources = (this.sources = { modules: {}, mapModuleNameToId: {} });
    const entryModule = new Module(entry, __dirname, sources);
    sources.entry = entryModule.absoulutePath;
    rewriteCode(sources);
    buildOuptut(sources);
  }
}

new Compiler("../example/simple/index.js");
