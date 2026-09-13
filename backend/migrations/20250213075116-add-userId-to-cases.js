'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cases', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users', // Name of the referenced table
        key: 'id', // Primary key in the referenced table
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE', // If a user is deleted, their cases will also be deleted
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('cases', 'userID');
  },
};
