<script setup lang="ts">
import type {
  GeoJSONSource,
  MapGeoJSONFeature,
  MapMouseEvent,
  PointLike,
} from "maplibre-gl";
import { ref } from "vue";
import maplibregl from "maplibre-gl";
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";
import IcCross from "~/assets/icons/ic-cross.svg";
import KeenSlider, { type KeenSliderInstance } from "keen-slider";
import { showHighlightLayer } from "~/utils/index";

const mapRefStore = useMapRef();
const featureStore = useFeature();
const { map } = storeToRefs(mapRefStore);
const mapLayerStore = useMapLayer();

// Slider Logic
const sliderContainer = ref<HTMLElement | null>(null);
let slider: KeenSliderInstance | null = null;
let nextImage: (e: MouseEvent) => void;
let prevImage: (e: MouseEvent) => void;

onMounted(() => {
  if (sliderContainer.value) {
    slider = new KeenSlider(
      sliderContainer.value!,
      {
        loop: true,
      },
      []
    );
    nextImage = (e: MouseEvent) => {
      slider?.update();
      slider?.next();
    };

    prevImage = (e: MouseEvent) => {
      slider?.update();
      slider?.prev();
    };
  }
});

// Popup Logic
export type PopupItem = {
  layerId: string;
  layerType: string;
  tableName: string;
  rowId: string | number;
  clickPopupColumns: string[] | null;
  imageColumns: string[] | null;
  featureDetailColumns: string[] | null;
  geometry: GeoJSON.Geometry;
};

const contentRef = ref<HTMLDivElement>();
const popupItems = ref<PopupItem[]>([]);
const popupRef = ref<maplibregl.Popup>();
const features = ref<any[]>([]);
const isFetching = ref(false);
const featureIndex = ref(0);

watchEffect(() => {
  if (!map.value) return;
  map.value.on("click", (e: MapMouseEvent & Object) => {
    // The 'point' to query for features
    const point = [e.point.x, e.point.y];
    const filterLayers = mapLayerStore.groupedActiveLayers
      ?.map(({ layerLists }) => layerLists)
      .flat()
      .filter((e) => Boolean(e.click_popup_columns));

    // Query all the rendered features at the clicked point
    // across all layers using queryRenderedFeatures
    const features = map.value!.queryRenderedFeatures(point as PointLike, {
      layers: filterLayers?.map(({ layer_id }) => layer_id),
    });

    const featureList = features.map((feature: MapGeoJSONFeature) => {
      const foundLayer = filterLayers?.find(
        (layer) => layer.layer_id === feature.layer.id
      )!;
      return {
        layerId: feature.layer.id,
        layerType: feature.layer.type,
        tableName: feature.sourceLayer,
        rowId: feature.id,
        clickPopupColumns: foundLayer.click_popup_columns,
        featureDetailColumns: foundLayer.feature_detail_columns,
        imageColumns: foundLayer.image_columns ?? [],
      };
    });

    popupItems.value = featureList as PopupItem[];
    if (popupRef.value) {
      popupRef.value.remove();
    }
    if (featureList.length && contentRef.value) {
      popupRef.value = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        closeOnMove: false,
        className: "geod-popup",
      })
        .setLngLat(e.lngLat)
        .setMaxWidth("400px")
        .setDOMContent(contentRef.value)
        .addTo(map.value!);
      featureStore.setRightSidebar("");
      setTimeout(
        () => featureStore.setFeature(featureList[0] as PopupItem),
        500
      );
      slider?.moveToIdx(0);
    }
  });
});

onUnmounted(() => {
  slider?.destroy();
  popupRef.value?.remove();
});

watchEffect(async () => {
  if (popupItems.value?.length) {
    const fetchFeature = async (popupItem: PopupItem) => {
      try {
        const querystring = new URLSearchParams({
          fields: [
            "geom",
            ...popupItem.clickPopupColumns!,
            ...popupItem.imageColumns!,
          ]!.join(","),
        } as Record<string, string>);
        const response: { data: any } = await $fetch(
          `/panel/items/${popupItem.tableName}/${popupItem.rowId}?${querystring}`
        );
        return response.data;
      } catch (error) {
        return {};
      }
    };
    isFetching.value = true;
    const data = await Promise.all(
      popupItems.value.map((item) => fetchFeature(item))
    );
    isFetching.value = false;
    features.value = data;
    featureIndex.value = 0;
    slider?.update();
    showHighlightLayer(map.value!, data as any[], popupItems.value[0].layerId);
  }
});

const nextFeature = () => {
  if (featureIndex.value === popupItems.value.length - 1) return;
  featureIndex.value++;
  const newData: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: features.value
      .filter((_, idx) => idx === featureIndex.value)
      .map(({ geom, ...rest }) => ({
        type: "Feature",
        properties: rest,
        geometry: geom,
      })),
  };
  (map.value!.getSource("highlight") as GeoJSONSource).setData(newData);
  moveHighlightLayer(map.value!, popupItems.value[featureIndex.value].layerId);
  slider?.moveToIdx(0);
  slider?.update();
  featureStore.setFeature(popupItems.value[featureIndex.value]);
};

const prevFeature = () => {
  if (featureIndex.value === 0) return;
  featureIndex.value--;
  const newData: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: features.value
      .filter((_, idx) => idx === featureIndex.value)
      .map(({ geom, ...rest }) => ({
        type: "Feature",
        properties: rest,
        geometry: geom,
      })),
  };
  (map.value!.getSource("highlight") as GeoJSONSource).setData(newData);
  moveHighlightLayer(map.value!, popupItems.value[featureIndex.value].layerId);
  slider?.moveToIdx(0);
  slider?.update();
  featureStore.setFeature(popupItems.value[featureIndex.value]);
};

const removePopup = () => {
  popupRef.value!.remove();
  (map.value!.getSource("highlight") as GeoJSONSource).setData(
    emptyFeatureCollection
  );
  pauseAllAnimation();
};
</script>

<template>
  <div class="hidden">
    <div ref="contentRef">
      <section
        class="flex w-72 flex-col items-center justify-center gap-3 p-3 overflow-hidden bg-grey-800 rounded-xs text-grey-100"
      >
        <header
          class="flex justify-between items-center w-full border-b pb-1 border-grey-700"
        >
          <h4 class="text-xs font-medium">Detail Popup</h4>
          <IcCross
            role="button"
            :fontControlled="false"
            @click="removePopup"
            class="-mr-1 w-5 h-4 px-1 py-0.5 text-grey-400"
          ></IcCross>
        </header>

        <h4 class="text-xs font-normal text-left w-full">
          {{ featureIndex + 1 }}/{{ features.length }} Layer Selection
        </h4>

        <div
          :class="`relative w-full ${
            popupItems[featureIndex]?.imageColumns?.length ? 'h-40' : 'h-0'
          }`"
        >
          <div
            ref="sliderContainer"
            class="keen-slider h-full w-full rounded-xs"
          >
            <img
              class="keen-slider__slide object-cover min-w-full max-w-full"
              v-for="(val, idx) of Object.keys(features[featureIndex] ?? {})
                .filter((k) =>
                  popupItems[featureIndex]?.imageColumns?.includes(k)
                )
                .map((k) =>
                  features[featureIndex][k].includes(',')
                    ? features[featureIndex][k].split(',')
                    : features[featureIndex][k]
                )
                .flat()"
              :key="idx"
              :src="val"
            />
          </div>

          <button
            v-if="
              Object.keys(features[featureIndex] ?? {}).filter((k) =>
                popupItems[featureIndex]?.imageColumns?.includes(k)
              ).length
            "
            @click="prevImage"
            class="absolute left-2 top-1/2 -translate-y-1/2 flex justify-center items-center border rounded-xs bg-black opacity-40"
          >
            <IcArrowReg
              :fontControlled="false"
              class="w-5 h-5 m-1 -rotate-90 text-grey-50"
            />
          </button>

          <button
            v-if="
              Object.keys(features[featureIndex] ?? {}).filter((k) =>
                popupItems[featureIndex]?.imageColumns?.includes(k)
              ).length
            "
            @click="nextImage"
            class="absolute right-2 top-1/2 -translate-y-1/2 flex justify-center items-center border rounded-xs bg-black opacity-40"
          >
            <IcArrowReg
              :fontControlled="false"
              class="w-5 h-5 m-1 rotate-90 text-grey-50"
            />
          </button>
        </div>

        <article
          class="w-full space-y-2 max-h-40 overflow-y-scroll"
          v-if="popupItems?.length"
        >
          <h5 class="text-xs font-medium">Layer</h5>
          <div class="flex text-grey-400 space-x-2">
            <p class="text-2xs w-1/4">Name</p>
            <p class="text-xs">: {{ popupItems[featureIndex].tableName }}</p>
          </div>
          <div class="flex text-grey-400 space-x-2">
            <p class="text-2xs w-1/4">Type</p>
            <p class="text-xs">: {{ popupItems[featureIndex].layerType }}</p>
          </div>

          <h5 class="text-xs font-medium">Feature</h5>
          <template v-if="isFetching">
            <div
              v-for="(_, idx) in Array.from({ length: 3 })"
              :key="idx"
              class="flex space-x-2 animate-pulse"
            >
              <div class="w-1/4 h-4 bg-grey-700 rounded-xs"></div>
              <div class="grow h-4 bg-grey-700 rounded-xs"></div>
            </div>
          </template>
          <template v-else>
            <div
              v-for="key of Object.keys(features[featureIndex] ?? {}).filter(
                (k) => popupItems[featureIndex].clickPopupColumns?.includes(k)
              )"
              :key="key"
              class="flex text-grey-400 space-x-2"
            >
              <p class="text-2xs w-1/4">{{ key }}</p>
              <p class="text-xs">: {{ features[featureIndex][key] }}</p>
            </div>
          </template>
        </article>

        <footer class="w-full flex items-center pt-2 space-x-2">
          <button
            :disabled="popupItems?.length < 2 || featureIndex === 0"
            @click="prevFeature"
            class="rounded-xs border w-9 h-9 flex justify-center items-center -rotate-90 text-grey-400 border-grey-400 disabled:text-grey-600 disabled:border-grey-600"
          >
            <IcArrowReg :fontControlled="false" />
          </button>

          <button
            @click="
              () => {
                featureStore.setRightSidebar('feature');
                popupRef!.remove()             }
            "
            class="rounded-xs grow h-9 bg-brand-600 text-sm font-medium"
          >
            More Detail
          </button>
          <button
            :disabled="
              popupItems?.length < 2 || featureIndex === features.length - 1
            "
            @click="nextFeature"
            class="rounded-xs border w-9 h-9 flex justify-center items-center rotate-90 text-grey-400 border-grey-400 disabled:text-grey-600 disabled:border-grey-600"
          >
            <IcArrowReg :fontControlled="false" />
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>

<style>
@import url("keen-slider/keen-slider.css");
</style>
