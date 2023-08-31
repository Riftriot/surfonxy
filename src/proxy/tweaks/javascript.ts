import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";

const WINDOW_LOCATION_TWEAKED_PROPERTY = "__sf_location";

/**
 * @param code Raw JavaScript code to tweak.
 * @returns Tweaked JavaScript code that should be used instead.
 */
export const tweakJS = (code: string): string => {
  const ast = parse(code, {
    sourceType: "unambiguous",
  });
  
  traverse(ast, {
    enter (path) {
      if (path.node.type === "MemberExpression") {
        if (path.node.object.type === "Identifier") {
          let from = path.node.object.name;
          if (from !== "window") {
            let bind = path.scope.getBinding(from);
            if (!bind) return;

            if (bind.path.node.type === "VariableDeclarator" && bind.path.node.init && bind.path.node.init.type === "Identifier") {
              from = bind.path.node.init.name;
            } else return;

            if (from !== "window") return;
          }

          if (path.node.property.type === "Identifier" && path.node.property.name === "location") {
            // only if the window variable was not redefined before
            if (path.scope.hasBinding("window")) return;

            path.node.property.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
          }
        }
      }
    }
  });

  return generate(ast, /*{ minified: true }*/).code;
};
