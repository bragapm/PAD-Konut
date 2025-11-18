import { join } from "node:path";

import "dotenv/config";
import autoLoad from "@fastify/autoload";

import endClients from "./utils/endClients.mjs";
import fetchDataSubscriptions from "./utils/fetchDataSubscriptions.mjs";

export default async function (fastify, opts) {
  fastify.register(autoLoad, {
    dir: join(import.meta.dirname, "plugins"),
    options: Object.assign({}, opts),
  });

  fastify.register(autoLoad, {
    dir: join(import.meta.dirname, "routes"),
    options: Object.assign({}, opts),
  });

  fastify.addHook("onReady", async () => {
    await fetchDataSubscriptions(fastify.log);
  });

  fastify.addHook("onClose", async (instance) => {
    await endClients(instance.log);
  });
}

// Pass --options via CLI arguments in command to enable these options.
export const options = {};
