const { writeFile } = require("./file");

module.exports = function buildOutput(sources) {
  const chunks = sources.chunks;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const buffers = chunk.buildOutput(chunks.length);
    writeFile(chunk.filename, buffers);
  }
};
