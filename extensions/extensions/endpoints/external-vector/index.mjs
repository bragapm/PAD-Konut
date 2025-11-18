import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";

import { ServiceUnavailableError, RouteNotFoundError } from "@directus/errors";
import { Client as FTPClient } from "basic-ftp";
import { XMLParser } from "fast-xml-parser";

import validateUuid from "../../utils/validateUuid.mjs";

export default (router, { database, logger }) => {
  router.get("/:layerId", async (req, res, next) => {
    const { accountability } = req;
    const { layerId } = req.params;

    // validate uuid
    if (!validateUuid(layerId)) {
      return next(
        new RouteNotFoundError({ path: "/external-vector" + req.path })
      );
    }

    let externalVectorRows;
    // get external vector entry
    try {
      ({ rows: externalVectorRows } = await database.raw(
        `
          WITH allowed_roles_query AS (
            SELECT ARRAY_AGG(directus_roles_id) allowed_roles
            FROM external_vector_directus_roles
            WHERE external_vector_layer_id = :layerId
          )
          SELECT permission_type, allowed_roles, endpoint, transform_script, cache_duration, format, options
          FROM external_vector, allowed_roles_query
          WHERE layer_id = :layerId
        `,
        { layerId }
      ));
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "external-vector",
          reason: "Failed to fetch external vector entry",
        })
      );
    }

    if (!externalVectorRows.length) {
      return next(
        new RouteNotFoundError({ path: "/external-vector" + req.path })
      );
    }

    const layerConfig = externalVectorRows[0];

    switch (layerConfig.permission_type) {
      case "admin":
        if (!accountability.admin) {
          return next(
            new RouteNotFoundError({ path: "/external-vector" + req.path })
          );
        }
        break;

      case "roles":
        if (
          !accountability.admin &&
          (!accountability.role ||
            !Array.isArray(layerConfig.allowed_roles) ||
            !layerConfig.allowed_roles.includes(accountability.role))
        ) {
          return next(
            new RouteNotFoundError({ path: "/external-vector" + req.path })
          );
        }
        break;

      case "roles+public":
        if (
          !accountability.admin &&
          accountability.role &&
          (!Array.isArray(layerConfig.allowed_roles) ||
            !layerConfig.allowed_roles.includes(accountability.role))
        ) {
          return next(
            new RouteNotFoundError({ path: "/external-vector" + req.path })
          );
        }
        break;

      default:
        return next(
          new ServiceUnavailableError({
            service: "external-vector",
            reason: `Unexpected external vector permission type for ${layerId}: ${layerConfig.permission_type}`,
          })
        );
    }

    // return cached data if it's valid
    if (layerConfig.cache_duration > 0) {
      const cacheRow = await database("external_vector_cache")
        .where("layer_id", layerId)
        .whereRaw("expired_at > CURRENT_TIMESTAMP")
        .first("value");
      if (cacheRow) {
        res.set("Content-Type", "application/json");
        return res.send(cacheRow.value);
      }
    }

    let url;
    try {
      url = new URL(layerConfig.endpoint);
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "external-vector",
          reason: "Failed to parse endpoint",
        })
      );
    }

    let data;
    if (["https:", "http:"].includes(url.protocol)) {
      let res;
      try {
        const opts = layerConfig.options || {};
        if (opts.body && opts.headers?.["Content-Type"]) {
          if (opts.headers["Content-Type"] === "application/json") {
            opts.body = JSON.stringify(opts.body);
          }
          // TODO handle other content type
        }
        res = await fetch(url, {
          method: opts.method,
          headers: opts.headers,
          body: opts.body,
        });
      } catch (error) {
        logger.error(error);
        return next(
          new ServiceUnavailableError({
            service: "external-vector",
            reason: "Failed to fetch endpoint",
          })
        );
      }

      try {
        if (res.ok) {
          if (layerConfig.format === "json") {
            data = await res.json();
          } else if (layerConfig.format === "xml") {
            const xmlStr = await res.text();
            const parser = new XMLParser();
            data = parser.parse(xmlStr);
          } else {
            throw new Error(`Unexpected format: ${layerConfig.format}`);
          }
        } else {
          data = await res.text();
          throw new Error(
            `Endpoint response status is not ok. Response data: ${data}`
          );
        }
      } catch (error) {
        logger.error(error);
        if (data) {
          return next(
            new ServiceUnavailableError({
              service: "external-vector",
              reason: `Endpoint response status is not ok. Response data: ${data}`,
            })
          );
        } else {
          return next(
            new ServiceUnavailableError({
              service: "external-vector",
              reason: "Failed to parse data",
            })
          );
        }
      }
    } else if (url.protocol === "ftp:") {
      const splitPath = url.pathname.split("/");
      const fileName = splitPath[splitPath.length - 1];
      if (!fileName) {
        return next(
          new ServiceUnavailableError({
            service: "external-vector",
            reason: "Misconfigured FTP endpoint. No file name provided",
          })
        );
      }

      const client = new FTPClient();
      let tempDir;
      let tempFile;
      try {
        // download file from FTP
        try {
          const opts = layerConfig.options || {};
          await client.access({
            host: url.hostname,
            port: url.port,
            user: opts.user,
            password: opts.password,
            secure: opts.secure,
          });
          const tempDirPrefix = path.join(os.tmpdir(), "geodashboard_temp_");
          tempDir = await fs.mkdtemp(tempDirPrefix);
          tempFile = path.join(tempDir, fileName);
          await client.downloadTo(tempFile, url.pathname.slice(1));
        } catch (error) {
          logger.error(error);
          return next(
            new ServiceUnavailableError({
              service: "external-vector",
              reason: "Failed to download file from FTP server",
            })
          );
        }
        // read and parse file
        try {
          const fileContent = await fs.readFile(tempFile, { encoding: "utf8" });
          if (layerConfig.format === "json") {
            data = JSON.parse(fileContent);
          } else if (layerConfig.format === "xml") {
            const parser = new XMLParser();
            data = parser.parse(fileContent);
          } else {
            throw new Error(`Unexpected format: ${layerConfig.format}`);
          }
        } catch (error) {
          logger.error(error);
          return next(
            new ServiceUnavailableError({
              service: "external-vector",
              reason: "Failed to parse file",
            })
          );
        }
      } finally {
        if (!client.closed) {
          client.close();
        }
        if (tempDir) {
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch (error) {
            logger.error(`Failed to delete temp dir: ${tempDir}`);
            logger.error(error);
          }
        }
      }
    }

    if (layerConfig.transform_script) {
      try {
        const context = { data };
        const script = new vm.Script(layerConfig.transform_script);
        vm.createContext(context);
        script.runInContext(context);
        data = context.data;
      } catch (error) {
        logger.error(error);
        return next(
          new ServiceUnavailableError({
            service: "external-vector",
            reason: "Failed to run transform script",
          })
        );
      }
    }

    // update cached data
    if (layerConfig.cache_duration > 0) {
      try {
        const cacheExpiredAt = new Date();
        cacheExpiredAt.setHours(
          cacheExpiredAt.getHours() + layerConfig.cache_duration
        );
        await database("external_vector_cache")
          .insert({
            layer_id: layerId,
            value: data,
            expired_at: cacheExpiredAt,
          })
          .onConflict("layer_id")
          .merge(["value", "expired_at"]);
      } catch (error) {
        logger.error(error);
        return next(
          new ServiceUnavailableError({
            service: "external-vector",
            reason: "Failed to update cached data",
          })
        );
      }
    }

    try {
      return res.json(data);
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "external-vector",
          reason: "Failed to return data as JSON",
        })
      );
    }
  });
};
