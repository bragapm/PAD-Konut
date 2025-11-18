<script setup lang="ts">
import { TransitionRoot } from "@headlessui/vue";
import { _backgroundOpacity } from "#tailwind-config/theme";
import { geomTypeCircle, geomTypeLine, geomTypePolygon } from "~/constants";
import { parseString } from "~/utils";

const mapLayerStore = useMapLayer();

const vectorLegendLists = computed(() => {
  return mapLayerStore.groupedActiveLayers
    ?.map(({ layerLists }) => layerLists)
    .flat()
    .filter((el) => el.source === "vector_tiles");
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
      transformResult.push({
        label: `${styleArray[1][0] + " " + styleArray[1][2]} ${
          styleArray[2][0] + " " + styleArray[2][2]
        }`,
        value: styleArray[i + 1],
      });
    }
  }
  return transformResult;
};
</script>

<template>
  <h2 class="p-3 text-xs text-grey-50">Legend</h2>

  <hr class="mx-3" />
  <div
    class="p-3 flex-1 overflow-y-auto transition-all duration-500 ease-in-out"
  >
    <div
      v-if="vectorLegendLists && vectorLegendLists.length > 0"
      class="flex flex-col"
    >
      <template
        v-for="(item, index) in (vectorLegendLists as VectorTiles[])"
        :key="item.label"
      >
        <TransitionRoot
          :show="item.layer_style.layout_visibility === 'visible'"
          enter="transition duration-500 ease-in-out"
          enterFrom="transform max-h-0 opacity-0"
          enterTo="transform max-h-96 opacity-100"
          leave="transition duration-500 ease-in-out"
          leaveFrom="transform max-h-96 opacity-100"
          leaveTo="transform max-h-0 opacity-0"
          class="transition-all duration-500 ease-in-out"
        >
          <div class="pb-2">
            <p class="text-xs text-grey-50">
              {{ item.layer_alias || item.layer_name }}
            </p>
            <p class="text-2xs text-grey-400">{{ item.geometry_type }}</p>

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
        </TransitionRoot>
      </template>
      <template
        v-for="(item, index) in (rasterLegendLists as RasterTiles[])"
        :key="item.label"
      >
        <TransitionRoot
          :show="item.layer_style.layout_visibility === 'visible'"
          enter="transition duration-500 ease-in-out"
          enterFrom="transform max-h-0 opacity-0"
          enterTo="transform max-h-96 opacity-100"
          leave="transition duration-500 ease-in-out"
          leaveFrom="transform max-h-96 opacity-100"
          leaveTo="transform max-h-0 opacity-0"
          class="transition-all duration-500 ease-in-out"
        >
          <div class="pb-2">
            <p class="text-xs text-grey-50">
              {{ item.layer_alias }}
            </p>
            <p class="text-2xs text-grey-400">{{ item.geometry_type }}</p>
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
        </TransitionRoot>
      </template>
    </div>
  </div>
</template>
