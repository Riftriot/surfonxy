import { parse } from "meriyah";
import { traverse } from "estree-toolkit";
import { generate } from "astring";

const WINDOW_LOCATION_TWEAKED_PROPERTY = "__sf_location";

/**
 * @param code Raw JavaScript code to tweak.
 * @returns Tweaked JavaScript code that should be used instead.
 */
export const tweakJS = (code: string, isFromSrcDoc = false): string => {
  try {
    const ast = parse(code, {
      module: true
    });
  
    traverse(ast, {
      $: { scope: true },
      // Identifier (path) {
      //   // We need a node to make any changes.
      //   if (!path.node) return;

      //   // first try:
      //   if (path.node.name === "location") {
      //     path.node.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
      //   }
      // },
      MemberExpression (path) {
        if (!path.node) return;
  
        // Applied when using
        // `location.href`, `window.location`
        // and `top.location`, `parent.location`
        if (path.node.object.type === "Identifier") {
          if (!path.scope) return;
  
          let object_name = path.node.object.name;
  
          // If we access through the `location` object directly.
          if (object_name === "location") {
            if (path.scope.hasBinding("location")) return;
            if (isFromSrcDoc) return;

            path.node.object.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
            return;
          }
          
          // When we're not accessing through `window`.
          // Check if `object_name` is a binding.
          if (object_name !== "window" && object_name !== "parent" && object_name !== "top") {
            const bind = path.scope.getBinding(object_name);
            if (!bind) return;
  
            // Find the binding declaration
            if (bind.path.node && bind.path.node.type === "VariableDeclarator" && bind.path.node.init && bind.path.node.init.type === "Identifier") {
              // Check if it's a `window` variable.
              if (bind.path.node.init.name === "window" || bind.path.node.init.name === "parent" || bind.path.node.init.name === "top") {
                object_name = bind.path.node.init.name;
              }
              else return; // It's useless
            }
          }
  
          if (path.node.property.type === "Identifier" && path.node.property.name === "location") {
            // Prevent the rewrite if we already declared a similar variable before.
            if (object_name === "top" && path.scope.hasBinding("top")) return;
            if (object_name === "parent" && path.scope.hasBinding("parent")) return;
            if (object_name === "window" && path.scope.hasBinding("window")) return;
            
            // On iframe with `srcdoc`, we don't want to tweak the `window.location` object
            // because it'll be something like `about:srcdoc` which is not important to tweak.
            if (isFromSrcDoc && object_name === "window") return;
            
            path.node.property.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
          }
        }

        // Applied when using
        // `window.top.location` or `window.parent.location`
        // or `x.y..window.top.location` or `x.y..window.parent.location`
        else if (path.node.object.type === "MemberExpression") {
          // Check if we access the `location` property.
          if (path.node.property.type !== "Identifier") return;
          if (path.node.property.name !== "location") return;
          
          // Second operand should be the identifier `top` or `parent`.
          if (path.node.object.property.type !== "Identifier") return;
          if (path.node.object.property.name !== "top" && path.node.object.property.name !== "parent") return;
          
          // First operand should be the identifier `window`.
          // When `window.top.location` or `window.parent.location`.
          if (path.node.object.object.type === "Identifier") {
            if (path.node.object.object.name !== "window") return;
          }
          // When `x.y..window.top.location` or `x.y..window.parent.location`.
          else if (path.node.object.object.type === "MemberExpression") {
            if (path.node.object.object.property.type !== "Identifier") return;
            if (path.node.object.object.property.name !== "window") return;
          }
        
          // When everything is matched, we can tweak the code.
          path.node.property.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
        }
      }
    });

    return generate(ast);
  }
  catch (error) {
    console.error("[tweakJS]:", error);
    // We can't tweak the code, so we just return the original code with a bulk replace.
    return code.replaceAll("location", WINDOW_LOCATION_TWEAKED_PROPERTY);
  }
};
