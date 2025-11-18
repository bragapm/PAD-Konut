<script lang="ts" setup>
import { inject } from "vue";
import { extractAttributeFromExpression } from "~/utils/mapStyling";

const props = defineProps<{
  layerItem: VectorTiles | LoadedGeoJson | ExternalVector;
}>();
const style = props.layerItem.layer_style as LineStyles;

const authStore = useAuth();

const groupIndex = inject("groupIndexProvider");
const layerIndex = inject("layerIndexProvider");

// Extract attribute from paint_line_color once
const extractedAttribute = extractAttributeFromExpression(
  style.paint_line_color
);

const lineWidth = ref(style.paint_line_width);
const lineDash = ref(style.paint_line_dasharray ?? "");
const dashWidth = ref(
  style.paint_line_dasharray ? JSON.parse(style.paint_line_dasharray)[0] : null
);

const dashGap = ref(
  style.paint_line_dasharray?.length
    ? JSON.parse(style.paint_line_dasharray)[1]
    : null
);
const lineOpacity = ref(parseFloat(style.paint_line_opacity ?? "1") * 100);
const styleType = ref<"simple" | "categorical">(
  extractedAttribute ? "categorical" : "simple"
);
const lineColor = ref<string>(
  style.paint_line_color?.startsWith("[")
    ? "#ffffff"
    : style.paint_line_color ?? "#ffffff"
);

const store = useMapLayer();
const { updateLayerProperty } = store;
const mapStore = useMapRef();
const { map } = storeToRefs(mapStore);

const hasChanges = ref(false);
const changedFields = ref<Record<string, any>>({});

const handleChangeProperty = (
  propType: "paint" | "layout",
  value: string | number | boolean | null,
  propName: string
) => {
  hasChanges.value = true;

  // Map propName to the actual field name in the database
  const fieldMap: Record<string, string> = {
    "line-color": "paint_line_color",
    "line-opacity": "paint_line_opacity",
    "line-width": "paint_line_width",
    "line-dasharray": "paint_line_dasharray",
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
      `/panel/items/line/${
        (props.layerItem.layer_style as LineStylesConfig).id
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
    handleChangeProperty("paint", lineColor.value || "#ffffff", "line-color");
  }
});
</script>

<template>
  <div>
    <div class="bg-grey-800 rounded p-2 flex flex-col gap-1">
      <p class="text-grey-50 text-2xs font-medium leading-4">General</p>

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
        :initial-color-expression="style.paint_line_color || ''"
        :on-color-change="(expr: string) => handleChangeProperty('paint', expr, 'line-color')"
      />

      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Opacity
        </p>
        <div class="w-full flex gap-1">
          <USlider
            v-model="lineOpacity"
            @update:modelValue="
              (newValue) => {
                handleChangeProperty('paint',(newValue as number)/100, 'line-opacity');
              }
            "
            name="range"
            size="xs"
            color="gray"
            :min="0"
            :max="100"
          />
          <UInput
            v-model="lineOpacity"
            @blur="
               (e:Event) => {
                handleChangeProperty('paint',parseFloat((e.target as HTMLInputElement).value as string)/100, 'line-opacity');
              }
            "
            type="number"
            color="gray"
            placeholder="Line Opacity"
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
          Size
        </p>
        <UInput
          v-model="lineWidth"
          @blur="
            (e:Event) => {
              handleChangeProperty('paint',parseFloat((e.target as HTMLInputElement).value as string), 'line-width');
            }
          "
          type="number"
          color="gray"
          placeholder="Line Width"
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
          Style
        </p>
        <CoreInputDash
          v-model="lineDash"
          :updateLineDash="
            (value: any) => {
              if (value !== null) {
                let dashArray = [];
                if (dashWidth) {
                  dashArray.push(dashWidth);
                  if (dashGap) {
                    dashArray.push(dashGap);
                  }
                } else {
                  dashWidth = value[0];
                  dashGap = value[1];
                  dashArray = value;
                }
                handleChangeProperty(
                  'paint',
                  JSON.stringify(dashArray),
                  'line-dasharray'
                );
              } else {
                handleChangeProperty('paint', value, 'line-dasharray');
              }
            }
          "
        />
      </div>
      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Dash
        </p>
        <UInput
          :disabled="!lineDash"
          v-model="dashWidth"
          @blur="
            (e:Event) => {
              let newDashArray = [parseFloat((e.target as HTMLInputElement).value)]
              if(dashGap){newDashArray.push(dashGap)}
              handleChangeProperty('paint', JSON.stringify(newDashArray), 'line-dasharray');
            }
          "
          type="number"
          color="gray"
          placeholder="Dash"
          size="xs"
          min="0"
          max="100"
          class="flex-1"
          :ui="{ base: 'h-[26px] w-full' }"
        >
          <template #trailing>
            <span class="text-grey-400 text-2xs leading-4">Dash</span>
          </template>
        </UInput>
      </div>
      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Gap
        </p>
        <UInput
          :disabled="!lineDash"
          v-model="dashGap"
          @blur="
            (e:Event) => {
              let newDashArray = [dashWidth, parseFloat((e.target as HTMLInputElement).value)]
              handleChangeProperty('paint',  JSON.stringify(newDashArray), 'line-dasharray');
            }
          "
          type="number"
          color="gray"
          placeholder="Gap"
          size="xs"
          min="0"
          max="100"
          class="flex-1"
          :ui="{ base: 'h-[26px] w-full' }"
        >
          <template #trailing>
            <span class="text-grey-400 text-2xs leading-4">Gap</span>
          </template>
        </UInput>
      </div>

      <div v-if="styleType === 'simple'" class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Color
        </p>
        <CoreInputColor
          v-model="lineColor"
          :updateColor="
            (color:string) => {
              handleChangeProperty('paint',color, 'line-color');
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
