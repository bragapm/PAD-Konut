import { ServiceUnavailableError, RouteNotFoundError } from "@directus/errors";

export default (router, { database, logger, services }) => {
  const { ItemsService, FieldsService } = services;
  router.get("/:layerName", async (req, res, next) => {
    const { accountability } = req;
    const { layerName } = req.params;

    const vectorTilesService = new ItemsService("vector_tiles", {
      accountability,
      knex: database,
      schema: req.schema,
    });
    const fieldsService = new FieldsService({
      knex: database,
      schema: req.schema,
    });

    let layers = [];
    try {
      layers = await vectorTilesService.readByQuery({
        filter: { layer_name: { _eq: layerName } },
        fields: ["layer_name"],
        limit: 1,
      });
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "vector-tiles-attribute-table-header",
          reason: "Failed to fetch layer name",
        })
      );
    }
    if (!layers.length) {
      return next(new RouteNotFoundError({ path: "/table-header" + req.path }));
    }

    const permissions = accountability.permissions.filter(
      (el) => el.collection === layerName && el.action === "read"
    );
    if (!accountability.admin && !permissions.length) {
      return next(new RouteNotFoundError({ path: "/table-header" + req.path }));
    }

    const allowedFields = permissions[0].fields ?? [];
    if (!allowedFields.length) {
      return next(new RouteNotFoundError({ path: "/table-header" + req.path }));
    }

    let fields = [];
    try {
      fields = await fieldsService.readAll(layerName);
      fields = fields.filter(
        (el) =>
          !["ogc_fid", "geom"].includes(el.field) &&
          (allowedFields[0] === "*" ? true : allowedFields.includes(el.field))
      );
      fields = fields.map((el) => {
        return { field: el.field, type: el.type };
      });
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "vector-tiles-attribute-table-header",
          reason: "Failed to fetch fields",
        })
      );
    }

    return res.json({ data: fields });
  });
};
