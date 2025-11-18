<script setup lang="ts">
import { geomTypeCircle, geomTypeLine, geomTypePolygon } from "~/constants";
import { parseString } from "~/utils";

withDefaults(defineProps<{ forExport?: boolean }>(), {
  forExport: false,
});

const mapLayerStore = useMapLayer();

const vectorLegendLists = computed(() => {
  return mapLayerStore.groupedActiveLayers
    ?.map(({ layerLists }) => layerLists)
    .flat()
    .filter(
      (el) => el.source === "vector_tiles" || el.source === "external_vector"
    );
});

const rasterLegendLists = computed(() => {
  return mapLayerStore.groupedActiveLayers
    ?.map(({ layerLists }) => layerLists)
    .flat()
    .filter(
      (el) => el.source === "raster_tiles" && el.protocol === "greyscale"
    );
});

const transformCategoricalStyleArray = (styleArray: any[]) => {
  const transformResult = [];

  for (let i = 0; i < styleArray.length; i += 2) {
    if (styleArray[i][2] === null) {
      transformResult.push({
        label: "null",
        value: styleArray[i + 1],
      });
    } else if (typeof styleArray[i][2] === "string") {
      transformResult.push({
        label: styleArray[i][2],
        value: styleArray[i + 1],
      });
    } else if (typeof styleArray[i][2] === "number") {
      transformResult.push({
        label: `${styleArray[i][0] !== "==" ? styleArray[i][0] + " " : ""}${
          styleArray[i][2]
        }`,
        value: styleArray[i + 1],
      });
    } else if (typeof styleArray[i][2] === "object") {
      if (styleArray[i][0] === "all") {
        transformResult.push({
          label: `${styleArray[i][1][2] + " - " + styleArray[i][2][2]}`,
          value: styleArray[i + 1],
        });
      } else {
        transformResult.push({
          label: `${styleArray[1][0] + " " + styleArray[1][2]} ${
            styleArray[2][0] + " " + styleArray[2][2]
          }`,
          value: styleArray[i + 1],
        });
      }
    }
  }
  return transformResult;
};
</script>

<template>
  <div
    v-if="vectorLegendLists && vectorLegendLists.length > 0"
    class="flex flex-col"
  >
    <template
      v-for="(item, index) in (vectorLegendLists as (VectorTiles|ExternalVector)[])"
      :key="item.label"
    >
      <Transition
        enter-active-class="transition-all duration-500 ease-in-out"
        enter-from-class="max-h-0 opacity-0"
        enter-to-class="max-h-96 opacity-100"
        leave-active-class="transition-all duration-500 ease-in-out"
        leave-from-class="max-h-96 opacity-100"
        leave-to-class="max-h-0 opacity-0"
      >
        <div
          v-if="item.layer_style.layout_visibility === 'visible'"
          class="pb-2"
        >
          <p
            :class="['text-2xs ', forExport ? 'text-grey-950' : 'text-grey-50']"
          >
            {{ item.layer_alias || (item as VectorTiles).layer_name }}
          </p>
          <p
            :class="[
              'text-[8px]',
              forExport ? 'text-grey-600' : 'text-grey-400',
            ]"
          >
            {{ item.geometry_type }}
          </p>

          <template v-if="item.geometry_type === geomTypeCircle">
            <div
              v-if="
                  (item.layer_style as CircleStyles).paint_circle_color &&
                  Array.isArray(parseString((item.layer_style as CircleStyles).paint_circle_color as string))
                "
            >
              <div className="grid grid-cols-8 gap-2">
                <template
                  v-for="parsedItem in transformCategoricalStyleArray((parseString(
                          (item.layer_style as CircleStyles)
                            .paint_circle_color as string
                        )as []).slice(1,-1))"
                >
                  <div
                    class="flex items-center h-4 w-4 rounded-full place-self-center"
                    :style="{
                      backgroundColor: parsedItem.value,
                    }"
                  />
                  <p class="col-span-7 text-grey-50 text-xs">
                    {{ parsedItem.label }}
                  </p>
                </template>
              </div>
            </div>
            <div
              v-else
              class="h-4 w-4 rounded-full mt-1"
              :style="{
                  backgroundColor: (item.layer_style as CircleStyles).paint_circle_color,
                  opacity: (item.layer_style as CircleStyles).paint_circle_opacity,
                  border: (item.layer_style as CircleStyles).paint_circle_stroke_width !==0 ? '2px solid' + (item.layer_style as CircleStyles).paint_circle_stroke_color : '',
                }"
            ></div>
          </template>

          <template v-else-if="item.geometry_type === geomTypePolygon">
            <div
              v-if="
                  (item.layer_style as FillStyles).paint_fill_color &&
                  Array.isArray(parseString((item.layer_style as FillStyles).paint_fill_color as string))
                "
            >
              <div className="grid grid-cols-8 gap-2">
                <template
                  v-for="parsedItem in transformCategoricalStyleArray((parseString(
                          (item.layer_style as FillStyles)
                            .paint_fill_color as string
                        )as []).slice(1,-1))"
                >
                  <div
                    class="flex items-center h-4 w-4 place-self-center"
                    :style="{
                      backgroundColor: parsedItem.value,
                    }"
                  />
                  <p class="col-span-7 text-grey-50 text-xs">
                    {{ parsedItem.label }}
                  </p>
                </template>
              </div>
            </div>
            <div
              v-else
              class="h-4 w-4 mt-1"
              :style="{
              backgroundColor: (item.layer_style as FillStyles).paint_fill_color,
              opacity: (item.layer_style as FillStyles).paint_fill_opacity,
            }"
            ></div>
          </template>

          <template v-else-if="item.geometry_type === geomTypeLine">
            <div
              v-if="
                  (item.layer_style as LineStyles).paint_line_color &&
                  Array.isArray(parseString((item.layer_style as LineStyles).paint_line_color as string))
                "
            >
              <div className="grid grid-cols-8 gap-2">
                <template
                  v-for="parsedItem in transformCategoricalStyleArray((parseString(
                          (item.layer_style as LineStyles)
                            .paint_line_color as string
                        )as []).slice(1,-1))"
                >
                  <div
                    class="flex items-center h-1 w-4 place-self-center"
                    :style="{
                      backgroundColor: parsedItem.value,
                    }"
                  />
                  <p class="col-span-7 text-grey-50 text-xs">
                    {{ parsedItem.label }}
                  </p>
                </template>
              </div>
            </div>
            <div
              v-else
              class="flex items-center h-1 w-4 mt-1"
              :style="{
                  backgroundColor: (item.layer_style as LineStyles).paint_line_color,
                  opacity: (item.layer_style as LineStyles).paint_line_opacity,
                }"
            ></div>
          </template>
        </div>
      </Transition>
    </template>
    <template
      v-for="(item, index) in (rasterLegendLists as RasterTiles[])"
      :key="item.label"
    >
      <Transition
        enter-active-class="transition-all duration-500 ease-in-out"
        enter-from-class="max-h-0 opacity-0"
        enter-to-class="max-h-96 opacity-100"
        leave-active-class="transition-all duration-500 ease-in-out"
        leave-from-class="max-h-96 opacity-100"
        leave-to-class="max-h-0 opacity-0"
      >
        <div
          v-if="item.layer_style.layout_visibility === 'visible'"
          class="pb-2"
        >
          <p
            :class="['text-2xs ', forExport ? 'text-grey-950' : 'text-grey-50']"
          >
            {{ item.layer_alias }}
          </p>
          <p
            :class="[
              'text-[8px]',
              forExport ? 'text-grey-600' : 'text-grey-400',
            ]"
          >
            {{ item.geometry_type }}
          </p>
          <template v-for="(step, index) in item.color_steps" :key="index">
            <div class="flex items-end space-x-3 text-2xs text-grey-50">
              <span
                class="h-4 w-4 mt-1"
                :style="{ backgroundColor: step.color }"
              ></span>
              <p>
                {{ step.legend_label || step.pixel_value }}
              </p>
            </div>
          </template>
        </div>
      </Transition>
    </template>
  </div>
</template>
