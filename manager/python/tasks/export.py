from urllib.parse import urlparse
import os
import shutil
import tempfile
import traceback
import uuid

from dramatiq.middleware import TimeLimitExceeded
from osgeo import gdal, ogr
import dramatiq

from utils import init_gdal_config, logger, minio_client, pool

LAYER_EXPORTS_FOLDER_ID = "ffffffff-ffff-4fff-bfff-fffffffffff9"


@dramatiq.actor(store_results=True)
def export(table_name: str, format_file: str, downloader: str | None):
    conn = None
    bucket = os.environ.get("STORAGE_S3_BUCKET")
    storage_root = (
        os.environ.get("STORAGE_S3_ROOT", "") + "/"
        if os.environ.get("STORAGE_S3_ROOT")
        else ""
    )
    file_id = str(uuid.uuid4())
    object_key = file_id + ".zip"
    file_uploaded = False

    try:
        if not bucket:
            raise Exception("S3 bucket not configured")
        init_gdal_config()

        driver_short_name = ""
        match format_file:
            case "gpkg":
                driver_short_name = "GPKG"
            case "geojson":
                driver_short_name = "GeoJSON"
            case "kml":
                driver_short_name = "KML"
            case _:
                raise Exception(f"Unexpected file format: {str}")

        # db connection string must be exactly using "postgresql" scheme
        conn_string = (
            urlparse(os.environ.get("DB_CONNECTION_STRING"))
            ._replace(scheme="postgresql")
            .geturl()
        )

        db_dataset: gdal.Dataset = gdal.OpenEx(
            conn_string, gdal.GA_ReadOnly | gdal.OF_VECTOR, ["PostgreSQL"]
        )
        db_layer: ogr.Layer = db_dataset.GetLayerByName(table_name)
        db_feature_defn: ogr.FeatureDefn = db_layer.GetLayerDefn()

        with tempfile.TemporaryDirectory(
            prefix="geodashboard_geoprocessing_"
        ) as tmpdir:
            file_dir = os.path.join(tmpdir, "out")
            os.mkdir(file_dir)
            file_path = os.path.join(file_dir, f"{table_name}.{format_file}")

            out_driver: gdal.Driver = gdal.GetDriverByName(driver_short_name)
            out_dataset: gdal.Dataset = out_driver.Create(
                file_path, 0, 0, 0, gdal.GDT_Unknown
            )
            out_layer: ogr.Layer = out_dataset.CreateLayer(
                table_name, db_layer.GetSpatialRef(), db_layer.GetGeomType()
            )

            for i in range(0, db_feature_defn.GetFieldCount()):
                db_field_defn: ogr.FieldDefn = db_feature_defn.GetFieldDefn(i)
                out_layer.CreateField(db_field_defn)

            for feature in db_layer:
                feature: ogr.Feature
                out_layer.CreateFeature(feature)

            # close dataset by dereferencing them so all data will be flushed to disk
            del out_layer
            del out_dataset

            zip_path = os.path.join(tmpdir, file_id)
            shutil.make_archive(zip_path, "zip", file_dir)
            zip_path += ".zip"

            minio_client.fput_object(
                bucket, storage_root + object_key, zip_path, "application/zip"
            )
            file_uploaded = True

            conn = pool.getconn()
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO directus_files(id,storage,filename_disk,filename_download,type,folder,uploaded_by,filesize) VALUES(%s,%s,%s,%s,%s,%s,%s,%s)",
                        [
                            file_id,
                            "s3",
                            object_key,
                            table_name + ".zip",
                            "application/zip",
                            LAYER_EXPORTS_FOLDER_ID,
                            downloader,
                            os.stat(zip_path).st_size,
                        ],
                    )

        return {"file_id": file_id}

    except (TimeLimitExceeded, Exception) as err:
        error_traceback = traceback.format_exc()
        if isinstance(err, TimeLimitExceeded):
            error_message = "Time limit exceeded. File might be too big to process."
        else:
            error_message = str(err)
            logger.error(error_traceback)

        if bucket and file_uploaded:
            try:
                minio_client.remove_object(bucket, storage_root + object_key)
            except Exception as err:
                error_message += f"\n\nFailed to delete uploaded file. Please delete object key {object_key} manually from S3"
                logger.error(traceback.format_exc())

        return {"error": error_message, "traceback": error_traceback}
    finally:
        if conn:
            pool.putconn(conn)
