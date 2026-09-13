const path = require('path');
const fs = require('fs').promises;
const { DataTypes } = require('sequelize');
const ResponseUtil = require('../utils/response.util');

class AttachmentsController {
  constructor(sequelize, Attachment) {
    this.sequelize = sequelize;
    this.Attachment = Attachment;
    this.CaseAttachment = require('../models/caseAttachments.model')(sequelize, DataTypes);
    this.Case = require('../models/cases.model')(sequelize, DataTypes);
    this.setupAssociations();
    this.uploadDir = path.join(__dirname, '../public/uploads');
    this.ensureUploadDir();
  }

  setupAssociations() {
    this.Attachment.hasMany(this.CaseAttachment, { foreignKey: 'attachmentId', onDelete: 'CASCADE' });
    this.CaseAttachment.belongsTo(this.Attachment, { foreignKey: 'attachmentId', onDelete: 'CASCADE' });
    this.Case.hasMany(this.CaseAttachment, { foreignKey: 'caseId', onDelete: 'CASCADE' });
    this.CaseAttachment.belongsTo(this.Case, { foreignKey: 'caseId', onDelete: 'CASCADE' });
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFiles(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { parentCaseId } = req.query;
      const files = req.files;
      
      if (!files || files.length === 0) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['No files uploaded']);
      }
      
      if (!parentCaseId) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['parentCaseId is required']);
      }
      
      // Validate case exists
      const caseExists = await this.Case.findOne({
        where: { id: parentCaseId, is_deleted: false },
        transaction
      });
      if (!caseExists) {
        await transaction.rollback();
        return ResponseUtil.notFound(res, 'Case not found');
      }
      
      // Security validation
      const validationErrors = await this.validateFiles(files);
      if (validationErrors.length > 0) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, validationErrors);
      }
      
      const host = req.get('host');
      const protocol = req.protocol;
      
      const attachmentsData = files.map((file) => ({
        title: file.originalname,
        detail: `Uploaded file: ${file.originalname}`,
        path: `${protocol}://${host}/uploads/${file.filename}`,
      }));
      
      const newAttachments = await this.Attachment.bulkCreate(attachmentsData, {
        transaction,
      });
      
      const caseAttachmentsData = newAttachments.map((attachment) => ({
        caseId: parentCaseId,
        attachmentId: attachment.id,
      }));
      
      await this.CaseAttachment.bulkCreate(caseAttachmentsData, { transaction });
      
      await transaction.commit();
      
      return ResponseUtil.success(res, {
        attachments: newAttachments,
        uploaded: newAttachments.length,
      }, 'Files uploaded successfully');
      
    } catch (error) {
      await transaction.rollback();
      return ResponseUtil.serverError(res, error, 'Failed to upload files');
    }
  }

  async deleteAttachment(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { attachmentId } = req.params;
      
      if (!attachmentId) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['attachmentId is required']);
      }
      
      const attachment = await this.Attachment.findByPk(attachmentId, { transaction });
      if (!attachment) {
        await transaction.rollback();
        return ResponseUtil.notFound(res, 'Attachment not found');
      }
      
      // Extract filename from URL for secure deletion
      const fileName = this.extractFileName(attachment.path);
      if (!fileName) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['Invalid file path']);
      }
      
      const filePath = path.join(this.uploadDir, fileName);
      
      // Validate file path security
      if (!this.isValidFilePath(filePath)) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['Invalid file path']);
      }
      
      // Delete file from filesystem
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
      } catch (fileError) {
        console.error('File not found on filesystem:', filePath);
        // Continue with database deletion even if file doesn't exist
      }
      
      // Delete from database (cascade will handle CaseAttachment)
      await attachment.destroy({ transaction });
      
      await transaction.commit();
      
      return ResponseUtil.success(res, null, 'Attachment deleted successfully');
      
    } catch (error) {
      await transaction.rollback();
      return ResponseUtil.serverError(res, error, 'Failed to delete attachment');
    }
  }

  async downloadAttachment(req, res) {
    try {
      const { attachmentId } = req.params;
      
      if (!attachmentId) {
        return ResponseUtil.validationError(res, ['attachmentId is required']);
      }
      
      const attachment = await this.Attachment.findByPk(attachmentId);
      if (!attachment) {
        return ResponseUtil.notFound(res, 'Attachment not found');
      }
      
      const fileName = this.extractFileName(attachment.path);
      if (!fileName) {
        return ResponseUtil.validationError(res, ['Invalid file path']);
      }
      
      const filePath = path.join(this.uploadDir, fileName);
      
      // Validate file path security
      if (!this.isValidFilePath(filePath)) {
        return ResponseUtil.validationError(res, ['Invalid file path']);
      }
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return ResponseUtil.notFound(res, 'File not found on server');
      }
      
      // Set security headers
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.title}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Send file
      res.download(filePath, attachment.title, (error) => {
        if (error) {
          if (!res.headersSent) {
            return ResponseUtil.serverError(res, error, 'Failed to download file');
          }
        }
      });
      
    } catch (error) {
      return ResponseUtil.serverError(res, error, 'Failed to download attachment');
    }
  }

  // Security validation methods
  async validateFiles(files) {
    const errors = [];
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const maxFiles = 10;
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', // Images
      '.pdf', '.doc', '.docx', '.txt', '.rtf', // Documents
      '.xls', '.xlsx', '.csv', // Spreadsheets
      '.zip', '.rar', '.7z', // Archives
      '.mp4', '.avi', '.mov', '.wmv', // Videos
      '.mp3', '.wav', '.flac', // Audio
    ];
    
    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
    }
    
    for (const file of files) {
      // File size validation
      if (file.size > maxFileSize) {
        errors.push(`File ${file.originalname} exceeds maximum size of 10MB`);
      }
      
      // File extension validation
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        errors.push(`File type ${ext} not allowed for ${file.originalname}`);
      }
      
      // Filename validation
      if (!this.isValidFileName(file.originalname)) {
        errors.push(`Invalid filename: ${file.originalname}`);
      }
      
      // MIME type validation
      if (!this.isValidMimeType(file.mimetype, ext)) {
        errors.push(`Invalid MIME type for ${file.originalname}`);
      }
    }
    
    return errors;
  }

  isValidFileName(filename) {
    // Prevent path traversal and dangerous characters
    const dangerousPatterns = [
      /\.\./,     // Path traversal
      /[<>:"|?*]/,  // Windows reserved characters
      /[\x00-\x1F]/,  // Control characters
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(filename));
  }

  isValidMimeType(mimetype, extension) {
    const mimeExtMap = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/bmp': ['.bmp'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/zip': ['.zip'],
      'video/mp4': ['.mp4'],
      'audio/mpeg': ['.mp3'],
    };
    
    const allowedExtensions = mimeExtMap[mimetype];
    return allowedExtensions && allowedExtensions.includes(extension);
  }

  extractFileName(url) {
    try {
      return url.substring(url.lastIndexOf('/') + 1);
    } catch {
      return null;
    }
  }

  isValidFilePath(filePath) {
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(this.uploadDir);
    
    // Ensure file is within upload directory
    return resolvedPath.startsWith(resolvedUploadDir);
  }

  generateUniqueFileName(originalName) {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    return `${baseName}_${timestamp}_${random}${ext}`;
  }
}

module.exports = AttachmentsController; 