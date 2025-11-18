import { defineStore } from "pinia";

export type TableItem = {
  source: "vector_tiles" | "external_vector";
  label: string;
  layer_id: string;
  key: string;
};

export const useTableData = defineStore("tableData", () => {
  const activeTable = ref<null | TableItem>(null);
  function setActiveTable(item: TableItem) {
    activeTable.value = item;
  }
  const activeTableList = ref<TableItem[]>([]);
  function addActiveTableList(item: TableItem) {
    const exists = activeTableList.value.some(
      (t) => t.layer_id === item.layer_id
    );
    if (!exists) {
      activeTableList.value.push(item);
    }
  }

  function removeActiveTableByKey(key: string) {
    activeTableList.value = activeTableList.value.filter(
      (item) => item.layer_id !== key
    );

    if (activeTableList.value.length) {
      activeTable.value = activeTableList.value[0];
    } else {
      activeTable.value = null;
      toggleTable();
    }
  }

  const showTable = ref<boolean>(false);
  const fullscreen = ref<boolean>(false);
  function toggleTable() {
    showTable.value = !showTable.value;
  }
  function toggleFullscreen() {
    fullscreen.value = !fullscreen.value;
  }
  function closeTable() {
    activeTable.value = null;
    activeTableList.value = [];
    showTable.value = false;
    fullscreen.value && toggleFullscreen();
  }
  return {
    showTable,
    toggleTable,
    fullscreen,
    toggleFullscreen,
    closeTable,
    activeTable,
    setActiveTable,
    addActiveTableList,
    activeTableList,
    removeActiveTableByKey,
  };
});
