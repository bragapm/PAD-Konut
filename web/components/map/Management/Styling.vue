<script lang="ts" setup>
import { inject } from "vue";
import { geomTypeCircle, geomTypeLine, geomTypePolygon } from "~/constants";

const props = defineProps<{
  source: string;
  opacity: number;
  layerId: string;
  geometryType?: string;
}>();

const emit = defineEmits<{
  updateOpacity: [opacity: number];
}>();

const rangeValue = ref(props.opacity * 100);
const groupIndex = inject("groupIndexProvider");
const layerIndex = inject("layerIndexProvider");

const store = useMapLayer();
const { updateLayerOpacity } = store;
const mapStore = useMapRef();
const { map } = storeToRefs(mapStore);

const paintPropertyName = () => {
  switch (true) {
    case props.source === "raster_tiles" || props.source === "external_tiles":
      return "raster-opacity";
    case props.source === "vector_tiles" &&
      props.geometryType === geomTypeCircle:
      return "circle-opacity";
    case props.source === "vector_tiles" && props.geometryType === geomTypeLine:
      return "line-opacity";
    case props.source === "vector_tiles" &&
      props.geometryType === geomTypePolygon:
      return "fill-opacity";
    default:
      return "";
  }
};

const handleChangeOpacity = (value: number) => {
  emit("updateOpacity", value);

  const decimalOpacity = value / 100;
  updateLayerOpacity(
    groupIndex as number,
    layerIndex as number,
    decimalOpacity
  );
  if (map.value && props.source !== "three_d_tiles") {
    map.value.setPaintProperty(
      props.layerId,
      paintPropertyName(),
      decimalOpacity
    );
  }
};
</script>

<template>
  <div>
    <div class="bg-grey-800 rounded p-2 flex flex-col gap-1">
      <p class="text-grey-50 text-2xs font-medium leading-4">General</p>
      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Opacity
        </p>
        <div class="w-full flex gap-1">
          <USlider
            v-model="rangeValue"
            @update:modelValue="
              (newValue) => {
                handleChangeOpacity(newValue as number);
              }
            "
            name="range"
            size="xs"
            color="gray"
          />
          <UInput
            v-model="rangeValue"
            @blur="
              (e:Event) => {
                handleChangeOpacity(parseFloat((e.target as HTMLInputElement).value as string));
              }
            "
            type="number"
            color="gray"
            placeholder="Opacity"
            size="xs"
            min="0"
            max="100"
            :ui="{ base: 'h-[26px] w-14' }"
          >
            <template #trailing>
              <span class="text-grey-400 text-2xs">%</span>
            </template>
          </UInput>
        </div>
      </div>
    </div>
  </div>
</template>
