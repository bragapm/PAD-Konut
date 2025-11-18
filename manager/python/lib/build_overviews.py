from math import ceil

from osgeo import gdal

from utils import logger


def build_overviews(ds: gdal.Dataset):
    ovr_list = []
    ovr_x = ceil(ds.RasterXSize / 2)
    ovr_y = ceil(ds.RasterYSize / 2)
    ovr_i = 0
    while ovr_x > 256 and ovr_y > 256:
        ovr_list.append(2 << ovr_i)
        ovr_x = ceil(ovr_x / 2)
        ovr_y = ceil(ovr_y / 2)
        ovr_i += 1
    if len(ovr_list):
        logger.info(f"Building overviews with levels: {ovr_list}")
        ds.BuildOverviews(overviewlist=ovr_list)
