const { DataTypes } = require('sequelize');
const ResponseUtil = require('../utils/response.util');

class StepsController {
  constructor(sequelize, Step) {
    this.sequelize = sequelize;
    this.Step = Step;
    this.CaseStep = require('../models/caseSteps.model')(sequelize, DataTypes);
    this.Case = require('../models/cases.model')(sequelize, DataTypes);
    this.setupAssociations();
  }

  setupAssociations() {
    this.Step.hasMany(this.CaseStep, { foreignKey: 'stepId', onDelete: 'CASCADE' });
    this.CaseStep.belongsTo(this.Step, { foreignKey: 'stepId', onDelete: 'CASCADE' });
    this.Case.hasMany(this.CaseStep, { foreignKey: 'caseId', onDelete: 'CASCADE' });
    this.CaseStep.belongsTo(this.Case, { foreignKey: 'caseId', onDelete: 'CASCADE' });
  }

  async updateSteps(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { caseId } = req.query;
      const steps = req.body;
      
      if (!caseId) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['caseId is required']);
      }
      
      if (!Array.isArray(steps)) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['Steps must be an array']);
      }
      
      // Validate case exists
      const caseExists = await this.Case.findOne({
        where: { id: caseId, is_deleted: false },
        transaction
      });
      if (!caseExists) {
        await transaction.rollback();
        return ResponseUtil.notFound(res, 'Case not found');
      }
      
      const results = await Promise.all(
        steps.map(async (step) => {
          switch (step.editState) {
            case 'new':
              return await this.createStep(step, caseId, transaction);
            case 'deleted':
              return await this.deleteStep(step, transaction);
            case 'changed':
              return await this.updateStep(step, transaction);
            case 'notChanged':
              return step;
            default:
              throw new Error(`Invalid editState: ${step.editState}`);
          }
        })
      );
      
      await transaction.commit();
      
      const filteredResults = results.filter((result) => result !== null);
      
      return ResponseUtil.success(res, filteredResults, 'Steps updated successfully');
      
    } catch (error) {
      await transaction.rollback();
      return ResponseUtil.serverError(res, error, 'Failed to update steps');
    }
  }

  async createStep(step, caseId, transaction) {
    if (!step.step || !step.result) {
      throw new Error('Step and result are required for new steps');
    }
    
    if (!step.caseSteps || step.caseSteps.stepNo === undefined) {
      throw new Error('caseSteps.stepNo is required for new steps');
    }
    
    const newStep = await this.Step.create(
      {
        step: step.step,
        result: step.result,
      },
      { transaction }
    );
    
    await this.CaseStep.create(
      {
        caseId: parseInt(caseId, 10),
        stepId: newStep.id,
        stepNo: step.caseSteps.stepNo,
      },
      { transaction }
    );
    
    return newStep;
  }

  async deleteStep(step, transaction) {
    if (!step.id) {
      throw new Error('Step ID is required for deletion');
    }
    
    // Delete CaseStep association first (due to foreign key constraints)
    await this.CaseStep.destroy({
      where: { stepId: step.id },
      transaction,
    });
    
    // Then delete the Step itself
    await this.Step.destroy({
      where: { id: step.id },
      transaction,
    });
    
    return null; // Indicate deletion
  }

  async updateStep(step, transaction) {
    if (!step.id) {
      throw new Error('Step ID is required for updates');
    }
    
    // Update Step data
    if (step.step !== undefined || step.result !== undefined) {
      const updateData = {};
      if (step.step !== undefined) updateData.step = step.step;
      if (step.result !== undefined) updateData.result = step.result;
      
      await this.Step.update(updateData, {
        where: { id: step.id },
        transaction,
      });
    }
    
    // Update CaseStep data (stepNo)
    if (step.caseSteps && step.caseSteps.stepNo !== undefined) {
      await this.CaseStep.update(
        {
          stepNo: step.caseSteps.stepNo,
        },
        {
          where: { stepId: step.id },
          transaction,
        }
      );
    }
    
    return step;
  }
}

module.exports = StepsController; 