<script setup lang="ts">
import IcLink from "~/assets/icons/ic-link.svg";
import IcSend from "~/assets/icons/ic-send.svg";
import IcScreenShare from "~/assets/icons/ic-screen-share.svg";
import IcDownload from "~/assets/icons/ic-download.svg";
import { useMapShare } from "~/stores/useMapShare";

const mapRefStore = useMapRef();
const authStore = useAuth();
const isLoading = ref(false);
const isLoadingSent = ref(false);
const toast = useToast();
const mapShareStore = useMapShare();
const { setShareId } = mapShareStore;
const { shareId } = storeToRefs(mapShareStore);

const open = ref(false);
const shareUrl = ref("");
const email = ref("");

//reset shareId when map move end
const onMapMoveEnd = () => {
  shareId.value = "";
  shareUrl.value = "";
  mapRefStore.map?.off("moveend", onMapMoveEnd);
};

const copyLink = (id: string) => {
  shareUrl.value = window.location.origin + "?share_id=" + id;
  navigator.clipboard.writeText(window.location.origin + "?share_id=" + id);
  toast.add({
    title: "Share Map Successful",
    description: "Shareable link copied to your clipboard.",
    icon: "i-heroicons-information-circle",
  });
};

const getShareId = async (event: Event, shareEmail?: boolean) => {
  event.preventDefault();
  try {
    isLoading.value = true;
    const res = await $fetch<{ data: { id: string } }>(
      "/panel/items/shared_map?fields=id",
      {
        method: "POST",
        body: JSON.stringify({
          map_state: { boundArray: mapRefStore.map?.getBounds().toArray() },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + authStore.accessToken,
        },
      }
    );

    mapRefStore.map?.on("moveend", onMapMoveEnd);
    setShareId(res.data.id);
    copyLink(res.data.id);

    if (shareEmail) {
      sentToEmail(res.data.id);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get share ID";
    toast.add({
      title: "Failed to get share ID",
      description: message,
      icon: "i-heroicons-x-mark",
    });
  } finally {
    isLoading.value = false;
  }
};

const handleShare = (event: Event) => {
  if (shareId.value) {
    copyLink(shareId.value);
  } else {
    getShareId(event);
  }
};

const sentToEmail = async (id: string) => {
  try {
    isLoadingSent.value = true;
    const res = await $fetch.raw("/panel/share-by-email", {
      method: "POST",
      body: JSON.stringify({
        share_id: id,
        recipients: email.value,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + authStore.accessToken,
      },
    });
    if (res.status === 204) {
      toast.add({
        title: "Share Email Successful",
        icon: "i-heroicons-information-circle",
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    toast.add({
      title: "Share Email Failed",
      description: message,
      icon: "i-heroicons-x-mark",
    });
  } finally {
    isLoadingSent.value = false;
  }
};

const handleShareEmail = (event: Event) => {
  if (shareId.value) {
    sentToEmail(shareId.value);
  } else {
    getShareId(event, true);
  }
};
</script>

<template>
  <UPopover
    mode="hover"
    :ui="{ content: 'ring-grey-700 rounded-sm bg-grey-800' }"
  >
    <UButton variant="ghost" class="p-1 text-gray-400 hover:text-brand-600">
      <template #trailing>
        <IcScreenShare class="size-4" :fontControlled="false" />
      </template>
    </UButton>

    <template #content>
      <div class="w-[16.25rem] p-2 flex flex-col gap-2">
        <div class="text-2xs">
          <p class="text-grey-400 font-medium">Share or Export</p>
          <p class="text-grey-500">
            Share from link or Export as documents for printing
          </p>
        </div>
        <div
          class="p-1 border border-grey-700 rounded-sm flex gap-1 items-center justify-between"
        >
          <UInput
            v-model="shareUrl"
            color="gray"
            placeholder="Click copy button to get the link"
            size="xs"
            :ui="{ base: 'h-8 truncate', root: 'w-full' }"
            variant="none"
          >
          </UInput>
          <UButton
            @click="handleShare"
            :disabled="isLoading"
            size="sm"
            variant="outline"
            color="gray"
            label="Copy"
            class="justify-between"
          >
            <template #trailing>
              <UIcon
                v-if="isLoading"
                name="i-heroicons-arrow-path-solid"
                class="h-4 w-4 animate-spin"
              />
              <IcLink v-else class="size-3" :fontControlled="false" />
            </template>
          </UButton>
        </div>

        <div
          class="p-1 border border-grey-700 rounded-sm flex gap-1 items-center justify-between"
        >
          <UInput
            v-model="email"
            color="gray"
            placeholder="Share by Email"
            size="xs"
            :ui="{ base: 'h-8 truncate focus:none', root: 'w-full' }"
            variant="none"
          >
          </UInput>
          <UButton
            @click="handleShareEmail"
            :disabled="isLoadingSent"
            size="sm"
            variant="outline"
            color="gray"
            label="Send"
            class="justify-between"
          >
            <template #trailing>
              <UIcon
                v-if="isLoadingSent"
                name="i-heroicons-arrow-path-solid"
                class="h-4 w-4 animate-spin"
              />
              <IcSend v-else class="size-3" :fontControlled="false" />
            </template>
          </UButton>
        </div>

        <!-- <UInputTags
          v-model="emails"
          delimiter=","
          addOnPaste
          placeholder="Enter tags..."
          class="overflow-x-auto whitespace-nowrap flex-nowrap"
        /> -->
        <USeparator color="gray" />
        <UButton
          @click="open = !open"
          size="sm"
          variant="outline"
          color="gray"
          label="Export and Download Map"
          class="justify-between"
        >
          <template #trailing>
            <IcDownload class="size-3" :fontControlled="false" />
          </template>
        </UButton>
      </div>
    </template>
  </UPopover>
  <LayoutsExportModal v-model="open" />
</template>
