'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('projects', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      detail: {
        type: Sequelize.TEXT, // Changed to TEXT to allow longer details
        allowNull: true,
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true, // Set default to true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE', // Cascade delete when the user is deleted
        onUpdate: 'CASCADE', // Cascade updates when user ID changes
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW, // Set default to current timestamp
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW, // Set default to current timestamp
      },
    });

    // Optional: Add an index on the `userId` field for faster lookups
    await queryInterface.addIndex('projects', ['userId'], {
      name: 'projects_userId_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the index first (optional but good practice)
    await queryInterface.removeIndex('projects', 'projects_userId_index');

    // Drop the table
    await queryInterface.dropTable('projects');
  },
};
