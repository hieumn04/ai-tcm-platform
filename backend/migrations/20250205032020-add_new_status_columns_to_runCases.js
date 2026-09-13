'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('runCases', 'beStatus', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0, // Default status, e.g., 0 for "Not Executed"
    });

    await queryInterface.addColumn('runCases', 'appStatus', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('runCases', 'autoStatus', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('runCases', 'beStatus');
    await queryInterface.removeColumn('runCases', 'appStatus');
    await queryInterface.removeColumn('runCases', 'autoStatus');
  },
};
