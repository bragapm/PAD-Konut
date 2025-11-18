<script lang="ts" setup>
import {
  convertMapboxExpressionToState,
  convertStateToMapboxExpression,
} from "~/utils/mapStyling";

const props = defineProps<{
  layerName: string;
  layerId: string;
  initialAttribute: string;
  initialColorExpression: string;
  onColorChange: (expr: string) => void;
}>();

const authStore = useAuth();
const mapStore = useMapRef();
const { map } = storeToRefs(mapStore);

const referenceColumn = ref<string>(props.initialAttribute);
const columnList = ref<{ field: string; type: string }[] | null>(null);
const categoricalColor = ref<[string, string][]>(
  props.initialColorExpression?.startsWith("[")
    ? convertMapboxExpressionToState(props.initialColorExpression)
    : []
);

const distinctCount = ref<number>(0);
const isFetchingDistinct = ref(false);
const categoryLists = ref<any[]>([]);

const updateSourceTile = (attribute: string) => {
  if (map.value)
    (map.value.getSource(props.layerId) as any)!.setTiles([
      window.location.origin +
        "/panel/mvt/" +
        props.layerName +
        "?z={z}&x={x}&y={y}" +
        (attribute ? "&attributes=" + attribute : "") +
        (authStore.accessToken ? "&access_token=" + authStore.accessToken : ""),
    ]);
};

watch(referenceColumn, (newColumn) => {
  categoricalColor.value = [];
  updateSourceTile(newColumn);
});

watch(
  [referenceColumn, columnList],
  async ([newColumn, newColumnList]) => {
    if (!newColumn || !props.layerName) {
      distinctCount.value = 0;
      categoryLists.value = [];
      return;
    }

    try {
      isFetchingDistinct.value = true;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authStore.accessToken) {
        headers["Authorization"] = `Bearer ${authStore.accessToken}`;
      }

      const response = await $fetch<{
        data: {
          countDistinct: { [key: string]: number };
          min: { [key: string]: number };
          max: { [key: string]: number };
        }[];
      }>(`/panel/items/${props.layerName}`, {
        method: "GET",
        headers,
        query: {
          aggregate: JSON.stringify({
            countDistinct: [newColumn],
            min: [newColumn],
            max: [newColumn],
          }),
        },
      });

      const resDistinctCount = Number(
        response.data[0]?.countDistinct[newColumn] || 0
      );
      distinctCount.value = resDistinctCount;
      const min = Number(response.data[0]?.min[newColumn] || 0);
      const max = Number(response.data[0]?.max[newColumn] || 0);
      const columnData = newColumnList?.find(
        (column) => column.field === newColumn
      );

      // If distinctCount <= 50, fetch grouped data
      if (resDistinctCount > 0 && resDistinctCount <= 50) {
        if (columnData?.type === "float") {
          categoryLists.value = generateEqualIntervals(
            min,
            max,
            resDistinctCount
          );
          if (!categoricalColor.value.length) {
            const colors = distinctHexColors(categoryLists.value.length);

            const categoricalColorData: [string, string][] =
              categoryLists.value.map((category, index) => [
                String(category),
                colors[index]!,
              ]);

            categoricalColor.value = categoricalColorData;
          }
        } else {
          const groupedResponse = await $fetch<{
            data: { [key: string]: any }[];
          }>(`/panel/items/${props.layerName}`, {
            method: "GET",
            headers,
            query: {
              groupBy: [newColumn],
            },
          });

          categoryLists.value = groupedResponse.data.map((el) => el[newColumn]);
          if (!categoricalColor.value.length) {
            const colors = distinctHexColors(categoryLists.value.length);

            const categoricalColorData: [string, string][] =
              categoryLists.value.map((category, index) => [
                String(category),
                colors[index]!,
              ]);
            categoricalColor.value = categoricalColorData;
          }
        }
      } else {
        categoryLists.value = [];
      }
    } catch (error) {
      console.error("Error fetching distinct count:", error);
      distinctCount.value = 0;
      categoryLists.value = [];
    } finally {
      isFetchingDistinct.value = false;
    }
  },
  { immediate: true }
);

watch(categoricalColor, (newValue) => {
  if (newValue.length > 0) {
    if (newValue[0]![0].includes(" - ")) {
      const expr = JSON.stringify(
        convertStateToMapRangeExpression(newValue, referenceColumn.value)
      );

      props.onColorChange(expr);
    } else {
      const expr = JSON.stringify(
        convertStateToMapboxExpression(newValue, referenceColumn.value)
      );

      props.onColorChange(expr);
    }
  } else {
    props.onColorChange("#ffffff");
  }
});
</script>

<template>
  <div class="flex flex-col gap-1">
    <!-- column input section -->
    <div class="flex gap-1 items-center w-full">
      <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
        Column
      </p>
      <MapManagementColumnSelect
        v-model="referenceColumn"
        :layer-name="layerName"
        :enabled="true"
        @update:columnList="columnList = $event"
        class="flex-1"
      />
    </div>

    <!-- categories input section -->
    <div v-if="categoryLists.length > 0" class="flex gap-1 items-center w-full">
      <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
        Categories
      </p>
      <MapManagementCategoriesPopover
        :categories="categoryLists"
        :initialData="categoricalColor"
        @update-categorical-color="categoricalColor = $event"
      />
    </div>

    <!-- color input section -->
    <div
      v-if="categoricalColor.length > 0"
      class="flex gap-1 items-center w-full"
    >
      <p class="text-grey-400 text-2xs font-normal leading-4 w-16 shrink-0">
        Color
      </p>
      <MapManagementColorPopover
        :colorLists="categoricalColor"
        @update-categorical-color="categoricalColor = $event"
      />
    </div>
  </div>
</template>
