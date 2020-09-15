import { query } from "./c";
import { afn } from "./a";

import("./b").then(({ bfn }) => bfn());
