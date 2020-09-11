import ces from "/Users/zhaorenjie/Documents/project/js/fake-webpack/example/simple/c.js";
import { cfn } from "./c";
const ccjs = require("./c");
const { num } = require("./c");

console.log(ces);
console.log(cfn);
console.log(ccjs);
console.log(num);

import { count } from "./a";
const acjs = require("./a");
const { afn } = require("./a");
import name from "./a";

console.log(count);
console.log(acjs);
console.log(afn);
console.log(name);
