const express = require('express');
const router = express.Router();
const defineCase = require('../../models/cases.model');
const defineStep = require('../../models/steps.model');
const defineAttachment = require('../../models/attachments.model');
const defineUser = require('../../models/users.model');
const defineDevStatus = require('../../models/devStatus.model');
const { DataTypes } = require('sequelize');
const CasesController = require('../../controllers/cases.controller');

module.exports = function (sequelize) {
  const Case = defineCase(sequelize, DataTypes);
  const Step = defineStep(sequelize, DataTypes);
  const Attachment = defineAttachment(sequelize, DataTypes);
  const User = defineUser(sequelize, DataTypes);
  const DevStatus = defineDevStatus(sequelize, DataTypes);

  Case.belongsToMany(Step, { through: 'caseSteps' });
  Step.belongsToMany(Case, { through: 'caseSteps' });
  Case.belongsToMany(Attachment, { through: 'caseAttachments' });
  Attachment.belongsToMany(Case, { through: 'caseAttachments' });
  Case.belongsTo(User, { foreignKey: 'userId' });
  Case.hasMany(DevStatus, { foreignKey: 'caseId', onDelete: 'CASCADE' });
  DevStatus.belongsTo(Case, { foreignKey: 'caseId' });

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const { verifyProjectVisibleFromCaseId } = require('../../middlewares/verifyVisible.middleware')(sequelize);
  
  const casesController = new CasesController(sequelize, Case);

  router.get('/:caseId', 
    verifySignedIn, 
    verifyProjectVisibleFromCaseId, 
    (req, res) => casesController.showCase(req, res)
  );

  return router;
};
