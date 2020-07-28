module.exports.empty = function (obj) {
  return obj && obj.length === 0;
};

module.exports.ownkeys = function (obj) {
  return Object.keys(obj);
};

module.exports.isMainChunk = function (chunk) {
  return chunk.id === 0;
};
