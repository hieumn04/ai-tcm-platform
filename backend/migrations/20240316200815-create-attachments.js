'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attachments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      detail: {
        type: Sequelize.TEXT, // Changed to TEXT for longer details
        allowNull: true,
      },
      path: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW, // Default to current timestamp
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW, // Default to current timestamp
      },
    });

    // Add an index on `path` for faster lookups if necessary
    await queryInterface.addIndex('attachments', ['path'], {
      name: 'attachments_path_index',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the index before dropping the table
    await queryInterface.removeIndex('attachments', 'attachments_path_index');

    // Drop the table
    await queryInterface.dropTable('attachments');
  },
};
