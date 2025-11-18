import { useMapRef } from "@/stores/useMapRef"; // adjust path as needed
import center from "@turf/center";
import type { Geometry, Feature } from "geojson";

export const onRowClick = (geom: Geometry) => {
  const mapRefStore = useMapRef();
  if (!geom || !mapRefStore.map) return;

  const feature: Feature = {
    type: "Feature",
    geometry: geom,
    properties: {},
  };

  // Use Turf to calculate center
  const centroid = center(feature);
  const [lon, lat] = centroid.geometry.coordinates;

  const mapCanvas = mapRefStore.map.getCanvas();
  const width = mapCanvas.clientWidth;
  const offset = width / 2;

  mapRefStore.map.flyTo({
    center: [lon, lat],
    zoom: 17,
    essential: true,
    padding: {
      top: 0,
      bottom: 0,
      left: offset, // shifts the center to the right half
      right: 0,
    },
  });
};
