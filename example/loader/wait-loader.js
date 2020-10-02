module.exports = function (content) {
  const callback = this.async();
  console.log("5s后再继续");
  setTimeout(() => {
    callback(null, content);
  }, 5000);
};
