import math
import os
from uuid import uuid4

from minio.deleteobjects import DeleteObject
from osgeo import gdal, osr

from utils import minio_client


def get_zoom_level_for_pixel_size(pixel_size):
    equator_z0_pixel_size = 2 * math.pi * 6378137 / 256
    max_zoom_allowed = 22
    for i in range(max_zoom_allowed):
        if pixel_size > equator_z0_pixel_size / (2**i):
            return max(0, i - 1)
    return max_zoom_allowed


def delete_generated_tiles(bucket: str, layer_id: str):
    storage_root = (
        os.environ.get("STORAGE_S3_ROOT", "") + "/"
        if os.environ.get("STORAGE_S3_ROOT")
        else ""
    )
    delete_object_list = []
    object_list = minio_client.list_objects(
        bucket, f"{storage_root}raster-tiles/{layer_id}/", recursive=True
    )
    for obj in object_list:
        if obj.object_name:
            delete_object_list.append(DeleteObject(obj.object_name))
    errors = minio_client.remove_objects(bucket, delete_object_list)
    return errors


def tile_raster_data(
    bucket: str,
    min_zoom: int | None,
    max_zoom: int | None,
    object_key: str | None = None,
    file_path: str | None = None,
):
    min_zoom = int(min_zoom) if min_zoom is not None else min_zoom
    max_zoom = int(max_zoom) if max_zoom is not None else max_zoom

    if max_zoom is not None:
        if min_zoom is None:
            raise Exception("Min zoom must be defined when max zoom is defined")
        elif min_zoom > max_zoom:
            raise Exception("Min zoom must be lower than or equal to max_zoom")

    layer_id = str(uuid4())
    storage_root = (
        os.environ.get("STORAGE_S3_ROOT", "") + "/"
        if os.environ.get("STORAGE_S3_ROOT")
        else ""
    )
    if object_key:
        input_file = f"/vsis3/{bucket}/{storage_root}{object_key}"
    elif file_path:
        input_file = file_path
    else:
        raise Exception("Neither object_key nor file_path defined")
    output_dir = f"/vsis3/{bucket}/{storage_root}raster-tiles/{layer_id}"
    src_ds: gdal.Dataset = gdal.Open(input_file)

    # Get bounds in WGS84
    xmin, xres, _, ymax, _, yres = src_ds.GetGeoTransform()
    xmax = xmin + (src_ds.RasterXSize * xres)
    ymin = ymax + (src_ds.RasterYSize * yres)
    src_srs: osr.SpatialReference = src_ds.GetSpatialRef()
    wgs84_srs = osr.SpatialReference()
    wgs84_srs.ImportFromEPSG(4326)
    src2wgs84 = osr.CoordinateTransformation(src_srs, wgs84_srs)
    wgs84_bounds: tuple[float, float, float, float] = src2wgs84.TransformBounds(
        xmin, ymin, xmax, ymax, 21
    )

    del src2wgs84
    del wgs84_srs
    del src_srs

    # Determine min max zoom if not defined yet
    if min_zoom is None or max_zoom is None:
        # Transform to web mercator and save it into in memory VRT to get pixel size
        vrt_ds: gdal.Dataset = gdal.Warp(
            "",
            src_ds,
            format="VRT",
            dstSRS="EPSG:3857",
        )
        _, vrtxres, _, _, _, _ = vrt_ds.GetGeoTransform()
        if min_zoom is None:
            min_zoom = get_zoom_level_for_pixel_size(
                vrtxres * max(vrt_ds.RasterXSize, vrt_ds.RasterYSize) / 256
            )
        if max_zoom is None:
            max_zoom = get_zoom_level_for_pixel_size(xres)

        # handle if user defined min_zoom is larger than calculated max_zoom
        if min_zoom > max_zoom:
            max_zoom = min_zoom

    gdal.Run(
        "raster tile",
        {
            "input": src_ds,
            "output": output_dir,
            "min-zoom": min_zoom,
            "max-zoom": max_zoom,
            "webviewer": "none",
        },
    )

    return (
        layer_id,
        wgs84_bounds[1],
        wgs84_bounds[0],
        wgs84_bounds[3],
        wgs84_bounds[2],
        min_zoom,
        max_zoom,
    )
