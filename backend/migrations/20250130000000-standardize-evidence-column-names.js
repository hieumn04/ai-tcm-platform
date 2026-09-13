'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('platform_evidences', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      case_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cases',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      platform: {
        type: Sequelize.ENUM('Web', 'Wap', 'Zma', 'iOS', 'Android', 'API'),
        allowNull: false,
      },
      evidence_image_urls: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Array of base64 encoded image strings',
      },
      evidence_description: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    })

    // Create a composite unique index to ensure one evidence per case+platform
    await queryInterface.addIndex(
      'platform_evidences',
      ['case_id', 'platform'],
      {
        unique: true,
        name: 'unique_case_platform',
      },
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('platform_evidences')
  },
}
