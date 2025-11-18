import { ServiceUnavailableError, ForbiddenError } from "@directus/errors";

export default async (req, res, next) => {
  const { accountability } = req;
  if (!accountability.user) {
    return next(new ForbiddenError());
  }
  if (!accountability.admin) {
    try {
      const internalRole = await database
        .select("id")
        .from("directus_roles")
        .where("name", "Internal")
        .first();
      if (!internalRole) {
        return next(
          new ServiceUnavailableError({
            service: "geoprocessing",
            reason: 'Missing "Internal" role',
          })
        );
      }
      if (accountability.role !== internalRole.id) {
        return next(new ForbiddenError());
      }
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "geoprocessing",
          reason: "Failed to fetch roles",
        })
      );
    }
  }
  next();
};
