'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1, // Example: Default role could be 'user'
      },
      avatarPath: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Optional: Add an index for faster lookups
    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'users_email_unique_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the index first (optional but good practice)
    await queryInterface.removeIndex('users', 'users_email_unique_index');

    // Drop the table
    await queryInterface.dropTable('users');
  },
};
