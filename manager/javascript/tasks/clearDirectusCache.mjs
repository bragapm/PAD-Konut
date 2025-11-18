export default async function (_payload, helpers) {
  const { logger } = helpers;
  logger.info("Received clearDirectusCache task");
  const directusUrl = process.env.DIRECTUS_PUBLIC_URL || "http://directus:8055";
  try {
    const res = await fetch(directusUrl + "/utils/cache/clear", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` },
    });
    logger.info("Clear Directus cache response status: " + res.status);
  } catch (error) {
    logger.error(error);
  }
}
