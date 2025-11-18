import { join } from "node:path";

import { build as buildApplication } from "fastify-cli/helper.js";

const APP_PATH = join(import.meta.dirname, "..", "app.mjs");

// Fill in this config with all the configurations
// needed for testing the application
export function config() {
  return {
    skipOverride: true, // Register our application with fastify-plugin
  };
}

// automatically build and tear down our instance
export async function build(t) {
  // you can set all the options supported by the fastify CLI command
  const argv = [APP_PATH];

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  const app = await buildApplication(argv, config());

  // close the app after we are done
  t.after(() => app.close());

  return app;
}
