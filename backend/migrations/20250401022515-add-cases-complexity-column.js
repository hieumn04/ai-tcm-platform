'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cases', 'complexity', {
      type: Sequelize.ENUM('1', '2', '3'), // ENUM should be strings
      allowNull: false,
      defaultValue: '1', // Default must also be a string
      comment: 'Enum to indicate case complexity. Allowed values: 1, 2, 3',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('cases', 'complexity');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cases_complexity";');
  },
};
