'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('caseAttachments', {
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
        onUpdate: 'CASCADE', // Propagate updates to related rows
        onDelete: 'CASCADE', // Delete caseAttachments when a case is deleted
      },
      attachmentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'attachments',
          key: 'id',
        },
        onUpdate: 'CASCADE', // Propagate updates to related rows
        onDelete: 'CASCADE', // Delete caseAttachments when an attachment is deleted
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

    // Add a unique composite index for `caseId` and `attachmentId`
    await queryInterface.addIndex('caseAttachments', ['caseId', 'attachmentId'], {
      unique: true,
      name: 'caseAttachments_caseId_attachmentId_unique_index',
    });

    // Optional: Add an index on `caseId` for faster queries
    await queryInterface.addIndex('caseAttachments', ['caseId'], {
      name: 'caseAttachments_caseId_index',
    });

    // Optional: Add an index on `attachmentId` for faster queries
    await queryInterface.addIndex('caseAttachments', ['attachmentId'], {
      name: 'caseAttachments_attachmentId_index',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes before dropping the table
    await queryInterface.removeIndex('caseAttachments', 'caseAttachments_caseId_attachmentId_unique_index');
    await queryInterface.removeIndex('caseAttachments', 'caseAttachments_caseId_index');
    await queryInterface.removeIndex('caseAttachments', 'caseAttachments_attachmentId_index');

    // Drop the table
    await queryInterface.dropTable('caseAttachments');
  },
};
