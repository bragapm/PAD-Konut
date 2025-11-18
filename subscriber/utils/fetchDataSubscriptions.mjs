import createTableIfNotExists from "./createTableIfNotExists.mjs";
import decryptStr from "./decryptStr.mjs";
import getSimpleHash from "./getSimpleHash.mjs";
import initMqttClient from "./initMqttClient.mjs";
import sql from "../db.mjs";

export default async (logger) => {
  logger.info("Fetching data_subscriptions and initializing clients");
  const rows =
    await sql`SELECT subscription_id,protocol,url,username,password,topics FROM data_subscriptions`;

  for (const row of rows) {
    for (const t of row.topics) {
      await createTableIfNotExists(t.tableName, t.tableColumns);
    }
    if (row.password) {
      const encryptionPass = getSimpleHash(
        process.env.DIRECTUS_KEY + process.env.DIRECTUS_SECRET
      );
      row.password = decryptStr(row.password, encryptionPass);
    }
    if (row.protocol === "mqtt") {
      await initMqttClient(
        row.subscription_id,
        row.url,
        row.username,
        row.password,
        row.topics,
        logger
      );
    } else {
      logger.error(
        `Unexpected protocol: ${row.protocol} with subscription ID ${row.subscription_id}`
      );
    }
  }
};
