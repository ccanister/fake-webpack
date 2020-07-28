import { z } from "./common";

import("./a").then((a) => a.afn());
import("./b").then(({ bfn }) => bfn());
console.log(z);
