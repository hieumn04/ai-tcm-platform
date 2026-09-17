const { Sequelize } = require('sequelize');
const createApp = require('./app');
const WebSocketService = require('./services/websocket.service');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

async function startServer() {
  // Database configuration
  const databaseUrl = process.env.DATABASE_URL;
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT;
  const dbPassword = process.env.DB_PASSWORD;

  const sslOption = (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production') ? {
    require: true,
    rejectUnauthorized: false
  } : false;

  let sequelize;

  if (databaseUrl) {
    sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectOptions: {
        clientMinMessages: 'ignore',
        ssl: sslOption
      }
    });
  } else if (dbName && dbUser && dbHost && dbPort && dbPassword) {
    sequelize = new Sequelize(dbName, dbUser, dbPassword, {
      host: dbHost,
      port: parseInt(dbPort, 10),
      dialect: 'postgres',
      dialectOptions: {
        clientMinMessages: 'ignore',
        ssl: sslOption
      },
    });
  } else {
    console.error('Please set either DATABASE_URL or environment variables: DB_NAME, DB_USER, DB_HOST, DB_PORT, DB_PASSWORD');
    process.exit(1);
  }

  // Test database connection
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Auto-verify/create required JSONB columns on production DB
    await sequelize.query('ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "aiAssessment" JSONB;');
    await sequelize.query('ALTER TABLE "runCases" ADD COLUMN IF NOT EXISTS "aiAssessment" JSONB;');
    console.log('Database schema check: "aiAssessment" columns verified/added successfully.');
  } catch (error) {
    console.error('Unable to connect or sync database schema:', error);
    process.exit(1);
  }

  // --- Initialize Express app
  const app = createApp(sequelize, WebSocketService);

  // --- Create HTTP server & WebSocket server
  const server = http.createServer(app);
  const rawOrigins = process.env.FRONTEND_ORIGIN || 'http://localhost:8000';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const io = new Server(server, {
    path: '/backend/socket.io/',
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed =
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes('*') ||
          origin.endsWith('.vercel.app') ||
          origin.includes('localhost');
        return callback(null, isAllowed ? true : true);
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    upgradeTimeout: 30000,
    pingTimeout: 60000,
    pingInterval: 25000
  });

  WebSocketService.initialize(io);

  // Start server
  const PORT = process.env.PORT || 8001;
  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:8000';

  server.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
    console.log(`Access from the frontend origin: ${frontendOrigin} is valid.`);
    console.log(`-----------------------------------------------------`);
    if (!process.env.SECRET_KEY) {
      console.log(
        "[Warning]: Default key is used for token generation. Please set the environment variable 'SECRET_KEY'."
      );
    }
  });

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await sequelize.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await sequelize.close();
    process.exit(0);
  });
}

startServer().catch(err => {
  console.error('Server start failed:', err);
  process.exit(1);
});

module.exports = { startServer };
