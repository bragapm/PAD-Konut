import os
import traceback
from tempfile import TemporaryDirectory
from uuid import uuid4

import dramatiq
import numpy as np
import planetary_computer
from dramatiq.middleware import TimeLimitExceeded
from minio.deleteobjects import DeleteObject
from osgeo import gdal
from pystac_client import Client as STACClient

from lib.tile_raster_data import delete_generated_tiles, tile_raster_data
from lib.register_table import register_raster_tile
from lib.build_overviews import build_overviews
from utils import pool, logger, init_gdal_config, minio_client

COG_DATA_FOLDER_ID = "ffffffff-ffff-4fff-bfff-fffffffffff8"


@dramatiq.actor(store_results=True, time_limit=21600000)
def download_sentinel(ids: list[str], output: list[str], user_id: str):
    conn = None
    bucket = os.environ.get("STORAGE_S3_BUCKET")
    processed_tiles = []
    registered_tiles = []
    uploaded_files = []
    registered_files = []
    try:
        if not bucket:
            raise Exception("S3 bucket not configured")
        if not output:
            raise Exception("Output list is empty")
        init_gdal_config()

        stac = STACClient.open(
            "https://planetarycomputer.microsoft.com/api/stac/v1",
            modifier=planetary_computer.sign_inplace,
        )
        search = stac.search(
            ids=ids,
            collections=["sentinel-2-l2a"],
        )
        items = search.items()

        tif_driver: gdal.Driver = gdal.GetDriverByName("GTiff")
        conn = pool.getconn()
        with TemporaryDirectory(prefix="geodashboard_geoprocessing_") as tmpdir:
            for item in items:
                if "truecolor" in output:
                    asset_visual = item.assets.get("visual")
                    if not asset_visual:
                        raise Exception("Asset visual not found")

                    logger.info(f"Fetching and tiling {item.id} true color...")
                    (layer_id, xmin, ymin, xmax, ymax, minzoom, maxzoom) = (
                        tile_raster_data(
                            bucket,
                            None,
                            None,
                            file_path=f"/vsicurl/{asset_visual.href}",
                        )
                    )
                    processed_tiles.append(
                        {
                            "layer_id": layer_id,
                            "lon_min": xmin,
                            "lat_min": ymin,
                            "lon_max": xmax,
                            "lat_max": ymax,
                            "z_min": minzoom,
                            "z_max": maxzoom,
                        }
                    )
                    raster_alias = f"{item.id}_TrueColor"
                    register_raster_tile(
                        conn,
                        layer_id,
                        raster_alias,
                        xmin,
                        ymin,
                        xmax,
                        ymax,
                        minzoom,
                        maxzoom,
                        user_id,
                        False,
                        None,
                        None,
                    )
                    registered_tiles.append(layer_id)

                if "ndvi" in output:
                    asset_b4 = item.assets.get("B04")
                    asset_b8 = item.assets.get("B08")
                    if not asset_b4 or not asset_b8:
                        raise Exception("Asset B04/B08 not found")

                    b4_ds: gdal.Dataset = gdal.Open(f"/vsicurl/{asset_b4.href}")
                    b8_ds: gdal.Dataset = gdal.Open(f"/vsicurl/{asset_b8.href}")
                    raster_alias = f"{item.id}_NDVI"
                    cog_file_path = os.path.join(tmpdir, raster_alias)

                    cog_ds: gdal.Dataset = tif_driver.Create(
                        cog_file_path,
                        b4_ds.RasterXSize,
                        b4_ds.RasterYSize,
                        1,
                        gdal.GDT_Float32,
                        [
                            "TILED=YES",
                            "COMPRESS=DEFLATE",
                        ],
                    )
                    cog_ds.SetSpatialRef(b4_ds.GetSpatialRef())
                    cog_ds.SetGeoTransform(b4_ds.GetGeoTransform())
                    cog_band: gdal.Band = cog_ds.GetRasterBand(1)

                    logger.info(f"Fetching and calculating {item.id} NDVI...")
                    # use scanline to minimize memory usage
                    for line_offset in range(b4_ds.RasterYSize):
                        b4_line: np.ndarray = b4_ds.ReadAsArray(0, line_offset, None, 1, buf_type=gdal.GDT_Float32)  # type: ignore
                        b8_line: np.ndarray = b8_ds.ReadAsArray(0, line_offset, None, 1, buf_type=gdal.GDT_Float32)  # type: ignore

                        diff = b8_line - b4_line
                        summ = b8_line + b4_line
                        ndvi = np.divide(
                            diff, summ, np.full_like(diff, -1), where=summ != 0
                        )
                        ndvi = np.clip(ndvi, -1, 1)
                        cog_band.WriteArray(
                            ndvi,
                            0,
                            line_offset,
                        )
                    build_overviews(cog_ds)

                    logger.info(f"Scaling {item.id} NDVI to byte data type...")
                    scaled_file_path = os.path.join(tmpdir, raster_alias + "_scaled")
                    gdal.Translate(
                        scaled_file_path,
                        cog_ds,
                        format="COG",
                        outputType=gdal.GDT_Byte,
                        scaleParams=[[-1, 1, 0, 255]],
                    )
                    logger.info(f"Tiling {item.id} NDVI...")
                    (layer_id, xmin, ymin, xmax, ymax, minzoom, maxzoom) = (
                        tile_raster_data(bucket, None, None, file_path=scaled_file_path)
                    )

                    # close dataset so the file could be read and uploaded by minio client
                    del cog_band
                    del cog_ds

                    logger.info(f"Uploading {item.id} NDVI COG file...")
                    file_id = str(uuid4())
                    object_key = f"{file_id}.tif"
                    abs_object_key = (
                        os.environ.get("STORAGE_S3_ROOT", "") + "/"
                        if os.environ.get("STORAGE_S3_ROOT")
                        else ""
                    ) + object_key
                    minio_client.fput_object(
                        bucket, abs_object_key, cog_file_path, "image/tiff"
                    )
                    uploaded_files.append(abs_object_key)
                    with conn:
                        with conn.cursor() as cur:
                            cur.execute(
                                "INSERT INTO directus_files(id,storage,filename_disk,filename_download,title,type,folder,uploaded_by,filesize) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                                [
                                    file_id,
                                    "s3",
                                    object_key,
                                    raster_alias + ".tif",
                                    raster_alias,
                                    "image/tiff",
                                    COG_DATA_FOLDER_ID,
                                    user_id,
                                    os.stat(cog_file_path).st_size,
                                ],
                            )
                    registered_files.append(file_id)

                    register_raster_tile(
                        conn,
                        layer_id,
                        raster_alias,
                        xmin,
                        ymin,
                        xmax,
                        ymax,
                        minzoom,
                        maxzoom,
                        user_id,
                        False,
                        file_id,
                        {
                            "protocol": "greyscale",
                            "color_steps": [
                                {
                                    "pixel_value": 0,
                                    "color": "#500000",
                                    "legend_label": "-1",
                                },
                                {
                                    "pixel_value": 127,
                                    "color": "#FFFF00",
                                    "legend_label": "0",
                                },
                                {
                                    "pixel_value": 255,
                                    "color": "#005000",
                                    "legend_label": "1",
                                },
                            ],
                        },
                    )
                    registered_tiles.append(layer_id)
                    processed_tiles.append(
                        {
                            "layer_id": layer_id,
                            "lon_min": xmin,
                            "lat_min": ymin,
                            "lon_max": xmax,
                            "lat_max": ymax,
                            "z_min": minzoom,
                            "z_max": maxzoom,
                            "cog_file": file_id,
                        }
                    )

        return {"processed": processed_tiles}
    except (TimeLimitExceeded, Exception) as err:
        del_errs = []
        if processed_tiles and bucket:
            for tiles in processed_tiles:
                del_err_generator = delete_generated_tiles(bucket, tiles["layer_id"])
                for del_err in del_err_generator:
                    del_errs.append(del_err)

        if registered_tiles and conn:
            try:
                with conn:
                    with conn.cur() as cur:
                        cur.execute(
                            "DELETE FROM raster_tiles WHERE layer_id = ANY(%s::uuid[])",
                            [registered_tiles],
                        )
            except Exception as exc:
                del_errs.append(exc)

        if uploaded_files and bucket:
            delete_object_list = []
            for object_key in uploaded_files:
                if object_key:
                    delete_object_list.append(DeleteObject(object_key))
            del_err_generator = minio_client.remove_objects(bucket, delete_object_list)
            for del_err in del_err_generator:
                del_errs.append(del_err)

        if registered_files and conn:
            try:
                with conn:
                    with conn.cur() as cur:
                        cur.execute(
                            "DELETE FROM directus_files WHERE id = ANY(%s::uuid[])",
                            [registered_files],
                        )
            except Exception as exc:
                del_errs.append(exc)

        error_traceback = traceback.format_exc()
        if isinstance(err, TimeLimitExceeded):
            error_message = "Time limit exceeded. File might be too big to process."
        else:
            error_message = str(err)
            logger.error(error_traceback)

        if len(del_errs):
            error_message += f" Error deleting half generated tiles. Please delete manually: {del_errs}"

        return {"error": error_message, "traceback": error_traceback}
    finally:
        if conn:
            pool.putconn(conn)
