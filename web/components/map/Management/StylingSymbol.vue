<script lang="ts" setup>
import { inject } from "vue";
import { extractAttributeFromExpression } from "~/utils/mapStyling";
import type { SymbolStyles } from "~/utils/types";

const props = defineProps<{
  layerItem: VectorTiles | LoadedGeoJson | ExternalVector;
}>();

const authStore = useAuth();

const groupIndex = inject("groupIndexProvider");
const layerIndex = inject("layerIndexProvider");

const symbolStyle = props.layerItem.layer_style as SymbolStyles;

console.log("SYMBOL STYLE", symbolStyle);

// Extract attribute from layout_icon_image once
const layoutIconImage = symbolStyle.layout_icon_image;
const extractedAttribute = extractAttributeFromExpression(layoutIconImage);

const iconOpacity = ref(
  parseFloat(symbolStyle.paint_icon_opacity ?? "1") * 100
);
const iconColor = ref(symbolStyle.paint_icon_color ?? "#000000");
const iconSize = ref(symbolStyle.layout_icon_size ?? 1);
const styleType = ref<"simple" | "categorical">(
  extractedAttribute ? "categorical" : "simple"
);
// const iconImage = ref<string>(
//   typeof layoutIconImage === "object" && layoutIconImage?.id
//     ? layoutIconImage.id
//     : (layoutIconImage as string) || ""
// );

const defaultIconImageId = "1270a394-f07a-46eb-8aeb-2bc838ccb74f";

const iconImage = ref<string>(
  symbolStyle.layout_icon_image?.id ?? defaultIconImageId
);

const store = useMapLayer();
const { updateLayerProperty } = store;

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
    "icon-opacity": "paint_icon_opacity",
    "icon-color": "paint_icon_color",
    "icon-size": "layout_icon_size",
    "icon-image": "layout_icon_image",
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
      `/panel/items/symbol/${
        (props.layerItem.layer_style as SymbolStylesConfig).id
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
    // Reset to simple icon when switching from categorical
    if (iconImage.value) {
      handleChangeProperty(
        "layout",
        iconImage.value || defaultIconImageId,
        "icon-image"
      );
    }
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
        <div class="w-full grid grid-cols-3 gap-2">
          <UButton
            v-for="items in [1, 1.5, 2]"
            :color="items === iconSize ? 'brand' : 'gray'"
            variant="outline"
            :class="[
              items === iconSize ? 'bg-brand-950' : '',
              'p-[6px]',
              'rounded-sm',
            ]"
            @click="
              () => {
                iconSize = items;
                handleChangeProperty('layout', items, 'icon-size');
              }
            "
          >
            <template #leading>
              <div
                :class="[
                  items === iconSize ? 'bg-brand-500' : 'bg-grey-400',
                  'w-3 h-3 rounded-full',
                ]"
              />
            </template>
            <p class="text-2xs">{{ items }}x</p>
          </UButton>
        </div>
      </div>
      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Opacity
        </p>
        <div class="w-full flex gap-1">
          <USlider
            v-model="iconOpacity"
            @update:modelValue="
              (newValue) => {
                handleChangeProperty('paint',(newValue as number)/100, 'icon-opacity');
              }
            "
            name="range"
            size="xs"
            color="gray"
            :min="0"
            :max="100"
          />
          <UInput
            v-model="iconOpacity"
            @blur="
               (e:Event) => {
                handleChangeProperty('paint',parseFloat((e.target as HTMLInputElement).value as string)/100, 'icon-opacity');
              }
            "
            type="number"
            color="gray"
            placeholder="Symbol Opacity"
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

      <MapManagementCategoricalSymbol
        v-if="styleType === 'categorical'"
        :layer-name="layerName"
        :layer-id="layerItem.layer_id"
        :initial-attribute="extractedAttribute || ''"
        :initial-symbol-expression="
          typeof layoutIconImage === 'string' ? layoutIconImage : ''
        "
        :on-symbol-change="(expr: string) => handleChangeProperty('layout', expr, 'icon-image')"
      />

      <p class="text-grey-50 text-2xs font-medium leading-4">Fill</p>
      <div class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Color
        </p>
        <CoreInputColor
          v-model="iconColor"
          :updateColor="
            (color:string) => {
              handleChangeProperty('paint',color, 'icon-color');
            }
          "
        />
      </div>
      <div v-if="styleType === 'simple'" class="flex gap-1 items-center w-full">
        <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
          Symbol
        </p>

        <CoreIconPicker
          v-model="iconImage"
          :updateIconImage="
            (iconImageId:string) => {
              handleChangeProperty('layout', iconImageId, 'icon-image');
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
