const buildDep = require("./build-dep");
const rewriteCode = require("./rewrite-code");
const buildOutput = require("./build-output");
const buildChunk = require("./build-chunk");

class Compiler {
  constructor(entry) {
    const sources = (this.sources = { modules: {}, mapModuleNameToId: {} });
    const entryModule = buildDep(entry, __dirname, sources);
    sources.chunks = buildChunk(entryModule, null);
    rewriteCode(sources);
    buildOutput(sources);
  }
}

new Compiler("../example/simple/index.js");
