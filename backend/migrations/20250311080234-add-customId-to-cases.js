'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cases', 'customId', {
      type: Sequelize.STRING,
      allowNull: true, // Allows null values
      defaultValue: null, // Default value is null
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('cases', 'customId');
  },
};
