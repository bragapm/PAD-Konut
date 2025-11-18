<script setup lang="ts">
import { TransitionRoot } from "@headlessui/vue";
import IcBasemap from "~/assets/icons/ic-basemap.svg";
import IcInfo from "~/assets/icons/ic-info.svg";
import IcChart from "~/assets/icons/ic-chart.svg";
import IcRectangleList from "~/assets/icons/ic-rectangle-list.svg";
import IcMapLayerB from "~/assets/icons/ic-map-layer-b.svg";
import IcLocation from "~/assets/icons/ic-location.svg";
import IcMapExtent from "~/assets/icons/ic-map-instance.svg";
import IcMapLayer from "~/assets/icons/ic-map-layer.svg";
import IcZoomIn from "~/assets/icons/ic-plus.svg";
import IcZoomOut from "~/assets/icons/ic-min.svg";
import IcPrint from "~/assets/icons/ic-print.svg";
import { useMapData } from "~/utils";
import { storeToRefs } from "pinia";
import bbox from "@turf/bbox";
import type { LngLatBoundsLike } from "maplibre-gl";
import type { AllGeoJSON } from "@turf/helpers";

const isShowLayerManagement = ref(false);
const isShowLegend = ref(false);
const featureStore = useFeature();

const { data: mapData } = await useMapData();
const store = useMapRef();
const { map, geolocateRef } = storeToRefs(store);

const storeTableData = useTableData();
const { showTable, fullscreen } = storeToRefs(storeTableData);

const storeCatalogue = useCatalogue();
const { showCatalogue } = storeToRefs(storeCatalogue);

const currentZoom = ref(map.value?.getZoom().toPrecision(3));

const updateZoomValue = () => {
  currentZoom.value = map.value?.getZoom().toPrecision(3);
};

watchEffect((onCleanup) => {
  map.value?.on("load", () => updateZoomValue());
  map.value?.on("moveend", () => updateZoomValue());

  onCleanup(() => {
    map.value?.off("load", () => updateZoomValue());
    map.value?.off("moveend", () => updateZoomValue());
  });
});

const handlePrint = () => {
  if (!window.print) {
    console.log("browser not supported");
  } else {
    window.print();
  }
};
</script>

<template>
  <div
    :class="[
      (showCatalogue || (showTable && fullscreen)) && 'z-50',
      'fixed top-0 left-0 w-screen h-screen flex flex-col items-start',
    ]"
  >
    <Map></Map>

    <!-- left sidebar -->
    <TransitionRoot
      as="div"
      :show="isShowLayerManagement"
      enter="transform transition-all duration-300"
      enter-from="-ml-8 opacity-0"
      enter-to="ml-0 opacity-1"
      leave="transform transition-all duration-300"
      leave-from="ml-0 opacity-1"
      leave-to="-ml-8 opacity-0"
      class="z-10 absolute top-[5.5rem] bg-grey-900 w-[18.5rem] rounded-xs left-6 h-full max-h-[calc(100%-12rem)] overflow-hidden flex flex-col"
    >
      <MapManagement />
    </TransitionRoot>
    <TransitionRoot
      as="div"
      :show="isShowLegend"
      enter="transition-all duration-300"
      enter-from="-ml-8 opacity-0"
      enter-to="ml-0 opacity-1"
      leave="transition-all duration-300"
      leave-from="ml-0 opacity-1"
      leave-to="-ml-8 opacity-0"
      :class="isShowLayerManagement ? 'left-[20.5rem]' : 'left-[1.5rem]'"
      class="z-10 absolute top-[5.5rem] bg-grey-900 h-fit max-h-[calc(100%-12rem)] w-[15.5rem] rounded-xs transition-all ease-in-out duration-300 overflow-hidden flex flex-col"
    >
      <MapLegend />
    </TransitionRoot>
    <TransitionRoot
      as="div"
      :show="showTable"
      enter="transition-all duration-1000"
      enter-from="-ml-8 opacity-0"
      enter-to="ml-0 opacity-1"
      leave="transition-all duration-1000"
      leave-from="ml-0 opacity-1"
      leave-to="-ml-8 opacity-0"
      :class="[
        !fullscreen
          ? 'w-[calc(50vw-3rem)] h-[calc(100vh-7.5rem)] top-[5.5rem]'
          : 'w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] top-[1.5rem]',
        'absolute z-20 left-[1.5rem] bg-grey-900 rounded-xs transition-all ease-in-out duration-300',
      ]"
    >
      <MapManagementTable />
    </TransitionRoot>
    <TransitionRoot
      as="div"
      :show="showCatalogue"
      enter="transition-all duration-1000"
      enter-from="-ml-8 opacity-0"
      enter-to="ml-0 opacity-1"
      leave="transition-all duration-1000"
      leave-from="ml-0 opacity-1"
      leave-to="-ml-8 opacity-0"
      class="w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] top-[1.5rem] absolute z-[9999999] left-[1.5rem] bg-grey-900 rounded-xs transition-all ease-in-out duration-300"
    >
      <MapManagementCatalogue />
    </TransitionRoot>

    <!-- top left button controller -->
    <div
      :class="
        showTable
          ? 'left-[calc(50vw-0.75rem)]'
          : isShowLayerManagement && isShowLegend
          ? 'left-[36.5rem]'
          : isShowLayerManagement
          ? 'left-[20.5rem]'
          : isShowLegend
          ? 'left-[17.5rem]'
          : 'left-[1.5rem]'
      "
      class="z-10 absolute flex flex-col gap-2 shrink top-[5.5rem] left-6 transition-all ease-in-out duration-300"
    >
      <MapButtonControl
        :onClick="() => (isShowLayerManagement = !isShowLayerManagement)"
        :active="isShowLayerManagement"
      >
        <IcMapLayer class="w-5 h-5" :fontControlled="false" />
      </MapButtonControl>
      <MapButtonControl
        :onClick="() => (isShowLegend = !isShowLegend)"
        :active="isShowLegend"
      >
        <IcBasemap class="w-5 h-5" :fontControlled="false" />
      </MapButtonControl>
    </div>

    <!-- right sidebar -->
    <TransitionRoot
      as="div"
      :show="featureStore.mapInfo === 'info'"
      enter="transition-all duration-300"
      enter-from="-mr-8 opacity-0"
      enter-to="mr-0 opacity-1"
      leave="transition-all duration-300"
      leave-from="mr-0 opacity-1"
      leave-to="-mr-8 opacity-0"
      class="z-10 absolute top-[5.5rem] right-6 bg-grey-900 w-[18.5rem] rounded-xs max-h-[calc(100%-12rem)] overflow-hidden flex flex-col"
    >
      <MapInformation />
    </TransitionRoot>
    <TransitionRoot
      as="div"
      :show="featureStore.mapInfo === 'analytic'"
      enter="transition-all duration-300"
      enter-from="-mr-8 opacity-0"
      enter-to="mr-0 opacity-1"
      leave="transition-all duration-300"
      leave-from="mr-0 opacity-1"
      leave-to="-mr-8 opacity-0"
      class="z-10 absolute top-[5.5rem] right-6 bg-grey-900 w-[18.5rem] rounded-xs h-[calc(100%-12rem)] overflow-hidden flex flex-col"
    >
      <MapAnalysis />
    </TransitionRoot>
    <TransitionRoot
      as="div"
      :show="featureStore.rightSidebar === 'feature'"
      enter="transition-all duration-300"
      enter-from="-mr-8 opacity-0"
      enter-to="mr-0 opacity-1"
      leave="transition-all duration-300"
      leave-from="mr-0 opacity-1"
      leave-to="-mr-8 opacity-0"
      :class="
        featureStore.mapInfo === 'info' || featureStore.mapInfo === 'analytic'
          ? 'right-[20.5rem]'
          : 'right-[1.5rem]'
      "
      class="z-10 absolute top-[5.5rem] right-6 bg-grey-900 w-[18.5rem] rounded-xs h-[calc(100%-12rem)] overflow-hidden flex flex-col transition-all ease-in-out duration-300"
    >
      <MapFeatureDetail />
    </TransitionRoot>
    <TransitionRoot
      as="div"
      :show="featureStore.rightSidebar === '3d-feature'"
      enter="transition-all duration-300"
      enter-from="-mr-8 opacity-0"
      enter-to="mr-0 opacity-1"
      leave="transition-all duration-300"
      leave-from="mr-0 opacity-1"
      leave-to="-mr-8 opacity-0"
      :class="
        featureStore.mapInfo === 'info' || featureStore.mapInfo === 'analytic'
          ? 'right-[20.5rem]'
          : 'right-[1.5rem]'
      "
      class="z-10 absolute top-[5.5rem] right-6 bg-grey-900 w-[18.5rem] rounded-xs h-[calc(100%-12rem)] overflow-hidden flex flex-col"
    >
      <Map3DFeatureDetail />
    </TransitionRoot>
    <TransitionRoot
      as="div"
      :show="featureStore.rightSidebar === 'geoprocessing'"
      enter="transition-all duration-300"
      enter-from="-mr-8 opacity-0"
      enter-to="mr-0 opacity-1"
      leave="transition-all duration-300"
      leave-from="mr-0 opacity-1"
      leave-to="-mr-8 opacity-0"
      :class="
        featureStore.mapInfo === 'info' || featureStore.mapInfo === 'analytic'
          ? 'right-[20.5rem]'
          : 'right-[1.5rem]'
      "
      class="z-10 absolute top-[5.5rem] right-6 bg-grey-900 w-[18.5rem] rounded-xs h-[calc(100%-12rem)] overflow-hidden flex flex-col transition-all ease-in-out duration-300"
    >
      <MapGeoprocessing />
    </TransitionRoot>

    <!-- top right button controller -->
    <div
      :class="
        ['info', 'analytic'].includes(featureStore.mapInfo) &&
        ['feature', '3d-feature', 'geoprocessing'].includes(
          featureStore.rightSidebar
        )
          ? 'right-[39.5rem]'
          : ['info', 'analytic'].includes(featureStore.mapInfo)
          ? 'right-[20.5rem]'
          : ['feature', '3d-feature', 'geoprocessing'].includes(
              featureStore.rightSidebar
            )
          ? 'right-[20.5rem]'
          : 'right-[1.5rem]'
      "
      class="z-10 absolute flex flex-col gap-2 shrink top-[5.5rem] right-6 transition-all ease-in-out duration-300"
    >
      <MapButtonControl
        :onClick="
          () => {
            featureStore.setMapInfo(
              featureStore.mapInfo === 'info' ? '' : 'info'
            );
          }
        "
        :active="featureStore.mapInfo === 'info'"
      >
        <IcInfo class="w-5 h-5" :fontControlled="false" />
      </MapButtonControl>
      <MapButtonControl
        :onClick="
          () => {
            featureStore.setMapInfo(
              featureStore.mapInfo === 'analytic' ? '' : 'analytic'
            );
          }
        "
        :active="featureStore.mapInfo === 'analytic'"
      >
        <IcChart class="w-5 h-5" :fontControlled="false" />
      </MapButtonControl>
      <MapButtonControl
        :onClick="
          () => {
            featureStore.setRightSidebar(
              featureStore.rightSidebar === 'feature' ||
                featureStore.rightSidebar === '3d-feature'
                ? ''
                : 'feature'
            );
          }
        "
        :active="
          featureStore.rightSidebar === 'feature' ||
          featureStore.rightSidebar === '3d-feature'
        "
      >
        <IcRectangleList class="w-5 h-5" :fontControlled="false" />
      </MapButtonControl>
      <MapButtonControl
        :onClick="
          () => {
            featureStore.setRightSidebar(
              featureStore.rightSidebar === 'geoprocessing'
                ? ''
                : 'geoprocessing'
            );
          }
        "
        :active="featureStore.rightSidebar === 'geoprocessing'"
      >
        <IcMapLayerB class="w-5 h-5" :fontControlled="false" />
      </MapButtonControl>
      <MapButtonControl :onClick="handlePrint" :active="false">
        <IcPrint class="w-5 h-5" :fontControlled="false" />
      </MapButtonControl>
    </div>

    <!-- bottom left map -->
    <MapCoordinatesPanel />

    <!-- bottom toolbox -->
    <MapTools />

    <!-- bottom left map controller -->
    <div
      :class="showTable ? 'left-[calc(50vw-0.75rem)]' : 'left-6'"
      class="z-10 absolute bottom-8 left-6 transition-all ease-in-out duration-300"
    >
      <MapCompass />
    </div>

    <!-- bottom right map controller -->
    <div class="z-10 absolute bottom-8 right-6">
      <div class="flex gap-2 bg-black/30 rounded-xs p-2">
        <button
          @click="
            () => {
              map && map.fitBounds(mapData?.data?.initial_map_view?
              bbox( mapData?.data?.initial_map_view  ) as LngLatBoundsLike:[
                  [95.01, -11.01],
                  [141.02, 6.08],
                ]);
            }
          "
          class="bg-transparent hover:bg-black p-2 rounded-xs"
        >
          <IcMapExtent class="w-5 h-5 text-white" :fontControlled="false" />
        </button>
        <button
          @click="() => map && geolocateRef && geolocateRef.trigger()"
          class="bg-transparent hover:bg-black p-2 rounded-xs"
        >
          <IcLocation class="w-5 h-5 text-white" :fontControlled="false" />
        </button>
        <button
          @click="() => map && map.zoomOut()"
          class="bg-transparent hover:bg-black p-2 rounded-xs"
        >
          <IcZoomOut class="w-5 h-5 text-white" :fontControlled="false" />
        </button>
        <input
          :value="currentZoom"
          disabled
          type="text"
          class="text-xs text-center w-14 p-2 text-grey-200 rounded-xxs bg-black/5 border border-grey-600 focus:outline-none"
        />
        <button
          @click="() => map && map.zoomIn()"
          class="bg-transparent hover:bg-black p-2 rounded-xs"
        >
          <IcZoomIn class="w-5 h-5 text-white" :fontControlled="false" />
        </button>
      </div>
    </div>
  </div>
</template>
