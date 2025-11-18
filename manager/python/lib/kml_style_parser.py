import os
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import psycopg2
from osgeo import gdal
from utils import minio_client


def extract_kml_styles(kml_path, layer_name):
    # Parse the KML as XML
    tree = ET.parse(kml_path)
    root = tree.getroot()

    # KML uses this namespace
    ns = {'kml': 'http://www.opengis.net/kml/2.2'}

    # Collect <Style> and <StyleMap> definitions
    styles = {}
    stylemaps = {}

    for style in root.findall(".//kml:Style", ns):
        sid = style.get("id")
        if sid:
            styles[f"#{sid}"] = style

    for stylemap in root.findall(".//kml:StyleMap", ns):
        sid = stylemap.get("id")
        if sid:
            pairs = stylemap.findall(".//kml:Pair", ns)
            for pair in pairs:
                key = pair.find("kml:key", ns).text
                styleurl = pair.find("kml:styleUrl", ns).text
                if key == "normal":
                    stylemaps[f"#{sid}"] = styleurl

    # Prepare output
    style_dict = {
        "circle": {},
        "line": {},
        "fill": {}
    }

    # Open KML with GDAL to find layer name
    ds = gdal.OpenEx(kml_path, gdal.OF_VECTOR)
    if not ds:
        raise RuntimeError("Failed to open KML with GDAL")

    layer = ds.GetLayerByName(layer_name)
    if not layer:
        raise ValueError(f"Layer '{layer_name}' not found in KML.")

    # Scan features
    for feature in layer:
        # Try to find <Placemark> corresponding to this feature
        fid = feature.GetFID()
        placemarks = root.findall(".//kml:Placemark", ns)
        if fid >= len(placemarks):
            continue
        pm = placemarks[fid]

        # 1. Inline style
        style_tag = pm.find("kml:Style", ns)
        style_url_tag = pm.find("kml:styleUrl", ns)

        final_style = None

        if style_tag is not None:
            final_style = style_tag
        elif style_url_tag is not None:
            style_ref = style_url_tag.text.strip()
            if style_ref in stylemaps:
                style_ref = stylemaps[style_ref]
            final_style = styles.get(style_ref, None)

        if final_style is not None:
            # Extract geometry-specific styling
            iconstyle = final_style.find("kml:IconStyle", ns)
            linestyle = final_style.find("kml:LineStyle", ns)
            polystyle = final_style.find("kml:PolyStyle", ns)

            if iconstyle is not None:
                color = iconstyle.find("kml:color", ns)
                scale = iconstyle.find("kml:scale", ns)
                if color is not None:
                    style_dict["circle"]["circle-color"] = hex_color(color.text)
                    style_dict["circle"]["circle-opacity"] = opacity_from_kml(color.text)
                if scale is not None:
                    style_dict["circle"]["circle-radius"] = float(scale.text) * 5  # scale multiplier heuristic

            if linestyle is not None:
                color = linestyle.find("kml:color", ns)
                width = linestyle.find("kml:width", ns)
                if color is not None:
                    style_dict["line"]["line-color"] = hex_color(color.text)
                    style_dict["line"]["line-opacity"] = opacity_from_kml(color.text)
                if width is not None:
                    style_dict["line"]["line-width"] = float(width.text)

            if polystyle is not None:
                color = polystyle.find("kml:color", ns)
                fill = polystyle.find("kml:fill", ns)
                if color is not None:
                    style_dict["fill"]["fill-color"] = hex_color(color.text)
                    style_dict["fill"]["fill-opacity"] = opacity_from_kml(color.text)
                if fill is not None and fill.text == "0":
                    style_dict["fill"]["fill-opacity"] = 0.0

    return style_dict


def hex_color(kml_color: str) -> str:
    if not kml_color or len(kml_color) != 8:
        return "#000000"
    aabbggrr = re.findall("..", kml_color)
    a, b, g, r = aabbggrr
    return f"#{r}{g}{b}"


def opacity_from_kml(kml_color: str) -> float:
    if not kml_color or len(kml_color) != 8:
        return 1.0
    alpha = int(kml_color[0:2], 16)
    return round(alpha / 255, 2)


def process_layer_style(kml_storage_path: str, layer_name: str, geom_name: str) -> int | None:
    # === 1. Check if the KML file already exists locally, if not, download it ===
    kml_filename = os.path.basename(kml_storage_path)
    local_path = Path("/tmp") / kml_filename

    # Check if the local file already exists
    if not local_path.exists():
        # Download the KML file
        minio_client.fget_object(os.getenv("STORAGE_S3_BUCKET"), kml_storage_path, str(local_path))
    else:
        print(f"File {local_path} already exists. Skipping download.")

    # === 2. Extract styles by layer name ===
    layer_styles = extract_kml_styles(str(local_path), layer_name)

    # === 3. Insert each style into DB ===
    db_url = os.getenv("DB_CONNECTION_STRING")
    conn = psycopg2.connect(db_url)

    # TODO: 1 kml style could be inserted as multiple items into different geometry styles
    with conn:
        with conn.cursor() as cur:
            match geom_name:
                case "POLYGON" | "MULTIPOLYGON":
                    geom_type = "fill"
                case "LINESTRING" | "MULTILINESTRING":
                    geom_type = "line"
                case "POINT" | "MULTIPOINT":
                    geom_type = "circle"
                case _:
                    return 0
            style_dict = layer_styles[geom_type]
            columns = []
            values = []
            for k, v in style_dict.items():
                col = k.replace("-", "_")  # line-color → line_color
                columns.append(f"paint_{col}")
                values.append(v)
            columns.insert(0, '"name"')
            values.insert(0, layer_name)
            placeholders = ", ".join(["%s"] * len(values))
            colnames = ", ".join(columns)
            insert_sql = f"""
                INSERT INTO {geom_type} ({colnames})
                VALUES ({placeholders})
                RETURNING id
            """
            cur.execute(insert_sql, values)
            style_ids = cur.fetchone()
            if not style_ids:
                raise Exception('Failed to save kml style')
            style_id = style_ids[0]

    return style_id
