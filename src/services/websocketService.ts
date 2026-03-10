interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

interface NotificationData {
  id: string | number;
  incident_id?: string | number;
  type?: 'incident' | 'welfare' | 'system';
  title?: string;
  message?: string;
  priority_level?: string;
  user_name?: string;
  location?: string;
  date_reported?: string;
  submitted_at?: string;
  description?: string;
  incident_type?: string;
  additional_info?: string;
  first_name?: string;
  last_name?: string;
  report_id?: string | number;
  user_id?: string | number;
  status?: string;
  email?: string;
  guest_contact?: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private isConnecting = false;
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private lastPongTime = 0;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.connectionState === 'connected') {
        resolve();
        return;
      }

      this.isConnecting = true;
      this.connectionState = 'connecting';

      try {
        // Get the WebSocket URL from environment or construct from API URL
        const apiUrl = import.meta.env.VITE_API_URL || 'https://soterosbackend-production.up.railway.app/api';
        let wsUrl;

        // Check if we're in development mode
        const isDevelopment = import.meta.env.MODE === 'development' || 
                             window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
        
        if (isDevelopment) {
          // Development: use localhost
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.hostname;
          const port = import.meta.env.VITE_API_PORT || '5000';
          wsUrl = `${protocol}//${host}:${port}?token=${encodeURIComponent(token)}`;
        } else if (apiUrl.startsWith('http')) {
          // Production: use Render backend WebSocket
          const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/api$/, '');
          const protocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${wsHost}?token=${encodeURIComponent(token)}`;
        } else {
          // Fallback: use localhost
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.hostname;
          const port = import.meta.env.VITE_API_PORT || '5000';
          wsUrl = `${protocol}//${host}:${port}?token=${encodeURIComponent(token)}`;
        }

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          this.startKeepAlive();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);

            // Handle pong responses for keep-alive
            if (message.type === 'pong') {
              this.lastPongTime = Date.now();
              return;
            }
            
            this.handleMessage(message);
          } catch {
            // Ignore parse errors
          }
        };

        this.ws.onclose = (event) => {
          this.connectionState = 'disconnected';
          this.isConnecting = false;
          this.stopKeepAlive();
          
          if (event.code !== 1000) { // Not a normal closure
            this.attemptReconnect(token);
          }
          
          // Dispatch custom event for components to listen to
          window.dispatchEvent(new CustomEvent('websocketDisconnected', { 
            detail: { code: event.code, reason: event.reason } 
          }));
        };

        this.ws.onerror = (error) => {
          this.connectionState = 'disconnected';
          this.isConnecting = false;
          reject(error);
        };

        // Set a timeout for connection
        setTimeout(() => {
          if (this.connectionState !== 'connected') {
            this.isConnecting = false;
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect(token).catch(() => {
        // Reconnection failed, will try again
      });
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message.data);
      } catch {
        // Ignore handler errors
      }
    });
  }

  send(type: string, data?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString()
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  on(type: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  off(type: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.connectionState = 'disconnected';
    this.messageHandlers.clear();
    this.stopKeepAlive();
  }

  private startKeepAlive() {
    this.stopKeepAlive(); // Clear any existing interval
    this.lastPongTime = Date.now();
    
    this.keepAliveInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send ping every 60 seconds (less frequent to avoid unnecessary reconnections)
        this.send('ping', { timestamp: Date.now() });
        
        // Check if we got a pong response within 15 seconds (more lenient)
        setTimeout(() => {
          if (Date.now() - this.lastPongTime > 15000 && this.ws) {
            this.ws.close(1006, 'Keep-alive timeout');
          }
        }, 15000);
      }
    }, 60000); // Send ping every 60 seconds (less aggressive)
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  getConnectionState() {
    return this.connectionState;
  }

  isConnected() {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService;
export type { WebSocketMessage, NotificationData };
