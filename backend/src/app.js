const express = require('express');
const { rateLimit } = require('express-rate-limit');
const path = require('path');
const cors = require('cors');

function createApp(sequelize, webSocketService) {
  const app = express();

  // CORS configuration
  const rawOrigins = process.env.FRONTEND_ORIGIN || 'http://localhost:8000';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost');
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  };
  app.use(cors(corsOptions));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10000, // 10000 requests per hour
    message: 'Too many requests from this IP, please try again after an hour',
  });
  app.use(limiter);

  // Static files
  app.use(express.static(path.join(__dirname, '../public')));

  // Routes
  setupRoutes(app, sequelize, webSocketService);

  return app;
}

function setupRoutes(app, sequelize, webSocketService) {
  // Root route
  const indexRoute = require('./routes/index');
  app.use('/', indexRoute);

  // User routes
  const usersIndexRoute = require('./routes/users/users.route')(sequelize);
  const usersFindRoute = require('./routes/users/find.route')(sequelize);
  const usersSearchRoute = require('./routes/users/search.route')(sequelize);
  const signUpRoute = require('./routes/users/signup.route')(sequelize);
  const signInRoute = require('./routes/users/signin.route')(sequelize);
  const resetPasswordRoute = require('./routes/users/resetPassword.route')(sequelize);

  app.use('/api/users', usersIndexRoute);
  app.use('/api/users', usersFindRoute);
  app.use('/api/users', usersSearchRoute);
  app.use('/api/users', signUpRoute);
  app.use('/api/users', signInRoute);
  app.use('/api/users', resetPasswordRoute);

  // Project routes
  const projectsIndexRoute = require('./routes/projects/projects.route')(sequelize);
  const projectsShowRoute = require('./routes/projects/show.route')(sequelize);
  const projectsNewRoute = require('./routes/projects/new.route')(sequelize);
  const projectsEditRoute = require('./routes/projects/edit.route')(sequelize);
  const projectsDeleteRoute = require('./routes/projects/delete.route')(sequelize);

  app.use('/api/projects', projectsIndexRoute);
  app.use('/api/projects', projectsShowRoute);
  app.use('/api/projects', projectsNewRoute);
  app.use('/api/projects', projectsEditRoute);
  app.use('/api/projects', projectsDeleteRoute);

  // Folder routes
  const foldersIndexRoute = require('./routes/folders/folders.route')(sequelize);
  const foldersNewRoute = require('./routes/folders/new.route')(sequelize);
  const foldersEditRoute = require('./routes/folders/edit.route')(sequelize);
  const foldersDeleteRoute = require('./routes/folders/delete.route')(sequelize);
  const folderIndexByFolderIdRoute = require('./routes/folders/show.route')(sequelize);

  app.use('/api/folders', foldersIndexRoute);
  app.use('/api/folders', foldersNewRoute);
  app.use('/api/folders', foldersEditRoute);
  app.use('/api/folders', foldersDeleteRoute);
  app.use('/api/folders', folderIndexByFolderIdRoute);

  // Case routes
  const casesIndexRoute = require('./routes/cases/cases.route')(sequelize);
  const casesIndexByProjectIdRoute = require('./routes/cases/indexByProjectId.route')(sequelize);
  const casesShowRoute = require('./routes/cases/show.route')(sequelize);
  const casesNewRoute = require('./routes/cases/new.route')(sequelize);
  const casesEditRoute = require('./routes/cases/edit.route')(sequelize);
  const casesDeleteRoute = require('./routes/cases/delete.route')(sequelize);
  const casesImportRoute = require('./routes/cases/import.route')(sequelize);
  const casesDuplicateRoute = require('./routes/cases/duplicate.route')(sequelize);
  const casesPlatformEvidenceRoute = require('./routes/cases/platformEvidence.route')(sequelize);

  app.use('/api/cases', casesIndexRoute);
  app.use('/api/cases', casesIndexByProjectIdRoute);
  app.use('/api/cases', casesShowRoute);
  app.use('/api/cases', casesNewRoute);
  app.use('/api/cases', casesEditRoute);
  app.use('/api/cases', casesDeleteRoute);
  app.use('/api/cases', casesImportRoute);
  app.use('/api/cases', casesDuplicateRoute);
  app.use('/api/cases', casesPlatformEvidenceRoute);

  // Step routes
  const stepsEditRoute = require('./routes/steps/edit.route')(sequelize);
  app.use('/api/steps', stepsEditRoute);

  // Attachment routes
  const attachmentsNewRoute = require('./routes/attachments/new.route')(sequelize);
  const attachmentsDeleteRoute = require('./routes/attachments/delete.route')(sequelize);
  const attachmentsDownloadRoute = require('./routes/attachments/download.route')(sequelize);

  app.use('/api/attachments', attachmentsNewRoute);
  app.use('/api/attachments', attachmentsDeleteRoute);
  app.use('/api/attachments', attachmentsDownloadRoute);

  // Run routes
  const runsIndexRoute = require('./routes/runs/runs.route')(sequelize);
  const runsShowRoute = require('./routes/runs/show.route')(sequelize);
  const runsNewRoute = require('./routes/runs/new.route')(sequelize);
  const runsEditRoute = require('./routes/runs/edit.route')(sequelize);
  const runDeleteRoute = require('./routes/runs/delete.route')(sequelize);
  const runDuplicateRoute = require('./routes/runs/duplicate.route')(sequelize);

  app.use('/api/runs', runsIndexRoute);
  app.use('/api/runs', runsShowRoute);
  app.use('/api/runs', runsNewRoute);
  app.use('/api/runs', runsEditRoute);
  app.use('/api/runs', runDeleteRoute);
  app.use('/api/runs', runDuplicateRoute);

  // Run case routes
  const runCaseIndexRoute = require('./routes/runcases/runcases.route')(sequelize);
  const runCaseEditRoute = require('./routes/runcases/edit.route')(sequelize, webSocketService);
  const runCasesIndexByRunIdRoute = require('./routes/runcases/indexByRunId.route')(sequelize);
  const runCasesAddRoute = require('./routes/runcases/add.route')(sequelize);
  const runCasesRemoveRoute = require('./routes/runcases/remove.route')(sequelize);

  app.use('/api/runcases', runCaseIndexRoute);
  app.use('/api/runcases', runCaseEditRoute);
  app.use('/api/runcases', runCasesIndexByRunIdRoute);
  app.use('/api/runcases', runCasesAddRoute);
  app.use('/api/runcases', runCasesRemoveRoute);

  // Member routes
  const membersIndexRoute = require('./routes/members/members.route')(sequelize);
  const membersNewRoute = require('./routes/members/new.route')(sequelize);
  const membersEditRoute = require('./routes/members/edit.route')(sequelize);
  const membersDeleteRoute = require('./routes/members/delete.route')(sequelize);
  const membersCheckRoute = require('./routes/members/check.route')(sequelize);

  app.use('/api/members', membersIndexRoute);
  app.use('/api/members', membersNewRoute);
  app.use('/api/members', membersEditRoute);
  app.use('/api/members', membersDeleteRoute);
  app.use('/api/members', membersCheckRoute);

  // Home routes
  const homeIndexRoute = require('./routes/home/home.route')(sequelize);
  app.use('/api/home', homeIndexRoute);

  // Chart routes
  const userCasesChartRoute = require('./routes/charts/user-cases.route')(sequelize);
  app.use('/api/charts/user-cases', userCasesChartRoute);

  // Dev status routes
  const devStatusNewRoute = require('./routes/devStatus/new.route')(sequelize);
  const devStatusIndexByCaseIdRoute = require('./routes/devStatus/indexByCaseId.route')(sequelize);
  const devStatusDeleteRoute = require('./routes/devStatus/delete.route')(sequelize);

  app.use('/api/dev-status', devStatusNewRoute);
  app.use('/api/dev-status', devStatusIndexByCaseIdRoute);
  app.use('/api/dev-status', devStatusDeleteRoute);

  // Change log routes
  const changeLogsIndexByCaseIdRoute = require('./routes/changeLogs/indexByCaseId.route')(sequelize);
  app.use('/api/change-logs', changeLogsIndexByCaseIdRoute);

  // Analytics routes
  const analyticsIndexRoute = require('./routes/analytics/cases.route')(sequelize);
  app.use('/api/analytics', analyticsIndexRoute);

  // Folder platform routes
  const folderPlatformGetRoute = require('./routes/folderPlatform/show.route')(sequelize);
  const folderPlatformUpdateRoute = require('./routes/folderPlatform/edit.route')(sequelize);

  app.use('/api/folder-platform', folderPlatformGetRoute);
  app.use('/api/folder-platform', folderPlatformUpdateRoute);

  // Run platform routes
  const runPlatformGetRoute = require('./routes/runPlatform/show.route')(sequelize);
  const runPlatformUpdateRoute = require('./routes/runPlatform/edit.route')(sequelize);

  app.use('/api/run-platform', runPlatformGetRoute);
  app.use('/api/run-platform', runPlatformUpdateRoute);

  // Execute Senai callback routes
  const executeSenaiCallbackRoute = require('./routes/execute-senai/callback.route')(sequelize, webSocketService);
  app.use('/api/execute-senai', executeSenaiCallbackRoute);

  // DeepSeek AI routes
  const aiRoute = require('./routes/ai/ai.route')(sequelize, webSocketService);
  app.use('/api/ai', aiRoute);
}

module.exports = createApp;
