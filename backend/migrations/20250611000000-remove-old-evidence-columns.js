'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove old evidence columns from cases table
    // await queryInterface.removeColumn('cases', 'evidenceImageUrls');
    // await queryInterface.removeColumn('cases', 'evidenceDescription');
  },

  async down(queryInterface, Sequelize) {
    // Add back the columns if needed to rollback
    // await queryInterface.addColumn('cases', 'evidenceImageUrls', {
    //   type: Sequelize.JSON,
    //   allowNull: true,
    //   defaultValue: null,
    // });
    // await queryInterface.addColumn('cases', 'evidenceDescription', {
    //   type: Sequelize.TEXT,
    //   allowNull: true,
    //   defaultValue: null,
    // });
  },
};
