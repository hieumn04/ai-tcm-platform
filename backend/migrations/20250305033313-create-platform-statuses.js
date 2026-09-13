'use strict';

const { v4: uuidv4 } = require('uuid'); // Import uuid generator

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create the platformStatuses table as a global reference list
    await queryInterface.createTable('platformStatuses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      platform: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true, // Ensure platform names are unique
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

    // Insert default platform values with explicit UUIDs
    await queryInterface.bulkInsert('platformStatuses', [
      { id: uuidv4(), platform: 'web', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), platform: 'wap', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), platform: 'zma', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), platform: 'ios', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), platform: 'android', createdAt: new Date(), updatedAt: new Date() },
    ]);

    // Remove the old platform ENUM column from runCaseStatuses
    await queryInterface.removeColumn('runCaseStatuses', 'platform');

    // Add platformId as a foreign key reference to platformStatuses
    await queryInterface.addColumn('runCaseStatuses', 'platformId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'platformStatuses',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove platformId column
    await queryInterface.removeColumn('runCaseStatuses', 'platformId');

    // Restore original platform ENUM column
    await queryInterface.addColumn('runCaseStatuses', 'platform', {
      type: Sequelize.ENUM('web', 'wap', 'zma', 'ios', 'android'),
      allowNull: false,
    });

    // Delete inserted default platform statuses
    await queryInterface.bulkDelete('platformStatuses', null, {});

    // Drop platformStatuses table
    await queryInterface.dropTable('platformStatuses');
  },
};
