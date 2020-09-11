const { writeFile } = require("./file");
const { empty } = require("./util");
module.exports = function buildOutput(sources) {
  const chunks = sources.chunks;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (empty(chunk.modules)) {
      continue;
    }
    const buffers = chunk.buildOutput(chunks.length);
    writeFile(chunk.filename, buffers);
  }
};
