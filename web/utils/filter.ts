export function findPathById(array: any[], id: string) {
  let index: any = -1;

  function recursiveSearch(arr: any[], id: string, path: any) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].id === id) {
        index = [...path, i]; // Return the full path to the object
        return;
      }
      if (arr[i].filter) {
        recursiveSearch(arr[i].filter, id, [...path, i, "filter"]);
      }
    }
  }

  recursiveSearch(array, id, []);
  return index;
}

export function deleteByPath(array: any[], path: any[]) {
  if (path.length === 0) return array; // If the path is empty, do nothing

  const lastKey = path.pop(); // Get the last key (index or property name)
  const parent = path.reduce((acc, key) => acc[key], array); // Traverse the path to the parent

  if (Array.isArray(parent) && typeof lastKey === "number") {
    // If the parent is an array and the last key is an index, delete the item
    parent.splice(lastKey, 1);
  } else if (parent && lastKey in parent) {
    // If the parent is an object, delete the property
    delete parent[lastKey];
  }

  return array;
}

export function updateByPath(array: any[], path: any[], newValue: any) {
  if (path.length === 0) return;

  const lastKey = path.pop(); // Get the last key (index or property name)
  const parent = path.reduce((acc, key) => acc[key], array); // Traverse the path to the parent

  // Update the value at the specified path
  if (Array.isArray(parent) && typeof lastKey === "number") {
    parent[lastKey] = newValue;
  } else if (parent && lastKey in parent) {
    parent[lastKey] = newValue;
  }
}

export function updateGroupByPath(array: any[], path: any[], newValue: any) {
  if (path.length === 0) return;

  const lastKey = path.pop(); // Get the last key (index or property name)
  const parent = path.reduce((acc, key) => acc[key], array); // Traverse the path to the parent

  // Update the value at the specified path
  if (Array.isArray(parent) && typeof lastKey === "number") {
    parent[lastKey]["group"] = newValue;
  } else if (parent && lastKey in parent) {
    parent[lastKey]["group"] = newValue;
  }
}

export function insertByPath(array: any[], path: any[], newValue: any) {
  if (path.length === 0) return;

  const lastKey = path.pop(); // Get the last key (index or property name)
  const parent = path.reduce((acc, key) => acc[key], array); // Traverse the path to the parent

  // Update the value at the specified path
  if (Array.isArray(parent) && typeof lastKey === "number") {
    parent[lastKey]["filter"].push(newValue);
  } else if (parent && lastKey in parent) {
    parent[lastKey]["filter"].push(newValue);
  }
}

export function transformToFilterParams(filters: any) {
  return filters.map((filter: FilterItem | GroupItem) => {
    if ("group" in filter && filter.filter) {
      // If the filter has a group and nested filters, process recursively
      return {
        [filter.group as string]: transformToFilterParams(filter.filter),
      };
    } else {
      // If the filter is a simple condition, transform it into the desired format
      if (["_in", "_nin"].includes((filter as FilterItem).operator)) {
        return {
          [(filter as FilterItem).field]: {
            [(filter as FilterItem).operator]: (filter as FilterItem).value
              .split(",")
              .map((item) => item.trim()),
          },
        };
      } else {
        return {
          [(filter as FilterItem).field]: {
            [(filter as FilterItem).operator]: (filter as FilterItem).value,
          },
        };
      }
    }
  });
}
