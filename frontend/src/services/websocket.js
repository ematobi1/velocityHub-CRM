import io from 'socket.io-client';
import toast from 'react-hot-toast';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  connect(token) {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

    this.socket = io(API_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.connected = true;
      toast.success('Connected to real-time updates', { duration: 2000 });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.connected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
      this.connected = true;
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      toast.error('Real-time connection error');
    });

    // Set up global event handlers
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Notification events
    this.socket.on('notification', (notification) => {
      this.emit('notification', notification);

      // Show toast notification
      const icon = this.getNotificationIcon(notification.type);
      toast(notification.message, {
        icon: icon,
        duration: 5000,
        position: 'top-right'
      });
    });

    // Deal updates
    this.socket.on('deal:updated', (data) => {
      this.emit('deal:updated', data);
      toast.success(`Deal "${data.deal.name}" was updated`, { duration: 3000 });
    });

    this.socket.on('deal:created', (data) => {
      this.emit('deal:created', data);
      toast.success(`New deal "${data.deal.name}" created`, { duration: 3000 });
    });

    this.socket.on('deal:stage_changed', (data) => {
      this.emit('deal:stage_changed', data);
      toast.info(`Deal "${data.deal.name}" moved to ${data.newStage}`, { duration: 3000 });
    });

    // Lead updates
    this.socket.on('lead:created', (data) => {
      this.emit('lead:created', data);
      toast.success(`New lead: ${data.lead.name}`, { duration: 3000 });
    });

    this.socket.on('lead:hot', (data) => {
      this.emit('lead:hot', data);
      toast(`🔥 Hot lead alert: ${data.lead.name} (Score: ${data.lead.aiScore.overall})`, {
        duration: 5000,
        style: {
          background: '#ff6b6b',
          color: '#fff',
        }
      });
    });

    // Workflow execution
    this.socket.on('workflow:executed', (data) => {
      this.emit('workflow:executed', data);
    });

    // Task updates
    this.socket.on('task:created', (data) => {
      this.emit('task:created', data);
    });

    // Activity updates
    this.socket.on('activity:created', (data) => {
      this.emit('activity:created', data);
    });

    // User presence
    this.socket.on('user:online', (data) => {
      this.emit('user:online', data);
    });

    this.socket.on('user:offline', (data) => {
      this.emit('user:offline', data);
    });
  }

  getNotificationIcon(type) {
    const icons = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      deal: '💼',
      lead: '👤',
      task: '✓',
      workflow: '⚡',
      default: '🔔'
    };
    return icons[type] || icons.default;
  }

  // Subscribe to an event
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Emit event to listeners
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Send event to server
  send(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected. Cannot send:', event);
    }
  }

  // Join a room (for specific channels like a pipeline or team)
  joinRoom(room) {
    this.send('join:room', { room });
  }

  // Leave a room
  leaveRoom(room) {
    this.send('leave:room', { room });
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }

  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;
