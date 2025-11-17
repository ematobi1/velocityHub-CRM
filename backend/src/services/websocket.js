const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.users = new Map(); // userId -> socket.id mapping
  }

  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.user = decoded;

        logger.info(`User ${decoded.userId} authenticated for WebSocket`);
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id} (User: ${socket.userId})`);

      // Track user connection
      this.users.set(socket.userId, socket.id);

      // Notify others that user is online
      this.broadcast('user:online', {
        userId: socket.userId,
        timestamp: new Date()
      }, socket.userId);

      // Join user-specific room
      socket.join(`user:${socket.userId}`);

      // Handle room joining
      socket.on('join:room', (data) => {
        const { room } = data;
        socket.join(room);
        logger.info(`User ${socket.userId} joined room: ${room}`);
      });

      // Handle room leaving
      socket.on('leave:room', (data) => {
        const { room } = data;
        socket.leave(room);
        logger.info(`User ${socket.userId} left room: ${room}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id} (User: ${socket.userId})`);
        this.users.delete(socket.userId);

        // Notify others that user is offline
        this.broadcast('user:offline', {
          userId: socket.userId,
          timestamp: new Date()
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });
    });

    logger.info('✅ WebSocket server initialized');
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    const socketId = this.users.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Send to multiple users
  sendToUsers(userIds, event, data) {
    userIds.forEach(userId => {
      this.sendToUser(userId, event, data);
    });
  }

  // Broadcast to all connected clients except sender
  broadcast(event, data, excludeUserId = null) {
    if (excludeUserId) {
      const socketId = this.users.get(excludeUserId.toString());
      if (socketId) {
        this.io.except(socketId).emit(event, data);
      } else {
        this.io.emit(event, data);
      }
    } else {
      this.io.emit(event, data);
    }
  }

  // Broadcast to all including sender
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Send to a specific room
  sendToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  // Emit notification
  emitNotification(userId, notification) {
    this.sendToUser(userId, 'notification', notification);
  }

  // Emit deal update
  emitDealUpdate(deal, action = 'updated') {
    const event = `deal:${action}`;
    const data = {
      deal,
      action,
      timestamp: new Date()
    };

    // Send to deal owner
    if (deal.owner) {
      this.sendToUser(deal.owner, event, data);
    }

    // Broadcast to all (for pipeline updates)
    this.broadcastToAll(event, data);
  }

  // Emit lead update
  emitLeadUpdate(lead, action = 'updated') {
    const event = `lead:${action}`;
    const data = {
      lead,
      action,
      timestamp: new Date()
    };

    // Send to lead owner
    if (lead.owner) {
      this.sendToUser(lead.owner, event, data);
    }

    // If hot lead, broadcast to all
    if (action === 'hot' || (lead.aiScore && lead.aiScore.overall >= 80)) {
      this.broadcastToAll('lead:hot', data);
    }
  }

  // Emit workflow execution
  emitWorkflowExecution(workflow, execution, userId) {
    const data = {
      workflow,
      execution,
      timestamp: new Date()
    };

    this.sendToUser(userId, 'workflow:executed', data);
  }

  // Emit task creation
  emitTaskCreated(task) {
    const data = {
      task,
      timestamp: new Date()
    };

    if (task.assignedTo) {
      this.sendToUser(task.assignedTo, 'task:created', data);
    }
  }

  // Emit activity
  emitActivity(activity, userIds = []) {
    const data = {
      activity,
      timestamp: new Date()
    };

    if (userIds.length > 0) {
      this.sendToUsers(userIds, 'activity:created', data);
    } else {
      this.broadcastToAll('activity:created', data);
    }
  }

  isConnected() {
    return this.io !== null;
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
module.exports = websocketService;
