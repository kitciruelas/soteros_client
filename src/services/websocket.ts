import { getAuthState } from '../utils/auth';

// Connection states
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';

export const ConnectionStates: { [key: string]: ConnectionState } = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed'
} as const;

// Event types
export type WebSocketEventType = 'connectionStateChange' | 'error';

export const WebSocketEvents: { [key: string]: WebSocketEventType } = {
  CONNECTION_STATE_CHANGE: 'connectionStateChange',
  ERROR: 'error'
} as const;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000; // Start with 1 second
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private connectionState: ConnectionState = ConnectionStates.DISCONNECTED;
  private stateChangeHandlers: ((state: ConnectionState) => void)[] = [];
  private errorHandlers: ((error: Error) => void)[] = [];
  private autoReconnect = true;

  // Get WebSocket URL based on current environment
  private getWebSocketURL(): string {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    
    if (apiUrl.startsWith('http')) {
      // Production: use Render backend WebSocket
      const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
      const protocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
      return `${protocol}//${wsHost}`;
    } else {
      // Development: use localhost
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = import.meta.env.VITE_WS_PORT || '5000';
      return `${protocol}//${host}:${port}`;
    }
  }

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.CONNECTING || this.connectionState === ConnectionStates.CONNECTING) {
      return; // Already trying to connect
    }

    const authState = getAuthState();
    if (!authState?.userData?.token) {
      const error = new Error('No auth token available for WebSocket connection');
      this.handleError(error);
      return;
    }

    try {
      this.updateConnectionState(ConnectionStates.CONNECTING);

      // Connect to the WebSocket server running on the backend
      const wsURL = `${this.getWebSocketURL()}?token=${authState.userData?.token}`;
      this.ws = new WebSocket(wsURL);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.updateConnectionState(ConnectionStates.CONNECTED);
        this.reconnectAttempts = 0;
        this.reconnectTimeout = 1000;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          const parseError = error instanceof Error ? error : new Error('Error parsing WebSocket message');
          this.handleError(parseError);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.updateConnectionState(ConnectionStates.DISCONNECTED);
        
        // Don't reconnect if closed intentionally or max attempts reached
        if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else {
          this.updateConnectionState(ConnectionStates.FAILED);
        }
      };

      this.ws.onerror = (error) => {
        const wsError = error instanceof Error ? error : new Error('WebSocket error');
        this.handleError(wsError);
      };
    } catch (error) {
      const connectionError = error instanceof Error ? error : new Error('Error creating WebSocket connection');
      this.handleError(connectionError);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.updateConnectionState(ConnectionStates.FAILED);
      return;
    }

    this.updateConnectionState(ConnectionStates.RECONNECTING);

    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
      this.reconnectAttempts++;
      this.reconnectTimeout *= 2; // Exponential backoff
      this.connect();
    }, this.reconnectTimeout);
  }

  private updateConnectionState(state: ConnectionState) {
    this.connectionState = state;
    this.stateChangeHandlers.forEach(handler => handler(state));
  }

  private handleError(error: Error) {
    console.error('WebSocket error:', error);
    this.errorHandlers.forEach(handler => handler(error));
  }

  public onStateChange(handler: (state: ConnectionState) => void) {
    this.stateChangeHandlers.push(handler);
    // Immediately notify of current state
    handler(this.connectionState);
    return () => {
      const index = this.stateChangeHandlers.indexOf(handler);
      if (index !== -1) {
        this.stateChangeHandlers.splice(index, 1);
      }
    };
  }

  public onError(handler: (error: Error) => void) {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index !== -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  public getState(): ConnectionState {
    return this.connectionState;
  }

  public setAutoReconnect(enabled: boolean) {
    this.autoReconnect = enabled;
  }

  private handleMessage(message: any) {
    const { type, data } = message;
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  public subscribe(type: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  public unsubscribe(type: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        if (handlers.length === 0) {
          this.messageHandlers.delete(type);
        } else {
          this.messageHandlers.set(type, handlers);
        }
      }
    }
  }

  public send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService;
