import {
  InvalidQueryError,
  ServiceUnavailableError,
  RouteNotFoundError,
} from "@directus/errors";

export default (router, { database, logger }) => {
  router.get("/:layerName", async (req, res, next) => {
    const { accountability } = req;
    let { z, x, y, attributes } = req.query;
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

    // Validate attributes query
    if (attributes === "geom") {
      return next(
        new InvalidQueryError({
          reason: '"geom" column cannot be used as an attribute',
        })
      );
    }

    // Parse and validate tile coordinates
    z = parseInt(z);
    x = parseInt(x);
    y = parseInt(y);
    if (isNaN(z) || isNaN(x) || isNaN(y) || z < 0 || x < 0 || y < 0) {
      return next(new InvalidQueryError({ reason: "Invalid z, x, y" }));
    }

    // Generate a unique cache key for the requested tile
    const cacheKey = `${layerName}_${z}_${x}_${y}_${attributes || ""}`;

    // Attempt to retrieve the tile from cache
    let cacheExists = false;
    try {
      const cacheResult = await database("vector_tile_cache")
        .select("value", "expired_at")
        .where("key", cacheKey)
        .first();

      if (cacheResult) {
        cacheExists = true;
        if (cacheResult.expired_at > new Date()) {
          res.setHeader("Content-Type", "application/x-protobuf");
          return res.send(cacheResult.value);
        }
      }
    } catch (error) {
      logger.error(error);
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
        .select("cache_duration")
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
    const queryParams = { z, x, y, layerName };

    let attributesParam = "";
    if (attributes) {
      attributesParam = ", :attributes:";
      queryParams.attributes = attributes;
    }

    // SQL query to generate the Mapbox Vector Tile (MVT)
    let mvtQuery = `
      WITH tile_envelope AS (
        SELECT ST_TileEnvelope(:z, :x, :y) tile
      ), mvtgeom_table AS (
        SELECT ST_AsMVTGeom(ST_Transform(main.geom, 3857), tile) geom, ogc_fid${attributesParam}
        FROM :layerName: main
        INNER JOIN tile_envelope ON main.geom && ST_Transform(tile, 4326)
      )
      SELECT ST_AsMVT(mvtgeom_table, :layerName, 4096, 'geom', 'ogc_fid') mvt_buff
      FROM mvtgeom_table
    `;

    // Execute the query and send the result
    try {
      const result = await database.raw(mvtQuery, queryParams);
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
            if (cacheExists) {
              await database("vector_tile_cache")
                .update({ value: mvtBuff, expired_at: expirationTime })
                .where("key", cacheKey);
            } else {
              await database("vector_tile_cache").insert({
                key: cacheKey,
                value: mvtBuff,
                expired_at: expirationTime,
              });
            }
          } catch (error) {
            logger.error(error);
          }
        }

        return res.send(mvtBuff);
      } else {
        return res.status(204).send();
      }
    } catch (error) {
      if (error.routine === "errorMissingColumn") {
        return next(
          new InvalidQueryError({
            reason: `"${attributes}" column does not exist in "${layerName}" table`,
          })
        );
      }
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
