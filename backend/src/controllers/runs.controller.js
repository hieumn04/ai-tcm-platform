const ResponseUtil = require('../utils/response.util');

class RunsController {
  constructor(sequelize, Run) {
    this.sequelize = sequelize;
    this.Run = Run;
    this.setupAssociations();
  }

  setupAssociations() {
    const { DataTypes } = require('sequelize');
    const defineRunCase = require('../models/runCases.model');
    const defineRunCaseStatus = require('../models/runCaseStatus.model');
    
    this.RunCase = defineRunCase(this.sequelize, DataTypes);
    this.RunCaseStatus = defineRunCaseStatus(this.sequelize, DataTypes);
    
    // Set up associations properly
    this.RunCase.hasMany(this.RunCaseStatus, { foreignKey: 'runCaseId', as: 'statuses', onDelete: 'CASCADE' });
    this.RunCaseStatus.belongsTo(this.RunCase, { foreignKey: 'runCaseId', onDelete: 'CASCADE' });
  }

  /**
   * Create new test run
   */
  async createRun(req, res) {
    try {
      const { projectId } = req.query;
      const { name, configurations, description, state, ticketKey } = req.body;

      const newRun = await this.Run.create({
        name,
        configurations,
        description,
        state: state || 0,
        projectId,
        ticketKey,
      });

      ResponseUtil.created(res, newRun, 'Test run created successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to create test run');
    }
  }

  /**
   * Update existing test run
   */
  async updateRun(req, res) {
    try {
      const { runId } = req.params;
      const updateData = { ...req.body };

      // Remove steps from update data as they're handled separately
      if (updateData.Steps) {
        delete updateData.Steps;
      }

      const testrun = await this.Run.findByPk(runId);
      if (!testrun) {
        return ResponseUtil.notFound(res, 'Test run not found');
      }

      await testrun.update(updateData);
      ResponseUtil.success(res, testrun, 'Test run updated successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to update test run');
    }
  }

  /**
   * Delete test run
   */
  async deleteRun(req, res) {
    try {
      const { runId } = req.params;

      const testrun = await this.Run.findByPk(runId);
      if (!testrun) {
        return ResponseUtil.notFound(res, 'Test run not found');
      }

      await testrun.destroy();
      ResponseUtil.noContent(res);
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to delete test run');
    }
  }

  /**
   * List test runs for a project
   */
  async listRuns(req, res) {
    try {
      const { projectId } = req.query;

      const runs = await this.Run.findAll({
        where: { projectId },
        order: [['updatedAt', 'DESC']],
      });

      ResponseUtil.success(res, runs, 'Test runs retrieved successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to retrieve test runs');
    }
  }

  /**
   * Get test run details with status counts
   */
  async showRun(req, res) {
    try {
      const { runId } = req.params;

      const run = await this.Run.findByPk(runId);
      if (!run) {
        return ResponseUtil.notFound(res, 'Test run not found');
      }

      // Get status counts for test cases in this run
      const { literal } = require('sequelize');
      const statusCounts = await this.RunCaseStatus.findAll({
        attributes: ['status', [literal('COUNT(*)'), 'count']],
        include: [
          {
            model: this.RunCase,
            as: 'runCase',
            attributes: [],
            where: { runId: run.id, is_deleted: false },
          },
        ],
        group: ['status'],
      });

      const responseData = { run, statusCounts };
      ResponseUtil.success(res, responseData, 'Test run retrieved successfully');
    } catch (error) {
      ResponseUtil.serverError(res, error, 'Failed to retrieve test run');
    }
  }

  /**
   * Duplicate test run with all its cases
   */
  async duplicateRun(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id, name, description } = req.body;

      const sourceRun = await this.Run.findByPk(id);
      if (!sourceRun) {
        await transaction.rollback();
        return ResponseUtil.notFound(res, 'Source run not found');
      }

      // Create new run
      const newRun = await this.Run.create({
        name: name || `${sourceRun.name} (Copy)`,
        configurations: 0,
        description: description || sourceRun.description,
        state: 0,
        projectId: sourceRun.projectId,
        ticketKey: sourceRun.ticketKey,
      }, { transaction });

      // Copy run cases
      const sourceCases = await this.RunCase.findAll({ 
        where: { runId: id, is_deleted: false },
        transaction
      });

      if (sourceCases.length > 0) {
        const newRunCases = sourceCases.map((sourceCase) => ({
          runId: newRun.id,
          caseId: sourceCase.caseId,
        }));

        await this.RunCase.bulkCreate(newRunCases, { transaction });
      }

      await transaction.commit();
      ResponseUtil.created(res, newRun, 'Test run duplicated successfully');
    } catch (error) {
      await transaction.rollback();
      ResponseUtil.serverError(res, error, 'Failed to duplicate test run');
    }
  }
}

module.exports = RunsController; 