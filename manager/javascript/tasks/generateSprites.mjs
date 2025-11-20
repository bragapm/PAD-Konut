import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";

import { LAYER_ICONS_FOLDER_ID } from "../utils/const.mjs";
import minioClient from "../utils/minioClient.mjs";

const storageRoot = process.env.STORAGE_S3_ROOT
  ? process.env.STORAGE_S3_ROOT + "/"
  : "";
const bucketName = process.env.STORAGE_S3_BUCKET;

export default async function ({ queueId }, helpers) {
  const { withPgClient, logger } = helpers;
  logger.info(`Received generateSprites task with queue ID: ${queueId}`);

  const tempDirPrefix = path.join(os.tmpdir(), "geodashboard_sprites_");
  const spritesDir = await fs.promises.mkdtemp(tempDirPrefix);

  try {
    // Mark queue consumed
    await withPgClient(pg =>
      pg.query(
        "UPDATE other_processing_queue SET date_updated = CURRENT_TIMESTAMP, status = 'consumed' WHERE id = $1",
        [queueId]
      )
    );

    const { rows } = await withPgClient(pg =>
      pg.query(
        "SELECT filename_disk, filename_download, id FROM directus_files WHERE folder = $1 AND type = 'image/svg+xml'",
        [LAYER_ICONS_FOLDER_ID]
      )
    );

    const icons = rows.map(({ filename_disk, filename_download, id }) => ({
      disk: filename_disk,
      download: filename_download,
      id
    }));

    logger.info("ICON KEYS", icons.map(i => i.disk));
    logger.info("ICON DOWNLOAD NAMES", icons.map(i => i.download));

    logger.info("Downloading all icons");
    await Promise.all(
      icons.map(icon => {
        const filePath = path.join(spritesDir, icon.disk);
        return new Promise((resolve, reject) => {
          const fileStream = fs.createWriteStream(filePath);
          minioClient.getObject(
            bucketName,
            storageRoot + icon.disk,
            (err, stream) => {
              if (err) {
                reject(err);
                return;
              }
              stream
                .pipe(fileStream)
                .on("finish", resolve)
                .on("error", reject);
            }
          );
        });
      })
    );

    for (const pxRatio of [1, 2, 4]) {
      logger.info(`Generating sprite with pixel ratio ${pxRatio}`);

      // Determine which icons are SDF vs non-SDF
      const noSdfIcons = icons.filter(i => i.download.includes("colored"));
      const sdfIcons = icons.filter(i => !i.download.includes("colored"));

      // Combine all icons in one folder for spreet
      const outputPath = path.resolve(spritesDir, `sprite@${pxRatio}x`);

      // Generate sprite
      if (noSdfIcons.length > 0) {
        await execa("spreet", [
          "--ratio",
          pxRatio,
          "--unique",
          "--minify-index-file",
          spritesDir,
          outputPath
        ]);
      } else if (sdfIcons.length > 0) {
        await execa("spreet", [
          "--ratio",
          pxRatio,
          "--unique",
          "--minify-index-file",
          "--sdf",
          spritesDir,
          outputPath
        ]);
      }

      // Merge JSON
      let mergedJson = {};
      const spriteJsonPath = outputPath + ".json";
      if (fs.existsSync(spriteJsonPath)) {
        const spriteJson = JSON.parse(
          fs.readFileSync(spriteJsonPath, "utf-8")
        );
        for (const [key, value] of Object.entries(spriteJson)) {
          // Determine sdf flag based on filename
          const icon = icons.find(i => i.id === key);
          const isSdf = icon && !icon.download.includes("colored");
          mergedJson[key] = { ...value, sdf: isSdf };
        }
      }

      fs.writeFileSync(spriteJsonPath, JSON.stringify(mergedJson, null, 2));

      // Upload PNG
      await minioClient.fPutObject(
        bucketName,
        `${storageRoot}sprites/sprite@${pxRatio}x.png`,
        outputPath + ".png",
        { "Content-Type": "image/png" }
      );
      if (pxRatio === 1) {
        await minioClient.fPutObject(
          bucketName,
          `${storageRoot}sprites/sprite.png`,
          outputPath + ".png",
          { "Content-Type": "image/png" }
        );
      }
      logger.info(`Upload PNG ${pxRatio} Success`);

      // Upload JSON
      await minioClient.fPutObject(
        bucketName,
        `${storageRoot}sprites/sprite@${pxRatio}x.json`,
        spriteJsonPath,
        { "Content-Type": "application/json" }
      );
      if (pxRatio === 1) {
        await minioClient.fPutObject(
          bucketName,
          `${storageRoot}sprites/sprite.json`,
          spriteJsonPath,
          { "Content-Type": "application/json" }
        );
      }

      logger.info(`✅ Uploaded sprite@${pxRatio}x`);
    }

    await withPgClient(pg =>
      pg.query(
        "UPDATE other_processing_queue SET date_updated = CURRENT_TIMESTAMP, status = 'done' WHERE id = $1",
        [queueId]
      )
    );
  } catch (error) {
    await withPgClient(pg =>
      pg.query(
        "UPDATE other_processing_queue SET date_updated = CURRENT_TIMESTAMP, status = 'done', results = $1 WHERE id = $2",
        [{ error: error.message, stack: error.stack }, queueId]
      )
    );
    logger.error(error);
  } finally {
    fs.rmSync(spritesDir, { recursive: true, force: true });
  }
}
