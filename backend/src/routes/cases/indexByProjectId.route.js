const express = require('express');
const router = express.Router();
const defineCase = require('../../models/cases.model');
const { DataTypes } = require('sequelize');
const CasesController = require('../../controllers/cases.controller');
const CasesValidator = require('../../validators/cases.validator');

module.exports = function (sequelize) {
  const Case = defineCase(sequelize, DataTypes);
  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromProjectId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  
  const casesController = new CasesController(sequelize, Case);

  router.get('/byproject', 
    verifySignedIn, 
    verifyProjectVisibleFromProjectId,
    CasesValidator.validateListCases,
    (req, res) => casesController.listCases(req, res)
  );

  return router;
};
