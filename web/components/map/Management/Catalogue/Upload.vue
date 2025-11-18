<script lang="ts" setup>
import Ic3d from "~/assets/icons/ic-3d.svg";
import IcSpinner from "~/assets/icons/ic-spinner.svg";
import IcCheck from "~/assets/icons/ic-check.svg";
import { layerDataFolderId, layerPreviewFolderId } from "~/constants";

const emit = defineEmits<{
  (e: "refreshListedLayers"): void;
  (e: "handleCancel"): void;
  (e: "handleSuccess"): void;
}>();

const cancel = () => {
  emit("handleCancel");
};

const authStore = useAuth();
const toast = useToast();

const uploading = ref(false);
const uploaded = ref(false);

const selectedFile = ref<File | null>(null);
const thumbnailFile = ref<File | null>(null);

const dataType = ref<string>("");
const isTerrain = ref<"true" | "false">("false");
const hasColor = ref<"true" | "false">("false");

const formatData = ref<string>("");

const datasetName = ref<string>();
const datasetDesc = ref<string>();

const uploadPreviewImg = async () => {
  const form = new FormData();
  form.append("folder", layerPreviewFolderId);

  form.append("file", thumbnailFile.value as File);

  const res = await fetch("/panel/files", {
    credentials: "include",
    headers: {
      Authorization: `Bearer ${authStore.accessToken}`,
    },
    body: form,
    method: "POST",
  });

  const result = await res.json();

  if (result?.data?.id) {
    return result.data.id;
  } else {
    if (result.errors[0].message) {
      throw new Error(result.errors[0].message);
    } else {
      throw new Error("Error uploading preview image");
    }
  }
};

const upload = async () => {
  try {
    uploading.value = true;

    const additionalConfig: Record<string, any> = { listed: true };

    if (thumbnailFile.value) {
      const previewUploadResId = await uploadPreviewImg();

      if (previewUploadResId) {
        additionalConfig["preview"] = previewUploadResId;
      }
    }

    const form = new FormData();
    form.append("folder", layerDataFolderId);
    form.append("format_file", formatData.value);
    form.append(
      "is_zipped",
      selectedFile.value?.type === "application/zip" ? "true" : "false"
    );

    datasetDesc.value && (additionalConfig["description"] = datasetDesc.value);
    dataType.value === "vector" &&
      (additionalConfig["layer_alias"] =
        datasetName.value || selectedFile.value?.name);

    form.append("additional_config", JSON.stringify(additionalConfig));

    dataType.value === "raster" &&
      form.append(
        "raster_alias",
        JSON.stringify(datasetName.value || selectedFile.value?.name)
      );
    dataType.value === "raster" &&
      form.append("is_terrain", JSON.stringify(isTerrain.value));

    dataType.value === "3d" &&
      form.append(
        "three_d_alias",
        JSON.stringify(datasetName.value || selectedFile.value?.name)
      );
    dataType.value === "3d" &&
      form.append("has_color", JSON.stringify(hasColor.value));

    form.append("is_ready", "true");
    form.append("file", selectedFile.value as File);
    const res = await fetch("/panel/files", {
      credentials: "include",
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: form,
      method: "POST",
    });

    const result = await res.json();

    if (result.data) {
      setTimeout(() => {
        toast.add({
          title: "File has been processed successfully",
          icon: "i-heroicons-check-circle",
        });
        uploading.value = false;
      }, 2000);
      uploaded.value = true;
    } else {
      setTimeout(() => {
        toast.add({
          title: result.errors[0].message,
          icon: "i-heroicons-check-circle",
        });
        uploading.value = false;
      }, 2000);
    }
  } catch (error) {
    uploading.value = false;
    const message =
      error instanceof Error
        ? error.message || "Error uploading file"
        : "Error uploading file";
    toast.add({
      title: message,
    });
  }
};

const threedOptions = [{ value: "las/laz", label: "las/laz" }];

const vectorOptions = [
  { value: "csv", label: "csv" },
  { value: "gdb", label: "gdb" },
  { value: "geojson", label: "geojson" },
  { value: "kml", label: "kml" },
  { value: "shapefile", label: "shapefile" },
  { value: "xls", label: "xls" },
  { value: "xlsx", label: "xlsx" },
];

const rasterOptions = [{ value: "tif", label: "tif" }];

watchEffect(() => {
  if (dataType.value) {
    formatData.value = "";
  }
});

const activeStep = ref(0);
const nextDisabled = computed(() => {
  return (
    (activeStep.value === 0 && !formatData.value) ||
    (activeStep.value === 1 && !selectedFile.value) ||
    (activeStep.value === 2 && !selectedFile.value)
  );
});
const items = computed<any[]>(() => {
  return [
    {
      step: 1,
      title: "Select Data Type & Format",
      slot: "format" as const,
      disabled: true,
    },
    {
      step: 2,
      title: "Select File",
      slot: "file" as const,
      disabled: true,
    },
    {
      step: 3,
      title: "Data Information",
      slot: "info" as const,
      disabled: true,
    },
  ];
});
const stepper = useTemplateRef("stepper");

const handleBack = () => {
  stepper.value?.prev();
};
const handleNext = () => {
  stepper.value?.next();
};
</script>

<template>
  <div class="h-full flex flex-col gap-4 max-h-[calc(100%-2.25rem)]">
    <div
      class="w-full h-full border border-grey-700 py-10 px-5 overflow-y-auto"
    >
      <div v-if="!uploading && !uploaded" class="m-auto max-w-3xl">
        <p class="text-grey-50">Upload Data</p>
        <UStepper
          ref="stepper"
          v-model="activeStep"
          :items="items"
          :ui="{
            separator: 'hidden',
            trigger: 'w-full bg-transparent mb-5',
            title: 'hidden',
            description: 'hidden',
            header: 'gap-3',
          }"
          class="my-8"
        >
          <template #indicator="{ item }">
            <div
              class="flex flex-col flex-1 text-grey-200 text-2xs cursor-pointer"
            >
              <p>{{ item.step }}</p>
              <p>{{ item.title }}</p>
              <div
                :class="[
                  item.step - 1 <= activeStep ? 'bg-brand-500' : 'bg-grey-400',
                  ' h-[2px] w-full rounded-[20px] mt-2',
                ]"
              />
            </div>
          </template>
          <template #format>
            <div class="space-y-3">
              <p class="text-sm text-grey-400">
                Upload to Default Data Catalogue
              </p>
              <p class="text-xs text-grey-400">
                The file you choose from your storage will automatically be
                displayed and categorized as Default Data Catalogue. You can
                choose to manage the file's category either at the final stage
                of the upload process or later through the data catalogue
                settings.
              </p>
              <div class="flex flex-col gap-3">
                <p class="text-sm text-grey-400">Data Type</p>
                <div class="grid grid-cols-3 gap-3">
                  <div
                    v-for="item in [
                      {
                        icon: Ic3d,
                        desc: '.laz',
                        optLabel: 'Three Dimensions',
                        optValue: '3d',
                      },
                      {
                        icon: Ic3d,
                        desc: '.shp, .geojson, .kml, .gdb, .csv, .xlsx',
                        optLabel: 'Vector',
                        optValue: 'vector',
                      },
                      {
                        icon: Ic3d,
                        desc: '.tif',
                        optLabel: 'Raster',
                        optValue: 'raster',
                      },
                    ]"
                    @click="dataType = item.optValue"
                    :class="[
                      dataType === item.optValue
                        ? 'border-brand-500'
                        : 'border-grey-700',
                      'flex flex-col gap-1 justify-between p-4 bg-grey-800 border rounded-lg h-full cursor-pointer',
                    ]"
                  >
                    <div class="flex flex-col items-center py-6">
                      <component
                        :is="item.icon"
                        class="w-6 h-6 text-brand-500"
                        :fontControlled="false"
                      ></component>
                      <p class="text-grey-50 mt-2">{{ item.optLabel }}</p>
                      <p class="text-sm text-grey-400 text-center">
                        {{ item.desc }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="w-48">
                <USelect
                  v-model="formatData"
                  :disabled="!dataType"
                  placeholder="Data Format"
                  :items="
                    dataType === '3d'
                      ? threedOptions
                      : dataType === 'vector'
                      ? vectorOptions
                      : rasterOptions
                  "
                  class="text-xs text-grey-200 h-[34px] w-40"
                  color="gray"
                  variant="outline"
                  :ui="{
                    base: ['hover:bg-grey-800'],
                    content: 'bg-grey-800 ring-grey-700',
                    itemTrailingIcon: 'text-brand-500',
                    item: ['text-xs'],
                  }"
                ></USelect>
              </div>
            </div>
          </template>
          <template #file>
            <div class="space-y-3">
              <p class="text-sm text-grey-400">Upload Data</p>
              <MapManagementCatalogueLoadFileInput
                title="File"
                :accept="
                  formatData
                    ? formatData !== 'xls'
                      ? formatData === 'tif'
                        ? `.${formatData},.tiff,.zip`
                        : formatData === 'las/laz'
                        ? '.las,.laz,.zip'
                        : `.${formatData},.zip`
                      : `.${formatData}`
                    : ''
                "
                :allowed-desc="`(Supported File Type: ${
                  formatData
                    ? formatData !== 'xls'
                      ? formatData === 'tif'
                        ? `.${formatData},.tiff,.zip`
                        : formatData === 'las/laz'
                        ? '.las,.laz,.zip'
                        : `.${formatData},.zip`
                      : `.${formatData}`
                    : ''
                })`"
                :selectedFile="selectedFile"
                @set-selected-file="
                  (value: File|null) => {
                    selectedFile = value;
                  }
                "
              />
              <div v-if="dataType === 'raster'" class="space-y-3">
                <p class="text-sm text-grey-400">Is Terrain</p>
                <div
                  class="flex gap-2 w-full bg-grey-800 border border-grey-700 rounded-lg p-2"
                >
                  <URadioGroup
                    v-model="isTerrain"
                    orientation="horizontal"
                    variant="card"
                    default-value="true"
                    :items="[
                      { label: 'Yes', value: 'true' },
                      { label: 'No', value: 'false' },
                    ]"
                    class="w-full"
                    :ui="{
                      container: '',
                      base: 'flex items-center justify-center size-4',
                      indicator: 'size-2 rounded-full after:bg-transparent',
                      item: 'w-full items-center',
                      label: 'text-2xs text-grey-50 font-normal',
                    }"
                    size="xs"
                  />
                </div>
              </div>
              <div v-if="dataType === '3d'" class="space-y-3">
                <p class="text-sm text-grey-400">Has Color</p>
                <div
                  class="flex gap-2 w-full bg-grey-800 border border-grey-700 rounded-lg p-2"
                >
                  <URadioGroup
                    v-model="hasColor"
                    orientation="horizontal"
                    variant="card"
                    default-value="true"
                    :items="[
                      { label: 'Yes', value: 'true' },
                      { label: 'No', value: 'false' },
                    ]"
                    class="w-full"
                    :ui="{
                      container: '',
                      base: 'flex items-center justify-center size-4',
                      indicator: 'size-2 rounded-full after:bg-transparent',
                      item: 'w-full items-center',
                      label: 'text-2xs text-grey-50 font-normal',
                    }"
                    size="xs"
                  />
                </div>
              </div>
            </div>
          </template>
          <template #info>
            <div class="space-y-3">
              <p class="text-sm text-grey-400">Dataset Information</p>
              <MapManagementCatalogueLoadFileInput
                allowed-desc="(Supported File Type: .PNG, .JPEG, .JPG)"
                title="Thumbnail"
                accept="image/*"
                :selectedFile="thumbnailFile"
                @set-selected-file="
                  (value: File|null) => {
                    thumbnailFile = value;
                  }
                "
              />
              <div class="relative">
                <input
                  v-model="datasetName"
                  type="text"
                  id="floating_filled"
                  class="block rounded-sm px-2.5 pb-2.5 pt-5 w-full text-sm text-grey-200 bg-grey-700 border border-grey-600 appearance-none focus:outline-none focus:ring-0 focus:border-grey-600 peer"
                  placeholder=" "
                />
                <label
                  for="floating_filled"
                  class="absolute text-sm text-grey-200 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] start-2.5 peer-focus:text-grey-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto"
                >
                  Dataset Name
                </label>
              </div>
              <div class="relative">
                <textarea
                  v-model="datasetDesc"
                  type="text"
                  rows="5"
                  id="floating_filled"
                  class="block rounded-sm px-2.5 pb-2.5 pt-5 w-full text-sm text-grey-200 bg-grey-700 border border-grey-600 appearance-none focus:outline-none focus:ring-0 focus:border-grey-600 peer"
                  placeholder=" "
                />
                <label
                  for="floating_filled"
                  class="absolute text-sm text-grey-200 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] start-2.5 peer-focus:text-grey-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto"
                >
                  Dataset Description
                </label>
              </div>
            </div>
          </template>
        </UStepper>
      </div>
      <div
        v-else-if="uploading"
        class="w-full h-full flex flex-col justify-center items-center"
      >
        <IcSpinner
          class="text-brand-500 animate-spin h-10 w-10 mb-3"
          :fontControlled="false"
        />
        <p class="text-grey-50">Uploading Data</p>
        <p class="text-grey-400 text-sm">
          This might take a few seconds. Please Wait.
        </p>
      </div>
      <div
        v-else-if="uploaded"
        class="w-full h-full flex flex-col justify-center items-center gap-3"
      >
        <IcCheck class="w-10 h-10 text-brand-500" :fontControlled="false" />
        <div class="flex flex-col items-center">
          <p class="text-grey-50">Data Loaded</p>
          <p class="text-grey-400 text-sm">
            Your Data is Successfully loaded to the catalogue.
          </p>
        </div>
        <UButton
          @click="
            () => {
              emit('refreshListedLayers');
              emit('handleSuccess');
            }
          "
          class="rounded-sm"
          color="brand"
          >Go To Catalogue</UButton
        >
      </div>
    </div>
    <div v-if="!uploading && !uploaded" class="flex justify-between">
      <UButton
        @click="cancel"
        label="Cancel"
        variant="outline"
        color="brand"
        class="w-44 text-sm justify-center rounded-lg"
      >
      </UButton>
      <div class="space-x-2">
        <UButton
          :disabled="activeStep === 0"
          @click="handleBack"
          label="Back"
          variant="outline"
          :color="activeStep === 0 ? 'gray' : 'brand'"
          class="w-44 text-sm justify-center rounded-lg"
        >
        </UButton>
        <UButton
          :disabled="nextDisabled"
          @click="activeStep === 2 && selectedFile ? upload() : handleNext()"
          :label="activeStep === 2 ? 'Upload Data' : 'Next'"
          :color="nextDisabled ? 'gray' : 'brand'"
          class="w-44 text-sm justify-center rounded-lg"
        >
        </UButton>
      </div>
    </div>
  </div>
</template>
