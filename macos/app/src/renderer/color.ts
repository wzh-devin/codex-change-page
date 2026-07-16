type RGB = { r: number; g: number; b: number };

function hex({ r, g, b }: RGB) {
  return `#${[r, g, b].map((value) =>
    Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function saturation({ r, g, b }: RGB) {
  const values = [r, g, b].map((value) => value / 255);
  const max = Math.max(...values);
  const min = Math.min(...values);
  return max === 0 ? 0 : (max - min) / max;
}

function distance(left: RGB, right: RGB) {
  return Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);
}

export function derivePalette(pixels: Uint8ClampedArray) {
  const colors: RGB[] = [];
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue;
    const color = { r: pixels[index], g: pixels[index + 1], b: pixels[index + 2] };
    const brightness = (color.r + color.g + color.b) / 3;
    if (brightness < 20 || brightness > 242) continue;
    colors.push(color);
  }
  if (!colors.length) {
    return { accent: "#5865d8", secondary: "#36a8b8", highlight: "#8b4d9f" };
  }
  colors.sort((left, right) => saturation(right) - saturation(left));
  const accent = colors[0];
  const secondary = colors.find((color) => distance(color, accent) > 90) ?? colors[Math.floor(colors.length / 2)];
  const highlight = colors.find((color) =>
    distance(color, accent) > 70 && distance(color, secondary) > 70) ?? colors.at(-1) ?? accent;
  return { accent: hex(accent), secondary: hex(secondary), highlight: hex(highlight) };
}

export async function paletteFromImage(dataUrl: string) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return derivePalette(context.getImageData(0, 0, canvas.width, canvas.height).data);
}
