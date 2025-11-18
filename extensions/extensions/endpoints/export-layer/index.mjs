import crypto from "node:crypto";

import {
  InvalidPayloadError,
  ServiceUnavailableError,
  RouteNotFoundError,
} from "@directus/errors";

const VALID_FORMATS = ["gpkg", "kml", "geojson"];

export default (router, { database, logger }) => {
  router.post("/:layerName", async (req, res, next) => {
    const { accountability } = req;
    const { layerName } = req.params;
    const { format = "gpkg" } = req.body;

    if (
      !accountability.admin &&
      !accountability.permissions.some(
        (el) => el.collection === layerName && el.action === "read"
      )
    ) {
      return next(new RouteNotFoundError({ path: "/export-layer" + req.path }));
    }

    try {
      const {
        rows: [{ exists }],
      } = await database.raw(
        "SELECT EXISTS(SELECT 1 FROM vector_tiles WHERE layer_name = ?)",
        layerName
      );
      if (!exists) {
        return next(
          new RouteNotFoundError({ path: "/export-layer" + req.path })
        );
      }
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "export-layer",
          reason: "Failed to fetch vector layer list",
        })
      );
    }

    if (!VALID_FORMATS.includes(format)) {
      return next(
        new InvalidPayloadError({
          reason: `Invalid format. Supported formats are: ${VALID_FORMATS.join(
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
              table_name: layerName,
              format_file: format,
              downloader: accountability.user,
            },
            options: {},
            actor_name: "export",
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
          service: "export-layer",
          reason: "Failed to queue task",
        })
      );
    }
  });
};
