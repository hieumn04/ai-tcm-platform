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
  
  // Create upload middleware with security validation
  const upload = AttachmentsValidator.createUploadMiddleware();

  router.post('/', 
    verifySignedIn,
    AttachmentsValidator.validateFileTypes,
    upload.array('files', 10),
    AttachmentsValidator.sanitizeInput,
    AttachmentsValidator.validateUploadFiles,
    (req, res) => controller.uploadFiles(req, res)
  );

  return router;
};
