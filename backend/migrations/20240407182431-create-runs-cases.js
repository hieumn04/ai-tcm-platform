'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('runCases', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      runId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'runs',
          key: 'id',
        },
        onUpdate: 'CASCADE', // Propagate updates to related rows
        onDelete: 'CASCADE', // Delete runCases when a run is deleted
      },
      caseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cases',
          key: 'id',
        },
        onUpdate: 'CASCADE', // Propagate updates to related rows
        onDelete: 'CASCADE', // Delete runCases when a case is deleted
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0, // Default status, e.g., 0 for "Not Executed"
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

    // Add a unique composite index for `runId` and `caseId` to prevent duplicates
    await queryInterface.addIndex('runCases', ['runId', 'caseId'], {
      unique: true,
      name: 'runCases_runId_caseId_unique_index',
    });

    // Optional: Add individual indexes for performance optimization
    await queryInterface.addIndex('runCases', ['runId'], {
      name: 'runCases_runId_index',
    });
    await queryInterface.addIndex('runCases', ['caseId'], {
      name: 'runCases_caseId_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes before dropping the table
    await queryInterface.removeIndex('runCases', 'runCases_runId_caseId_unique_index');
    await queryInterface.removeIndex('runCases', 'runCases_runId_index');
    await queryInterface.removeIndex('runCases', 'runCases_caseId_index');

    // Drop the table
    await queryInterface.dropTable('runCases');
  },
};
