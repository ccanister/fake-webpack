
function bfn() {
  console.log("b-------");
  console.log(z);
}
import("./c").then(console.log);
module.exports.bfn = bfn;
