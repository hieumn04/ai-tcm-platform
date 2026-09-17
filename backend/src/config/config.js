require('dotenv').config();

const sslOption = (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production') ? {
  require: true,
  rejectUnauthorized: false
} : false;

const dbConfig = process.env.DATABASE_URL
  ? {
      url: process.env.DATABASE_URL,
      dialect: 'postgres',
      dialectOptions: { ssl: sslOption }
    }
  : {
      username: process.env.DB_USER || 'conan',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'conan_db',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      dialectOptions: { ssl: sslOption }
    };

module.exports = {
  development: dbConfig,
  test: dbConfig,
  production: dbConfig
};
