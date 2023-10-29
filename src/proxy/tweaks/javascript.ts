import { parse } from "meriyah";
import { traverse } from "estree-toolkit";
import { generate } from "astring";

const WINDOW_LOCATION_TWEAKED_PROPERTY = "__sf_location";
const DOCUMENT_REFERRER_TWEAKED_PROPERTY = "__sf_referrer";

const keywords = ["window", "parent", "top", "document"];
const isInKeywords = (value: string) => keywords.includes(value);

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
        // and `document.referrer`.
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
          
          // Check if `object_name` is a binding.
          if (!isInKeywords(object_name)) {
            const bind = path.scope.getBinding(object_name);
            if (!bind) return;
  
            // Find the binding declaration
            if (bind.path.node && bind.path.node.type === "VariableDeclarator" && bind.path.node.init && bind.path.node.init.type === "Identifier") {
              // Check if it's a `window` variable.
              if (isInKeywords(bind.path.node.init.name)) {
                object_name = bind.path.node.init.name;
              }
              else return; // It's useless
            }
          }
  
          if (path.node.property.type === "Identifier") {
            // Prevent the rewrite if we already declared a similar variable before.
            if (path.scope.hasBinding(object_name)) return;

            // Check if we access the `location` property.
            if (object_name !== "document" && path.node.property.name === "location") {
              // On iframe with `srcdoc`, we don't want to tweak the `window.location` object
              // because it'll be something like `about:srcdoc` which is not important to tweak.
              if (isFromSrcDoc && object_name === "window") return;
              
              path.node.property.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
            }
            // Check if we access the `referrer` property, only for `document` object.
            else if (object_name === "document" && path.node.property.name === "referrer") {
              path.node.property.name = DOCUMENT_REFERRER_TWEAKED_PROPERTY;
            }
          }
        }

        // Applied when using
        // `window.top.location` or `window.parent.location`
        // or `x.y..window.top.location` or `x.y..window.parent.location`
        // or `x.y..document.referrer`.
        else if (path.node.object.type === "MemberExpression") {
          let rewrite_document_referrer = false;
          let rewrite_location = false;
          
          // When `window.top.location` or `window.parent.location`
          if (path.node.object.object.type === "Identifier") {
            if (path.node.object.object.name === "window") rewrite_location = true;
            else return;
          }
          else if (path.node.object.type === "MemberExpression") {
            if (path.node.object.property.type !== "Identifier") return;
            
            // When `x.y..document.referrer`.
            if (path.node.object.property.name === "document") rewrite_document_referrer = true;

            // When `x.y..window.top.location` or `x.y..window.parent.location`
            else if (path.node.object.object.type === "MemberExpression") {
              if (path.node.object.object.property.type !== "Identifier") return;
              
              if (path.node.object.object.property.name === "window") rewrite_location = true;
              else return;
            }
          }

          // Second operand should be an identifier...
          if (path.node.object.property.type !== "Identifier") return;

          // `top` or `parent` for `rewrite_location`.
          if (rewrite_location && path.node.object.property.name !== "top" && path.node.object.property.name !== "parent") return;
          // `document` for `rewrite_document_referrer`.
          else if (rewrite_document_referrer && path.node.object.property.name !== "document") return;

          // Check if the accessed property is an identifier.
          if (path.node.property.type !== "Identifier") return;
          
          if (rewrite_location) {
            if (path.node.property.name !== "location") return;
            path.node.property.name = WINDOW_LOCATION_TWEAKED_PROPERTY;
          }
          
          else if (rewrite_document_referrer)  {
            if (path.node.property.name !== "referrer") return;
            path.node.property.name = DOCUMENT_REFERRER_TWEAKED_PROPERTY;
          }
        }
      }
    });

    return generate(ast);
  }
  catch (error) {
    console.error("[tweakJS]:", error);

    // We can't tweak the code, so we just return the original code with a bulk replace.
    // This is not perfect, but it's better than returning an empty script to client.
    return code
      .replaceAll("location", WINDOW_LOCATION_TWEAKED_PROPERTY)
      .replaceAll("referrer", DOCUMENT_REFERRER_TWEAKED_PROPERTY);
  }
};
