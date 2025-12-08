<template>
  <UModal
    v-model="localOpen"
    :ui="{
      container: 'items-stretch',
      width: 'sm:max-w-none',
      content: 'bg-transparent w-screen h-screen sm:rounded-none',
    }"
    fullscreen
    :title="title || 'PDF Viewer'"
  >
    <UCard
      class="bg-neutral-900 text-neutral-50"
      :ui="{
        rounded: 'rounded-xl',
        body: 'p-0',
        header: 'px-4 py-3 border-b border-neutral-800',
        footer: 'px-4 py-3 border-t border-neutral-800',
      }"
    >
      <!-- HEADER -->
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div class="space-y-0.5">
            <p class="text-xs uppercase tracking-wide text-neutral-400">
              {{ headerLabel }}
            </p>
            <p class="text-sm font-semibold">
              {{ title }}
            </p>
          </div>

          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-x-mark-20-solid"
            size="xs"
            @click="close"
          />
        </div>
      </template>

      <!-- BODY -->
      <div class="flex flex-col gap-4">
        <!-- Top bar: file badge + download -->
        <div
          class="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div
            class="inline-flex max-w-full items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2"
          >
            <UIcon
              name="i-heroicons-document-text-20-solid"
              class="h-4 w-4 shrink-0 text-neutral-300"
            />
            <span class="truncate text-xs font-medium">
              {{ fileName }}
            </span>
          </div>

          <div class="flex gap-2">
            <!-- Use original URL for download / open in new tab -->
            <UButton
              tag="a"
              :href="pdfUrl"
              target="_blank"
              rel="noopener"
              color="primary"
              size="xs"
              icon="i-heroicons-arrow-down-tray-20-solid"
            >
              Download
            </UButton>
          </div>
        </div>

        <!-- PDF viewer -->
        <div class="px-4 pb-4">
          <div
            class="h-[70vh] w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950"
          >
            <!-- Use Drive preview URL (or normal URL if not Drive) -->
            <iframe
              :src="iframeSrc"
              class="h-full w-full"
              title="PDF Viewer"
              allow="autoplay"
            />
          </div>
        </div>
      </div>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  title?: string;
  headerLabel?: string;
  fileName: string;
  /** Can be Google Drive share URL or any direct PDF URL */
  pdfUrl: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const localOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

/**
 * Convert a Google Drive URL into an embeddable /preview URL.
 * If it's not a Drive URL, just return the original URL.
 */
function toDrivePreview(url: string): string {
  // Match patterns like:
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // https://drive.google.com/uc?id=FILE_ID&export=download
  const fileMatch = url.match(/\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }

  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (idMatch?.[1]) {
    return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  }

  // Fallback: use as-is (for non-Drive URLs)
  return url;
}

const iframeSrc = computed(() => {
  return toDrivePreview(props.pdfUrl);
});

const close = () => emit("update:modelValue", false);
</script>
