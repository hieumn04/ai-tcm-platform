'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('runCases', 'status');
    await queryInterface.removeColumn('runCases', 'beStatus');
    await queryInterface.removeColumn('runCases', 'appStatus');
    await queryInterface.removeColumn('runCases', 'autoStatus');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('runCases', 'status', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('runCases', 'beStatus', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
};
