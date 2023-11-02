import { parse } from "meriyah";
import { traverse } from "estree-toolkit";
import { generate } from "astring";

const WINDOW_LOCATION_TWEAKED_PROPERTY = "__sf_location";
// const DOCUMENT_REFERRER_TWEAKED_PROPERTY = "__sf_referrer";

// const keywords = ["window", "parent", "top", "document"];
// const isInKeywords = (value: string) => keywords.includes(value);

// Constants.
const SCOPE_OPEN = ["(", "[", "{"];
const SCOPE_CLOSE = [")", "]", "}"];
/** Takes every `postMessage*(`. */
const POST_MESSAGE_REGEX = /postMessage\s*\(/g;

/**
 * Rewrite every `postMessage` calls so we can
 * tweak the data and origin.
 * 
 * Examples :
 * - `postMessage(data)` -> `postMessage(window.__sf_preparePostMessageData(data))`
 * - `postMessage(data, origin)` -> `postMessage(window.__sf_preparePostMessageData(data), window.__sf_preparePostMessageOrigin(origin))`
 */
const patchEveryPostMessageCalls = (code: string): string => {
  let current_match: RegExpExecArray | null;
  
  // Take every occurrences of `postMessage(`...
  while ((current_match = POST_MESSAGE_REGEX.exec(code)) !== null) {
    const start_index = current_match.index + current_match[0].length;
    
    let index = start_index;
    let current_char = code[index];

    // We start with 1 because we already have one parenthesis.
    let parenthesis_count = 1; 
    let parameters_index = 0;

    // We start with an empty string because
    // the first parameter is always required.
    const parameters = [""];

    

    while (parenthesis_count > 0) {
      if (SCOPE_OPEN.includes(current_char)) parenthesis_count++;
      else if (SCOPE_CLOSE.includes(current_char)) parenthesis_count--;
      else if (current_char === "," && parenthesis_count === 1) {
        parameters[++parameters_index] = "";
        current_char = code[++index];
      }

      parameters[parameters_index] += current_char;
      current_char = code[++index];
    }

    const end_index = index;

    parameters[0] = `window.__sf_preparePostMessageData(${parameters[0]})`;

    // Since the second parameter is optional...
    if (typeof parameters[1] === "string") {
      parameters[1] = `window.__sf_preparePostMessageOrigin(${parameters[1]})`;
    }

    // We replace and the tweaked `postMessage` in the current code.
    code = code.substring(0, start_index) + parameters.join(",") + code.substring(end_index);
  }
  
  return code;
};

/**
 * @param code Raw JavaScript code to tweak.
 * @returns Tweaked JavaScript code that should be used instead.
 */
export const tweakJS = (code: string, isFromSrcDoc = false, href: string): string => {
  // We patch every `postMessage` calls.
  code = patchEveryPostMessageCalls(code);

  try {
    const ast = parse(code, {
      module: true
    });
  
    traverse(ast, {
      $: { scope: true },

      /**
       * Patch every `import ... from "url"` so
       * the `url` becomes an absolute URL.
       * 
       * Example : `./index.js` -> `https://example.com/index.js`
       */
      ImportDeclaration (path) {
        if (!path.node) return;

        // NOTE: It should always be literal but I still check it in case (?)
        if (path.node.source.type === "Literal") {
          const import_from = path.node.source.value;

          if (typeof import_from === "string") {
            path.node.source.value = new URL(import_from, href).href;
          }
        }
      },

      /**
       * Patch every `import(url)` so it becomes
       * `import(window.__sf_prepareImport(url, href))`.
       */
      ImportExpression (path) {
        if (!path.node) return;

        path.node.source = {
          type: "CallExpression",
          optional: false,
          
          callee: {
            type: "MemberExpression",
            optional: false,
            computed: false,

            // window.__sf_prepareImport
            object: {
              type: "Identifier",
              name: "window"
            },
            property: {
              type: "Identifier",
              name: "__sf_prepareImport"
            }
          },
          arguments: [
            // This is the original `import` URL argument.
            path.node.source,
            // This is the `href` argument that we pass
            // to say where the import is from.
            { type: "Literal", value: href }
          ]
        };
      }

      /**
       * An attempt to patch objects referencing
       * the `window` or `document`object.
       */
      // Property (path) {
      //   if (!path.node) return;
      //   if (path.node.value.type === "Identifier") {
      //     if (path.node.value.name === "window" || path.node.value.name === "globalThis" || path.node.value.name === "self") {
      //       path.node.value.name = "window.__sf_fake_window";
      //     }
      //     else if (path.node.value.name === "document") {
      //       path.node.value.name = "window.__sf_fake_window.document";
      //     }
      //   }
      //   // else if (path.node.value.type === "ThisExpression") {
      //   //   path.node.value = {
      //   //     type: "Identifier",
      //   //     name: "window.__sf_fake_window"
      //   //   };
      //   // }
      // },

      // MemberExpression (path) {
      //   if (!path.node) return;
  
      //   // Applied when using
      //   // `location.href`, `window.location`
      //   // and `top.location`, `parent.location`
      //   // and `document.referrer`, `document.location`	
      //   if (path.node.object.type === "Identifier") {
      //     if (!path.scope) return;
  
      //     let object_name = path.node.object.name;
  
      //     // If we access through the `location` object directly.
      //     if (object_name === "location") {
      //       if (path.scope.hasBinding("location")) return;
      //       if (isFromSrcDoc) return;

      //       path.node.object.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
      //       return;
      //     }
          
      //     // Check if `object_name` is a binding.
      //     if (!isInKeywords(object_name)) {
      //       const bind = path.scope.getBinding(object_name);
      //       if (!bind) return;
  
      //       // Find the binding declaration
      //       if (bind.path.node && bind.path.node.type === "VariableDeclarator" && bind.path.node.init && bind.path.node.init.type === "Identifier") {
      //         // Check if it's a `window` variable.
      //         if (isInKeywords(bind.path.node.init.name)) {
      //           object_name = bind.path.node.init.name;
      //         }
      //         else return; // It's useless
      //       }
      //     }
  
      //     if (path.node.property.type !== "Identifier") return;
      //     // TODO: (fix this somehow) Prevent the rewrite if we already declared a similar variable before.
      //     // const bind = path.scope.getBinding(object_name);
      //     // if (bind) {
      //     //   console.log(bind.);
      //     //   return bind;
      //     // }

      //     // Check if we access the `referrer` property, only for `document` object.
      //     if (object_name === "document" && path.node.property.name === "referrer") {
      //       path.node.property.name = DOCUMENT_REFERRER_TWEAKED_PROPERTY;
      //     }
      //     // Check if we access the `location` property.
      //     else if (path.node.property.name === "location") {
      //       // On iframe with `srcdoc`, we don't want to tweak the `window.location` object
      //       // because it'll be something like `about:srcdoc` which is not important to tweak.
      //       if (isFromSrcDoc && (object_name === "window" || object_name === "document")) return;
            
      //       path.node.property.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
      //     }
          
      //   }

      //   // Applied when using
      //   // `window.top.location` or `window.parent.location`
      //   // or `x.y..window.top.location` or `x.y..window.parent.location`
      //   // or `x.y..window.document.referrer`, `window.document.location`
      //   else if (path.node.object.type === "MemberExpression") {
      //     let rewrite_referrer = false;
      //     let rewrite_location = false;
          
      //     // When `window.top.location` or `window.parent.location`
      //     if (path.node.object.object.type === "Identifier") {
      //       if (path.node.object.object.name === "window") rewrite_location = true;
      //       // When `parent.document.location`
      //       else if (path.node.object.property.type === "Identifier" && path.node.object.property.name === "document") {
      //         rewrite_location = true;
      //       }
      //       else return;
      //     }
      //     else if (path.node.object.type === "MemberExpression") {
      //       if (path.node.object.property.type !== "Identifier") return;
            
      //       // When `x.y..document.referrer` or `x.y..document.location`.
      //       if (path.node.object.property.name === "document") {
      //         // It can be both.
      //         rewrite_referrer = true;
      //         rewrite_location = true;
      //       }

      //       // When `x.y..window.top.location` or `x.y..window.parent.location`
      //       // When  `x.y..document.location`
      //       else if (path.node.object.object.type === "MemberExpression") {
      //         if (path.node.object.object.property.type !== "Identifier") return;
              
      //         if (path.node.object.object.property.name === "window") rewrite_location = true;
      //         else return;
      //       }
      //     }

      //     // Second operand should be an identifier...
      //     if (path.node.object.property.type !== "Identifier") return;

      //     // `top` or `parent` for `rewrite_location`.
      //     if (rewrite_location && path.node.object.property.name !== "top" && path.node.object.property.name !== "parent" && path.node.object.property.name !== "document") return;
      //     // `document` for `rewrite_document_referrer`.
      //     else if (rewrite_referrer && path.node.object.property.name !== "document") return;

      //     // Check if the accessed property is an identifier.
      //     if (path.node.property.type !== "Identifier") return;
          
      //     if (path.node.property.name === "location") {
      //       path.node.property.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
      //     }
          
      //     else if (path.node.property.name === "referrer")  {
      //       path.node.property.name = DOCUMENT_REFERRER_TWEAKED_PROPERTY;
      //     }
      //   }
      // }
    });

    code = generate(ast);
  }
  catch (error) {
    console.error("[tweakJS]:", error, isFromSrcDoc);
  }

  return code
    .replaceAll("location", WINDOW_LOCATION_TWEAKED_PROPERTY);
};
