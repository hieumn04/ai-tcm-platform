'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cases', 'isAuto', {
      type: Sequelize.ENUM('manual', 'auto'),
      allowNull: false,
      defaultValue: 'manual', // Default value
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('cases', 'isAuto');
    await queryInterface.sequelize.query('DROP TYPE "enum_cases_isAuto";'); // Drop ENUM type
  },
};
