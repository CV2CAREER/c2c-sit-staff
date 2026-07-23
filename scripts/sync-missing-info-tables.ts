import { Sequelize } from "sequelize-typescript";
import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USERNAME,
  DB_POOL_ACQUIRE,
  DB_POOL_EVICT,
  DB_POOL_IDLE,
  DB_POOL_MAX,
  DB_POOL_MIN,
  DB_STATEMENT_TIMEOUT,
} from "../src/config/env";
import { MissingInfoTemplate } from "../src/models/v1/missing-info-template.model";
import { MissingInfoTemplateField } from "../src/models/v1/missing-info-template-field.model";

async function run() {
  const sequelize = new Sequelize({
    database: DATABASE_NAME,
    username: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
    host: DATABASE_HOST,
    port: DATABASE_PORT,
    dialect: "postgres",
    logging: console.log,
    models: [MissingInfoTemplate, MissingInfoTemplateField],
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      statement_timeout: DB_STATEMENT_TIMEOUT,
    },
    pool: {
      max: DB_POOL_MAX,
      min: DB_POOL_MIN,
      acquire: DB_POOL_ACQUIRE,
      idle: DB_POOL_IDLE,
      evict: DB_POOL_EVICT,
    },
  });

  try {
    await sequelize.authenticate();
    console.log("Connected. Syncing missing_info_templates and missing_info_template_fields...");
    await sequelize.sync({ force: false });
    console.log("Done. Tables created.");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await sequelize.close();
  }
}

run();
