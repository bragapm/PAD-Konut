import { defineStore } from "pinia";
import { findPathById, updateByPath } from "~/utils/filter";

export type FilterItem = {
  id: string;
  field: string;
  operator: string;
  value: string;
};

export type LogicalOperator = "_and" | "_or";

export type GroupItem = {
  id: string;
  group?: LogicalOperator;
  filter: (FilterItem | GroupItem)[];
};

type FilterGroupParams = {
  [key: string]: { [key: string]: string } | FilterGroupParams[];
};

export type FilterParams = {
  [key: string | LogicalOperator]:
    | { [key: string]: string }
    | FilterGroupParams[];
};

export const useFilter = defineStore("filter", () => {
  const filterArray = ref<(FilterItem | GroupItem)[]>([]);
  const filterParams = ref<FilterParams[] | null>(null);

  function setFilterParams(value: FilterParams[] | null) {
    filterParams.value = value;
  }

  function addFilter() {
    let current = JSON.parse(JSON.stringify(filterArray.value));
    filterArray.value = [
      ...current,
      { id: crypto.randomUUID(), field: "", operator: "", value: "" },
    ];
  }

  function addGroup(group: LogicalOperator) {
    let current = JSON.parse(JSON.stringify(filterArray.value));
    filterArray.value = [
      ...current,
      { id: crypto.randomUUID(), group: group, filter: [] },
    ];
  }

  function updateFilter(id: string, newValue: FilterItem) {
    const current = [...JSON.parse(JSON.stringify(filterArray.value))];
    const path = findPathById(current, id);

    updateByPath(current, path, newValue);
    filterArray.value = current;
  }

  function updateGroup(id: string, newValue: LogicalOperator) {
    const current = [...JSON.parse(JSON.stringify(filterArray.value))];
    const path = findPathById(current, id);
    updateGroupByPath(current, path, newValue);
    filterArray.value = current;
  }

  function insertFilter(id: string) {
    let current = JSON.parse(JSON.stringify(filterArray.value));
    const path = findPathById(current, id);
    insertByPath(current, path, {
      id: crypto.randomUUID(),
      field: "",
      operator: "",
      value: "",
    });
    filterArray.value = current;
  }

  function insertGroup(id: string, group: LogicalOperator) {
    let current = JSON.parse(JSON.stringify(filterArray.value));
    const path = findPathById(current, id);
    insertByPath(current, path, {
      id: crypto.randomUUID(),
      group: group,
      filter: [],
    });
    filterArray.value = current;
  }

  function deleteById(id: string) {
    const current = [...JSON.parse(JSON.stringify(filterArray.value))];
    const path = findPathById(current, id);
    const deleted = deleteByPath(current, path);
    filterArray.value = deleted;
  }

  function resetFilter() {
    filterArray.value = [];
    filterParams.value = null;
  }

  return {
    filterArray,
    filterParams,
    setFilterParams,
    addFilter,
    insertFilter,
    addGroup,
    insertGroup,
    updateFilter,
    updateGroup,
    resetFilter,
    deleteById,
  };
});
