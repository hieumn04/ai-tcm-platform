'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('runs', 'ticketKey', {
      type: Sequelize.STRING,
      allowNull: true, // Allow null values for existing runs
      defaultValue: null, // Default value can be set to null
      comment: 'Ticket key associated with the run', // Optional comment for clarity
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('runs', 'ticketKey');
  },
};
