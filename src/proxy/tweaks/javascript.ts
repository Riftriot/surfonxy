import { parse } from "meriyah";
import { traverse } from "estree-toolkit";
import { generate } from "astring";

const WINDOW_LOCATION_TWEAKED_PROPERTY = "__sf_location";

/**
 * @param code Raw JavaScript code to tweak.
 * @returns Tweaked JavaScript code that should be used instead.
 */
export const tweakJS = (code: string): string => {
  const ast = parse(code, {
    module: true
  });

  traverse(ast, {
    $: { scope: true },
    MemberExpression (path) {
      if (!path.node) return;

      if (path.node.object.type === "Identifier") {
        if (!path.scope) return;

        let object_name = path.node.object.name;

        if (object_name === "location") {
          path.node.object.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
          return;
        }
        
        if (object_name !== "window") {
          let bind = path.scope.getBinding(object_name);
          if (!bind) return;

          if (bind.path.node && bind.path.node.type === "VariableDeclarator" && bind.path.node.init && bind.path.node.init.type === "Identifier") {
            object_name = bind.path.node.init.name;
          } else return;

          if (object_name !== "window") return;
        }

        if (path.node.property.type === "Identifier" && path.node.property.name === "location") {
          // only if the window variable was not redefined before
          if (path.scope.hasBinding("window")) return;
          
          path.node.property.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
        }
      }
    }
  });

  return generate(ast);
};
