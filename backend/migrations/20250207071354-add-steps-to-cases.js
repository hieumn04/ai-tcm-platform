'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cases', 'stepsDetail', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Column to store steps information for the case',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('cases', 'stepsDetail');
  },
};
