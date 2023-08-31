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
      // Check if window was not defined as another variable in the scope, like `let w = window;`.
      
      
      // Rewrite `window.location` to `window.__sf_location`.
      if (path.isMemberExpression()) {
        

        if (path.get("object").isIdentifier({ name: "window" })) {
          if (path.node.property.type === "Identifier" && path.node.property.name === "location") {
            // only if the window variable was not redefined before
            if (path.scope.hasBinding("window")) return;

            path.node.property.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
          }
        }
      }
    }
  });

  return generate(ast).code;
};

const badCode = `
  window.location.href = "https://google.com";
  window.location = "https://google.com";
  window.location.replace("https://google.com");
  window.location.assign("https://google.com");
  window.location.reload();
  window.location.reload(true);
  window.location.toString();
  
  const a = window.location;
  a.href = "https://google.com";

  const w = window;
  w.location.href = "https://google.com";

  const func = () => {
    let location = "yes";
    location = "no";

    let window = { location: "yes" };
    let data = window.location;

    return data;
  }
`;

console.log(tweakJS(badCode));