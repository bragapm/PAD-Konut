import { defineStore } from "pinia";
import type { AnalysisResult } from "~/utils/types";

export const useAnalysisResult = defineStore("analysisResult", () => {
  const results = ref<AnalysisResult[]>([]);
  function setResults(newResults: AnalysisResult[]) {
    results.value = newResults;
  }
  function addResult(res: AnalysisResult) {
    results.value = [...results.value, res];
  }
  function removeResult(date: string) {
    results.value = results.value.filter((r) => r.date !== date);
  }

  const isOpenPDFViewer = ref<boolean>(false);
  function setIsOpenPDFViewer(value: boolean) {
    isOpenPDFViewer.value = value;
  }

  return {
    results,
    setResults,
    addResult,
    removeResult,
    isOpenPDFViewer,
    setIsOpenPDFViewer
  };
});
