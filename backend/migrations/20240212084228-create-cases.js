'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cases', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      folderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'folders',
          key: 'id',
        },
        onUpdate: 'CASCADE', // Propagate updates to related rows
        onDelete: 'CASCADE', // Delete cases if the folder is deleted
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      state: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0, // Default state, e.g., 0 for "new"
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1, // Default priority, e.g., 1 for "low"
      },
      type: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0, // Default type, e.g., 0 for "manual"
      },
      automationStatus: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0, // Default automation status, e.g., 0 for "not automated"
      },
      description: {
        type: Sequelize.TEXT, // Changed to TEXT for longer descriptions
        allowNull: true,
      },
      template: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0, // Default template ID (if applicable)
      },
      preConditions: {
        type: Sequelize.TEXT, // Changed to TEXT for longer preconditions
        allowNull: true,
      },
      expectedResults: {
        type: Sequelize.TEXT, // Changed to TEXT for longer expected results
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW, // Set default to current timestamp
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW, // Set default to current timestamp
      },
    });

    // Add an index on `folderId` for faster lookups
    await queryInterface.addIndex('cases', ['folderId'], {
      name: 'cases_folderId_index',
    });

    // Optional: Add an index on `state` to optimize state-based queries
    await queryInterface.addIndex('cases', ['state'], {
      name: 'cases_state_index',
    });

    // Optional: Add an index on `priority` for optimized priority filtering
    await queryInterface.addIndex('cases', ['priority'], {
      name: 'cases_priority_index',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes before dropping the table
    await queryInterface.removeIndex('cases', 'cases_folderId_index');
    await queryInterface.removeIndex('cases', 'cases_state_index');
    await queryInterface.removeIndex('cases', 'cases_priority_index');

    // Drop the table
    await queryInterface.dropTable('cases');
  },
};
