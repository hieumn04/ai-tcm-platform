'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('runCases', 'is_deleted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Add index for performance on is_deleted queries
    await queryInterface.addIndex('runCases', ['is_deleted'], {
      name: 'runCases_is_deleted_index',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('runCases', 'runCases_is_deleted_index');
    await queryInterface.removeColumn('runCases', 'is_deleted');
  },
}; 