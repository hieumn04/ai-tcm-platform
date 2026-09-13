const express = require('express');
const router = express.Router();
const defineAttachment = require('../../models/attachments.model');
const { DataTypes } = require('sequelize');

module.exports = function (sequelize) {
  const Attachment = defineAttachment(sequelize, DataTypes);
  const AttachmentsController = require('../../controllers/attachments.controller');
  const controller = new AttachmentsController(sequelize, Attachment);

  const { verifySignedIn } = require('../../middlewares/auth.middleware')(sequelize);
  const AttachmentsValidator = require('../../validators/attachments.validator');

  router.get('/download/:attachmentId', 
    verifySignedIn,
    AttachmentsValidator.sanitizeInput,
    AttachmentsValidator.validateDownloadAttachment,
    (req, res) => controller.downloadAttachment(req, res)
  );

  return router;
};
