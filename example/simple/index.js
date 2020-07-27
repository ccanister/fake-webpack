import { afn } from "./a";
const { bfn } = require("./b");
const d = require("./d");
import { count, cfn } from "./c";

afn();
bfn();
cfn();
d.default();

const query = {};
query.count = 1;
console.log(query);
function test() {
  console.log(count);
}
test();
