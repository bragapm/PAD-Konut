import { defineStore } from "pinia";

export const useMapShare = defineStore("mapShare", () => {
  const shareId = ref("");
  function setShareId(value: string) {
    shareId.value = value;
  }
  return { shareId, setShareId };
});
