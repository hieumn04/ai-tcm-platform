const ResponseUtil = require('../utils/response.util');
const path = require('path');

class AttachmentsValidator {

  static validateUploadFiles(req, res, next) {
    const errors = [];
    const { parentCaseId } = req.query;
    const files = req.files;

    // Validate parentCaseId
    if (!parentCaseId) {
      errors.push('parentCaseId is required');
    } else if (!Number.isInteger(parseInt(parentCaseId, 10)) || parseInt(parentCaseId, 10) <= 0) {
      errors.push('parentCaseId must be a positive integer');
    }

    // Validate files presence
    if (!files || files.length === 0) {
      errors.push('At least one file is required');
    } else {
      // File count validation
      if (files.length > 10) {
        errors.push('Maximum 10 files allowed per upload');
      }

      // Individual file validation
      files.forEach((file, index) => {
        if (!file.originalname) {
          errors.push(`File ${index + 1}: Original filename is required`);
        }

        if (!file.size || file.size <= 0) {
          errors.push(`File ${index + 1}: Invalid file size`);
        }

        if (!file.mimetype) {
          errors.push(`File ${index + 1}: MIME type is required`);
        }
      });
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static validateDeleteAttachment(req, res, next) {
    const errors = [];
    const { attachmentId } = req.params;

    if (!attachmentId) {
      errors.push('attachmentId is required');
    } else if (!Number.isInteger(parseInt(attachmentId)) || parseInt(attachmentId) <= 0) {
      errors.push('attachmentId must be a positive integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static validateDownloadAttachment(req, res, next) {
    const errors = [];
    const { attachmentId } = req.params;

    if (!attachmentId) {
      errors.push('attachmentId is required');
    } else if (!Number.isInteger(parseInt(attachmentId)) || parseInt(attachmentId) <= 0) {
      errors.push('attachmentId must be a positive integer');
    }

    if (errors.length > 0) {
      return ResponseUtil.validationError(res, errors);
    }

    next();
  }

  static sanitizeInput(req, res, next) {
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.trim().replace(/[\x00-\x1F\x7F]/g, '');
    };

    const sanitizeNumber = (num) => {
      if (num === undefined || num === null) return num;
      const parsed = parseInt(num, 10);
      return isNaN(parsed) ? num : parsed;
    };

    // Sanitize query parameters
    if (req.query) {
      if (req.query.parentCaseId) {
        req.query.parentCaseId = sanitizeNumber(req.query.parentCaseId);
      }
    }

    // Sanitize route parameters
    if (req.params) {
      if (req.params.attachmentId) {
        req.params.attachmentId = sanitizeNumber(req.params.attachmentId);
      }
    }

    // Sanitize file metadata if present
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (file.originalname) {
          file.originalname = sanitizeString(file.originalname);
        }
      });
    }

    next();
  }

  // Security middleware to validate file types before multer processing
  static validateFileTypes(req, res, next) {
    const allowedMimeTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
      // Documents
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/rtf',
      // Spreadsheets
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // Media
      'video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv',
      'audio/mpeg', 'audio/wav', 'audio/flac',
    ];

    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
      '.pdf', '.doc', '.docx', '.txt', '.rtf',
      '.xls', '.xlsx', '.csv',
      '.zip', '.rar', '.7z',
      '.mp4', '.avi', '.mov', '.wmv',
      '.mp3', '.wav', '.flac',
    ];

    // This will be used by multer fileFilter
    req.fileValidation = {
      allowedMimeTypes,
      allowedExtensions,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    };

    next();
  }

  // Multer file filter function
  static createFileFilter() {
    return (req, file, cb) => {
      const validation = req.fileValidation;
      
      if (!validation) {
        return cb(new Error('File validation not initialized'), false);
      }

      // Check MIME type
      if (!validation.allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error(`File type ${file.mimetype} not allowed`), false);
      }

      // Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (!validation.allowedExtensions.includes(ext)) {
        return cb(new Error(`File extension ${ext} not allowed`), false);
      }

      // Check filename for dangerous patterns
      if (!AttachmentsValidator.isSecureFilename(file.originalname)) {
        return cb(new Error(`Filename contains dangerous characters`), false);
      }

      cb(null, true);
    };
  }

  static isSecureFilename(filename) {
    // Prevent path traversal and dangerous characters
    const dangerousPatterns = [
      /\.\./,           // Path traversal
      /[<>:"|?*]/,      // Windows reserved characters
      /[\x00-\x1F]/,    // Control characters
      /^\./,            // Hidden files (starting with dot)
      /\.$/,            // Trailing dots
      /\s$/,            // Trailing spaces
    ];

    return !dangerousPatterns.some(pattern => pattern.test(filename));
  }

  // Storage configuration for multer
  static createStorage() {
    const multer = require('multer');
    const fs = require('fs');
    const uploadDir = path.join(__dirname, '../public/uploads');

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    return multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: async (req, file, cb) => {
        try {
          const ext = path.extname(file.originalname).toLowerCase();
          const baseName = path.basename(file.originalname, ext);
          const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
          
          // Generate unique filename
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);
          const uniqueFilename = `${sanitizedBaseName}_${timestamp}_${random}${ext}`;
          
          // Double-check uniqueness
          const finalPath = path.join(uploadDir, uniqueFilename);
          if (fs.existsSync(finalPath)) {
            const extraRandom = Math.random().toString(36).substring(2, 8);
            const finalUnique = `${sanitizedBaseName}_${timestamp}_${random}_${extraRandom}${ext}`;
            return cb(null, finalUnique);
          }
          
          cb(null, uniqueFilename);
        } catch (error) {
          cb(error, '');
        }
      },
    });
  }

  // Create multer upload middleware
  static createUploadMiddleware() {
    const multer = require('multer');
    
    return multer({
      storage: AttachmentsValidator.createStorage(),
      fileFilter: AttachmentsValidator.createFileFilter(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10, // Maximum 10 files
      },
    });
  }
}

module.exports = AttachmentsValidator; 