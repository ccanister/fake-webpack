const { writeFile, readFile } = require("./file");
const path = require("path");
const syncTemplate = readFile(
  path.join(__dirname, "template/sync-template.js")
);

module.exports = function buildOuptut(sources) {
  const buffer = [];

  buffer.push(syncTemplate);
  buffer.push('"' + sources.entry + '");\n');
  buffer.push("/******/ })");
  buffer.push("({\n");

  const keys = Object.keys(sources.modules);
  for (let i = 0; i < keys.length; i++) {
    const chunkModule = sources.modules[keys[i]];
    const { absoulutePath, rewriteCode } = chunkModule;
    buffer.push(`"${absoulutePath}":`);
    buffer.push("(function(module, exports, __webpack_require__) {\n");
    buffer.push('"use strict";\n');
    buffer.push(`eval("${rewriteCode}")\n`);
    buffer.push(`}),\n`);
  }
  let filename = "bundle";
  buffer.push("});");
  writeFile(filename, buffer);
};
