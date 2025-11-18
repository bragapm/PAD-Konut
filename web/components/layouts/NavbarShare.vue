<script setup lang="ts">
import IcLink from "~/assets/icons/ic-link.svg";

const mapRefStore = useMapRef();
const authStore = useAuth();
const isLoading = ref(false);
const toast = useToast();
const handleShare = async (event: Event) => {
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
    navigator.clipboard.writeText(
      window.location.origin + "?share_id=" + res.data.id
    );
    toast.add({
      title: "Share Map Successful",
      description: "Shareable link copied to your clipboard.",
      icon: "i-heroicons-information-circle",
    });
  } catch (error) {
    console.log(error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <UButton
    :ui="{ rounded: 'rounded-xxs' }"
    label="Share Map"
    @click="handleShare"
    :disabled="isLoading"
  >
    <template #trailing>
      <UIcon
        v-if="isLoading"
        name="i-heroicons-arrow-path-solid"
        class="h-4 w-4 animate-spin"
      />
      <IcLink v-else class="text-base" />
    </template>
  </UButton>
</template>
