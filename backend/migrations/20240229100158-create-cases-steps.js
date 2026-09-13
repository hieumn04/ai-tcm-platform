'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('caseSteps', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      caseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cases',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Cascade delete when a case is deleted
      },
      stepId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'steps',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Cascade delete when a step is deleted
      },
      stepNo: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1, // Default to 1 if not explicitly provided
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW, // Default to current timestamp
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW, // Default to current timestamp
      },
    });

    // Add a unique composite index for `caseId` and `stepId`
    await queryInterface.addIndex('caseSteps', ['caseId', 'stepId'], {
      unique: true,
      name: 'caseSteps_caseId_stepId_unique_index',
    });

    // Optional: Add an index on `caseId` for faster lookups
    await queryInterface.addIndex('caseSteps', ['caseId'], {
      name: 'caseSteps_caseId_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes before dropping the table
    await queryInterface.removeIndex('caseSteps', 'caseSteps_caseId_stepId_unique_index');
    await queryInterface.removeIndex('caseSteps', 'caseSteps_caseId_index');

    // Drop the table
    await queryInterface.dropTable('caseSteps');
  },
};
