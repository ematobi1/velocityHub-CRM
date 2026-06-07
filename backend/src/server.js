const http = require('http');
const { app, connectDB } = require('./app');
const websocketService = require('./services/websocket');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

connectDB()
  .then(() => {
    websocketService.initialize(server);
    server.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
