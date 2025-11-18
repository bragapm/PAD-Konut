import sql from "../db.mjs";
import { MQTT_CLIENTS } from "../clients.mjs";

export default async (logger) => {
  logger.info("Closing database connection");
  await sql.end();
  logger.info("Closing MQTT connections");
  for (const id in MQTT_CLIENTS) {
    await MQTT_CLIENTS[id].client.endAsync();
  }
};
