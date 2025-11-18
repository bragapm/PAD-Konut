from uuid import uuid4

from lib.clear_directus_cache import clear_directus_cache
from lib.get_header_info import HeaderInfo
from psycopg2.extras import Json
from utils import create_bbox_polygon, logger


def validate_permission_type(conn, uploader, permission_type):
    # if uploader is not an admin, only allow "roles" or "roles+public"
    # default to admin if uploader is admin, and roles with their user role if not admin
    allowed_role = None
    with conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT admin_access, role FROM directus_users u INNER JOIN directus_roles r ON role = r.id WHERE u.id = %s",
                [uploader],
            )
            user_role = cur.fetchone()
            if not user_role:
                raise Exception("Uploader does not exists")
            if permission_type:
                if user_role[0]:
                    if permission_type not in ["admin", "roles", "roles+public"]:
                        permission_type = "admin"
                        # TODO add allowed_roles selected by admin
                else:
                    allowed_role = user_role[1]
                    if permission_type not in ["roles", "roles+public"]:
                        permission_type = "roles"
            else:
                if user_role[0]:
                    permission_type = "admin"
                else:
                    permission_type = "roles"
                    allowed_role = user_role[1]
    return permission_type, allowed_role


def register_table_to_directus(
    conn,
    table_name: str,
    header_info: HeaderInfo,
    uploader: str,
    additional_config: dict | None,
    with_invalidate: bool = True,
    kml_style_id: int | None = None,
):
    layer_alias = None
    listed = False
    permission_type = "admin"
    allowed_role = None
    fill_style = None
    line_style = None
    circle_style = None
    preview = None
    description = None

    if additional_config is not None:
        layer_alias = additional_config.get("layer_alias", None)
        listed = additional_config.get("listed", False)
        permission_type, allowed_role = validate_permission_type(
            conn, uploader, additional_config.get("permission_type", None)
        )
        preview = additional_config.get("preview", None)
        description = additional_config.get("description", None)

    with conn:
        with conn.cursor() as cur:
            if listed:
                # get random style for auto listed layer
                match header_info["geom_name"]:
                    case "POLYGON" | "MULTIPOLYGON":
                        cur.execute("SELECT id FROM fill LIMIT 1")
                        style_id = cur.fetchone()
                        if style_id is not None:
                            fill_style = style_id[0]
                        else:
                            raise Exception("No fill style defined")
                    case "LINESTRING" | "MULTILINESTRING":
                        cur.execute("SELECT id FROM line LIMIT 1")
                        style_id = cur.fetchone()
                        if style_id is not None:
                            line_style = style_id[0]
                        else:
                            raise Exception("No line style defined")
                    case "POINT" | "MULTIPOINT":
                        cur.execute("SELECT id FROM circle LIMIT 1")
                        style_id = cur.fetchone()
                        if style_id is not None:
                            circle_style = style_id[0]
                        else:
                            raise Exception("No circle style defined")
                    case _:
                        raise Exception(
                            f"Failed to define default style for geom_name: {header_info['geom_name']}"
                        )

            if kml_style_id:
                match header_info["geom_name"]:
                    case "POLYGON" | "MULTIPOLYGON":
                        fill_style = kml_style_id
                    case "LINESTRING" | "MULTILINESTRING":
                        line_style = kml_style_id
                    case "POINT" | "MULTIPOINT":
                        circle_style = kml_style_id

            # Calculate bbox from PostGIS using ST_Extent
            cur.execute(f"SELECT ST_Extent(geom) FROM {table_name}")
            bbox_result = cur.fetchone()
            if bbox_result is None or bbox_result[0] is None:
                raise Exception(f"Could not calculate bbox for table: {table_name}")

            bbox_str = bbox_result[0]
            bbox_str_clean = bbox_str.replace("BOX(", "").replace(")", "")
            bbox_values = bbox_str_clean.replace(",", " ").split()
            lon_min, lat_min, lon_max, lat_max = map(float, bbox_values)
            bbox_polygon = create_bbox_polygon(lon_min, lat_min, lon_max, lat_max)

            # Insert data into vector_tiles table
            layer_id = str(uuid4())
            cur.execute(
                "INSERT INTO vector_tiles(layer_id, layer_name, geometry_type, user_created, bounds, layer_alias, listed, fill_style, line_style, circle_style, permission_type, preview, description) VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                [
                    layer_id,
                    table_name,
                    (
                        "MULTIPOLYGON"
                        if header_info["geom_name"] == "POLYGON"
                        else header_info["geom_name"]
                    ),
                    uploader,
                    Json(bbox_polygon),
                    layer_alias,
                    listed,
                    fill_style,
                    line_style,
                    circle_style,
                    permission_type,
                    preview,
                    description,
                ],
            )
            if allowed_role:
                cur.execute(
                    "INSERT INTO vector_tiles_directus_roles(vector_tiles_layer_id, directus_roles_id) VALUES(%s, %s)",
                    [layer_id, allowed_role],
                )
            # handle public only, because permission for allowed roles are handled by junction table insertion trigger
            if permission_type == "roles+public":
                cur.execute(
                    "INSERT INTO directus_permissions(collection, role, action, fields) VALUES(%s, NULL, 'read', '*')",
                    [table_name],
                )

    logger.info("Register to vector_tiles")

    if with_invalidate:
        clear_directus_cache()


def register_raster_tile(
    conn,
    layer_id: str,
    raster_alias: str,
    lon_min: float,
    lat_min: float,
    lon_max: float,
    lat_max: float,
    z_min: int,
    z_max: int,
    uploader: str,
    is_terrain: bool,
    cog_file: str | None,
    additional_config: dict | None,
):
    listed = False
    permission_type = "admin"
    allowed_role = None
    preview = None
    description = None
    protocol = "default"
    color_steps = None

    if additional_config is not None:
        listed = additional_config.get("listed", False)
        permission_type, allowed_role = validate_permission_type(
            conn, uploader, additional_config.get("permission_type", None)
        )
        preview = additional_config.get("preview", None)
        description = additional_config.get("description", None)
        protocol = additional_config.get("protocol", "default")
        if protocol not in ["default", "greyscale"]:
            protocol = "default"
        color_steps = additional_config.get("color_steps", None)

    with conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO raster_tiles(layer_id, layer_alias, bounds, minzoom, maxzoom, terrain_rgb, protocol, color_steps, cog_file, user_created, listed, permission_type, preview, description)
            VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                [
                    layer_id,
                    raster_alias,
                    Json(create_bbox_polygon(lon_min, lat_min, lon_max, lat_max)),
                    z_min,
                    z_max,
                    is_terrain,
                    protocol,
                    Json(color_steps),
                    cog_file,
                    uploader,
                    listed,
                    permission_type,
                    preview,
                    description,
                ],
            )
            if allowed_role:
                cur.execute(
                    "INSERT INTO raster_tiles_directus_roles(raster_tiles_layer_id, directus_roles_id) VALUES(%s, %s)",
                    [layer_id, allowed_role],
                )
    logger.info("Register to raster tiles")


def register_3d_tile(
    conn,
    layer_id: str,
    three_d_alias: str,
    uploader: str,
    additional_config: dict | None,
):
    listed = False
    permission_type = "admin"
    allowed_role = None
    opacity = None
    point_size = None
    preview = None
    description = None

    if additional_config is not None:
        listed = additional_config.get("listed", False)
        permission_type, allowed_role = validate_permission_type(
            conn, uploader, additional_config.get("permission_type", None)
        )
        preview = additional_config.get("preview", None)
        description = additional_config.get("description", None)

    if listed:
        # default view for auto listed layer
        opacity = 1
        point_size = 1

    with conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO three_d_tiles(layer_id, layer_alias, user_created, listed, permission_type, opacity, point_size, preview, description)
            VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                [
                    layer_id,
                    three_d_alias,
                    uploader,
                    listed,
                    permission_type,
                    opacity,
                    point_size,
                    preview,
                    description,
                ],
            )
            if allowed_role:
                cur.execute(
                    "INSERT INTO three_d_tiles_directus_roles(three_d_tiles_layer_id, directus_roles_id) VALUES(%s, %s)",
                    [layer_id, allowed_role],
                )
