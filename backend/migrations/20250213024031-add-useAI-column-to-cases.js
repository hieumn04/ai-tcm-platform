'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cases', 'useAI', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Boolean flag to indicate AI usage in the case',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('cases', 'useAI');
  },
};
