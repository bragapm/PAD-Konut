<script lang="ts" setup>
import { inject } from "vue";
import { extractAttributeFromExpression } from "~/utils/mapStyling";

const props = defineProps<{
  layerItem: VectorTiles | LoadedGeoJson | ExternalVector;
}>();

const authStore = useAuth();

const groupIndex = inject("groupIndexProvider");
const layerIndex = inject("layerIndexProvider");

// Extract attribute from paint_circle_color once
const extractedAttribute = extractAttributeFromExpression(
  (props.layerItem.layer_style as CircleStyles).paint_circle_color
);

const circleRadius = ref(
  (props.layerItem.layer_style as CircleStyles).paint_circle_radius
);
const styleType = ref<"simple" | "categorical">(
  extractedAttribute ? "categorical" : "simple"
);

const circleStrokeDash = ref(null);
const circleStrokeWidth = ref(
  (props.layerItem.layer_style as CircleStyles).paint_circle_stroke_width
);
const fillOpacity = ref(
  parseFloat(
    (props.layerItem.layer_style as CircleStyles).paint_circle_opacity ?? "1"
  ) * 100
);
const strokeOpacity = ref(
  parseFloat(
    (props.layerItem.layer_style as CircleStyles).paint_circle_stroke_opacity ??
      "1"
  ) * 100
);
const fillColor = ref<string>(
  (props.layerItem.layer_style as CircleStyles).paint_circle_color?.startsWith(
    "["
  )
    ? "#ffffff"
    : (props.layerItem.layer_style as CircleStyles).paint_circle_color ??
        "#ffffff"
);
const strokeColor = ref(
  (props.layerItem.layer_style as CircleStyles).paint_circle_stroke_color ??
    "#000000"
);

const store = useMapLayer();
const { updateLayerProperty } = store;
const mapStore = useMapRef();
const { map } = storeToRefs(mapStore);

const hasChanges = ref(false);
const changedFields = ref<Record<string, any>>({});

const handleChangeProperty = (
  propType: "paint" | "layout",
  value: string | number,
  propName: string
) => {
  hasChanges.value = true;

  // Map propName to the actual field name in the database
  const fieldMap: Record<string, string> = {
    "circle-radius": "paint_circle_radius",
    "circle-color": "paint_circle_color",
    "circle-opacity": "paint_circle_opacity",
    "circle-stroke-width": "paint_circle_stroke_width",
    "circle-stroke-color": "paint_circle_stroke_color",
    "circle-stroke-opacity": "paint_circle_stroke_opacity",
  };

  const fieldName = fieldMap[propName];
  if (fieldName) {
    changedFields.value[fieldName] = value;
  }

  updateLayerProperty(
    groupIndex as number,
    layerIndex as number,
    propType,
    propName,
    value,
    props.layerItem.layer_id
  );
};

const toast = useToast();

const handleSave = async () => {
  try {
    await $fetch(
      `/panel/items/circle/${
        (props.layerItem.layer_style as CircleStylesConfig).id
      }`,
      {
        method: "PATCH",
        body: {
          ...changedFields.value,
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + authStore.accessToken,
        },
      }
    );
    hasChanges.value = false;
    changedFields.value = {};

    toast.add({
      title: "Style saved successfully",
      description: `Layer style "${props.layerItem.layer_alias}" has been updated`,
      icon: "i-heroicons-information-circle",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Could not update layer "${props.layerItem.layer_alias}", please try again`;
    toast.add({
      title: `Failed to save style "${props.layerItem.layer_alias}"`,
      description: message,
      icon: "i-heroicons-x-mark",
    });
  }
};

// Get layer name for column fetching
const layerName = computed(() => {
  if (props.layerItem.source === "vector_tiles") {
    return (props.layerItem as VectorTiles).layer_name;
  }
  return "";
});

watch(styleType, (newValue) => {
  hasChanges.value = true;
  if (newValue === "simple") {
    handleChangeProperty("paint", fillColor.value || "#ffffff", "circle-color");
  }
});
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
          v-model="circleRadius"
          @blur="
            (e:Event) => {
              handleChangeProperty('paint',parseFloat((e.target as HTMLInputElement).value as string), 'circle-radius');
            }
          "
          type="number"
          color="gray"
          placeholder="Circle Radius"
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
          Type
        </p>
        <USelectMenu
          v-model="styleType"
          :items="['simple', 'categorical']"
          size="xs"
          color="gray"
          :ui="{
            base: 'h-[26px]',
          }"
        />
      </div>

      <MapManagementCategorical
        v-if="styleType === 'categorical'"
        :layer-name="layerName"
        :layer-id="layerItem.layer_id"
        :initial-attribute="extractedAttribute || ''"
        :initial-color-expression="(layerItem.layer_style as CircleStyles).paint_circle_color || ''"
        :on-color-change="(expr: string) => handleChangeProperty('paint', expr, 'circle-color')"
      />

      <p class="text-grey-50 text-2xs">Fill</p>
      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Opacity
        </p>
        <div class="w-full flex gap-1">
          <USlider
            v-model="fillOpacity"
            @update:modelValue="
            (newValue) => {
              handleChangeProperty('paint', (newValue as number) / 100, 'circle-opacity');
            }
          "
            name="range"
            size="xs"
            color="gray"
            :min="0"
            :max="100"
          />
          <UInput
            v-model="fillOpacity"
            @blur="
             (e:Event) => {
              handleChangeProperty('paint',parseFloat((e.target as HTMLInputElement).value as string)/100, 'circle-opacity');
            }
          "
            type="number"
            color="gray"
            placeholder="Fill Opacity"
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
      <div v-if="styleType === 'simple'" class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Color
        </p>
        <CoreInputColor
          v-model="fillColor"
          :updateColor="
            (color:string) => {
              handleChangeProperty('paint', color, 'circle-color');
            }
          "
        />
      </div>

      <p class="text-grey-50 text-2xs font-medium leading-4">Stroke</p>
      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Size
        </p>
        <UInput
          v-model="circleStrokeWidth"
          @blur="
            (e:Event) => {
              handleChangeProperty('paint',parseFloat((e.target as HTMLInputElement).value as string), 'circle-stroke-width');
            }
          "
          type="number"
          color="gray"
          placeholder="Circle Radius"
          size="xs"
          min="0"
          max="100"
          class="w-full"
          :ui="{ base: 'h-[26px]' }"
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
            v-model="strokeOpacity"
            @update:modelValue="
              (newValue) => {
                handleChangeProperty('paint', (newValue as number)/100, 'circle-stroke-opacity');
              }
            "
            name="range"
            size="xs"
            color="gray"
            :min="0"
            :max="100"
          />
          <UInput
            v-model="strokeOpacity"
            @blur="
               (e:Event) => {
                handleChangeProperty('paint',parseFloat((e.target as HTMLInputElement).value as string)/100, 'circle-opacity');
              }
            "
            type="number"
            color="gray"
            placeholder="Fill Opacity"
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
          Style
        </p>
        <CoreInputDash
          disabled
          v-model="circleStrokeDash"
          :updateLineDash="() => {}"
        />
      </div>
      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Color
        </p>
        <CoreInputColor
          v-model="strokeColor"
          :updateColor="
          (color:string) => {
            handleChangeProperty('paint', color, 'circle-stroke-color');
          }
        "
        />
      </div>
      <UButton
        v-if="authStore.accessToken"
        @click="handleSave"
        :disabled="!hasChanges"
        color="primary"
        size="xs"
        class="w-full mt-2 justify-center text-xs py-1"
        variant="outline"
      >
        Save Style
      </UButton>
    </div>
  </div>
</template>
