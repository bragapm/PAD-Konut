import {
  createError,
  ServiceUnavailableError,
  RouteNotFoundError,
  InvalidPayloadError,
} from "@directus/errors";

import validateUuid from "../../utils/validateUuid.mjs";

const SharedMapNotFound = createError(
  "SHARED_MAP_NOT_FOUND",
  (ext) => `Shared map ${ext.shareId} not found`,
  404
);

export default (router, { database, logger, env, services }) => {
  const { MailService } = services;
  router.post("/", async (req, res, next) => {
    const { accountability } = req;
    const { share_id: shareId, recipients } = req.body;

    if (!accountability.user) {
      return next(new RouteNotFoundError({ path: "/share-by-email" }));
    }

    if (!validateUuid(shareId)) {
      return next(new InvalidPayloadError({ reason: "Invalid share_id" }));
    }

    const recipientsArr = [];
    if (typeof recipients === "string") {
      recipientsArr.push(recipients.trim().toLowerCase());
    } else if (Array.isArray(recipients)) {
      for (const rec of recipients) {
        if (typeof rec !== "string") {
          return next(
            new InvalidPayloadError({
              reason: "recipients must be array of string or string",
            })
          );
        }
        recipientsArr.push(rec.trim().toLowerCase());
      }
    } else {
      return next(
        new InvalidPayloadError({
          reason: "recipients must be array of string or string",
        })
      );
    }

    const regex =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    for (const rec of recipientsArr) {
      if (!rec.match(regex)) {
        return next(
          new InvalidPayloadError({ reason: `Invalid recipient ${rec}` })
        );
      }
    }

    try {
      const sharedMap = await database("shared_map")
        .first("user_created")
        .where("id", shareId);

      if (!sharedMap || sharedMap.user_created !== accountability.user) {
        return next(new SharedMapNotFound({ shareId }));
      }
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "share-by-email",
          reason: "Failed to fetch shared map entry",
        })
      );
    }

    let panelUrl;
    let shareUrl;
    try {
      panelUrl = new URL(env.PUBLIC_URL);
      shareUrl = `${panelUrl.origin}/?share_id=${shareId}`;
    } catch (error) {
      logger.error(error);
      return next(
        new ServiceUnavailableError({
          service: "share-by-email",
          reason: "Failed to generate share URL",
        })
      );
    }

    const mailService = new MailService({ knex: database, schema: req.schema });
    await Promise.allSettled(
      recipientsArr.map((rec) =>
        mailService.send({
          to: rec,
          subject: "Shared Map",
          // TODO template for shared map
          html: `<p>GeoDashboard has shared map with you: </p><a href=${shareUrl}>Click here to open</a>`,
        })
      )
    );
    return res.status(204).send();
  });
};
