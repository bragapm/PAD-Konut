<script setup lang="ts">
import type { Attachment } from "~/utils/types";
import KeenSlider, {
  type KeenSliderInstance,
  type KeenSliderPlugin,
} from "keen-slider";
import IcArrowReg from "~/assets/icons/ic-arrow-reg.svg";
import IcCross from "~/assets/icons/ic-cross.svg";
import IcRectangleList from "~/assets/icons/ic-rectangle-list.svg";
import type { GeoJSONSource } from "maplibre-gl";
import { useQuery } from "@tanstack/vue-query";

type DetailData = {
  markdown: string | null;
  attachments: Attachment[];
  gallery: string[];
};

// const showPdf = ref(false);
const mapRefStore = useMapRef();
const ResizePlugin: KeenSliderPlugin = (slider) => {
  const observer = new ResizeObserver(function () {
    slider.update();
  });

  slider.on("created", () => {
    observer.observe(slider.container);
  });
  slider.on("destroyed", () => {
    observer.unobserve(slider.container);
  });
};

const current = ref<number>(0);
const sliderContainer = ref<HTMLElement | null>(null);
let slider: KeenSliderInstance | null = null;
let nextImage: () => void;
let prevImage: () => void;

watchEffect((onInvalidate) => {
  if (sliderContainer.value) {
    slider = new KeenSlider(
      sliderContainer.value!,
      {
        loop: true,
        initial: 0,
        slideChanged: (s) => {
          current.value = s.track.details.rel;
        },
      },
      [ResizePlugin]
    );
    nextImage = () => {
      slider?.update();
      slider?.next();
    };

    prevImage = () => {
      slider?.update();
      slider?.prev();
    };
  }

  onInvalidate(() => {
    slider?.destroy();
  });
});

const isOpen = ref(false);

const openModal = (idx: number) => {
  isOpen.value = true;
  if (idx) {
    setTimeout(() => {
      slider?.update();
      slider?.moveToIdx(idx);
    }, 500);
  } else {
    current.value = 0;
  }
};

const featureStore = useFeature();
const { feature } = storeToRefs(featureStore);
const {
  data: detailData,
  error: detailError,
  isFetching: isDetailFetching,
  isError: isDetailError,
} = useQuery({
  queryKey: [
    `/panel/feature-detail`,
    feature.value?.tableName,
    feature.value?.rowId,
  ],
  queryFn: async ({ queryKey }) => {
    const res = await $fetch<DetailData>(queryKey.join("/"));
    // console.log(res);
    return res;
  },
  placeholderData: { markdown: null, attachments: [], gallery: [] },
});

const clearSelection = () => {
  (mapRefStore.map!.getSource("highlight") as GeoJSONSource)?.setData(
    emptyFeatureCollection
  );
  pauseAllAnimation();
  featureStore.setRightSidebar("");
  setTimeout(() => {
    featureStore.setFeature(undefined);
  }, 500);
};

const isPdf = (url: string) => {
  if (url.includes("drive.google.com")) {
    return url.replace("/view", "/preview");
  }
  return url.includes(".pdf");
};
</script>

<template>
  <div class="flex justify-between items-center m-3">
    <h2 class="text-white">Feature Detail</h2>
    <IcCross
      role="button"
      @click="featureStore.setRightSidebar('')"
      :fontControlled="false"
      class="w-3 h-3 rotate-180 text-grey-50"
    />
  </div>
  <hr class="mx-3" />
  <div class="grow overflow-y-auto px-3 my-3">
    <div
      v-if="!featureStore.feature"
      class="h-full flex flex-col justify-center items-center text-white text-center gap-3"
    >
      <IcRectangleList
        :fontControlled="false"
        class="w-12 h-12 text-brand-500"
      />
      <h4 class="text-sm text-grey-50">Feature Detail will be shown here.</h4>
      <p class="text-xs text-grey-400">
        Please click layer feature first to show the feature properties here.
      </p>
    </div>

    <div
      v-else-if="!detailData && isDetailFetching"
      class="h-full animate-pulse space-y-3"
    >
      <div class="w-full h-8 bg-grey-700 rounded-lg"></div>
      <div class="w-full h-8 bg-grey-700 rounded-lg"></div>
      <div class="w-full h-44 bg-grey-700 rounded-lg"></div>
      <div class="w-full h-4 bg-grey-700 rounded-lg"></div>
      <div class="w-full h-4 bg-grey-700 rounded-lg"></div>
      <div class="w-full h-4 bg-grey-700 rounded-lg"></div>
      <div class="w-full h-4 bg-grey-700 rounded-lg"></div>
      <div class="w-full h-4 bg-grey-700 rounded-lg"></div>
      <div class="w-full h-4 bg-grey-700 rounded-lg"></div>
    </div>

    <div
      v-else-if="
        !detailData ||
        (detailData.markdown === null &&
          detailData.attachments.length === 0 &&
          detailData.gallery.length === 0) ||
        isDetailError
      "
      class="h-full flex flex-col justify-center items-center text-white text-center gap-3"
    >
      <IcRectangleList
        :fontControlled="false"
        class="w-12 h-12 text-brand-500"
      />
      <h4 class="text-sm text-grey-50">Content structure has not been set.</h4>
      <p class="text-xs text-grey-400">
        Please contact data owner to set content structure for this layer
        feature detail.
      </p>
    </div>

    <template v-else-if="detailData">
      <MapMarkdownRenderer
        v-if="detailData.markdown"
        :source="detailData.markdown"
      />

      <div v-if="detailData.gallery?.filter((item) => item !== '').length">
        <p class="text-white text-sm my-3">Image Gallery</p>
        <ul class="flex space-x-1 relative">
          <img
            role="button"
            @click="() => openModal(idx)"
            class="rounded-sm w-16 h-16 object-cover"
            v-for="(source, idx) of detailData.gallery
              .map((src, idx) =>
                idx > 3 ? [] : src.includes(',') ? src.split(',') : src
              )
              .flat()"
            :key="idx"
            :src="source"
          />
          <button
            v-if="
              detailData.gallery
                .map((src) => (src.includes(',') ? src.split(',') : src))
                .flat().length > 4
            "
            @click="() => openModal(4)"
            class="absolute top-0 right-1 w-16 h-16 bg-grey-900/30 flex justify-center items-center text-white text-2xs"
          >
            More
          </button>
        </ul>
      </div>

      <ul class="mt-3 space-y-3" v-if="detailData.attachments?.length">
        <p class="text-white text-sm">Attachment</p>
        <template
          v-for="(attachment, idx) in detailData.attachments"
          :key="idx"
        >
          <MapAttachmentLink
            v-if="attachment.url !== '#'"
            :title="attachment.title"
            :description="attachment.description"
            :url="attachment.url"
            :icon="attachment.icon"
          />
          <p v-else class="text-white text-sm">-</p>
        </template>

        <!-- Dynamically show PDF viewer for PDF attachments -->
        <!-- <UButton
          v-if="isPdf(detailData.attachments[0].url)"
          color="primary"
          @click="showPdf = true"
        >
          Open PDF Viewer
        </UButton>

        <MapPDFViewer
          v-if="isPdf(detailData.attachments[0].url) && showPdf"
          v-model="showPdf"
          header-label="PDF Viewer - Sertifikat Tanah"
          :title="detailData.attachments[0].title"
          :file-name="detailData.attachments[0].title"
          :pdf-url="detailData.attachments[0].url"
        /> -->
      </ul>
    </template>
  </div>

  <UButton
    v-if="featureStore.feature && detailData"
    label="Clear Feature Selection"
    variant="outline"
    color="brand"
    class="m-3 rounded-xl"
    @click="clearSelection"
  >
  </UButton>

  <UModal
    v-if="detailData"
    v-model:open="isOpen"
    :ui="{ content: 'bg-grey-900 max-w-2xl' }"
  >
    <template #content>
      <div class="p-3">
        <div
          class="text-base font-medium leading-6 flex justify-between items-center"
        >
          <h2 class="text-white">Image Gallery</h2>
          <IcCross
            role="button"
            @click="isOpen = false"
            :fontControlled="false"
            class="w-3 h-3 rotate-180 text-grey-50"
          />
        </div>
        <div class="relative w-full my-3">
          <div
            ref="sliderContainer"
            class="keen-slider h-full w-full rounded-lg"
          >
            <img
              class="keen-slider__slide object-cover min-w-full max-w-full"
              v-for="(source, idx) of detailData.gallery
                .map((src) => (src.includes(',') ? src.split(',') : src))
                .flat()"
              :key="idx"
              :src="source"
              alt="Gallery image"
            />
          </div>

          <button
            v-if="detailData.gallery.length"
            @click="prevImage"
            class="absolute left-8 top-1/2 -translate-y-1/2 flex justify-center items-center border rounded-lg bg-black opacity-40"
          >
            <IcArrowReg
              :fontControlled="false"
              class="w-5 h-5 m-1 -rotate-90 text-grey-50"
            />
          </button>

          <button
            v-if="detailData.gallery.length"
            @click="nextImage"
            class="absolute right-8 top-1/2 -translate-y-1/2 flex justify-center items-center border rounded-lg bg-black opacity-40"
          >
            <IcArrowReg
              :fontControlled="false"
              class="w-5 h-5 m-1 rotate-90 text-grey-50"
            />
          </button>
        </div>
        <ul class="flex space-x-1 overflow-x-scroll">
          <img
            role="button"
            @click="() => slider?.moveToIdx(idx)"
            :class="[
              'rounded-sm w-16 h-16 object-cover',
              idx === current && 'border-4 border-brand-500',
            ]"
            v-for="(source, idx) of detailData.gallery
              .map((src, idx) =>
                idx > 3 ? [] : src.includes(',') ? src.split(',') : src
              )
              .flat()"
            :key="idx"
            :src="source"
            alt="Thumbnail"
          />
        </ul>
      </div>
    </template>
  </UModal>
</template>

<style>
@import url("keen-slider/keen-slider.css");
</style>
