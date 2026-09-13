'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if table exists using raw query
      const [results] = await queryInterface.sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_name = 'platform_evidences'"
      );

      // If we get any results back, the table exists
      if (results && Array.isArray(results) && results.length > 0) {
        return;
      }

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
      });

      await queryInterface.addIndex('platform_evidences', ['case_id', 'platform'], {
        unique: true,
        name: 'unique_case_platform_idx',
      });
    } catch (error) {
      throw error;
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.dropTable('platform_evidences');
    } catch (error) {
      throw error;
    }
  },
};
