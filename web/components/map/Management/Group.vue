<script setup lang="ts">
import type { LayerGroupedByCategory, LayerLists } from "~/utils/types";
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";
import { geomTypeThreeD } from "~/constants";

const props = defineProps<{
  order: number;
  filtered: boolean;
  defaultOpen: boolean;
  label: string;
  layerLists: LayerLists[];
}>();

const emit = defineEmits<{
  updateDragGroup: [order: number];
  updateDragOverGroup: [order: number];
  handleChangeGroupOrder: [];
}>();

const isPanelOpen = ref(props.defaultOpen);

const store = useMapLayer();
const mapRefStore = useMapRef();

const dragItem = ref<null | { groupOrder: number; itemOrder: number }>(null);
const updateDragItem = (order: { groupOrder: number; itemOrder: number }) => {
  dragItem.value = order;
};
const dragOverItem = ref<null | { groupOrder: number; itemOrder: number }>(
  null
);
const updateDragOverItem = (order: {
  groupOrder: number;
  itemOrder: number;
}) => {
  dragOverItem.value = order;
};
const handleChangeOrder = () => {
  const copiedGroupedActiveLayers: LayerGroupedByCategory[] = JSON.parse(
    JSON.stringify(store.groupedActiveLayers)
  );
  const movedItem =
    copiedGroupedActiveLayers[dragItem.value!.groupOrder].layerLists[
      dragItem.value!.itemOrder
    ];
  if (mapRefStore.map?.getLayer(movedItem.layer_id)) {
    mapRefStore.map?.removeLayer(movedItem.layer_id);
  }

  copiedGroupedActiveLayers[dragItem.value!.groupOrder].layerLists.splice(
    dragItem.value!.itemOrder,
    1
  );
  copiedGroupedActiveLayers[dragItem.value!.groupOrder].layerLists.splice(
    dragOverItem.value!.itemOrder,
    0,
    movedItem
  );

  store.groupedActiveLayers = copiedGroupedActiveLayers;
};
</script>

<template>
  <UCollapsible v-model:open="isPanelOpen" class="flex flex-col w-full">
    <UButton
      :draggable="
        label === geomTypeThreeD || label === 'Terrain'
          ? false
          : filtered
          ? false
          : true
      "
      @dragstart="
        (e) => {
          emit('updateDragGroup', order);
        }
      "
      @dragenter="
        () => {
          if (label !== geomTypeThreeD && label !== 'Terrain') {
            emit('updateDragOverGroup', order);
          }
        }
      "
      @drop="
        () => {
          if (label !== geomTypeThreeD && label !== 'Terrain') {
            emit('handleChangeGroupOrder');
          }
        }
      "
      @dragover="
        (e) => {
          e.preventDefault();
        }
      "
      color="gray"
      variant="ghost"
      :class="[
        filtered || label === geomTypeThreeD || label === 'Terrain'
          ? 'cursor-pointer'
          : 'cursor-grab',
        'justify-between py-2 px-1',
      ]"
    >
      <p class="text-sm text-grey-200 font-normal">{{ label }}</p>
      <div
        :class="[
          isPanelOpen ? '' : 'rotate-180',
          'text-grey-50 transition-all duration-300',
        ]"
      >
        <IcArrowReg
          :fontControlled="false"
          class="w-4 h-4 text-grey-400"
        /></div
    ></UButton>

    <template #content>
      <div class="overflow-hidden space-y-2 p-[1px] text-xs">
        <template
          v-for="(item, index) in props.layerLists"
          :key="item.layer_id"
        >
          <MapManagementLayerVector
            v-if="
              item.source === 'vector_tiles' ||
              item.source === 'loaded_geojson' ||
              item.source === 'external_vector'
            "
            :filtered="filtered"
            :order="index"
            :groupOrder="order"
            :layerItem="item"
            @update-drag-item="updateDragItem"
            @update-drag-over-item="updateDragOverItem"
            @handle-change-order="handleChangeOrder"
          />
          <MapManagementLayerRaster
            v-else-if="
              item.source === 'raster_tiles' || item.source === 'external_tiles'
            "
            :filtered="filtered"
            :order="index"
            :groupOrder="order"
            :layerItem="item"
            @update-drag-item="updateDragItem"
            @update-drag-over-item="updateDragOverItem"
            @handle-change-order="handleChangeOrder"
          />
          <MapManagementLayerThreeD
            v-else-if="item.source === 'three_d_tiles'"
            :filtered="filtered"
            :order="index"
            :groupOrder="order"
            :layerItem="item"
          />
        </template>
      </div>
    </template>
  </UCollapsible>
</template>
