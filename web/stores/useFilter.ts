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
  const filterArrayList = ref<{
    [key: string]: (FilterItem | GroupItem)[];
  }>({});
  const filterParamsList = ref<{
    [key: string]: FilterParams[];
  }>({});

  function addFilterArrayList(key: string, item: (FilterItem | GroupItem)[]) {
    filterArrayList.value[key] = item;
  }
  function addFilterParamsList(key: string, item: FilterParams[]) {
    filterParamsList.value[key] = item;
  }
  function removeFilterListByKey(key: string) {
    delete filterArrayList.value[key];
    delete filterParamsList.value[key];
  }
  function resetFilterList() {
    filterArrayList.value = {};
    filterParamsList.value = {};
  }
  return {
    filterArrayList,
    addFilterArrayList,
    filterParamsList,
    addFilterParamsList,
    resetFilterList,
    removeFilterListByKey
    // filterArray,
    // filterParams,
    // setFilterParams,
    // addFilter,
    // insertFilter,
    // addGroup,
    // insertGroup,
    // updateFilter,
    // updateGroup,
    // resetFilter,
    // deleteById,
  };
});
