import { defineStore } from "pinia";

type SatelliteDataListItem = any;

export const useSatellite = defineStore("satellite", () => {
  const satelliteDataList = ref<SatelliteDataListItem[] | null>(null);
  const setSatelliteDataList = (list: SatelliteDataListItem[]) => {
    satelliteDataList.value = list;
  };

  return { satelliteDataList, setSatelliteDataList };
});
