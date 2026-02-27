import { useEffect, useRef, useCallback } from 'react';

type WSEvent = {
  type: string;
  data: Record<string, unknown>;
};

type EventHandler = (data: Record<string, unknown>) => void;

const WS_BASE = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

export function useWebSocket(workspaceId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectDelay = useRef(1000);

  const connect = useCallback(() => {
    if (!workspaceId) return;

    const ws = new WebSocket(`${WS_BASE}/ws/${workspaceId}`);

    ws.onopen = () => {
      reconnectDelay.current = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSEvent = JSON.parse(event.data);
        const handlers = handlersRef.current.get(msg.type);
        if (handlers) {
          handlers.forEach((handler) => handler(msg.data));
        }
        // Also fire wildcard handlers
        const wildcardHandlers = handlersRef.current.get('*');
        if (wildcardHandlers) {
          wildcardHandlers.forEach((handler) => handler({ type: msg.type, ...msg.data }));
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      // Auto-reconnect with exponential backoff (max 30s)
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [workspaceId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const on = useCallback((eventType: string, handler: EventHandler) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());
    }
    handlersRef.current.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      handlersRef.current.get(eventType)?.delete(handler);
    };
  }, []);

  return { on };
}
