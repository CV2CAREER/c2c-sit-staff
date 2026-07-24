import { Sequelize } from "sequelize-typescript";
import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USERNAME,
  DB_STATEMENT_TIMEOUT,
  DB_POOL_ACQUIRE,
  DB_POOL_IDLE,
  DB_POOL_MAX,
  DB_POOL_MIN,
  DB_POOL_EVICT,
} from "../src/config/env";
import { modelList } from "../src/utils/modelsList";
import { User } from "../src/models/v1/user.model";
import { Credentials } from "../src/models/v1/credentials.model";

async function main() {
  const sequelize = new Sequelize({
    database: DATABASE_NAME,
    username: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
    host: DATABASE_HOST,
    port: DATABASE_PORT,
    dialect: "postgres",
    logging: false,
    models: modelList,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
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
    console.log("Connected to DB");

    const user = await User.findOne({
      where: { firstName: "Manuel", lastName: "Doe" },
    });
    if (!user) throw new Error("User Manuel Doe not found");
    console.log(`Found user: ${user.id}`);

    const cred = await Credentials.findOne({
      where: { clientId: user.id, isDeleted: false },
    });
    if (!cred) throw new Error("Credentials record not found");
    console.log(`Found credentials: ${cred.id}`);

    const email = "damilolaolawoore03@gmail.com";
    const name = "Damilola";

    await cred.update({
      AssignedPCName: name,
      AssignedPCEmail: email,
      AssignedVetName: name,
      AssignedVetEmail: email,
      AssignedCompletedName: name,
      AssignedCompletedEmail: email,
      updatedBy: "admin",
    });

    console.log("VA assignment updated successfully");
    console.log(`  DPC: ${name} <${email}>`);
    console.log(`  VPC: ${name} <${email}>`);
    console.log(`  SPC: ${name} <${email}>`);
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await sequelize.close();
  }
}

main();
