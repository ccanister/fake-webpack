import { afn } from "./a";

import("./b").then(({ bfn }) => bfn());
import("./a").then(({ afn }) => afn());
