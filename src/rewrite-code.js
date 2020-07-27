const traverse = require("@babel/traverse").default;
const path = require("path");
const generator = require("@babel/generator");
const t = require("@babel/types");

// 标志了esmodule的模块，不以结构方式导入即import xxx from "xxx"时候
// 会导入模块的default属性
// 所有有些cjs模块标志了esmodule后，会按照exports.default = xx形式导出
// 即export default xx === (exports.default = xxx，标志了esmodule后)
// 如果cjs模块没有esmodule标志，那么也会定义一个getter的函数导出，以xx.a形式调用
// 其实想一下，es就是default属性，那么我们规定一个cjs模块的属性代表全局就可以了，webpack用了a名称。
// 如import cfn from "./c";
// var _c__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(xxx);
// var _c__WEBPACK_IMPORTED_MODULE_2___default = __webpack_require__.n(_c__WEBPACK_IMPORTED_MODULE_2__);
// _c__WEBPACK_IMPORTED_MODULE_2___default.a();
// __webpack_require__.n为cjs模块定义了get方法
// cjs -> import  // import只有default需要用特殊之去替代，此时以xx.a形式调用，其他都直接按照xx[name]形式调用
// cjs -> require
// es -> import
// es -> require  // require就是把模块导出的所有东西放在一个变量中，包含了default属性等
// 所以当es使用了export default a = 1，应该用require("xx").default调用
module.exports = function rewriteCode(sources) {
  const { mapModuleNameToId, modules } = sources;

  const keys = Object.keys(modules);
  for (let j = 0; j < keys.length; j++) {
    let identifierMap = {}; // 存储被改变的导入变量明
    const esImport = {};
    const chunkModule = modules[keys[j]];
    const { ast, id, esModule } = chunkModule;
    // 假设现在是require，我们不会对require的exports作任何处理，会对require导入调用__webpack__require方法
    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.name === "require") {
          const absoulutePath = mapModuleNameToId[path.node.arguments[0].value];
          path.replaceWith(
            t.callExpression(t.identifier("__webpack_require__"), [
              t.stringLiteral(absoulutePath),
            ])
          );
        }
      },
      ExportNamedDeclaration(path) {
        const declaration = path.node.declaration;
        let name = "";
        if (t.isVariableDeclaration(declaration)) {
          name = declaration.declarations[0].id.name;
        } else if (t.isFunctionDeclaration(declaration)) {
          name = declaration.id.name;
        }
        // export const a = 1 => const a = 1;
        path.replaceWith(path.node.declaration);
        const root = path.findParent((path) => t.isProgram(path));
        root
          .get("body.0")
          .insertBefore(
            t.callExpression(
              t.memberExpression(
                t.identifier("__webpack_require__"),
                t.identifier("d")
              ),
              [
                t.identifier("exports"),
                t.stringLiteral(name),
                t.functionExpression(
                  null,
                  [],
                  t.blockStatement([t.returnStatement(t.identifier(name))])
                ),
              ]
            )
          );
      },
      ExportDefaultDeclaration(path) {
        path.replaceWith(
          t.assignmentExpression(
            "=",
            t.identifier('exports["default"]'),
            path.node.declaration
          )
        );
      },
      // import {} from ""和import xx from ""都是一样的
      ImportDeclaration(nodePath) {
        const importPath = nodePath.node.source.value;
        const absoulutePath = mapModuleNameToId[importPath];
        const importSource = modules[absoulutePath];
        if (esImport[importPath] != null) {
          identifierMap = getIdentiferMap(
            identifierMap,
            esImport[importPath],
            nodePath.node.specifiers,
            importSource.esModule
          );
          nodePath.remove();
          return;
        }
        const moduleName = getModuleName(
          importPath,
          Object.keys(esImport).length
        );
        esImport[importPath] = moduleName;
        if (!importSource.esModule) {
          // 如果不是es模块，直接将default也输出
          const defaultModuleName = `${moduleName}_default`;
          nodePath.insertAfter(
            t.variableDeclaration("var", [
              t.variableDeclarator(
                t.identifier(defaultModuleName),
                t.callExpression(
                  t.memberExpression(
                    t.identifier("__webpack_require__"),
                    t.identifier("n")
                  ),
                  [t.identifier(moduleName)]
                )
              ),
            ])
          );
        }
        identifierMap = getIdentiferMap(
          identifierMap,
          moduleName,
          nodePath.node.specifiers,
          importSource.esModule
        );
        nodePath.replaceWith(
          t.variableDeclaration("var", [
            t.variableDeclarator(
              t.identifier(moduleName),
              t.callExpression(t.identifier("__webpack_require__"), [
                t.stringLiteral(absoulutePath),
              ])
            ),
          ])
        );
      },
      Import(path) {
        const asyncModule = findSourceById(
          sources,
          mapModuleNameToId[path.parent.arguments[0].value]
        );
        path.parentPath.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.callExpression(
                t.memberExpression(
                  t.identifier("__webpack_require__"),
                  t.identifier("e")
                ),
                [t.numericLiteral(asyncModule.chunkId)]
              ),
              t.Identifier("then")
            ),
            [
              t.callExpression(
                t.memberExpression(
                  t.identifier("__webpack_require__"),
                  t.identifier("bind")
                ),
                [t.nullLiteral(), t.numericLiteral(asyncModule.id)]
              ),
            ]
          )
        );
      },
    });
    traverse(ast, {
      Program(path) {
        // esModule 开头先声明自己是esModule
        if (esModule) {
          path
            .get("body.0")
            .insertBefore(
              t.callExpression(
                t.memberExpression(
                  t.identifier("__webpack_require__"),
                  t.identifier("r")
                ),
                [t.identifier("exports")]
              )
            );
        }
        // 修改导入变量名
        const keys = Object.keys(identifierMap);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          // 即使在函数中调用了导入的变量，也会被替换
          path.scope.rename(key, identifierMap[key]);
        }
      },
    });

    const code = generator
      .default(ast)
      .code.replace(/\n+/g, "\\n")
      .replace(/"/g, '\\"')
      .replace(/\"[^\"]+\"/g, function (matchStr) {
        return matchStr.replace(/\\n/g, "\\\\n");
      })
      .replace(/'\\n'/g, "'\\\\n'");
    chunkModule.rewriteCode = code;
  }
};

// var _a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(绝对路径)
function getModuleName(importPath, esImportId) {
  return `_${path.basename(
    importPath,
    ".js"
  )}__WEBPACK_IMPORTED_MODULE_${esImportId}__`;
}

function findSourceById(sources, id) {
  const values = Object.values(sources.modules);
  return values.find((v) => v.id === id);
}

function getIdentiferMap(identifierMap, prefix, specifiers, esModule) {
  for (const spec of specifiers) {
    const name = spec.local.name;
    if (t.isImportDefaultSpecifier(spec)) {
      if (esModule) {
        identifierMap[name] = `${prefix}['default']`;
      } else {
        identifierMap[name] = `${getDefaultModuleName(prefix)}.a`;
      }
    } else if (t.isImportSpecifier(spec)) {
      identifierMap[name] = `${prefix}['${name}']`;
    }
  }

  return identifierMap;
}

function getDefaultModuleName(moduleName) {
  return `${moduleName}_default`;
}
