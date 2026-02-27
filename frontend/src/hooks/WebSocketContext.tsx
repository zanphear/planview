import { createContext, useContext, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

type EventHandler = (data: Record<string, unknown>) => void;
type OnFn = (eventType: string, handler: EventHandler) => () => void;

const WSContext = createContext<OnFn | null>(null);

interface WebSocketProviderProps {
  workspaceId: string | undefined;
  children: React.ReactNode;
}

export function WebSocketProvider({ workspaceId, children }: WebSocketProviderProps) {
  const { on } = useWebSocket(workspaceId);

  return <WSContext.Provider value={on}>{children}</WSContext.Provider>;
}

/**
 * Subscribe to a WebSocket event. The handler is automatically
 * registered/unregistered as the component mounts/unmounts.
 */
export function useWSEvent(eventType: string, handler: EventHandler, deps: unknown[] = []) {
  const on = useContext(WSContext);

  useEffect(() => {
    if (!on) return;
    return on(eventType, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, eventType, ...deps]);
}

/**
 * Get the raw `on` function from WebSocket context.
 * Use useWSEvent for most cases — this is for dynamic subscription patterns.
 */
export function useWSOn(): OnFn | null {
  return useContext(WSContext);
}
