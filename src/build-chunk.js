const { empty } = require("./util");
const path = require("path");
const { readFile } = require("./file");
const syncTemplate = readFile(
  path.join(__dirname, "template/sync-template.js")
);
const dynamicTemplate = readFile(
  path.join(__dirname, "template/dynamic-template.js")
);

let chunkId = 0;
const chunks = [];
// 和主chunk毫无关联的时候，各自打包
// 分离出来的chunk导入的模块，在主chunk也导入的时候，那么就打包到主chunk去。
// 分离出来的chunk入口也被主chunk导入时候，直接将整个chunk打包到主chunk去
// 分离出来的不同chunk，导入了相同的模块，理应打包到相应的chunk去。
function buildChunk(entryModule, parent) {
  // 原则2
  if (parentIncludeModule(entryModule, parent)) {
    return;
  }
  const chunk = parent
    ? new Chunk(chunkId++, entryModule, parent)
    : new MainChunk(chunkId++, entryModule);
  chunks.push(chunk);
  addModuleToChunk(entryModule, chunk);
  return chunks;
}

function addModuleToChunk(module, chunk) {
  if (parentIncludeModule(module, chunk)) {
    return;
  }
  const childChunk = isParentChunk(module, chunk);
  if (childChunk) {
    childChunk.modules = childChunk.modules.filter(
      (m) => m === module || module.syncDeps.includes(m)
    );
  }
  // 前者对应了原则1
  // 后者对应了原则3
  chunk.modules.push(module);
  module.chunks.push(chunk); // 一个模块可能属于多个chunk
  module.syncDeps.forEach((syncDep) => addModuleToChunk(syncDep.module, chunk));
  module.asyncDeps.forEach((asyncDep) => buildChunk(asyncDep.module, chunk));
}

function isParentChunk(module, parentChunk) {
  const chunks = module.chunks;
  for (let i = 0; i < chunks.length; i++) {
    if (recuriveIsParentChunk(chunks[i], parentChunk)) {
      return chunks[i];
    }
  }
  return null;
}

function recuriveIsParentChunk(chunk, parentChunk) {
  while (chunk) {
    if (chunk === parentChunk) {
      return true;
    }
    chunk = chunk.parent;
  }
  return false;
}

function parentIncludeModule(module, parent) {
  while (parent) {
    if (parent.modules.includes(module)) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function chunkFindModule(chunk, module) {
  if (!chunk) {
    return false;
  }
  if (chunk.modules.includes(module)) {
    return true;
  }
  return chunkFindModule(chunk.parent, module);
}

class Chunk {
  constructor(id, entry, parent) {
    this.id = id;
    this.parent = parent;
    this.entry = entry;
    this.modules = [];
    this.filename = `${id}-bundle`;
  }

  buildOutput() {
    const buffers = [];
    buffers.push(
      `(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[${this.id}],{`
    );

    this.buildModules(buffers);
    buffers.push("}]);");

    return buffers;
  }

  buildModules(buffers) {
    const modules = this.modules;
    for (let i = 0; i < modules.length; i++) {
      const chunkModule = modules[i];
      const { absoulutePath, rewriteCode } = chunkModule;
      buffers.push(`"${absoulutePath}":`);
      buffers.push("(function(module, exports, __webpack_require__) {\n");
      buffers.push('"use strict";\n');
      buffers.push(`eval("${rewriteCode}")\n`);
      buffers.push(`}),\n`);
    }

    return buffers;
  }
}

class MainChunk extends Chunk {
  constructor(id, entry) {
    super(id, entry, null);
    this.filename = "bundle";
  }

  buildOutput(total) {
    let buffers = [];
    if (total > 1) {
      buffers.push(dynamicTemplate);
    } else {
      buffers.push(syncTemplate);
    }
    buffers.push('"' + this.entry.absoulutePath + '");\n');
    buffers.push("/******/ })");
    buffers.push("({\n");

    this.buildModules(buffers);
    buffers.push("});");

    return buffers;
  }
}

module.exports = buildChunk;
