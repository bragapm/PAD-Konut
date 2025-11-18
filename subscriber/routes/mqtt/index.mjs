import { MQTT_CLIENTS } from "../../clients.mjs";
import createTableIfNotExists from "../../utils/createTableIfNotExists.mjs";
import initMqttClient from "../../utils/initMqttClient.mjs";

const mqttBodySchema = {
  type: "object",
  properties: {
    subscriptionId: { type: "string" },
    url: { type: "string" },
    topics: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          tableName: { type: "string" },
          tableColumns: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: {
                  enum: ["varchar", "integer", "float", "timestamptz"],
                },
              },
              required: ["name", "type"],
            },
          },
          transformScript: { type: "string" },
          active: { type: "boolean" },
        },
        required: [
          "topic",
          "tableName",
          "tableColumns",
          "transformScript",
          "active",
        ],
      },
    },
    username: { type: "string" },
    password: { type: "string" },
  },
  required: ["subscriptionId", "url", "topics"],
};

export default async (fastify, _opts) => {
  fastify.post(
    "/",
    {
      schema: {
        response: {
          "4xx": { $ref: "HttpError" },
          "5xx": { $ref: "HttpError" },
        },
        body: mqttBodySchema,
      },
    },
    async (req, res) => {
      const { subscriptionId, url, topics, username, password } = req.body;

      if (MQTT_CLIENTS[subscriptionId]) {
        return res.badRequest(
          `Subscription ${subscriptionId} already configured`
        );
      }

      for (const t of topics) {
        await createTableIfNotExists(t.tableName, t.tableColumns);
      }

      await initMqttClient(
        subscriptionId,
        url,
        username,
        password,
        topics,
        fastify.log
      );
      return res.code(204).send();
    }
  );

  fastify.delete(
    "/:subscriptionId",
    {
      schema: {
        response: {
          "4xx": { $ref: "HttpError" },
          "5xx": { $ref: "HttpError" },
        },
        params: {
          type: "object",
          properties: { subscriptionId: { type: "string" } },
        },
      },
    },
    async (req, res) => {
      const { subscriptionId } = req.params;

      const client = MQTT_CLIENTS[subscriptionId]?.client;
      if (!client) {
        return res.notFound(`Subscription ${subscriptionId} not configured`);
      }

      await client.endAsync();
      delete MQTT_CLIENTS[subscriptionId];

      return res.code(204).send();
    }
  );

  fastify.put(
    "/:subscriptionId",
    {
      schema: {
        response: {
          "4xx": { $ref: "HttpError" },
          "5xx": { $ref: "HttpError" },
        },
        params: {
          type: "object",
          properties: { subscriptionId: { type: "string" } },
        },
        body: mqttBodySchema,
      },
    },
    async (req, res) => {
      const { subscriptionId: oldSubscriptionId } = req.params;
      const { subscriptionId, url, topics, username, password } = req.body;
      if (
        oldSubscriptionId !== subscriptionId &&
        MQTT_CLIENTS[subscriptionId]
      ) {
        return res.badRequest(
          `Subscription ${subscriptionId} already configured`
        );
      }

      const client = MQTT_CLIENTS[oldSubscriptionId]?.client;
      if (client) {
        await client.endAsync();
        delete MQTT_CLIENTS[oldSubscriptionId];
      }

      for (const t of topics) {
        await createTableIfNotExists(t.tableName, t.tableColumns);
      }

      await initMqttClient(
        subscriptionId,
        url,
        username,
        password,
        topics,
        fastify.log
      );
      return res.code(204).send();
    }
  );
};
