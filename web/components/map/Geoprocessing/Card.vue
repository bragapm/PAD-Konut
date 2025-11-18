<script lang="ts" setup>
import IcTrash from "~/assets/icons/ic-trash.svg";
import IcLayerPlus from "~/assets/icons/ic-layer-plus.svg";
import IcCross from "~/assets/icons/ic-cross.svg";
import type { Queue } from "~/utils/types";
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/vue";
import { useQueryClient } from "@tanstack/vue-query";

const props = withDefaults(
  defineProps<{
    data: Queue;
    isAddLayerAction: boolean;
  }>(),
  {
    isAddLayerAction: false,
  }
);

const queryClient = useQueryClient();

const authStore = useAuth();
const mapLayerStore = useMapLayer();
const toast = useToast();

const isOpenModal = ref(false);
function closeModal() {
  isOpenModal.value = false;
}

const handleAddLayer = async () => {
  const response = await fetch(
    `/panel/items/vector_tiles/${props.data.result.layer_id}?fields=*.*.*&sort=layer_name`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authStore.accessToken}`,
      },
    }
  );
  const result = await response.json();
  if (result.data) {
    const item = mapLayerStore.getLayersArr({
      vectorTiles: { data: [result.data] },
    });
    mapLayerStore.addLayer(item[0]);
  }
};

const handleDelete = async () => {
  try {
    const res = await Promise.all(
      [
        { key: "vector_tiles", id: props.data.result.layer_id },
        { key: "geoprocessing_queue", id: props.data.message_id },
      ].map(async (el) => {
        const resp = await fetch(`/panel/items/${el.key}`, {
          method: "DELETE",
          body: JSON.stringify([el.id]),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        });
        if (!resp.ok) {
          throw new Error(resp.statusText);
        }

        return await resp;
      })
    );
    if (res) {
      toast.add({
        description: `Layer ${props.data.message.kwargs.output_table} has been successfully deleted`,
        icon: "i-heroicons-check-circle",
      });
      queryClient.refetchQueries({
        queryKey: ["geoprocessing_history_query_key"],
        type: "active",
        exact: true,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    toast.add({
      title: "Error",
      description: message,
    });
  }
};
</script>

<template>
  <div>
    <div
      class="p-2 bg-grey-800 rounded-xxs flex gap-2 justify-between items-center"
    >
      <div class="text-2xs">
        <p class="text-grey-400 capitalize">{{ data.message.actor_name }}</p>
        <p class="text-grey-500">{{ data.message.kwargs.output_table }}</p>
      </div>
      <div class="space-x-1">
        <button v-if="isAddLayerAction" @click="handleAddLayer">
          <IcLayerPlus class="text-grey-400 w-3 h-3" :fontControlled="false" />
        </button>
        <button
          v-if="isAddLayerAction"
          @click="
            () => {
              isOpenModal = true;
            }
          "
        >
          <IcTrash class="text-brand-500 w-3 h-3" :fontControlled="false" />
        </button>
      </div>
    </div>
    <div class="p-2 border border-grey-700 rounded-xxs space-y-2">
      <div class="text-2xs">
        <p class="text-grey-500">Queue ID</p>
        <p class="text-grey-50">{{ data.message_id }}</p>
      </div>
      <div class="text-2xs">
        <p class="text-grey-500">Initiator</p>
        <p class="text-grey-50">
          {{
            data.uploader
              ? data.uploader.first_name + " " + data.uploader.last_name
              : "-"
          }}
        </p>
      </div>
      <div class="text-2xs">
        <p class="text-grey-500">Created at</p>
        <p class="text-grey-50">
          {{ data.mtime ? new Date(data.mtime).toLocaleString() : "-" }}
        </p>
      </div>
      <div class="text-2xs">
        <p class="text-grey-500">Status</p>
        <p class="text-grey-50">{{ data.status ?? data.state }}</p>
      </div>
    </div>
  </div>
  <TransitionRoot appear :show="isOpenModal" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-10">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto rounded-xs">
        <div
          class="flex min-h-full items-center justify-center p-4 text-center rounded-xs"
        >
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-sm transform overflow-hidden rounded-xs bg-grey-900 p-3 text-left align-middle shadow-xl transition-all"
            >
              <DialogTitle
                class="text-base font-medium leading-6 flex justify-between items-center"
              >
                <h2 class="text-white">Delete Confirmation</h2>
                <IcCross
                  role="button"
                  @click="closeModal"
                  :fontControlled="false"
                  class="w-3 h-3 rotate-180 text-grey-50"
                />
              </DialogTitle>
              <div class="text-grey-50 my-5">
                Delete layer {{ data.message.kwargs.output_table }} ?
              </div>
              <div class="relative w-full flex justify-end gap-2">
                <UButton
                  color="brand"
                  :ui="{ rounded: 'rounded-[4px]' }"
                  size="sm"
                  @click="closeModal"
                >
                  Cancel
                </UButton>
                <UButton
                  color="brand"
                  variant="outline"
                  :ui="{ rounded: 'rounded-[4px]' }"
                  size="sm"
                  @click="handleDelete"
                >
                  Delete
                </UButton>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
