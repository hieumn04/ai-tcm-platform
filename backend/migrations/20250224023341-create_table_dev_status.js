'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dev_status', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      case_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'cases',
          key: 'id',
        },
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      role: {
        type: Sequelize.ENUM('app', 'backend', 'frontend'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('passed', 'failed', 'pending'),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users', // Reference to the users table
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users', // Reference to the users table
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
    });

    await queryInterface.addConstraint('dev_status', {
      fields: ['case_id', 'role'],
      type: 'unique',
      name: 'unique_case_id_role',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('dev_status', 'unique_case_id_role');
    await queryInterface.dropTable('dev_status');
  },
};
