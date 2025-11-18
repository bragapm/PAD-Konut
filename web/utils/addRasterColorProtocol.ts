import maplibregl from "maplibre-gl";

export default function addRasterColorProtocol() {
  function interpolateColor(
    color1: [number, number, number],
    color2: [number, number, number],
    factor: number
  ): [number, number, number] {
    return [
      Math.round(color1[0] + (color2[0] - color1[0]) * factor),
      Math.round(color1[1] + (color2[1] - color1[1]) * factor),
      Math.round(color1[2] + (color2[2] - color1[2]) * factor),
    ];
  }

  function generateColorScale(
    value_steps: number[],
    color_steps: [number, number, number][]
  ): [number, number, number][] {
    const scale: [number, number, number][] = [];

    // Ensure value_steps and color_steps have the same length
    if (value_steps.length !== color_steps.length) {
      throw new Error("value_steps and color_steps must have the same length");
    }

    // Iterate over each value step and interpolate between color pairs
    for (let i = 0; i < value_steps.length - 1; i++) {
      const startValue = value_steps[i];
      const endValue = value_steps[i + 1];
      const startColor = color_steps[i];
      const endColor = color_steps[i + 1];

      for (let j = startValue; j <= endValue; j++) {
        const factor = (j - startValue) / (endValue - startValue);
        scale.push(interpolateColor(startColor, endColor, factor));
      }
    }

    return scale; // Return exactly 256 colors
  }

  function getUuidFromUrl(url: string): string | null {
    // Define a regular expression to match a UUID pattern
    const uuidRegex =
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

    // Use the regex to search for the UUID in the URL
    const match = url.match(uuidRegex);

    // If a match is found, return the UUID, otherwise return null
    return match ? match[0] : null;
  }

  function parseColorsToRGB(colorArray: string[]): [number, number, number][] {
    // Convert hex color to RGB
    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [
            parseInt(result[1], 16), // Red
            parseInt(result[2], 16), // Green
            parseInt(result[3], 16), // Blue
          ]
        : [0, 0, 0]; // Default to black if parsing fails
    };

    // Map each hex color string to an RGB array
    const rgbArray: [number, number, number][] = colorArray.map(hexToRgb);

    return rgbArray;
  }

  const colorScales: Record<string, any> = {};

  maplibregl.addProtocol("greyscale", (async (
    params: any,
    abortController: AbortController
  ) => {
    let [protocolQuery, absoluteUrl] = params.url.split("[|]");
    let uuid = getUuidFromUrl(absoluteUrl)!;
    let colorScale = colorScales[uuid];

    if (!colorScale) {
      protocolQuery = protocolQuery.replace("greyscale://", "");
      protocolQuery = Object.fromEntries(new URLSearchParams(protocolQuery));
      colorScale = generateColorScale(
        JSON.parse(protocolQuery["value_steps"]),
        parseColorsToRGB(JSON.parse(protocolQuery["color_steps"]))
      );
      colorScales[uuid] = colorScale;
    }

    try {
      // Use AbortController signal to cancel the request if needed
      const response = await fetch(absoluteUrl, {
        signal: abortController.signal,
      });
      if (response.status !== 200) {
        throw new Error(`Tile fetch error: ${response.statusText}`);
      }

      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        const blob = await response.blob();
        const img = new Image();
        img.src = URL.createObjectURL(blob);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, 256, 256);
            URL.revokeObjectURL(img.src);

            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
              const value = data[i]; // Assuming grayscale image
              const color = colorScale[value];
              if (color) {
                data[i] = color[0]; // Red
                data[i + 1] = color[1]; // Green
                data[i + 2] = color[2]; // Blue
              } else {
                data[i + 3] = 0; // Transparent
              }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve();
          };

          img.onerror = () => reject(new Error("Image load error"));
        });

        const newBlob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob));
        });

        if (newBlob) {
          const buffer = await newBlob.arrayBuffer();
          return { data: buffer };
        }
      }
    } catch (error: any) {
      if (abortController.signal.aborted) {
        console.warn("Fetch aborted");
      } else {
        console.error("Error in tile fetch or processing:", error.message);
      }
      throw new Error(error?.message);
    }
  }) as any);
}
