const ResponseUtil = require('../utils/response.util');

class FoldersController {
  constructor(sequelize, Folder) {
    this.sequelize = sequelize;
    this.Folder = Folder;
  }

  /**
   * Create new folder
   */
  async createFolder(req, res) {
    try {
      const { projectId } = req.query;
      const { name, detail, parentFolderId } = req.body;

      const newFolder = await this.Folder.create({
        name,
        detail,
        projectId,
        parentFolderId,
      });

      ResponseUtil.created(res, newFolder, 'Folder created successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to create folder');
    }
  }

  /**
   * Update existing folder
   */
  async updateFolder(req, res) {
    try {
      const { folderId } = req.params;
      const { name, detail, projectId, parentFolderId } = req.body;

      const folder = await this.Folder.findByPk(folderId);
      if (!folder) {
        return ResponseUtil.notFound(res, 'Folder not found');
      }

      await folder.update({
        name,
        detail,
        projectId,
        parentFolderId,
      });

      ResponseUtil.success(res, folder, 'Folder updated successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to update folder');
    }
  }

  /**
   * Delete folder
   */
  async deleteFolder(req, res) {
    try {
      const { folderId } = req.params;

      const folder = await this.Folder.findByPk(folderId);
      if (!folder) {
        return ResponseUtil.notFound(res, 'Folder not found');
      }

      await folder.destroy();
      ResponseUtil.noContent(res);
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to delete folder');
    }
  }

  /**
   * List folders for a project
   */
  async listFolders(req, res) {
    try {
      const { projectId } = req.query;

      const folders = await this.Folder.findAll({
        where: { projectId },
        order: [['updatedAt', 'DESC']],
      });

      ResponseUtil.success(res, folders, 'Folders retrieved successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to retrieve folders');
    }
  }

  /**
   * Get specific folder details
   */
  async showFolder(req, res) {
    try {
      const { projectId } = req.query;
      const { folderId } = req.params;

      const folder = await this.Folder.findOne({
        where: {
          id: folderId,
          projectId: projectId,
        },
      });

      if (!folder) {
        return ResponseUtil.notFound(res, 'Folder not found in this project');
      }

      ResponseUtil.success(res, folder, 'Folder retrieved successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to retrieve folder');
    }
  }
}

module.exports = FoldersController; 