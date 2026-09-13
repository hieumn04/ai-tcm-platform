const defineUser = require('../models/users.model');
const defineChangeLogs = require('../models/changeLogs.model');
const { DataTypes } = require('sequelize');

function changeLogsMiddleware(sequelize) {
  const ChangeLogs = defineChangeLogs(sequelize, DataTypes);
  const Users = defineUser(sequelize, DataTypes);

  async function writeChangeLogs(req, res, next) {
    if (req.method === 'GET') {
      return next();
    }

    try {
      const user = await Users.findByPk(req.userId);
      if (!user) {
        return next();
      }

      const author = user.email;
      const body = req.body;

      if (Array.isArray(body)) {
        // If body itself is an array, log each item separately
        await Promise.all(body.map((item) => createChangeLog(item, req, author)));
      } else if (Array.isArray(body.caseIds)) {
        // If caseIds exists, log each ID separately while keeping other body fields
        await Promise.all(body.caseIds.map((caseId) => createChangeLog({ ...body, caseId }, req, author)));
      } else if (Array.isArray(body.cases)) {
        // If cases array exists, log each case separately
        await Promise.all(body.cases.map((singleCase) => createChangeLog(singleCase, req, author)));
      } else {
        // Default case: log the whole body
        await createChangeLog(body, req, author);
      }
    } catch (error) {
      console.error('Error in changeLogs middleware:', error);
    } finally {
      next();
    }
  }

  async function createChangeLog(body, req, author) {
    const folderId = body.folderId || req.params.folderId || req.query.folderId;
    const projectId = body.projectId || req.params.projectId || req.query.projectId;
    const caseId = body.caseId || req.params.caseId || req.query.caseId;
    const { method: action, originalUrl: endpoint } = req;

    await ChangeLogs.create({
      folder_id: folderId,
      project_id: projectId,
      case_id: caseId,
      action,
      endpoint,
      author,
      content: JSON.stringify(body),
      action_at: new Date(),
    });
  }

  return { writeChangeLogs };
}

module.exports = changeLogsMiddleware; 