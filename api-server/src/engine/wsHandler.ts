import type { WebSocket } from 'ws';
import { eventBus } from './eventBus';
import { logger } from '../lib/logger';
import type { JarvisEngine } from './jarvisEngine';

export function handleWsClient(ws: WebSocket, engine: JarvisEngine): void {
  const onBroadcast = (msg: any) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  eventBus.on('BROADCAST', onBroadcast);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'VOICE_INPUT':
          await engine.processVoiceInput(message.text as string);
          break;
        case 'CONFIRM':
          engine.handleConfirmation(message.id as string, message.approved as boolean);
          break;
        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;
        default:
          logger.warn({ msgType: message.type }, 'Unknown WS message type');
      }
    } catch (error) {
      logger.error({ error }, 'Error handling WS message');
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Failed to process message' }));
      }
    }
  });

  ws.on('close', () => {
    eventBus.removeListener('BROADCAST', onBroadcast);
  });
}
