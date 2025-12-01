import { defineStore } from "pinia";
import type { PopupItem } from "@/components/map/Popup.vue";

export type rightSidebarEnum =
  | "mapinfo"
  | "feature"
  | "3d-feature"
  | "geoprocessing"
  | "";
export type mapInfoEnum = "info" | "analytic" | "";

export const useFeature = defineStore("feature", () => {
  const feature = ref<PopupItem>();
  function setFeature(newFeature: PopupItem | undefined) {
    feature.value = newFeature;
  }
  const threeDfeature = ref<{ header: Object; content: Object }>();
  function set3DFeature(
    newFeature: { header: Object; content: Object } | undefined
  ) {
    threeDfeature.value = newFeature;
  }
  const mapInfo = ref<mapInfoEnum>("");
  function setMapInfo(newValue: mapInfoEnum) {
    mapInfo.value = newValue;
  }
  const rightSidebar = ref<rightSidebarEnum>("");
  function setRightSidebar(newValue: rightSidebarEnum) {
    rightSidebar.value = newValue;
  }

  const selectedKecamatan = ref();
  function setSelectedKecamatan(newValue: any) {
    selectedKecamatan.value = newValue;
  }
  return {
    feature,
    setFeature,
    threeDfeature,
    set3DFeature,
    rightSidebar,
    setRightSidebar,
    mapInfo,
    setMapInfo,
    selectedKecamatan,
    setSelectedKecamatan
  };
});
