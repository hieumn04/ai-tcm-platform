'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('members', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false, // Ensure a member always has a user
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE', // Propagate updates to related rows
        onDelete: 'CASCADE', // Delete member when the user is deleted
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false, // Ensure a member always belongs to a project
        references: {
          model: 'projects',
          key: 'id',
        },
        onUpdate: 'CASCADE', // Propagate updates to related rows
        onDelete: 'CASCADE', // Delete member when the project is deleted
      },
      role: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1, // Default role, e.g., 1 for "member"
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

    // Add a unique composite index for `userId` and `projectId`
    await queryInterface.addIndex('members', ['userId', 'projectId'], {
      unique: true,
      name: 'members_userId_projectId_unique_index',
    });

    // Optional: Add individual indexes for performance optimization
    await queryInterface.addIndex('members', ['userId'], {
      name: 'members_userId_index',
    });
    await queryInterface.addIndex('members', ['projectId'], {
      name: 'members_projectId_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes before dropping the table
    await queryInterface.removeIndex('members', 'members_userId_projectId_unique_index');
    await queryInterface.removeIndex('members', 'members_userId_index');
    await queryInterface.removeIndex('members', 'members_projectId_index');

    // Drop the table
    await queryInterface.dropTable('members');
  },
};
