'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('folders', {
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
        type: Sequelize.TEXT, // Changed to TEXT for longer details
        allowNull: true,
      },
      parentFolderId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'folders', // Self-referencing to allow folder hierarchy
          key: 'id',
          onDelete: 'SET NULL', // If the parent folder is deleted, set to null
          onUpdate: 'CASCADE',
        },
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id',
        },
        onDelete: 'CASCADE', // Cascade delete if the project is deleted
        onUpdate: 'CASCADE',
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

    // Add an index on `projectId` for faster queries
    await queryInterface.addIndex('folders', ['projectId'], {
      name: 'folders_projectId_index',
    });

    // Add an index on `parentFolderId` for hierarchy traversal
    await queryInterface.addIndex('folders', ['parentFolderId'], {
      name: 'folders_parentFolderId_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first for clean rollback
    await queryInterface.removeIndex('folders', 'folders_projectId_index');
    await queryInterface.removeIndex('folders', 'folders_parentFolderId_index');

    // Drop the table
    await queryInterface.dropTable('folders');
  },
};
