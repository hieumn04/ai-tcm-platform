'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create the folderPlatforms table to link folders and platforms
    await queryInterface.createTable('folderPlatforms', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      folderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'folders',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      platformId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'platformStatuses',
          key: 'id',
        },
        onDelete: 'CASCADE',
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('folderPlatforms');
  },
};
