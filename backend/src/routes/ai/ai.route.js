const express = require('express');
const router = express.Router();
const AIController = require('../../controllers/ai.controller');

module.exports = function (sequelize, webSocketService) {
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const controller = new AIController(sequelize, webSocketService);

  // Generate test case from prompt
  router.post('/generate', verifySignedIn, (req, res) => controller.generateTestCase(req, res));

  // Stream test case generation via SSE
  router.post('/generate-stream', verifySignedIn, (req, res) => controller.generateTestCaseStream(req, res));

  // Save generated test case
  router.post('/save', verifySignedIn, (req, res) => controller.saveAiTestCase(req, res));

  // Save batch of generated test cases
  router.post('/save-batch', verifySignedIn, (req, res) => controller.saveBatchAiTestCases(req, res));

  // Execute AI analysis on test case
  router.post('/execute', verifySignedIn, (req, res) => controller.executeCase(req, res));

  // Save AI assessment
  router.post('/save-assessment', verifySignedIn, (req, res) => controller.saveAssessment(req, res));

  return router;
};
