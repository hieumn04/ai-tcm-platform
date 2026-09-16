const { DataTypes, Op } = require('sequelize');
const ResponseUtil = require('../utils/response.util');
const deepseekService = require('../services/deepseek.service');

class AIController {
  constructor(sequelize, webSocketService) {
    this.sequelize = sequelize;
    this.webSocketService = webSocketService;
    this.Case = require('../models/cases.model')(sequelize, DataTypes);
    this.Step = require('../models/steps.model')(sequelize, DataTypes);
    this.CaseStep = require('../models/caseSteps.model')(sequelize, DataTypes);
    this.User = require('../models/users.model')(sequelize, DataTypes);
    this.RunCase = require('../models/runCases.model')(sequelize, DataTypes);

    if (!this.Case.associations.User) {
      this.Case.belongsTo(this.User, { foreignKey: 'userId' });
    }
  }

  /**
   * Generate test case or test suite from prompt and optional image using DeepSeek
   */
  async generateTestCase(req, res) {
    try {
      const { prompt, image, mode = 'suite', language = 'en' } = req.body;

      if ((!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) && !image) {
        return ResponseUtil.validationError(res, ['Please provide a prompt description or an image']);
      }

      if (mode === 'single') {
        const singleCase = await deepseekService.generateTestCase({
          prompt: prompt ? prompt.trim() : '',
          image,
          language,
        });
        return ResponseUtil.success(res, { testCases: [singleCase], singleCase }, 'Single test case generated successfully');
      }

      const testCases = await deepseekService.generateTestSuite({
        prompt: prompt ? prompt.trim() : '',
        image,
        language,
      });

      return ResponseUtil.success(res, { testCases }, 'Test suite generated successfully by DeepSeek AI');
    } catch (error) {
      console.error('[AIController Error in generateTestCase]:', error);
      return ResponseUtil.serverError(res, error, error.message || 'Failed to generate test case with AI');
    }
  }

  /**
   * Stream test suite generation using HTTP SSE (Server-Sent Events)
   */
  async generateTestCaseStream(req, res) {
    try {
      const { prompt, image, language = 'en' } = req.body;

      if ((!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) && !image) {
        return ResponseUtil.validationError(res, ['Please provide a prompt description or an image']);
      }

      // HTTP Server-Sent Events headers (Point 6)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (res.flushHeaders) {
        res.flushHeaders();
      }

      await deepseekService.streamTestSuite({
        prompt: prompt ? prompt.trim() : '',
        image,
        language,
        onChunk: (chunk) => {
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          if (typeof res.flush === 'function') {
            res.flush();
          }
        },
      });

      // Signal stream completion
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('[AIController Error in generateTestCaseStream]:', error);
      if (!res.headersSent) {
        return ResponseUtil.serverError(res, error, error.message || 'Failed to stream test case with AI');
      }
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream error occurred' })}\n\n`);
      res.end();
    }
  }

  /**
   * Save AI generated test case to database
   */
  async saveAiTestCase(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { folderId, caseData } = req.body;
      const userId = req.userId || 1;

      if (!folderId || !caseData || !caseData.title) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['folderId and caseData with title are required']);
      }

      // Generate customId if not provided
      let customId = caseData.customId;
      if (!customId) {
        const totalCases = await this.Case.count({ transaction });
        customId = `TC-AI-${totalCases + 1}`;
      }

      const complexityValue = String(caseData.complexity || '2');

      const newCase = await this.Case.create(
        {
          title: caseData.title,
          description: caseData.description || '',
          state: 1,
          priority: typeof caseData.priority === 'number' ? caseData.priority : 1,
          type: typeof caseData.type === 'number' ? caseData.type : 4,
          automationStatus: 0,
          template: Array.isArray(caseData.steps) && caseData.steps.length > 0 ? 1 : 0,
          preConditions: caseData.preConditions || '',
          expectedResults: caseData.expectedResults || '',
          folderId: Number(folderId),
          isAuto: 'manual',
          useAI: true,
          userId: Number(userId),
          customId,
          complexity: complexityValue,
          stepsDetail: caseData.stepsDetail || '',
        },
        { transaction }
      );

      // Create steps if template is step-based
      if (Array.isArray(caseData.steps) && caseData.steps.length > 0) {
        for (let i = 0; i < caseData.steps.length; i++) {
          const stepItem = caseData.steps[i];
          const createdStep = await this.Step.create(
            {
              caseId: newCase.id,
              step: stepItem.step || '',
              result: stepItem.result || '',
            },
            { transaction }
          );

          await this.CaseStep.create(
            {
              caseId: newCase.id,
              stepId: createdStep.id,
              stepNo: stepItem.stepNo || i + 1,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();

      const createdFullCase = await this.Case.findOne({
        where: { id: newCase.id },
        include: [{ model: this.User, attributes: ['email'] }],
      });

      return ResponseUtil.created(res, createdFullCase || newCase, 'AI Test case saved successfully');
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error('[AIController Error in saveAiTestCase]:', error);
      return ResponseUtil.serverError(res, error, error.message || 'Failed to save AI test case');
    }
  }

  /**
   * Save batch of AI generated test cases to database
   */
  async saveBatchAiTestCases(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { folderId, cases } = req.body;
      const userId = req.userId || 1;

      if (!folderId || !Array.isArray(cases) || cases.length === 0) {
        await transaction.rollback();
        return ResponseUtil.validationError(res, ['folderId and a non-empty cases array are required']);
      }

      let totalCases = await this.Case.count({ transaction });
      const createdCases = [];

      for (let cIdx = 0; cIdx < cases.length; cIdx++) {
        const caseData = cases[cIdx];
        totalCases++;
        const customId = caseData.customId || `TC-AI-${totalCases}`;
        const complexityValue = String(caseData.complexity || '2');

        const newCase = await this.Case.create(
          {
            title: caseData.title,
            description: caseData.description || '',
            state: 1,
            priority: typeof caseData.priority === 'number' ? caseData.priority : 1,
            type: typeof caseData.type === 'number' ? caseData.type : 4,
            automationStatus: 0,
            template: Array.isArray(caseData.steps) && caseData.steps.length > 0 ? 1 : 0,
            preConditions: caseData.preConditions || '',
            expectedResults: caseData.expectedResults || '',
            folderId: Number(folderId),
            isAuto: 'manual',
            useAI: true,
            userId: Number(userId),
            customId,
            complexity: complexityValue,
            stepsDetail: caseData.stepsDetail || '',
          },
          { transaction }
        );

        if (Array.isArray(caseData.steps) && caseData.steps.length > 0) {
          for (let i = 0; i < caseData.steps.length; i++) {
            const stepItem = caseData.steps[i];
            const createdStep = await this.Step.create(
              {
                caseId: newCase.id,
                step: stepItem.step || '',
                result: stepItem.result || '',
              },
              { transaction }
            );

            await this.CaseStep.create(
              {
                caseId: newCase.id,
                stepId: createdStep.id,
                stepNo: stepItem.stepNo || i + 1,
              },
              { transaction }
            );
          }
        }

        createdCases.push(newCase);
      }

      await transaction.commit();

      return ResponseUtil.created(res, createdCases, `Successfully saved ${createdCases.length} AI test cases`);
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error('[AIController Error in saveBatchAiTestCases]:', error);
      return ResponseUtil.serverError(res, error, error.message || 'Failed to save batch AI test cases');
    }
  }

  /**
   * Execute AI analysis / test execution on a test case with optional screenshot
   */
  async executeCase(req, res) {
    try {
      const { testCase, image, webhookId, language = 'en', runCaseId, autoSave = true } = req.body;

      if (!testCase) {
        return ResponseUtil.validationError(res, ['testCase is required']);
      }

      console.log('[AI Execution]: Analyzing test case with DeepSeek:', testCase.customId || testCase.id, image ? '(with screenshot)' : '');

      const analysis = await deepseekService.executeTestCase({
        testCase,
        image,
        language,
      });

      const enrichedAnalysis = {
        ...analysis,
        analyzedAt: new Date().toISOString(),
      };

      // Automatically persist to runCase if runCaseId is provided and autoSave is true
      if (runCaseId && autoSave) {
        try {
          await this.RunCase.update(
            { aiAssessment: enrichedAnalysis },
            { where: { id: runCaseId } }
          );
          console.log(`[AI Execution]: Automatically saved aiAssessment to runCase #${runCaseId}`);
        } catch (dbErr) {
          console.error('[AI Execution]: Could not persist to runCase:', dbErr.message);
        }
      }

      // Also persist to Case if caseId is provided
      if (testCase.id && autoSave) {
        try {
          await this.Case.update(
            { aiAssessment: enrichedAnalysis },
            { where: { id: testCase.id } }
          );
        } catch (caseErr) {
          console.error('[AI Execution]: Could not persist to case:', caseErr.message);
        }
      }

      return ResponseUtil.success(res, enrichedAnalysis, 'Test case analysis completed by DeepSeek AI');
    } catch (error) {
      console.error('[AIController Error in executeCase]:', error);
      return ResponseUtil.serverError(res, error, error.message || 'Failed to execute AI analysis');
    }
  }

  /**
   * Manually save or update assessment
   */
  async saveAssessment(req, res) {
    try {
      const { runCaseId, caseId, assessment } = req.body;

      if (!assessment) {
        return ResponseUtil.validationError(res, ['assessment data is required']);
      }

      const assessmentToSave = {
        ...assessment,
        savedAt: new Date().toISOString(),
      };

      if (runCaseId) {
        await this.RunCase.update(
          { aiAssessment: assessmentToSave },
          { where: { id: runCaseId } }
        );
      }

      if (caseId) {
        await this.Case.update(
          { aiAssessment: assessmentToSave },
          { where: { id: caseId } }
        );
      }

      return ResponseUtil.success(res, assessmentToSave, 'AI Assessment saved successfully');
    } catch (error) {
      console.error('[AIController Error in saveAssessment]:', error);
      return ResponseUtil.serverError(res, error, 'Failed to save AI assessment');
    }
  }
}

module.exports = AIController;
