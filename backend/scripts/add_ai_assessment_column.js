const { Sequelize } = require('sequelize');
require('dotenv').config();

async function run() {
  const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      logging: console.log,
    }
  );

  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL successfully.');

    await sequelize.query('ALTER TABLE "runCases" ADD COLUMN IF NOT EXISTS "aiAssessment" JSONB;');
    console.log('Successfully added aiAssessment JSONB column to "runCases" table.');

    await sequelize.query('ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "aiAssessment" JSONB;');
    console.log('Successfully added aiAssessment JSONB column to "cases" table.');

    process.exit(0);
  } catch (error) {
    console.error('Error adding column:', error);
    process.exit(1);
  }
}

run();
