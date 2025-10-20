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
        const apiUrl = import.meta.env.VITE_API_URL || 'https://soteros-backend.onrender.com/api';
        let wsUrl;
        
        console.log('🔧 WebSocket Debug Info:');
        console.log('- VITE_API_URL:', import.meta.env.VITE_API_URL);
        console.log('- VITE_API_PORT:', import.meta.env.VITE_API_PORT);
        console.log('- Current location:', window.location.href);
        console.log('- API URL being used:', apiUrl);
        console.log('- NODE_ENV:', import.meta.env.MODE);
        
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
          console.log('- Using development WebSocket URL (localhost)');
        } else if (apiUrl.startsWith('http')) {
          // Production: use Render backend WebSocket
          const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/api$/, '');
          const protocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${wsHost}?token=${encodeURIComponent(token)}`;
          console.log('- Using production WebSocket URL');
        } else {
          // Fallback: use localhost
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.hostname;
          const port = import.meta.env.VITE_API_PORT || '5000';
          wsUrl = `${protocol}//${host}:${port}?token=${encodeURIComponent(token)}`;
          console.log('- Using fallback WebSocket URL (localhost)');
        }

        console.log('🔌 Connecting to WebSocket:', wsUrl);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          this.startKeepAlive();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('📨 WebSocket message received:', message);
            
            // Handle pong responses for keep-alive
            if (message.type === 'pong') {
              this.lastPongTime = Date.now();
              return;
            }
            
            this.handleMessage(message);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket connection closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          this.connectionState = 'disconnected';
          this.isConnecting = false;
          this.stopKeepAlive();
          
          if (event.code !== 1000) { // Not a normal closure
            console.log('🔄 Attempting to reconnect...');
            this.attemptReconnect(token);
          }
          
          // Dispatch custom event for components to listen to
          window.dispatchEvent(new CustomEvent('websocketDisconnected', { 
            detail: { code: event.code, reason: event.reason } 
          }));
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          console.error('❌ WebSocket readyState:', this.ws?.readyState);
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
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

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
      } catch (error) {
        console.error('Error in message handler:', error);
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
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
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
        // Send ping every 30 seconds
        this.send('ping', { timestamp: Date.now() });
        
        // Check if we got a pong response within 10 seconds
        setTimeout(() => {
          if (Date.now() - this.lastPongTime > 10000 && this.ws) {
            console.log('⚠️ WebSocket keep-alive timeout, reconnecting...');
            this.ws.close(1006, 'Keep-alive timeout');
          }
        }, 10000);
      }
    }, 30000); // Send ping every 30 seconds
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
