const buildDep = require("./build-dep");
const rewriteCode = require("./rewrite-code");
const buildOutput = require("./build-output");
const buildChunk = require("./build-chunk");

class Compiler {
  constructor(entry) {
    this.entry = entry;
    this.sources = { modules: {}, mapModuleNameToId: {} };
  }

  async start() {
    const { sources, entry } = this;
    const entryModule = await buildDep(entry, __dirname, sources);
    sources.chunks = buildChunk(entryModule, null);
    rewriteCode(sources);
    buildOutput(sources);
  }
}

const compiler = new Compiler("../example/async/index.js");
compiler.start();
