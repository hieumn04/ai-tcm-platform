const express = require('express');
const router = express.Router();
const defineCase = require('../../models/cases.model');
const { DataTypes } = require('sequelize');
const CasesController = require('../../controllers/cases.controller');
const CasesValidator = require('../../validators/cases.validator');

module.exports = function (sequelize) {
  const Case = defineCase(sequelize, DataTypes);
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromCaseId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  
  const casesController = new CasesController(sequelize, Case);

  // Get all platform evidence for a case
  router.get('/:caseId/platform-evidence', 
    verifySignedIn, 
    verifyProjectVisibleFromCaseId, 
    (req, res) => casesController.getPlatformEvidence(req, res)
  );

  // Update platform evidence for a specific platform
  router.post('/:caseId/platform-evidence/:platform', 
    verifySignedIn, 
    verifyProjectVisibleFromCaseId,
    CasesValidator.validatePlatformEvidence,
    (req, res) => casesController.updatePlatformEvidence(req, res)
  );

  return router;
}; 