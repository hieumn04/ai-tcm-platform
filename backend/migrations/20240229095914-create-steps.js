'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('steps', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      caseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cases', // Assuming `steps` belong to `cases`
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      step: {
        type: Sequelize.TEXT, // Changed to TEXT for longer step descriptions
        allowNull: false,
      },
      result: {
        type: Sequelize.TEXT, // Changed to TEXT for longer expected results
        allowNull: false,
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

    // Add an index on `caseId` for faster lookups
    await queryInterface.addIndex('steps', ['caseId'], {
      name: 'steps_caseId_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index before dropping the table
    await queryInterface.removeIndex('steps', 'steps_caseId_index');

    // Drop the table
    await queryInterface.dropTable('steps');
  },
};
