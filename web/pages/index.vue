<script setup lang="ts">
import IcBasemap from "~/assets/icons/ic-basemap.svg";
import IcInfo from "~/assets/icons/ic-info.svg";
import IcChart from "~/assets/icons/ic-chart.svg";
import IcRectangleList from "~/assets/icons/ic-rectangle-list.svg";
import IcMapLayerB from "~/assets/icons/ic-map-layer-b.svg";
import IcLocation from "~/assets/icons/ic-location.svg";
import IcMapExtent from "~/assets/icons/ic-map-instance.svg";
import IcMapLayer from "~/assets/icons/ic-map-layer.svg";
import IcSatellite from "~/assets/icons/ic-satellite.svg";
import IcTable from "~/assets/icons/ic-table.svg";
import IcZoomIn from "~/assets/icons/ic-plus.svg";
import IcZoomOut from "~/assets/icons/ic-min.svg";
import { useMapData } from "~/utils";
import { storeToRefs } from "pinia";
import bbox from "@turf/bbox";
import type { LngLatBoundsLike } from "maplibre-gl";

// Transition configurations
const TRANSITION_SLIDE_LEFT = {
  enterActiveClass: "transition-all duration-300",
  enterFromClass: "-translate-x-8 opacity-0",
  enterToClass: "translate-x-0 opacity-100",
  leaveActiveClass: "transition-all duration-300",
  leaveFromClass: "translate-x-0 opacity-100",
  leaveToClass: "-translate-x-8 opacity-0",
};

const TRANSITION_SLIDE_RIGHT = {
  enterActiveClass: "transition-all duration-300",
  enterFromClass: "translate-x-8 opacity-0",
  enterToClass: "translate-x-0 opacity-100",
  leaveActiveClass: "transition-all duration-300",
  leaveFromClass: "translate-x-0 opacity-100",
  leaveToClass: "translate-x-8 opacity-0",
};

// Stores
const featureStore = useFeature();
const { data: mapData } = await useMapData();
const store = useMapRef();
const { map, geolocateRef } = storeToRefs(store);

const storeTableData = useTableData();
const { showTable, fullscreen, activeTable, activeTableList } =
  storeToRefs(storeTableData);
const { toggleTable } = storeTableData;

const storeCatalogue = useCatalogue();
const { showCatalogue } = storeToRefs(storeCatalogue);

// Local state
const leftDrawerA = ref<"" | "layer-management" | "satellite">("");
const leftDrawerB = ref<"" | "legend" | "satellite-settings">("");
const currentZoom = ref(map.value?.getZoom().toPrecision(3));
const satelliteSettingsId = ref<null | number>(null);

// Update zoom value
const updateZoomValue = () => {
  currentZoom.value = map.value?.getZoom().toPrecision(3);
};

watchEffect((onCleanup) => {
  map.value?.on("load", updateZoomValue);
  map.value?.on("moveend", updateZoomValue);

  onCleanup(() => {
    map.value?.off("load", updateZoomValue);
    map.value?.off("moveend", updateZoomValue);
  });
});

// Computed properties for dynamic positioning
const legendDrawerPosition = computed(() =>
  leftDrawerA.value ? "left-[20.5rem]" : "left-[1.5rem]"
);
const satelliteSettingsDrawerPosition = computed(() =>
  leftDrawerA.value ? "left-[20rem]" : "left-[1.5rem]"
);

const featureDetailRightPosition = computed(() =>
  featureStore.mapInfo === "info" || featureStore.mapInfo === "analytic"
    ? "right-[20.5rem]"
    : "right-[1.5rem]"
);

const leftControlsPosition = computed(() => {
  if (showTable.value) return "left-[calc(50vw-0.75rem)]";
  if (leftDrawerA.value && leftDrawerB.value) return "left-[36.5rem]";
  if (leftDrawerA.value) return "left-[20.5rem]";
  if (leftDrawerB.value) return "left-[17.5rem]";
  return "left-[1.5rem]";
});

const rightControlsPosition = computed(() => {
  const hasLeftSidebar = ["info", "analytic"].includes(featureStore.mapInfo);
  const hasRightSidebar = ["feature", "3d-feature", "geoprocessing"].includes(
    featureStore.rightSidebar
  );

  if (hasLeftSidebar && hasRightSidebar) return "right-[39.5rem]";
  if (hasLeftSidebar || hasRightSidebar) return "right-[20.5rem]";
  return "right-[1.5rem]";
});

const showTableContent = computed(
  () =>
    showTable.value &&
    activeTable.value !== null &&
    activeTableList.value.length > 0
);

// Helper methods
const toggleMapInfo = (type: mapInfoEnum) => {
  featureStore.setMapInfo(featureStore.mapInfo === type ? "" : type);
};

const toggleRightSidebar = (
  type: rightSidebarEnum,
  altTypes: string[] = []
) => {
  const isActive = [type, ...altTypes].includes(featureStore.rightSidebar);
  featureStore.setRightSidebar(isActive ? "" : type);
};

const resetMapView = () => {
  if (!map.value) return;
  const bounds = mapData.value?.data?.initial_map_view
    ? (bbox(mapData.value.data.initial_map_view) as LngLatBoundsLike)
    : ([
        [95.01, -11.01],
        [141.02, 6.08],
      ] as LngLatBoundsLike);
  map.value.fitBounds(bounds);
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
    <Transition v-bind="TRANSITION_SLIDE_LEFT">
      <div
        v-if="leftDrawerA === 'layer-management'"
        class="z-10 absolute top-[5.5rem] left-6 bg-grey-900 w-[18.5rem] rounded-lg h-[100vh] max-h-[calc(100%-12rem)] overflow-hidden flex flex-col"
      >
        <MapManagement />
      </div>
    </Transition>

    <Transition v-bind="TRANSITION_SLIDE_LEFT">
      <div
        v-if="leftDrawerA === 'satellite'"
        class="z-10 absolute top-[5.5rem] left-6 bg-grey-900 w-[18.5rem] rounded-lg h-[100vh] max-h-[calc(100%-12rem)] overflow-hidden flex flex-col"
      >
        <MapSatellite
          :on-close="() => (leftDrawerA = '')"
          :satellite-settings-id="satelliteSettingsId"
        />
      </div>
    </Transition>

    <Transition v-bind="TRANSITION_SLIDE_LEFT">
      <div
        v-if="leftDrawerB === 'legend'"
        :class="[
          legendDrawerPosition,
          'z-10 absolute top-[5.5rem] bg-grey-900 h-fit max-h-[calc(100%-12rem)] w-[15.5rem] rounded-lg overflow-hidden flex flex-col transition-[left] ease-in-out duration-300',
        ]"
      >
        <MapLegendContainer />
      </div>
    </Transition>

    <!-- <Transition v-bind="TRANSITION_SLIDE_LEFT">
      <div
        v-if="leftDrawerB === 'satellite-settings'"
        :class="[
          satelliteSettingsDrawerPosition,
          'z-10 absolute top-[5.5rem] bg-grey-900 h-fit max-h-[calc(100%-12rem)] w-[16.25rem] rounded-lg overflow-hidden flex flex-col transition-[left] ease-in-out duration-300',
        ]"
      >
        <MapSatelliteSettings
          :on-close="
            () => {
              leftDrawerB = '';
              satelliteSettingsId = null;
            }
          "
          :satellite-settings-id="satelliteSettingsId"
        />
      </div>
    </Transition> -->

    <Transition v-bind="TRANSITION_SLIDE_LEFT">
      <div
        v-if="showTableContent"
        :class="[
          !fullscreen
            ? 'w-[calc(50vw-3rem)] h-[calc(100vh-7.5rem)] top-[5.5rem]'
            : 'w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] top-[1.5rem]',
          'absolute z-20 left-[1.5rem] bg-grey-900 rounded-lg',
        ]"
      >
        <template v-for="item in activeTableList" :key="item.key">
          <MapManagementTable
            v-if="item.source === 'vector_tiles'"
            :activeCollection="item.key"
            :layerId="item.layer_id"
          />
          <MapManagementTableExternal
            v-else-if="item.source === 'external_vector'"
            :selectedLayerId="item.key"
            :layerId="item.layer_id"
          />
        </template>
      </div>
    </Transition>

    <Transition v-bind="TRANSITION_SLIDE_LEFT">
      <div
        v-if="showCatalogue"
        class="w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] top-[1.5rem] absolute z-[9999999] left-[1.5rem] bg-grey-900 rounded-lg"
      >
        <MapManagementCatalogue />
      </div>
    </Transition>

    <!-- top left button controller -->
    <div
      :class="leftControlsPosition"
      class="z-10 absolute flex flex-col gap-2 shrink top-[5.5rem] left-6 transition-all ease-in-out duration-300"
    >
      <CoreTooltip text="Layer Management">
        <MapButtonControl
          @click="
            () =>
              (leftDrawerA =
                leftDrawerA === 'layer-management' ? '' : 'layer-management')
          "
          :active="leftDrawerA === 'layer-management'"
        >
          <IcMapLayer class="w-5 h-5" :fontControlled="false" />
        </MapButtonControl>
      </CoreTooltip>
      <CoreTooltip text="Legend">
        <MapButtonControl
          @click="
            () => (leftDrawerB = leftDrawerB === 'legend' ? '' : 'legend')
          "
          :active="leftDrawerB === 'legend'"
        >
          <IcBasemap class="w-5 h-5" :fontControlled="false" />
        </MapButtonControl>
      </CoreTooltip>
      <!--
      <CoreTooltip text="Satellite Data">
        <MapButtonControl
          @click="
            () => (leftDrawerA = leftDrawerA === 'satellite' ? '' : 'satellite')
          "
          :active="leftDrawerA === 'satellite'"
        >
          <IcSatellite class="w-5 h-5" :fontControlled="false" />
        </MapButtonControl>
      </CoreTooltip>
      -->

      <CoreTooltip v-if="activeTable" text="Data Table">
        <MapButtonControl @click="toggleTable" :active="showTable">
          <IcTable class="w-5 h-5" :fontControlled="false" />
        </MapButtonControl>
      </CoreTooltip>
    </div>

    <!-- right sidebar -->
    <Transition v-bind="TRANSITION_SLIDE_RIGHT">
      <div
        v-if="featureStore.mapInfo === 'info'"
        class="z-10 absolute top-[5.5rem] right-6 bg-grey-900 w-[18.5rem] rounded-lg max-h-[calc(100%-12rem)] overflow-hidden flex flex-col"
      >
        <MapInformation />
      </div>
    </Transition>

    <Transition v-bind="TRANSITION_SLIDE_RIGHT">
      <div
        v-if="featureStore.mapInfo === 'analytic'"
        class="z-10 absolute top-[5.5rem] right-6 bg-grey-900 w-[18.5rem] rounded-lg h-[calc(100%-12rem)] overflow-hidden flex flex-col"
      >
        <MapAnalysis />
      </div>
    </Transition>

    <Transition v-bind="TRANSITION_SLIDE_RIGHT">
      <div
        v-if="featureStore.rightSidebar === 'feature'"
        :class="[
          featureDetailRightPosition,
          'z-10 absolute top-[5.5rem] bg-grey-900 w-[18.5rem] rounded-lg h-[calc(100%-12rem)] overflow-hidden flex flex-col transition-[right] ease-in-out duration-300',
        ]"
      >
        <MapFeatureDetail />
      </div>
    </Transition>

    <Transition v-bind="TRANSITION_SLIDE_RIGHT">
      <div
        v-if="featureStore.rightSidebar === '3d-feature'"
        :class="[
          featureDetailRightPosition,
          'z-10 absolute top-[5.5rem] bg-grey-900 w-[18.5rem] rounded-lg h-[calc(100%-12rem)] overflow-hidden flex flex-col transition-[right] ease-in-out duration-300',
        ]"
      >
        <Map3DFeatureDetail />
      </div>
    </Transition>

    <Transition v-bind="TRANSITION_SLIDE_RIGHT">
      <div
        v-if="featureStore.rightSidebar === 'geoprocessing'"
        :class="[
          featureDetailRightPosition,
          'z-10 absolute top-[5.5rem] bg-grey-900 w-[18.5rem] rounded-lg h-[calc(100%-12rem)] overflow-hidden flex flex-col transition-[right] ease-in-out duration-300',
        ]"
      >
        <MapGeoprocessing />
      </div>
    </Transition>

    <!-- top right button controller -->
    <div
      :class="rightControlsPosition"
      class="z-10 absolute flex flex-col gap-2 shrink top-[5.5rem] right-6 transition-all ease-in-out duration-300"
    >
      <CoreTooltip text="Map Information" placement="left">
        <MapButtonControl
          @click="() => toggleMapInfo('info')"
          :active="featureStore.mapInfo === 'info'"
        >
          <IcInfo class="w-5 h-5" :fontControlled="false" />
        </MapButtonControl>
      </CoreTooltip>
      <CorePopover title="Analysis Result" placement="left">
        <MapButtonControl
          @click="() => toggleMapInfo('analytic')"
          :active="featureStore.mapInfo === 'analytic'"
        >
          <IcChart class="w-5 h-5" :fontControlled="false" />
        </MapButtonControl>
        <template #panel>
          <p class="text-grey-400">
            Interact with and view the results from Analytics Tools from this
            panel
          </p>
        </template>
      </CorePopover>
      <CorePopover title="Feature Detail" placement="left">
        <MapButtonControl
          @click="() => toggleRightSidebar('feature', ['3d-feature'])"
          :active="
            featureStore.rightSidebar === 'feature' ||
            featureStore.rightSidebar === '3d-feature'
          "
        >
          <IcRectangleList class="w-5 h-5" :fontControlled="false" />
        </MapButtonControl>
        <template #panel>
          <p class="text-grey-400">
            Details of your currently selected data layers is presented in this
            panel
          </p>
        </template>
      </CorePopover>
      <CoreTooltip text="Geoprocessing Queue" placement="left">
        <MapButtonControl
          @click="() => toggleRightSidebar('geoprocessing')"
          :active="featureStore.rightSidebar === 'geoprocessing'"
        >
          <IcMapLayerB class="w-5 h-5" :fontControlled="false" />
        </MapButtonControl>
      </CoreTooltip>
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
      <div class="flex gap-2 bg-black/30 rounded-lg p-2 h-[3.25rem]">
        <CorePopover title="Reset Instance title" placement="top">
          <button
            @click="resetMapView"
            class="bg-transparent hover:bg-black p-2 rounded-lg"
          >
            <IcMapExtent class="w-5 h-5 text-white" :fontControlled="false" />
          </button>
          <template #panel>
            <p class="text-grey-400">
              Fly and Zoom into the initial view of the map.
            </p>
          </template>
        </CorePopover>
        <CorePopover title="Device Location" placement="top">
          <button
            @click="() => map && geolocateRef && geolocateRef.trigger()"
            class="bg-transparent hover:bg-black p-2 rounded-lg"
          >
            <IcLocation class="w-5 h-5 text-white" :fontControlled="false" />
          </button>
          <template #panel>
            <p class="text-grey-400">
              Fly and Zoom into the initial view of the map.
            </p>
          </template>
        </CorePopover>
        <CoreTooltip text="Zoom Out" placement="top">
          <button
            @click="() => map && map.zoomOut()"
            class="bg-transparent hover:bg-black p-2 rounded-lg"
          >
            <IcZoomOut class="w-5 h-5 text-white" :fontControlled="false" />
          </button>
        </CoreTooltip>
        <CoreTooltip text="Zoom Level" placement="top">
          <input
            :value="currentZoom"
            disabled
            type="text"
            class="text-xs text-center w-14 p-2 text-grey-200 rounded-sm bg-black/5 border border-grey-600 focus:outline-none"
          />
        </CoreTooltip>
        <CoreTooltip text="Zoom In" placement="top">
          <button
            @click="() => map && map.zoomIn()"
            class="bg-transparent hover:bg-black p-2 rounded-lg"
          >
            <IcZoomIn class="w-5 h-5 text-white" :fontControlled="false" />
          </button>
        </CoreTooltip>
      </div>
    </div>
  </div>
</template>
