import {
  InvalidQueryError,
  ServiceUnavailableError,
  RouteNotFoundError,
} from "@directus/errors";

export default (router, { database, logger }) => {
  router.get("/:layerName", async (req, res, next) => {
    const { accountability } = req;
    let { z, x, y } = req.query;
    const { layerName } = req.params;

    // Check if the user has permission to access the requested layer
    if (
      !accountability.admin &&
      !accountability.permissions.some(
        (el) => el.collection === layerName && el.action === "read"
      )
    ) {
      return next(new RouteNotFoundError({ path: "/mvt" + req.path }));
    }

    // Parse and validate tile coordinates
    z = parseInt(z);
    x = parseInt(x);
    y = parseInt(y);
    if (isNaN(z) || isNaN(x) || isNaN(y) || z < 0 || x < 0 || y < 0) {
      return next(new InvalidQueryError({ reason: "Invalid z, x, y" }));
    }

    // Generate a unique cache key for the requested tile
    const cacheKey = `mvt_${layerName}_${z}_${x}_${y}`;

    // Attempt to retrieve the tile from cache
    try {
      const cacheResult = await database("vector_tile_cache")
        .select("value")
        .where("key", cacheKey)
        .first();

      if (cacheResult) {
        res.setHeader("Content-Type", "application/x-protobuf");
        return res.send(Buffer.from(cacheResult.value));
      }
    } catch (cacheError) {
      logger.error("Cache lookup failed:", cacheError);
      return next(
        new ServiceUnavailableError({
          service: "mvt",
          reason: "Failed to fetch MVT cache",
        })
      );
    }

    // Fetch additional configuration for the layer
    let layerConfig;
    try {
      layerConfig = await database("vector_tiles")
        .select(
          "fill_class_columns",
          "line_class_columns",
          "circle_class_columns",
          "symbol_class_columns",
          "cache_duration"
        )
        .where("layer_name", layerName)
        .first();
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "mvt",
          reason: "Failed to fetch vector layer list",
        })
      );
    }

    if (!layerConfig) {
      return next(new RouteNotFoundError({ path: "/mvt" + req.path }));
    }

    // Prepare query parameters for fetching the tile
    let queryParams = [z, x, y];

    let classColumnParam = "";
    const classColumnsArr = [];
    if (layerConfig.fill_class_columns) {
      classColumnsArr.push(...layerConfig.fill_class_columns.split(","));
    }
    if (layerConfig.line_class_columns) {
      classColumnsArr.push(...layerConfig.line_class_columns.split(","));
    }
    if (layerConfig.circle_class_columns) {
      classColumnsArr.push(...layerConfig.circle_class_columns.split(","));
    }
    if (layerConfig.symbol_class_columns) {
      classColumnsArr.push(...layerConfig.symbol_class_columns.split(","));
    }
    if (classColumnsArr.length) {
      const classColumnsSet = new Set(classColumnsArr);
      classColumnsSet.forEach((col) => {
        classColumnParam += ", ??";
        queryParams.push(col);
      });
    }

    // SQL query to generate the Mapbox Vector Tile (MVT)
    let mvtQuery = `
      WITH tile_envelope AS (
        SELECT ST_TileEnvelope(?, ?, ?) tile
      ), mvtgeom_table AS (
        SELECT ST_AsMVTGeom(ST_Transform(main.geom, 3857), tile) geom, ogc_fid${classColumnParam}
        FROM ?? main
        INNER JOIN tile_envelope ON main.geom && ST_Transform(tile, 4326)
      )
      SELECT ST_AsMVT(mvtgeom_table, ?, 4096, 'geom', 'ogc_fid') mvt_buff
      FROM mvtgeom_table
    `;

    // Execute the query and send the result
    try {
      const result = await database.raw(mvtQuery, [
        ...queryParams,
        layerName,
        layerName,
      ]);
      const mvtBuff = result.rows[0]?.mvt_buff;

      if (mvtBuff && mvtBuff.length) {
        res.setHeader("Content-Type", "application/x-protobuf");

        // Update the cache if caching is enabled for this layer
        if (layerConfig.cache_duration > 0) {
          const expirationTime = new Date();
          expirationTime.setHours(
            expirationTime.getHours() + layerConfig.cache_duration
          );

          try {
            await database("vector_tile_cache").insert({
              key: cacheKey,
              value: mvtBuff,
              expired_at: expirationTime,
            });
          } catch (cacheUpdateError) {
            logger.error("Failed to update cache:", cacheUpdateError);
          }
        }

        return res.send(mvtBuff);
      } else {
        return res.status(204).send();
      }
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "mvt",
          reason: "Failed to fetch MVT",
        })
      );
    }
  });
};
