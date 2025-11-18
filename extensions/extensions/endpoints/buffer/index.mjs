import {
  InvalidPayloadError,
  ServiceUnavailableError,
  ForbiddenError,
} from "@directus/errors";

export default (router, { database, logger }) => {
  router.post("/", async (req, res, next) => {
    const { accountability } = req;
    const { points, radius, layer, type, column } = req.body;

    if (!layer) {
      return next(new InvalidPayloadError({ reason: "layer is required" }));
    }

    try {
      const {
        rows: [{ exists }],
      } = await database.raw(
        "SELECT EXISTS(SELECT 1 FROM vector_tiles WHERE layer_name = ?)",
        layer
      );
      if (!exists) {
        return next(new ForbiddenError());
      }
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "buffer-analysis",
          reason: "Failed to apply buffer analysis",
        })
      );
    }

    if (
      !accountability.admin &&
      !accountability.permissions.some(
        (el) => el.collection === layer && el.action === "read"
      )
    ) {
      return next(new ForbiddenError());
    }

    if (!Array.isArray(points)) {
      return next(
        new InvalidPayloadError({
          reason: "points must be array of [lon,lat]",
        })
      );
    }

    if (typeof radius !== "number" || !isFinite(radius) || radius < 0) {
      return next(
        new InvalidPayloadError({ reason: "radius must be positive number" })
      );
    }

    // Construct the array part of the SQL for points
    let p = 0;
    const pointBindings = {};
    const makePointQueries = [];
    for (const point of points) {
      if (!Array.isArray(point) || point.length !== 2) {
        return next(
          new InvalidPayloadError({
            reason: "points must be array of [lon,lat]",
          })
        );
      }
      const bindingName0 = `point${p++}`;
      const bindingName1 = `point${p++}`;
      pointBindings[bindingName0] = point[0];
      pointBindings[bindingName1] = point[1];
      makePointQueries.push(`ST_MakePoint(:${bindingName0},:${bindingName1})`);
    }

    const baseSQL = `
        WITH buffer AS (
            SELECT ST_Buffer(ST_SetSRID(ST_Collect(ARRAY[${makePointQueries.join(
              ","
            )}]), 4326)::geography, :radius)::geometry AS geom
        )
    `;

    // Build the SQL
    let sql;
    if (type === "simple") {
      sql = `${baseSQL}
               SELECT 'All' as category, COUNT(*) FROM :layer:, buffer
               WHERE ST_Intersects(:layer:.geom, buffer.geom);
        `;
    } else if (type === "categorical") {
      if (!column) {
        return next(new InvalidPayloadError({ reason: "column is required" }));
      } else if (!req.schema.collections[layer]?.fields[column]) {
        return next(new ForbiddenError());
      }
      sql = `${baseSQL}
               SELECT :column: as category, COUNT(*) FROM :layer:, buffer
               WHERE ST_Intersects(:layer:.geom, buffer.geom)
               GROUP BY :column:;
        `;
    } else {
      return next(
        new InvalidPayloadError({
          reason: 'type must be "simple" or "categorical"',
        })
      );
    }

    try {
      const { rows } = await database.raw(sql, {
        ...pointBindings,
        radius,
        layer,
        column,
      });
      return res.json(rows);
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "buffer-analysis",
          reason: "Failed to apply buffer analysis",
        })
      );
    }
  });
};
