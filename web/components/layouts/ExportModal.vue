<script lang="ts" setup>
import html2canvas from "html2canvas-pro";
import LogoGeodashboard from "@/assets/images/logo-geodashboard.png";
import LogoBraga from "@/assets/images/logo-braga.png";
const mapRefStore = useMapRef();
const { map, geolocateRef } = storeToRefs(mapRefStore);

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();
const isOpenModal = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const captureSnapshot = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!map.value) return resolve(null);

    map.value.once("render", () => {
      try {
        const canvas = map.value!.getCanvas();
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        // if the canvas is tainted by CORS this will fail
        console.error("captureSnapshot error", err);
        resolve(null);
      }
    });
    // trigger a repaint so we get the latest frame
    map.value.triggerRepaint();
  });
};

const snapshot = ref<null | string>(null);

watchEffect(async () => {
  if (isOpenModal.value) {
    updateScaleBar();
    const getSnapshot = await captureSnapshot();
    snapshot.value = getSnapshot;
  }
});

const contentRef = ref<HTMLElement | null>(null);

const size = ref<any>({ id: "a4", label: "A4", value: "a4" });
const sizeOptions = [
  { id: "4:3", label: "4:3", value: [200, 150] },
  { id: "16:9", label: "16:9", value: [160, 90] },
  { id: "a1", label: "A1", value: "a1" },
  { id: "a2", label: "A2", value: "a2" },
  { id: "a3", label: "A3", value: "a3" },
  { id: "a4", label: "A4", value: "a4" },
];

const orientation = ref<"landscape" | "portrait">("landscape");
const orientationOptions: { value: "landscape" | "portrait"; label: string }[] =
  [
    { value: "landscape", label: "Landscape" },
    { value: "portrait", label: "Portrait" },
  ];

const format = ref<"pdf" | "png" | "jpeg">("pdf");
const formatOptions: { value: "pdf" | "png" | "jpeg"; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
];

const resolution = ref<number>(192); //dpi number
const resolutionOptions: { value: number; label: string }[] = [
  { value: 96, label: "96dpi" },
  { value: 192, label: "192dpi" },
];

const isCustomResolution = ref(false);
const customResInput = ref<ComponentPublicInstance | null>(null);

const isPrimaryLogo = ref<boolean>(true);
const isSecondaryLogo = ref<boolean>(true);
const isTitle = ref<boolean>(true);
const isDescription = ref<boolean>(true);
const isFooter = ref<boolean>(true);
const isScale = ref<boolean>(true);
const isLegend = ref<boolean>(true);

const contentTitle = ref<string>(
  "Map Title Mapping How Neighborhoods Shape Businesses"
);
const contentDescription = ref<string>("Map Description here");
const contentFooter = ref<string>(
  "GeoDashboard, Logbook, by Braga Technologies, 2024."
);

const aspectRatio = computed(() => {
  const sizes: Record<string, [number, number]> = {
    a4: [210, 297],
    a3: [297, 420],
    a2: [420, 594],
    a1: [594, 841],
    "16:9": [9, 16],
    "4:3": [3, 4],
  };

  const selectedSize = sizes[size.value.id] ?? [1, 1];
  const [w, h] =
    orientation.value === "portrait"
      ? selectedSize
      : ([selectedSize[1], selectedSize[0]] as [number, number]);

  return w / h;
});

const isExporting = ref(false);

const exportToPDF = async (format: "pdf" | "png" | "jpeg", dpi: number) => {
  if (!contentRef.value) return;

  isExporting.value = true;
  try {
    const { jsPDF } = await import("jspdf");

    const scale = dpi / 96; // Convert resolution(DPI) to html2canvas scale
    const canvas = await html2canvas(contentRef.value, {
      scale,
      useCORS: true,
    });

    if (format === "pdf") {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: orientation.value,
        unit: "mm",
        format: size.value.value,
      });

      // get full page size
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      //   const pdfWidth = pdf.internal.pageSize.getWidth();
      //   const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("geodashboard.pdf");
    } else {
      // 2B. Export as PNG or JPEG
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const dataURL = canvas.toDataURL(mime, 1.0);

      // Trigger download
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `geodashboard.${format}`;
      link.click();
    }
  } finally {
    isExporting.value = false;
  }
};

// const exportToPDF = async () => {
//   if (!contentRef.value) return;

//   const { jsPDF } = await import("jspdf");

//   // 1️⃣ Get map snapshot
//   const getMapImage = async (): Promise<string | null> => {
//     return new Promise((resolve) => {
//       if (!map.value) return resolve(null);

//       map.value.once("render", () => {
//         console.log("map once");
//         const canvas = map.value.getCanvas();
//         resolve(canvas.toDataURL("image/png"));
//       });
//       map.value.triggerRepaint();
//     });
//   };
//   const mapImg = await getMapImage();

//   // 2️⃣ Clone the content so we can replace <Map> with <img>
//   const clone = contentRef.value.cloneNode(true) as HTMLElement;
//   const mapDiv = clone.querySelector("div"); // first child inside <Map>
//   if (mapImg && mapDiv) {
//     const img = document.createElement("img");
//     img.src = mapImg;
//     img.style.width = "100%";
//     img.style.height = "100%";
//     mapDiv.replaceWith(img);
//   }

//   // 🔑 2.5 Insert clone offscreen so html2canvas can resolve styles
//   clone.style.position = "fixed";
//   clone.style.top = "-10000px"; // move it offscreen
//   document.body.appendChild(clone);

//   // 3️⃣ Render cloned DOM to canvas
//   const canvas = await html2canvas(clone, { scale: 2, useCORS: true });

//   // Cleanup
//   document.body.removeChild(clone);

//   // 4️⃣ Add to PDF
//   const imgData = canvas.toDataURL("image/png");
//   const pdf = new jsPDF("landscape", "mm", "a4");
//   const pdfWidth = pdf.internal.pageSize.getWidth();
//   const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
//   pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
//   pdf.save("content.pdf");
// };

const mapImageRef = ref<HTMLImageElement | null>(null);

function getNiceDistance(distance: number): number {
  const pow10 = Math.pow(10, Math.floor(Math.log10(distance)));
  const d = distance / pow10;
  let nice;
  if (d < 1.5) nice = 1;
  else if (d < 3.5) nice = 2;
  else if (d < 7.5) nice = 5;
  else nice = 10;
  return nice * pow10;
}

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

const barWidth = ref<any>();
const distance = ref<any>();

function updateScaleBar() {
  const zoom = map.value!.getZoom();
  const bottomLat = map.value!.getBounds().getSouth();
  const earthCircumference = 40075016.686;
  const tileSize = 512;

  // meters per pixel at bottom latitude
  const metersPerPixel =
    (earthCircumference * Math.cos((bottomLat * Math.PI) / 180)) /
    (Math.pow(2, zoom) * tileSize);

  // raw distance for 100px bar
  const rawDistance = metersPerPixel * 100;
  const niceDistance = getNiceDistance(rawDistance);

  // pixels for that nice distance
  const barPixelLength = niceDistance / metersPerPixel;
  barWidth.value = barPixelLength;
  distance.value = formatDistance(niceDistance);
}

const enableCustomResolution = async () => {
  isCustomResolution.value = true;
  await nextTick(); // wait until input is enabled
  const inputEl = customResInput.value?.$el?.querySelector("input");
  inputEl?.focus();
};
</script>

<template>
  <UModal
    v-model:open="isOpenModal"
    :ui="{
      content: 'h-[95vh] max-w-[95vw] w-[95vw] bg-grey-900 divide-y-0',
      header: 'px-3 pt-3 pb-0 sm:px-3 min-h-0',
      body: 'p-3 sm:p-3',
      footer: 'px-3 pb-3 pt-0 sm:px-3',
    }"
  >
    <template #header>
      <div>
        <p class="text-xs text-grey-50 font-medium">Export Map</p>
        <p class="text-2xs text-grey-500">
          Share map by exporting it into preferred file format
        </p>
      </div>
    </template>
    <template #body>
      <div class="flex gap-2 h-full">
        <div class="w-56 space-y-2">
          <div
            class="border border-grey-800 rounded-sm px-3 pb-3 pt-2 space-y-2"
          >
            <div class="space-y-[2px]">
              <p class="text-2xs text-grey-50">Ratio</p>
              <div class="flex gap-1">
                <UButton
                  v-for="option in sizeOptions"
                  :key="option.id"
                  @click="
                    () => {
                      size = option;
                    }
                  "
                  :color="size.id === option.id ? 'brand' : 'gray'"
                  variant="outline"
                  class="flex-1 text-2xs py-1 px-2 space-x-1 whitespace-nowrap rounded-sm"
                >
                  {{ option.label }}
                </UButton>
              </div>
            </div>

            <div class="space-y-[2px]">
              <p class="text-2xs text-grey-50">Orientation</p>
              <div class="grid grid-cols-2 gap-1">
                <UButton
                  v-for="option in orientationOptions"
                  :key="option.value"
                  @click="
                    () => {
                      orientation = option.value;
                    }
                  "
                  :color="orientation === option.value ? 'brand' : 'gray'"
                  variant="outline"
                  class="flex-1 text-2xs py-1 px-2 space-x-1 whitespace-nowrap rounded-sm"
                >
                  {{ option.label }}
                </UButton>
              </div>
            </div>

            <div class="space-y-[2px]">
              <p class="text-2xs text-grey-50">Format</p>
              <div class="grid grid-cols-3 gap-1">
                <UButton
                  v-for="option in formatOptions"
                  :key="option.value"
                  @click="
                    () => {
                      format = option.value;
                    }
                  "
                  :color="format === option.value ? 'brand' : 'gray'"
                  variant="outline"
                  class="flex-1 text-2xs py-1 px-2 space-x-1 whitespace-nowrap rounded-sm"
                >
                  {{ option.label }}
                </UButton>
              </div>
            </div>

            <div class="space-y-[2px]">
              <p class="text-2xs text-grey-50">Resolution</p>
              <div class="grid grid-cols-3 gap-1">
                <UButton
                  v-for="option in resolutionOptions"
                  :key="option.value"
                  @click="
                    () => {
                      isCustomResolution = false;
                      resolution = option.value;
                    }
                  "
                  :color="
                    resolution === option.value && isCustomResolution === false
                      ? 'brand'
                      : 'gray'
                  "
                  variant="outline"
                  class="flex-1 text-2xs py-1 px-2 space-x-1 whitespace-nowrap rounded-sm"
                >
                  {{ option.label }}
                </UButton>
                <UButton
                  v-if="isCustomResolution === false"
                  @click="enableCustomResolution"
                  :color="isCustomResolution ? 'brand' : 'gray'"
                  variant="outline"
                  class="flex-1 text-2xs py-1 px-2 space-x-1 whitespace-nowrap rounded-sm"
                >
                  custom
                </UButton>
                <UInput
                  v-else
                  ref="customResInput"
                  type="number"
                  v-model="resolution"
                  size="xs"
                  ><template #trailing
                    ><p class="text-grey-500 text-2xs">dpi</p></template
                  >
                </UInput>
              </div>
            </div>
          </div>
          <div
            class="border border-grey-800 rounded-sm px-3 pb-3 pt-2 space-y-2"
          >
            <div class="text-2xs">
              <p class="text-grey-50 font-medium">Select Content</p>
              <p class="text-grey-500">
                Selected contents will be shown on top of the exported map
              </p>
            </div>
            <div class="grid grid-cols-2 gap-1">
              <UButton
                @click="
                  () => {
                    isPrimaryLogo = !isPrimaryLogo;
                  }
                "
                :color="isPrimaryLogo ? 'brand' : 'gray'"
                variant="outline"
                class="text-2xs py-1 px-2 whitespace-nowrap rounded-sm"
              >
                Primary Logo
              </UButton>
              <UButton
                @click="
                  () => {
                    isSecondaryLogo = !isSecondaryLogo;
                  }
                "
                :color="isSecondaryLogo ? 'brand' : 'gray'"
                variant="outline"
                class="text-2xs py-1 px-2 whitespace-nowrap rounded-sm"
              >
                Secondary Logo
              </UButton>
              <UButton
                @click="
                  () => {
                    isTitle = !isTitle;
                  }
                "
                :color="isTitle ? 'brand' : 'gray'"
                variant="outline"
                class="text-2xs py-1 px-2 whitespace-nowrap rounded-sm"
              >
                Title
              </UButton>
              <UButton
                @click="
                  () => {
                    isDescription = !isDescription;
                  }
                "
                :color="isDescription ? 'brand' : 'gray'"
                variant="outline"
                class="text-2xs py-1 px-2 whitespace-nowrap rounded-sm"
              >
                Description
              </UButton>
            </div>
            <UTextarea
              v-model="contentTitle"
              color="gray"
              variant="outline"
              class="w-full"
              size="2xs"
              autoresize
            />
            <UTextarea
              v-model="contentDescription"
              color="gray"
              variant="outline"
              class="w-full"
              size="2xs"
              autoresize
            />
            <UButton
              @click="
                () => {
                  isFooter = !isFooter;
                }
              "
              :color="isFooter ? 'brand' : 'gray'"
              variant="outline"
              class="w-full text-2xs py-1 px-2 whitespace-nowrap rounded-sm"
            >
              Footer (Credit, Attribution, Year, etc)
            </UButton>
            <UTextarea
              v-model="contentFooter"
              color="gray"
              variant="outline"
              class="w-full"
              size="2xs"
              autoresize
            />
            <div class="grid grid-cols-2 gap-1">
              <UButton
                @click="
                  () => {
                    isScale = !isScale;
                  }
                "
                :color="isScale ? 'brand' : 'gray'"
                variant="outline"
                class="text-2xs py-1 px-2 whitespace-nowrap rounded-sm"
              >
                Scale
              </UButton>
              <UButton
                @click="
                  () => {
                    isLegend = !isLegend;
                  }
                "
                :color="isLegend ? 'brand' : 'gray'"
                variant="outline"
                class="text-2xs py-1 px-2 whitespace-nowrap rounded-sm"
              >
                Legend
              </UButton>
            </div>
          </div>
        </div>
        <div
          class="flex-1 bg-grey-700 border border-grey-800 rounded-sm p-2 flex flex-col gap-2"
        >
          <p class="text-white text-2xs">Exported Map Preview</p>
          <div class="flex-1 flex items-center justify-center">
            <div class="w-[80%] h-[90%] flex items-center justify-center">
              <div
                class="relative h-full max-h-full bg-white"
                :style="{
                  aspectRatio: aspectRatio,
                }"
                ref="contentRef"
              >
                <img
                  v-if="snapshot"
                  ref="mapImageRef"
                  :src="snapshot"
                  alt="Map snapshot"
                  class="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div class="absolute z-50 w-full h-full">
                  <div
                    v-if="isPrimaryLogo || isSecondaryLogo"
                    class="absolute left-3 top-3 w-40"
                  >
                    <div
                      class="w-full bg-grey-100 p-2 border border-grey-300 rounded-sm space-y-2"
                    >
                      <img
                        v-if="isPrimaryLogo"
                        :src="LogoGeodashboard"
                        alt="braga-logo"
                        class=""
                      />
                      <img
                        v-if="isSecondaryLogo"
                        :src="LogoBraga"
                        alt="braga-logo"
                        class=""
                      />
                    </div>
                    <div
                      v-if="isDescription || isTitle"
                      class="w-full bg-grey-100 p-2 mt-2 border border-grey-300 rounded-sm"
                    >
                      <p
                        v-if="isTitle"
                        class="text-grey-950 text-xs font-medium"
                      >
                        {{ contentTitle }}
                      </p>
                      <p v-if="isDescription" class="text-grey-600 text-2xs">
                        {{ contentDescription }}
                      </p>
                    </div>
                  </div>
                  <div
                    v-if="isFooter || isScale"
                    class="absolute left-3 bottom-3"
                  >
                    <div
                      class="w-full bg-grey-100 p-2 mt-2 border border-grey-300 rounded-sm flex flex-col gap-1"
                    >
                      <div v-if="isScale" class="flex gap-1 items-center">
                        <p class="text-grey-600 text-2xs text-nowrap">
                          {{ distance }}
                        </p>
                        <div
                          :style="{ width: barWidth + 'px', height: '1.5px' }"
                          class="relative bg-grey-600 mt-[2px]"
                        >
                          <div
                            class="absolute w-[1.5px] bg-grey-600 h-[5px] left-0 bottom-0"
                          ></div>
                          <div
                            class="absolute w-[1.5px] bg-grey-600 h-[5px] right-0 bottom-0"
                          ></div>
                        </div>
                      </div>
                      <USeparator color="neutral" />
                      <p v-if="isFooter" class="text-grey-600 text-[6px]">
                        {{ contentFooter }}
                      </p>
                    </div>
                  </div>
                  <div v-if="isLegend" class="absolute right-3 top-3 w-40">
                    <div
                      class="w-full bg-grey-100 p-2 border border-grey-300 rounded-sm space-y-2"
                    >
                      <p class="text-grey-950 text-xs font-medium">Legend</p>
                      <MapLegend :for-export="true" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- <div ref="contentRef" class="relative w-[80%] h-[80%]">
              <img
                v-if="snapshot"
                :src="snapshot"
                alt="Map snapshot"
                class="w-full h-full"
              />
              <div class="absolute left-3 top-3">
                <div class="w-40 bg-grey-100 p-2">
                  <img
                    :src="DummyImage"
                    alt="catalogue-item"
                    class="h-24 w-full object-cover object-center rounded-sm"
                  />
                </div>
                <div class="w-40 bg-grey-100 p-2 mt-2">
                  <p class="text-grey-950 text-xs font-medium">
                    Map Title Mapping How Neighborhoods Shape Businesses
                  </p>
                  <p class="text-grey-600 text-2xs">
                    Map Description here lorem ipsum dolor sit amet up to FOUR
                    line of text here - ididunt ut labore et dolore magna
                    aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                    ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
                    occaecat cupidatat ...
                  </p>
                </div>
              </div>
            </div> -->
          </div>
        </div>
      </div>
    </template>
    <template #footer
      ><div class="w-full flex justify-end">
        <div class="flex gap-2">
          <UButton
            @click="isOpenModal = false"
            size="sm"
            variant="outline"
            label="Cancel"
            class="justify-between"
          >
          </UButton>
          <UButton
            :loading="isExporting"
            @click="exportToPDF(format, resolution)"
            size="sm"
            label="Export Map"
            class="justify-between"
          >
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
