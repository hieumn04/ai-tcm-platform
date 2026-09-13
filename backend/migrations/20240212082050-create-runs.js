'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('runs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      configurations: {
        type: Sequelize.TEXT, // Changed to TEXT for longer configuration data
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT, // Changed to TEXT for longer descriptions
        allowNull: true,
      },
      state: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0, // Added a default value, e.g., 0 for "pending"
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id',
        },
        onUpdate: 'CASCADE', // Updates propagate to related rows
        onDelete: 'CASCADE', // Deleting a project deletes related runs
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW, // Default to the current timestamp
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW, // Default to the current timestamp
      },
    });

    // Add an index on `projectId` for faster lookups
    await queryInterface.addIndex('runs', ['projectId'], {
      name: 'runs_projectId_index',
    });

    // Optional: Add an index on `state` to optimize state-based queries
    await queryInterface.addIndex('runs', ['state'], {
      name: 'runs_state_index',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes before dropping the table
    await queryInterface.removeIndex('runs', 'runs_projectId_index');
    await queryInterface.removeIndex('runs', 'runs_state_index');

    // Drop the table
    await queryInterface.dropTable('runs');
  },
};
