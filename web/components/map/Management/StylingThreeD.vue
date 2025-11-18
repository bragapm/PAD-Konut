<script lang="ts" setup>
import { inject } from "vue";

const props = defineProps<{
  layerItem: ThreeDTiles;
}>();

const emit = defineEmits<{
  updateOpacity: [opacity: number];
}>();

const rangeValue = ref(props.layerItem.opacity * 100);
const pointSize = ref(props.layerItem.point_size ?? 1);
const fillColor = ref(props.layerItem.point_color ?? "#000000");
const groupIndex = inject("groupIndexProvider");
const layerIndex = inject("layerIndexProvider");

const store = useMapLayer();
const { updateLayerProperty } = store;

const handleChangeProperty = (
  propType: "paint" | "layout" | "3d",
  value: string | number,
  propName: string
) => {
  updateLayerProperty(
    groupIndex as number,
    layerIndex as number,
    propType,
    propName,
    value,
    props.layerItem.layer_id
  );
};
</script>

<template>
  <div>
    <div class="bg-grey-800 rounded p-2 flex flex-col gap-1">
      <p class="text-grey-50 text-2xs font-medium leading-4">General</p>
      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Size
        </p>
        <UInput
          v-model="pointSize"
          @blur="
            (e:Event) => {
              handleChangeProperty('3d',parseFloat((e.target as HTMLInputElement).value as string), 'point_size');
            }
          "
          type="number"
          color="gray"
          placeholder="Point Size"
          size="xs"
          min="0"
          max="100"
          class="flex-1"
          :ui="{ base: 'h-[26px] w-full' }"
        >
          <template #trailing>
            <span class="text-grey-400 text-2xs leading-4">px</span>
          </template>
        </UInput>
      </div>
      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Opacity
        </p>
        <div class="w-full flex gap-1">
          <USlider
            v-model="rangeValue"
            @update:modelValue="
              (newValue) => {
                handleChangeProperty('3d',(newValue as number)/100, 'opacity');
              }
            "
            name="range"
            size="xs"
            color="gray"
            :min="0"
            :max="100"
          />
          <UInput
            v-model="rangeValue"
            @blur="
               (e:Event) => {
                handleChangeProperty('3d',parseFloat((e.target as HTMLInputElement).value as string)/100, 'opacity');
              }
            "
            type="number"
            color="gray"
            placeholder="Point Opacity"
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
      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Color
        </p>
        <CoreInputColor
          v-model="fillColor"
          :updateColor="
            (color:string) => {
              handleChangeProperty('3d', color, 'point_color');
            }
          "
        />
      </div>
    </div>
  </div>
</template>
