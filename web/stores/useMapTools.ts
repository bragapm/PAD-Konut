import { defineStore } from "pinia";

export const useMapTools = defineStore("mapTools", () => {
  const showTools = ref(true);
  const showCard = ref(false);
  const activeTools = shallowRef<ToolItem | null>(null);
  const expandTools = ref<boolean>(false);

  const handleOpenToolsCard = (item: ToolItem) => {
    showCard.value = true;
    showTools.value = false;
    activeTools.value = item;
  };

  const handleCloseToolsCard = () => {
    showCard.value = false;
    showTools.value = true;
    setTimeout(() => {
      activeTools.value = null;
    }, 400);
  };
  function toggleExpandTools() {
    expandTools.value = !expandTools.value;
  }
  return {
    showTools,
    showCard,
    activeTools,
    expandTools,
    handleOpenToolsCard,
    handleCloseToolsCard,
    toggleExpandTools,
  };
});
