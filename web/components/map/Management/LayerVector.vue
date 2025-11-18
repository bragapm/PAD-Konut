<script lang="ts" setup>
import IcEye from "~/assets/icons/ic-eye.svg";
import IcEyeCrossed from "~/assets/icons/ic-eye-crossed.svg";
import IcMarkerStyle from "~/assets/icons/ic-marker-style.svg";
import type {
  LineStyles,
  FillStyles,
  CircleStyles,
  VectorTiles,
} from "~/utils/types";
import {
  geomTypeCircle,
  geomTypeLine,
  geomTypePolygon,
  geomTypeSymbol,
  uncategorizedAlias,
} from "~/constants";
import { storeToRefs } from "pinia";
import { provide } from "vue";

const props = defineProps<{
  order: number;
  groupOrder: number;
  filtered: boolean;
  layerItem: VectorTiles | LoadedGeoJson | ExternalVector;
}>();

const emit = defineEmits<{
  updateDragItem: [order: { groupOrder: number; itemOrder: number }];
  updateDragOverItem: [order: { groupOrder: number; itemOrder: number }];
  handleChangeOrder: [];
}>();

const store = useMapRef();
const { map } = storeToRefs(store);

const storeLayer = useMapLayer();
const { handleVisibility } = storeLayer;

const mapStore = useMap();
const { cursorMode, selectedLayerId } = storeToRefs(mapStore);
const { selectLayerId, selectLayerName } = mapStore;

const groupIndex = computed(() => {
  if (storeLayer.groupedActiveLayers)
    if (props.layerItem.category) {
      return storeLayer.groupedActiveLayers.findIndex(
        (el) => el.label === props.layerItem.category?.category_name
      );
    } else {
      return storeLayer.groupedActiveLayers.findIndex(
        (el) => el.label === uncategorizedAlias
      );
    }
});

provide("groupIndexProvider", groupIndex.value);

const layerIndex = computed(() => {
  if (groupIndex.value !== undefined) {
    if (storeLayer?.groupedActiveLayers?.[groupIndex.value]?.layerLists)
      return storeLayer.groupedActiveLayers[
        groupIndex.value
      ].layerLists.findIndex((el) => el.layer_id === props.layerItem.layer_id);
  }
});

provide("layerIndexProvider", layerIndex.value);

const isShowStyling = ref(false);
const visibility = ref<string>(
  props.layerItem.layer_style.layout_visibility ?? "visible"
);
const opacity = ref<string>(
  props.layerItem.geometry_type === geomTypeCircle
    ? (props.layerItem.layer_style as CircleStyles).paint_circle_opacity ?? "1"
    : props.layerItem.geometry_type === geomTypePolygon
    ? (props.layerItem.layer_style as FillStyles).paint_fill_opacity ?? "1"
    : props.layerItem.geometry_type === geomTypeLine
    ? (props.layerItem.layer_style as LineStyles).paint_line_opacity ?? "1"
    : "1"
);
const updateOpacity = (value: number) => {
  opacity.value = (value / 100).toString();
};

const toggleVisibility = () => {
  if (groupIndex.value !== undefined && layerIndex.value !== undefined) {
    const currentVisibility =
      visibility.value === "visible" ? "none" : "visible";
    handleVisibility(groupIndex.value, layerIndex.value, currentVisibility);
    visibility.value = currentVisibility;
  }
  if (map.value) {
    const currentLayoutVisibility = map.value.getLayoutProperty(
      props.layerItem.layer_id,
      "visibility"
    );
    map.value.setLayoutProperty(
      props.layerItem.layer_id,
      "visibility",
      currentLayoutVisibility === "visible" ? "none" : "visible"
    );
  }
};
</script>

<template>
  <div
    @dragenter="
      () => {
        emit('updateDragOverItem', {
          groupOrder,
          itemOrder: order,
        });
      }
    "
    @drop="
      () => {
        emit('handleChangeOrder');
      }
    "
    @dragover="(e) => e.preventDefault()"
    class="relative"
  >
    <div
      :draggable="filtered ? false : true"
      @dragstart="
        (ev) => {
          emit('updateDragItem', {
            groupOrder,
            itemOrder: order,
          });
        }
      "
      :class="[
        isShowStyling || layerItem.layer_id === selectedLayerId
          ? 'bg-grey-700'
          : 'bg-transparent hover:ring-1 hover:ring-grey-500',
        filtered ? 'cursor-pointer' : 'cursor-grab',
        'rounded-sm p-2 flex justify-between items-center gap-2 w-full transition-all duration-500 ease',
      ]"
    >
      <div
        :disabled="cursorMode !== 'select'"
        @click="
          (e) => {
            if (cursorMode === 'select') {
              if (layerItem.source === 'vector_tiles') {
                selectLayerId(layerItem.layer_id);
                selectLayerName(layerItem.layer_name);
              } else if (layerItem.source === 'external_vector') {
                selectLayerId(layerItem.layer_id);
                selectLayerName(layerItem.layer_id.split('_')[0]);
              }
            }
          }
        "
        :class="[cursorMode === 'select' && 'cursor-pointer', 'w-full']"
      >
        <UTooltip
          :text="layerItem.layer_alias"
          :ui="{
            content:
              'bg-grey-800 ring-grey-700 rounded-sm text-grey-50 max-w-2xl',
          }"
        >
          <p
            :class="[
              visibility === 'visible' ? 'text-grey-200' : 'text-grey-500',
              'truncate max-w-[12rem] overflow-hidden',
            ]"
          >
            {{ layerItem.layer_alias }}
          </p>
        </UTooltip>
        <p
          :class="[
            visibility === 'visible' ? 'text-grey-400' : 'text-grey-500',
            'truncate',
          ]"
        >
          {{ layerItem.geometry_type }}
        </p>
      </div>
      <div class="flex gap-2 items-center justify-end">
        <button
          :disabled="visibility === 'none'"
          @click="isShowStyling = !isShowStyling"
        >
          <IcMarkerStyle
            :class="[
              visibility === 'visible'
                ? isShowStyling
                  ? 'text-brand-500'
                  : 'text-grey-400'
                : 'text-grey-500',
              ,
              'w-3 h-3',
            ]"
            :fontControlled="false"
          />
        </button>
        <button
          :disabled="isShowStyling"
          @click="toggleVisibility"
          :class="isShowStyling ? 'text-grey-600' : 'text-grey-400'"
        >
          <IcEyeCrossed
            v-if="visibility === 'none'"
            class="w-3 h-3"
            :fontControlled="false"
          />
          <IcEye v-else class="w-3 h-3" :fontControlled="false" />
        </button>
        <MapManagementMenu :item="layerItem" :disabled="isShowStyling" />
      </div>
    </div>
    <Transition
      enter-active-class="transition duration-500 ease-in-out"
      enter-from-class="transform max-h-0 opacity-0"
      enter-to-class="transform max-h-96 opacity-100"
      leave-active-class="transition duration-500 ease-in-out"
      leave-from-class="transform max-h-96 opacity-100"
      leave-to-class="transform max-h-0 opacity-0"
    >
      <div v-if="isShowStyling" class="transition-all duration-500 ease-in-out">
        <MapManagementStylingCircle
          v-if="layerItem.geometry_type === geomTypeCircle"
          :layerItem="layerItem"
        />
        <MapManagementStylingLine
          v-else-if="layerItem.geometry_type === geomTypeLine"
          :layerItem="layerItem"
        />
        <MapManagementStylingFill
          v-else-if="layerItem.geometry_type === geomTypePolygon"
          :layerItem="layerItem"
        />
        <MapManagementStylingSymbol
          v-else-if="layerItem.geometry_type === geomTypeSymbol"
          :layerItem="layerItem"
        />
        <MapManagementStyling
          v-else
          :source="layerItem.source"
          :opacity="opacity ? parseFloat(opacity) : 0"
          :layerId="layerItem.layer_id"
          :geometryType="layerItem.geometry_type"
          @update-opacity="updateOpacity"
        />
      </div>
    </Transition>
  </div>
</template>
