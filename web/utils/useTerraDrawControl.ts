import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawLineStringMode,
  TerraDrawSelectMode,
  TerraDrawCircleMode,
  TerraDrawRectangleMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

export type DrawMode = "polygon" | "linestring" | "circle" | "rectangle" | "";

interface TerraDrawOptions {
  mode?: DrawMode;
  onFinish?: (id: string, feature: any) => void;
  onChange?: (ids: string[], features: any[]) => void;
  styles?: {
    fillColor?: string;
    outlineColor?: string;
    outlineWidth?: number;
    fillOpacity?: number;
    lineStringColor?: string;
    lineStringWidth?: number;
    closingPointColor?: string;
    closingPointWidth?: number;
    closingPointOutlineColor?: string;
    closingPointOutlineWidth?: number;
  };
  selectStyles?: {
    selectedPolygonColor?: string;
    selectedPolygonOutlineColor?: string;
    selectedLineStringColor?: string;
    selectionPointColor?: string;
    selectionPointOutlineColor?: string;
    midPointColor?: string;
    midPointWidth?: number;
  };
}

export const useTerraDrawControl = (options: TerraDrawOptions) => {
  const mapRef = useMapRef();
  const drawInstance = shallowRef<any>(null);

  const defaultStyles = {
    fillColor: "#f59047",
    outlineColor: "#f36a1d",
    outlineWidth: 2,
    fillOpacity: 0.5,
    lineStringColor: "#f59047",
    lineStringWidth: 3,
    closingPointColor: "#f36a1d",
    closingPointWidth: 4,
    closingPointOutlineColor: "#f36a1d",
    closingPointOutlineWidth: 2,
  };

  const defaultSelectStyles = {
    selectedPolygonColor: "#f59047",
    selectedPolygonOutlineColor: "#f36a1d",
    selectedLineStringColor: "#f59047",
    selectionPointColor: "#f36a1d",
    selectionPointOutlineColor: "#f36a1d",
    midPointColor: "#f36a1d",
    midPointWidth: 4,
  };

  const styles = { ...defaultStyles, ...options.styles };
  const selectStyles = { ...defaultSelectStyles, ...options.selectStyles };

  const initialize = () => {
    if (!mapRef.map) return;

    // Create all draw modes
    const polygonMode = new TerraDrawPolygonMode({
      styles: {
        fillColor: styles.fillColor as any,
        outlineColor: styles.outlineColor as any,
        outlineWidth: styles.outlineWidth,
        fillOpacity: styles.fillOpacity,
        closingPointColor: styles.closingPointColor as any,
        closingPointWidth: styles.closingPointWidth,
        closingPointOutlineColor: styles.closingPointOutlineColor as any,
        closingPointOutlineWidth: styles.closingPointOutlineWidth,
      },
    });

    const lineStringMode = new TerraDrawLineStringMode({
      styles: {
        lineStringColor: styles.lineStringColor as any,
        lineStringWidth: styles.lineStringWidth,
        closingPointColor: styles.closingPointColor as any,
        closingPointWidth: styles.closingPointWidth,
        closingPointOutlineColor: styles.closingPointOutlineColor as any,
        closingPointOutlineWidth: styles.closingPointOutlineWidth,
      },
    });

    const circleMode = new TerraDrawCircleMode({
      styles: {
        fillColor: styles.fillColor as any,
        outlineColor: styles.outlineColor as any,
        outlineWidth: styles.outlineWidth,
        fillOpacity: styles.fillOpacity,
      },
    });

    const rectangleMode = new TerraDrawRectangleMode({
      styles: {
        fillColor: styles.fillColor as any,
        outlineColor: styles.outlineColor as any,
        outlineWidth: styles.outlineWidth,
        fillOpacity: styles.fillOpacity,
      },
    });

    const selectMode = new TerraDrawSelectMode({
      styles: {
        selectedPolygonColor: selectStyles.selectedPolygonColor as any,
        selectedPolygonOutlineColor:
          selectStyles.selectedPolygonOutlineColor as any,
        selectedLineStringColor: selectStyles.selectedLineStringColor as any,
        selectionPointColor: selectStyles.selectionPointColor as any,
        selectionPointOutlineColor:
          selectStyles.selectionPointOutlineColor as any,
        midPointColor: selectStyles.midPointColor as any,
        midPointWidth: selectStyles.midPointWidth,
      },
      flags: {
        polygon: {
          feature: {
            draggable: true,
            rotateable: true,
            scaleable: true,
            coordinates: {
              midpoints: true,
              draggable: true,
              deletable: true,
            },
          },
        },
        linestring: {
          feature: {
            draggable: true,
            coordinates: {
              midpoints: true,
              draggable: true,
              deletable: true,
            },
          },
        },
        point: { feature: {} },
      },
    });

    drawInstance.value = markRaw(
      new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({
          map: mapRef.map as any,
        }),
        modes: [
          polygonMode,
          lineStringMode,
          circleMode,
          rectangleMode,
          selectMode,
        ],
      })
    );

    // Setup event listeners
    drawInstance.value.on("finish", (id: string) => {
      drawInstance.value.selectFeature(id);

      if (options.onFinish) {
        const snapshot = drawInstance.value.getSnapshot();
        const feature = snapshot.find((f: any) => f.id === id);
        options.onFinish(id, feature);
      }
    });

    drawInstance.value.on("change", (ids: string[]) => {
      if (options.onChange && ids.length > 0) {
        const snapshot = drawInstance.value.getSnapshot();
        const features = ids
          .map((id: string) => snapshot.find((f: any) => f.id === id))
          .filter(Boolean);
        options.onChange(ids, features);
      }
    });

    // Start drawing
    drawInstance.value.start();
    if (options.mode) {
      drawInstance.value.setMode(options.mode);
    }
  };

  const clear = () => {
    drawInstance.value?.clear();
  };

  const setMode = (mode: DrawMode) => {
    if (mode && drawInstance.value) {
      drawInstance.value.setMode(mode);
    }
  };

  const destroy = () => {
    if (drawInstance.value) {
      drawInstance.value.off("finish");
      drawInstance.value.off("change");
      drawInstance.value.setMode("static");
      drawInstance.value.clear();
      drawInstance.value.stop();
    }
  };

  const getSnapshot = () => {
    return drawInstance.value?.getSnapshot() || [];
  };

  return {
    drawInstance,
    initialize,
    clear,
    setMode,
    destroy,
    getSnapshot,
  };
};
