'use strict';

const { v4: uuidv4 } = require('uuid'); // Import uuid generator

module.exports = {
  async up(queryInterface, Sequelize) {
    // Insert API platform status with explicit UUID
    await queryInterface.bulkInsert('platformStatuses', [
      { id: uuidv4(), platform: 'api', createdAt: new Date(), updatedAt: new Date() },
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Delete added API platform status
    await queryInterface.bulkDelete(
      'platformStatuses',
      {
        platform: 'api',
      },
      {}
    );
  },
};
