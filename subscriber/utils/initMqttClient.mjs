import mqtt from "mqtt";

import { MQTT_CLIENTS } from "../clients.mjs";
import runScriptInVm from "./runScriptInVm.mjs";
import insertDataToTable from "./insertDataToTable.mjs";

export default async (
  subscriptionId,
  url,
  username,
  password,
  topics,
  logger
) => {
  const topicsConfig = topics.reduce(
    (obj, item) => (
      (obj[item.topic] = {
        tableName: item.tableName,
        transformScript: item.transformScript,
      }),
      obj
    ),
    {}
  );
  const client = await mqtt.connectAsync(url, {
    username,
    password,
    reconnectOnConnackError: true,
  });
  client.on("message", async (msgTopic, payload) => {
    const config = MQTT_CLIENTS[subscriptionId]?.topicsConfig?.[msgTopic];
    if (config) {
      const data = payload.toString();
      const context = { data };
      try {
        runScriptInVm(context, config.transformScript);
        await insertDataToTable(config.tableName, context.data);
        logger.info(
          `Inserted data from ${url} with topic ${msgTopic} to table ${config.tableName}`
        );
      } catch (error) {
        logger.error(
          `Failed to insert data from ${url} with topic ${msgTopic}`
        );
        logger.error(error);
      }
    } else {
      logger.error(
        `Missing topic configuration for subscription id ${subscriptionId} topic ${msgTopic}`
      );
    }
  });
  MQTT_CLIENTS[subscriptionId] = { client, topicsConfig };
  for (const t of topics) {
    if (t.active) {
      await client.subscribeAsync(t.topic);
    }
  }
};
