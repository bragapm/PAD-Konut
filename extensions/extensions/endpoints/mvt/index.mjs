import {
  InvalidQueryError,
  ServiceUnavailableError,
  RouteNotFoundError,
} from "@directus/errors";
// import * as clusterbusterImport from "clusterbuster";

export function isNotEmptyObject(obj) {
  return obj && Object.keys(obj).length > 0 && obj.constructor === Object;
}

export default (router, { database, logger, env }) => {
  // const TileServer =
  //   clusterbusterImport.TileServer ?? clusterbusterImport.default?.TileServer;

  // if (typeof TileServer !== "function") {
  //   throw new Error("TileServer is not a valid function");
  // }

  // let tileServerInstance = null;

  router.get("/:layerName", async (req, res, next) => {
      const { accountability } = req;
      let { z, x, y, ...rest } = req.query;
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

      if ("access_token" in rest) {
        delete rest.access_token;
      }

      // Generate a unique cache key for the requested tile
      const cacheKey = `mvt_${layerName}_${Object.values(rest).join(
        "_"
      )}_${z}_${x}_${y}`;

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
            "label_columns",
            "cache_duration"
          )
        .where(
          "layer_name",
          isNotEmptyObject(rest)
            ? layerName +
                "?" +
                Object.keys(rest)
                  .map((key) => `${key}=${rest[key]}`)
                  .join("&")
            : layerName
        )
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
      // console.log('LAYER CONFIG', layerConfig)
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
      if (layerConfig.label_columns) {
        // logger.info('LABEL COLUMNS RES:', layerConfig.label_columns)
        // console.log('LABEL COLUMNS RES:', layerConfig.label_columns)
        classColumnsArr.push(...layerConfig.label_columns.split(","));
      }
      if (classColumnsArr.length) {
        const classColumnsSet = new Set(classColumnsArr);
        classColumnsSet.forEach((col) => {
          classColumnParam += ", ??";
          queryParams.push(col);
        });
      }
      
      console.log('FINAL CLASS COLUMN:', classColumnParam)
      console.log('FINAL QUERY COLUMN:', queryParams)
      // Detect id column dynamically
      let idColumn = "ogc_fid";
      try {
        const columnCheck = await database("information_schema.columns")
          .select("column_name")
          .where("table_name", layerName)
          .andWhere("column_name", "id")
          .first();

        if (columnCheck) {
          idColumn = "id";
        }
      } catch (err) {
        logger.error("Failed to check id column:", err);
      }

      // SQL query to generate the Mapbox Vector Tile (MVT)
      let mvtQuery = `
        WITH tile_envelope AS (
          SELECT ST_TileEnvelope(?, ?, ?) tile
        ), mvtgeom_table AS (
          SELECT ST_AsMVTGeom(ST_Transform(main.geom, 3857), tile, 512) geom, ${idColumn} ${classColumnParam}
          FROM ?? main
          INNER JOIN tile_envelope ON main.geom && ST_Transform(tile, 4326)
                  ${
          isNotEmptyObject(rest)
            ? "WHERE " +
              Object.keys(rest)
                .map((key) => `main.${key} = '${rest[key]}'`)
                .join(" AND ")
            : ""
        }
      )
        )
        SELECT ST_AsMVT(mvtgeom_table, ?, 512, 'geom') mvt_buff
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

  // router.get("/cluster/:layerName", async (req, res, next) => {
  //   const { accountability } = req;
  //   let { z, x, y } = req.query;
  //   const { layerName } = req.params;

  //   let layerConfig;
  //   try {
  //     layerConfig = await database("vector_tiles")
  //       .select("geometry_type")
  //       .where("layer_name", layerName)
  //       .first();
  //   } catch (error) {
  //     logger.error(error);
  //     return next(
  //       new ServiceUnavailableError({
  //         service: "mvt",
  //         reason: "Failed to fetch vector layer list",
  //       })
  //     );
  //   }
  //   if (
  //     !layerConfig ||
  //     (layerConfig.geometry_type !== "POINT" &&
  //       layerConfig.geometry_type !== "MULTIPOINT")
  //   ) {
  //     return next(new RouteNotFoundError({ path: "/mvt" + req.path }));
  //   }
  //   if (tileServerInstance === null) {
  //     tileServerInstance = await TileServer({
  //       maxZoomLevel: 14,
  //       debug: true,
  //       attributes: ["ogc_fid"],
  //       pgPoolOptions: {
  //         connectionString: env.DB_CONNECTION_STRING,
  //       },
  //     filtersToWhere: () => {
  //       return [
  //         "geom IS NOT NULL",
  //         "ST_IsValid(geom)",
  //         "ST_SRID(geom) = 4326",
  //         "ST_X(geom) BETWEEN -180 AND 180",
  //         "ST_Y(geom) BETWEEN -90 AND 90"
  //       ];
  //     },

  //     });
  //   }

  //   try {
  //     // Check if the user has permission to access the requested layer
  //     if (
  //       !accountability.admin &&
  //       !accountability.permissions.some(
  //         (el) => el.collection === layerName && el.action === "read"
  //       )
  //     ) {
  //       return next(new RouteNotFoundError({ path: "/mvt" + req.path }));
  //     }

  //     // Parse and validate tile coordinates
  //     z = parseInt(z);
  //     x = parseInt(x);
  //     y = parseInt(y);
  //     if (isNaN(z) || isNaN(x) || isNaN(y) || z < 0 || x < 0 || y < 0) {
  //       return next(new InvalidQueryError({ reason: "Invalid z, x, y" }));
  //     }

  //     // Generate a unique cache key for the requested tile

  //     // Attempt to retrieve the tile from cache
  //     const tile = await tileServerInstance({
  //       z: +z,
  //       x: +x,
  //       y: +y,
  //       table: `public.${layerName}`,
  //       geometry: "geom",
  //       extent: 4096,
  //       bufferSize: 256,
  //       sourceLayer: layerName,
  //       // filters: req.query,
  //     });
  //     if (!tile || tile.length === 0) return res.status(204).send();
  //     res.setHeader("Content-Type", "application/x-protobuf");
  //     res.setHeader("Content-Encoding", "gzip");
  //     res.send(tile);
  //   } catch (error) {
  //     logger.error(error);
  //     return next(
  //       new ServiceUnavailableError({
  //         service: "mvt",
  //         reason: "Failed to fetch MVT",
  //       })
  //     );
  //   }
  // });
};
