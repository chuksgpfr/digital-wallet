require("dotenv").config();
// Update with your config settings.

module.exports = {

  development: {
    client: 'mysql',
    connection: {
      database: process.env.DATABASE_NAME_DEV,
      user:     process.env.DATABASE_USERNAME_DEV,
      password: process.env.DATABASE_PASSWORD_DEV
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  staging: {
    client: 'mysql',
    connection: {
      database: 'abeg_app_interview_database',
      user:     'root',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'mysql',
    connection: {
      host: process.env.DB_HOST,
      database: process.env.DATABASE_NAME_PROD,
      user:     process.env.DATABASE_USERNAME_PROD,
      password: process.env.DATABASE_PASSWORD_PROD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

};
