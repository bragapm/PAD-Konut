<script setup lang="ts">
import IcArrowFat from "~/assets/icons/ic-arrow-fat.svg";
import IcChart from "~/assets/icons/ic-chart.svg";
import IcDifference from "~/assets/icons/ic-difference.svg";
import IcDrawFree from "~/assets/icons/ic-draw-free.svg";
import IcDrawSquare from "~/assets/icons/ic-draw-square.svg";
import IcIntersect from "~/assets/icons/ic-intersect.svg";
import IcMapFlat from "~/assets/icons/ic-map-flat.svg";
import IcMapLayerB from "~/assets/icons/ic-map-layer-b.svg";
import IcRoute from "~/assets/icons/ic-route.svg";
import IcRuler from "~/assets/icons/ic-ruler.svg";
import IcRulerCorner from "~/assets/icons/ic-ruler-corner.svg";
import IcSearch from "~/assets/icons/ic-search.svg";
import IcTools from "~/assets/icons/ic-tools.svg";
import { storeToRefs } from "pinia";
import type { GeoJSONSource } from "maplibre-gl";

const store = useTableData();
const { showTable } = storeToRefs(store);

const mapRefStore = useMapRef();
const { map } = storeToRefs(mapRefStore);

const toolsStore = useMapTools();
const { showTools, showSatelliteTools, showCard, activeTools, expandTools } =
  storeToRefs(toolsStore);
const { handleCloseToolsCard, toggleExpandTools } = toolsStore;

const removeAllAnimation = () => {
  if (map.value?.getSource("highlight")) {
    (map.value?.getSource("highlight") as GeoJSONSource).setData(
      emptyFeatureCollection
    );
  }
  pauseAllAnimation();
};
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="-translate-y-6 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-6 opacity-0"
  >
    <div
      v-if="!showTable && showTools"
      class="z-10 absolute bottom-8 left-1/2 -translate-x-1/2 rounded-lg flex gap-2 bg-grey-900 ring-1 ring-grey-700 p-2"
    >
      <MapToolsDropdown
        :triggerLabel="'Analytic Tools'"
        :triggerIcon="IcChart"
        :itemLabel="'Analytic Tools'"
        :itemDescription="'Geospatial Analytic Tools to draw Insights from the Map.'"
        :items="[
          {
            id: 'advanced_insight',
            label: 'Advanced Insight',
            icon: IcTools,
          },
          {
            id: 'isochrone',
            label: 'Isochrone',
            icon: IcDrawFree,
          },
          {
            id: 'buffer_area',
            label: 'Buffer Area',
            icon: IcDrawSquare,
          },
          {
            id: 'route_finder',
            label: 'Route Finder',
            icon: IcRoute,
          },
        ]"
      ></MapToolsDropdown>
      <MapToolsDropdown
        :triggerLabel="'Advanced Search'"
        :triggerIcon="IcSearch"
        :items="[
          {
            id: 'find_coordinate',
            label: 'Find Coordinate',
            icon: IcDrawFree,
          },
          {
            id: 'administrative_area',
            label: 'Administration Area',
            icon: IcDrawSquare,
          },
          {
            id: 'building_number',
            label: 'Building Number',
            icon: IcRoute,
          },
        ]"
      ></MapToolsDropdown>
      <MapToolsDropdown
        :triggerLabel="'Geoprocessing'"
        :triggerIcon="IcMapLayerB"
        :items="[
          {
            id: 'clip',
            label: 'Clip Tool',
            icon: IcDifference,
          },
          {
            id: 'difference',
            label: 'Difference Tool',
            icon: IcIntersect,
          },
          {
            id: 'dissolve',
            label: 'Dissolve Tool',
            icon: IcDifference,
          },
          {
            id: 'intersect',
            label: 'Intersect Tool',
            icon: IcIntersect,
          },
          {
            id: 'merge',
            label: 'Merge Tool',
            icon: IcDifference,
          },
          {
            id: 'spatial-join',
            label: 'Spatial Join Tool',
            icon: IcIntersect,
          },
          {
            id: 'union',
            label: 'Union Tool',
            icon: IcDifference,
          },
        ]"
      ></MapToolsDropdown>
      <div class="border-l border-grey-700 h-8"></div>
      <MapToolsDropdown
        :triggerIcon="IcRuler"
        :itemLabel="'Measurement'"
        :itemDescription="'Draw on Map and add to layer'"
        :items="[
          {
            id: 'length',
            label: 'Length',
            labelCard: 'Length Measurement Tool',
            icon: IcRuler,
            action: (item) => {
              removeAllAnimation();
            },
          },
          {
            id: 'area',
            label: 'Area',
            labelCard: 'Area Measurement Tool',
            icon: IcRulerCorner,
            action: (item) => {
              removeAllAnimation();
            },
          },
        ]"
      ></MapToolsDropdown>
      <MapToolsDropdown
        :triggerIcon="IcMapFlat"
        :itemLabel="'Basemap'"
        :itemDescription="'Change basemap'"
      >
        <template #custom-item>
          <MapToolsBasemap />
        </template>
      </MapToolsDropdown>
      <div class="border-l border-grey-700 h-8"></div>
      <button
        @click="toggleExpandTools"
        :class="expandTools ? '' : 'rotate-180'"
        class="transition-all duration-500 ease-in-out"
      >
        <IcArrowFat class="w-4 h-4 text-grey-400" :fontControlled="false" />
      </button>
    </div>
  </Transition>
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="-translate-y-6 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-6 opacity-0"
  >
    <div
      v-if="!showTable && showSatelliteTools"
      class="z-10 absolute bottom-8 left-1/2 -translate-x-1/2 rounded-lg flex gap-2 bg-grey-900 ring-1 ring-grey-700 p-2"
    >
      <MapToolsSatellite /></div
  ></Transition>
  <MapToolsCard
    :active="showCard"
    :onClose="handleCloseToolsCard"
    :label="activeTools?.labelCard || activeTools?.label"
    :icon="activeTools?.icon"
  >
    <MapToolsLength v-if="activeTools?.id === 'length'" />
    <MapToolsArea v-else-if="activeTools?.id === 'area'" />
    <MapToolsFindCoordinate v-else-if="activeTools?.id === 'find_coordinate'" />
    <MapToolsBuffer v-else-if="activeTools?.id === 'buffer_area'" />
    <MapToolsRouteFinder v-else-if="activeTools?.id === 'route_finder'" />
    <MapToolsIntersect
      v-else-if="activeTools?.id === 'intersect'"
      @on-close="handleCloseToolsCard"
    />
    <MapToolsDifference
      v-else-if="activeTools?.id === 'difference'"
      @on-close="handleCloseToolsCard"
    />
    <MapToolsClip
      v-else-if="activeTools?.id === 'clip'"
      @on-close="handleCloseToolsCard"
    />
    <MapToolsDissolve
      v-else-if="activeTools?.id === 'dissolve'"
      @on-close="handleCloseToolsCard"
    />
    <MapToolsMerge
      v-else-if="activeTools?.id === 'merge'"
      @on-close="handleCloseToolsCard"
    />
    <MapToolsSpatialJoin
      v-else-if="activeTools?.id === 'spatial-join'"
      @on-close="handleCloseToolsCard"
    />
    <MapToolsUnion
      v-else-if="activeTools?.id === 'union'"
      @on-close="handleCloseToolsCard"
    />
  </MapToolsCard>
</template>
