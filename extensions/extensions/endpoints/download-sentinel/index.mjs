import crypto from "node:crypto";

import {
  InvalidPayloadError,
  ServiceUnavailableError,
  RouteNotFoundError,
} from "@directus/errors";

const VALID_OUTPUT = ["truecolor", "ndvi"];

export default (router, { database, logger }) => {
  router.post("/", async (req, res, next) => {
    const { accountability } = req;
    const { ids, output } = req.body;

    if (!accountability.admin) {
      return next(
        new RouteNotFoundError({ path: "/download-sentinel" + req.path })
      );
    }

    if (
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 5 ||
      !ids.every((el) => typeof el === "string")
    ) {
      return next(
        new InvalidPayloadError({
          reason: '"ids" must be an array of string with 1-5 elements',
        })
      );
    }
    if (
      !Array.isArray(output) ||
      output.length < 1 ||
      !output.every((el) => VALID_OUTPUT.includes(el))
    ) {
      return next(
        new InvalidPayloadError({
          reason: `"output" must be an array of string with minimum 1 element. Valid outputs are: ${VALID_OUTPUT.join(
            ", "
          )}`,
        })
      );
    }

    try {
      const messageId = crypto.randomUUID();
      const now = new Date();
      await database
        .insert({
          message_id: messageId,
          queue_name: "default",
          state: "queued",
          mtime: now.toISOString(),
          message: JSON.stringify({
            args: [],
            kwargs: {
              ids,
              output,
              user_id: accountability.user,
            },
            options: {},
            actor_name: "download_sentinel",
            message_id: messageId,
            queue_name: "default",
            message_timestamp: now.getTime().toString(),
          }),
          uploader: accountability.user,
        })
        .into("geoprocessing_queue");
      return res.json({ message_id: messageId });
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "download-sentinel",
          reason: "Failed to queue task",
        })
      );
    }
  });
};
