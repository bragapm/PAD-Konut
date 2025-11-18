import { parseString } from "./index";
import { layerIconsFolderId } from "~/constants";

export function extractAttributeFromExpression(expr: any): string | null {
  let parsedExpr = parseString(expr);
  if (Array.isArray(parsedExpr)) {
    // Check direct ["get", "column"]
    if (parsedExpr[0] === "get" && typeof parsedExpr[1] === "string") {
      return parsedExpr[1];
    }

    // Skip operator at index 0 (e.g. "case", "all", "<", ">=") and scan the rest
    for (let i = 1; i < parsedExpr.length; i++) {
      const found = extractAttributeFromExpression(parsedExpr[i]);
      if (found) return found;
    }
  }
  return null;
}

export function convertMapboxExpressionToState(
  expression: any
): [string, string][] {
  if (!expression) return [];
  // Parse the JSON string to get the Mapbox expression array
  const expr: any[] = JSON.parse(expression);

  // Initialize the result array
  const result: [string, string][] = [];

  // Ensure the expression starts with 'case'
  if (expr[0] !== "case") {
    throw new Error('Invalid expression format. Expected a "case" expression.');
  }

  // Loop through the expression parts
  for (let i = 1; i < expr.length; i += 2) {
    if (Array.isArray(expr[i])) {
      const condition = expr[i];
      let label: string;
      let color: string;

      // Check if the condition is a range or exact match
      if (
        condition[0] === "all" &&
        condition[1][0] === ">=" &&
        (condition[2][0] === "<" || condition[2][0] === "<=")
      ) {
        // Handling range condition
        const min = condition[1][2];
        const max = condition[2][2];
        label =
          min !== null && max !== null ? `${min} - ${max}` : "Unknown Range";
        color = expr[i + 1];
      } else {
        // Handling exact match condition
        label = condition[2];
        color = expr[i + 1];
      }

      // Add the parsed label and color to the result
      if (typeof label === "string" && typeof color === "string") {
        result.push([label, color]);
      }
    } else {
      // Handle the default color
      //   const defaultColor = expr[i] as string;
      //   result.push(["Lainnya", defaultColor]);
      break;
    }
  }

  return result;
}

export function convertStateToMapboxExpression(
  state: [string, any][],
  referenceColumn: string
): any[] {
  // Check for valid input
  if (state.length === 0) {
    throw new Error("Empty state array provided.");
  }
  if (!referenceColumn) {
    throw new Error("Reference column must be provided.");
  }

  // Initialize the Mapbox expression array with 'case'
  const mapboxExpression: any[] = ["case"];
  let hasDefault = false;

  // Loop through the state array to construct the expression parts
  state.forEach(([label, color]) => {
    if (label === "Lainnya") {
      // Handle default color - don't add it yet
      hasDefault = true;
    } else {
      // Add conditional expressions for labels and colors
      mapboxExpression.push(["==", ["get", referenceColumn], label], color);
    }
  });

  // Add default fallback color (required by Mapbox)
  if (hasDefault) {
    const defaultEntry = state.find(([label]) => label === "Lainnya");
    mapboxExpression.push(defaultEntry?.[1] || "#ffffff");
  } else {
    // If no default specified, use transparent or white
    mapboxExpression.push("#ffffff");
  }

  // Return the stringified Mapbox expression
  return mapboxExpression;
}

export function convertStateToMapRangeExpression(
  rangeArray: [string, string][],
  propertyName: string
) {
  const result: any[] = ["case"];

  rangeArray.forEach(([range, color]) => {
    // Parse the range string (e.g., "4.20 - 4.32")
    const [min, max] = range.split(" - ").map((val) => parseFloat(val.trim()));

    // Create the condition: (e.g., ["all", [">=", ["get", "magnitude"], min], ["<=", ["get", "magnitude"], max]])
    const condition = [
      "all",
      [">=", ["get", propertyName], min],
      ["<=", ["get", propertyName], max],
    ];

    result.push(condition, color);
  });
  result.push("#FFFFFF");

  return result;
}

export const fetchIconIds = async (count: number): Promise<string[]> => {
  try {
    const response = await fetch(
      `/panel/files?${new URLSearchParams({
        filter: JSON.stringify({
          _and: [
            { folder: { _eq: layerIconsFolderId } },
            { type: { _eq: "image/svg+xml" } },
          ],
        }),
        fields: "id",
        limit: String(count),
      })}`
    );
    const data = await response.json();
    return data.data?.map((item: any) => item.id) || [];
  } catch (error) {
    console.error("Error fetching icon IDs:", error);
    return [];
  }
};

export function generateEqualIntervals(
  min: number,
  max: number,
  distinctCount: number
): string[] {
  // Decide optimal number of intervals based on data density
  let intervalsCount = 5;
  if (distinctCount > 20 && distinctCount <= 50) intervalsCount = 6;
  else if (distinctCount > 50) intervalsCount = 7;

  const range = max - min;
  const step = range / intervalsCount;

  const useDecimals = range < 10; // If small numeric range, keep decimals
  const result: string[] = [];

  let currentMin = min;
  let currentMax = min + step;

  const cleanNumber = (num: number): string => {
    return parseFloat(num.toFixed(2)).toString();
  };

  for (let i = 0; i < intervalsCount; i++) {
    if (i === intervalsCount - 1) {
      currentMax = max; // Ensure last interval hits exact max
    }

    // Format numbers
    const formattedMin = useDecimals
      ? cleanNumber(currentMin)
      : Math.round(currentMin).toString();
    const formattedMax = useDecimals
      ? cleanNumber(currentMax)
      : Math.round(currentMax).toString();

    result.push(`${formattedMin} - ${formattedMax}`);

    // Move to next interval (avoid overlap by adding a tiny step)
    currentMin = currentMax + (useDecimals ? 0.01 : 1);
    currentMax = currentMin + step;
  }

  return result;
}

export function distinctHexColors(count: number): string[] {
  const colors: string[] = [];

  for (let i = 0; i < count; i++) {
    // Distribute hue evenly
    const hue = Math.floor((360 / count) * i);
    const saturation = 70; // Balanced saturation for vivid colors
    const lightness = 50; // Balanced lightness

    // Convert HSL → HEX
    colors.push(hslToHex(hue, saturation, lightness));
  }

  return colors;
}

export function generateColorPresets(count: number): string[][] {
  const presets: string[][] = [];

  // Helper to generate unique colors with even distribution
  const generateUniqueColors = (
    baseHues: number[],
    saturation: number,
    lightness: number,
    count: number
  ): string[] => {
    const colors: string[] = [];
    const usedColors = new Set<string>();

    // If count is small, use base hues directly
    if (count <= baseHues.length) {
      for (let i = 0; i < count; i++) {
        colors.push(hslToHex(baseHues[i]!, saturation, lightness));
      }
      return colors;
    }

    // For larger counts, distribute evenly with variations
    const step = 360 / count;
    for (let i = 0; i < count; i++) {
      let hue = Math.floor(step * i);
      let s = saturation;
      let l = lightness;

      // Add slight variations to avoid repetition
      if (i > 0 && i % baseHues.length === 0) {
        s = Math.max(20, saturation - 10);
        l = Math.min(80, lightness + 10);
      }

      const color = hslToHex(hue, s, l);

      // Ensure uniqueness
      let attempts = 0;
      while (usedColors.has(color) && attempts < 10) {
        hue = (hue + 13) % 360; // Prime number offset for better distribution
        const newColor = hslToHex(hue, s, l);
        if (!usedColors.has(newColor)) {
          colors.push(newColor);
          usedColors.add(newColor);
          break;
        }
        attempts++;
      }

      if (!usedColors.has(color)) {
        colors.push(color);
        usedColors.add(color);
      }
    }

    return colors;
  };

  // Preset 1: Vibrant colors
  const preset1 = generateUniqueColors([0, 45, 90, 135, 180, 225, 270, 315], 70, 50, count);
  presets.push(preset1);

  // Preset 2: Pastel colors
  const preset2 = generateUniqueColors([15, 60, 105, 150, 195, 240, 285, 330], 50, 70, count);
  presets.push(preset2);

  // Preset 3: Deep/Dark colors
  const preset3 = generateUniqueColors([30, 75, 120, 165, 210, 255, 300, 345], 80, 35, count);
  presets.push(preset3);

  // Preset 4: Warm colors (reds, oranges, yellows)
  const preset4 = generateUniqueColors([0, 15, 30, 40, 50, 60, 330, 345], 75, 55, count);
  presets.push(preset4);

  // Preset 5: Cool colors (blues, greens, purples)
  const preset5 = generateUniqueColors([180, 195, 210, 225, 240, 260, 280, 300], 70, 50, count);
  presets.push(preset5);

  // Preset 6: Earthy/Natural colors
  const preset6 = generateUniqueColors([25, 40, 55, 75, 90, 110, 130, 150], 45, 45, count);
  presets.push(preset6);

  return presets;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));

  return `#${f(0).toString(16).padStart(2, "0")}${f(8)
    .toString(16)
    .padStart(2, "0")}${f(4).toString(16).padStart(2, "0")}`;
}
