import type { WebSocketHandler } from "bun";
import { SURFONXY_URI_ATTRIBUTES } from "../utils/constants";

export const makeProxyWebSocketHandler = <T extends {
  request: Request,
  headers: Record<string, string>
}>(base_path: string): (WebSocketHandler<T> & {
  /** Where the communication with the real websocket is done. */
  proxiedWebSocket?: WebSocket
}) => ({
  open (ws) {
    const patched_url = new URL(ws.data.request.url);
    const origin_encoded = patched_url.searchParams.get(SURFONXY_URI_ATTRIBUTES.URL);
    
    if (!origin_encoded) {
      console.error("[proxy/websocket.ts]: closing because no encoded origin was provided.");
      ws.close();
      return;
    }
    
    let origin_decoded: string | undefined;
    try {
      origin_decoded = atob(origin_encoded);
    }
    catch (error) {
      console.error("[proxy/websocket.ts]: closing because we couldn't decode the origin provided.");
      ws.close();
      return;
    }

    patched_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.URL);
    // In case it was introduced somehow, normally we should only have the `URL` one on WS.
    patched_url.searchParams.delete(SURFONXY_URI_ATTRIBUTES.READY); 
    
    const original_pathname = patched_url.pathname.slice(base_path.length);
    const original_url = new URL(original_pathname + patched_url.search + patched_url.hash, origin_decoded);

    // ws.data.headers["origin"] = "https://discord.com";
    // ws.data.headers["host"] = "wss://remote-auth-gateway.discord.gg";
    this.proxiedWebSocket = new WebSocket(original_url, {
      // @ts-expect-error
      headers: ws.data.headers
    });
    console.log(this.proxiedWebSocket.url);

    this.proxiedWebSocket.onopen = (e) => {
      console.log("open");
    }

    this.proxiedWebSocket.onmessage = (event) => {
      ws.send(event.data);
    }
    
    this.proxiedWebSocket.onclose = (event) => {
      console.log("close", event.reason);
      ws.close(event.code, event.reason);
    }
  },
  
  message (ws, message) {
    console.log(this.proxiedWebSocket?.readyState)
    if (!this.proxiedWebSocket) return;
    this.proxiedWebSocket.send(message);
  },

  close(ws, code, reason) {
    this.proxiedWebSocket?.close(code, reason);
  },
});
