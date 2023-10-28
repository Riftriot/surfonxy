import type { WebSocketHandler } from "bun";
import { SURFONXY_URI_ATTRIBUTES } from "../utils/constants";

import TCPWebSocket from "tcp-websocket";

export const makeProxyWebSocketHandler = <T extends {
  request: Request,
  headers: Record<string, string>
}>(base_path: string): (WebSocketHandler<T> & {
  /** Where the communication with the real websocket is done. */
  proxiedWebSocket?: TCPWebSocket,
  /** Messages that needs to be sent on real websocket open. */
  messagesOnOpen?: string[]
}) => ({
    open (ws) {
      const patched_url = new URL(ws.data.request.url);

      const request_url_encoded = patched_url.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL);
      const request_ws_origin_encoded = patched_url.searchParams.get(SURFONXY_URI_ATTRIBUTES.ORIGIN);
    
      if (!request_url_encoded || !request_ws_origin_encoded) {
        console.error("[proxy/websocket.ts]: closing because no encoded origin was provided.");
        ws.close();
        return;
      }
    
      let request_url_decoded: string | undefined;
      let request_ws_origin_decoded: string | undefined;
      try {
        request_url_decoded = atob(request_url_encoded);
        request_ws_origin_decoded = atob(request_ws_origin_encoded);
      }
      catch (error) {
        console.error("[proxy/websocket.ts]: closing because we couldn't decode the origin provided.");
        ws.close();
        return;
      }

      patched_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.URL);
      patched_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.ORIGIN);
      // In case it was introduced somehow, normally we should only have the `URL` one on WS.
      patched_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.READY); 
    
      const original_pathname = patched_url.pathname.slice(base_path.length);
      const original_url = new URL(original_pathname + patched_url.search + patched_url.hash, request_url_decoded);

      this.proxiedWebSocket = new TCPWebSocket(original_url, {
        headers: { "Origin": request_ws_origin_decoded.trim() }
      });

      this.proxiedWebSocket!.once("open", () => {
        if (this.messagesOnOpen) {
          this.messagesOnOpen.forEach((message) => {
            this.proxiedWebSocket!.send(message);
          });

          this.messagesOnOpen = undefined;
        }
      });

      this.proxiedWebSocket!.on("message", (event) => {
        ws.send(event.data);
      });
    
      this.proxiedWebSocket!.once("close", (event) => {
        ws.close(event.code, event.reason);
      });
    },
  
    message (_, message) {
      if (Buffer.isBuffer(message)) {
        message = message.toString("utf8");
      }
      else if (typeof message === "object") {
        message = JSON.stringify(message);
      }

      if (this.proxiedWebSocket?.readyState !== TCPWebSocket.OPEN) {
        if (!this.messagesOnOpen) {
          this.messagesOnOpen = [];
        }

        this.messagesOnOpen.push(message);
        return;
      }
      
      this.proxiedWebSocket?.send(message);
    },

    close (_, code, reason) {
      this.proxiedWebSocket?.close(reason, code);
    },
  });

// This is only for Elysia users who needs strict types.
import type { Context } from "elysia";
export type ProxyWebSocketElysiaHandler = Omit<Partial<WebSocketHandler<Context>>, "publish" | "open" | "message" | "close" | "drain" | "publishToSelf">
