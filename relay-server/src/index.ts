export default {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      server.addEventListener('message', () => {
        server.send(JSON.stringify({ type: 'pong' }));
      });
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('Smart Paste Hub Relay', { status: 200 });
  }
};
