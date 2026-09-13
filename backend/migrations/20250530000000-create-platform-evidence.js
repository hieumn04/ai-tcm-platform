
'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Rename evidence_image_urls to evidenceImageUrls
    await queryInterface.renameColumn(
      'platform_evidences',
      'evidence_image_urls',
      'evidenceImageUrls',
    )

    // Rename evidence_description to evidenceDescription
    await queryInterface.renameColumn(
      'platform_evidences',
      'evidence_description',
      'evidenceDescription',
    )
  },

  async down(queryInterface, Sequelize) {
    // Revert evidenceImageUrls back to evidence_image_urls
    await queryInterface.renameColumn(
      'platform_evidences',
      'evidenceImageUrls',
      'evidence_image_urls',
    )

    // Revert evidenceDescription back to evidence_description
    await queryInterface.renameColumn(
      'platform_evidences',
      'evidenceDescription',
      'evidence_description',
    )
  },
} 