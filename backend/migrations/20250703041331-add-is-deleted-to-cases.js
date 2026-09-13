'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cases', 'is_deleted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Add index for performance on is_deleted queries
    await queryInterface.addIndex('cases', ['is_deleted'], {
      name: 'cases_is_deleted_index',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('cases', 'cases_is_deleted_index');
    await queryInterface.removeColumn('cases', 'is_deleted');
  },
}; 