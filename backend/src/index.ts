import { WebSocketServer, WebSocket, RawData } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

let senderSocket: WebSocket | null = null;
let receiverSocket: WebSocket | null = null;

wss.on('connection', (ws: WebSocket) => {
  ws.on('error', (error) => {
    console.log(error);
  });

  ws.on('message', (data: RawData) => {
    const payload = data.toString();
    let parsedPayload: { type: string; data: unknown } | null = null;

    try {
      parsedPayload = JSON.parse(payload);
    } catch (error) {
      console.log('Payload is not a valid JSON');
    }

    if (!parsedPayload) {
      ws.send('Payload is not a valid JSON');
      return;
    }

    if (parsedPayload.type === 'sender') {
      senderSocket = ws;
    }

    if (parsedPayload.type === 'receiver') {
      receiverSocket = ws;
    }

    if (parsedPayload.type === 'offer') {
      receiverSocket?.send(JSON.stringify(parsedPayload));
    }

    if (parsedPayload.type === 'answer') {
      senderSocket?.send(JSON.stringify(parsedPayload));
    }

    if (parsedPayload.type === 'ice-candidate') {
      if (ws === senderSocket) {
        senderSocket?.send(JSON.stringify(parsedPayload));
      } else if (ws === receiverSocket) {
        receiverSocket?.send(JSON.stringify(parsedPayload));
      }
    }
  });
});
