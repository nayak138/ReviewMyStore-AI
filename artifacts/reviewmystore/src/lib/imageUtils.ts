export const MAX_IMAGE_BYTES = 24 * 1024; // 24 KB hard limit for all uploads

/**
 * Resolves a stored object path to a fetchable URL.
 * Uploads store paths like `/objects/uploads/{id}`, but the API serves them
 * under `${BASE_URL}api/storage/objects/...` — this bridges the two.
 */
export function objectUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  if (path.startsWith("/objects/")) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${base}/api/storage${path}`;
  }
  if (path.startsWith("/public-assets/")) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${base}/api/storage${path}`;
  }
  return path;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this file as an image."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Compresses any image down to MAX_IMAGE_BYTES by progressively shrinking
 * dimensions and quality (WebP). Files already under the limit pass through
 * untouched. Throws if the file isn't a decodable image.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_IMAGE_BYTES) return file;

  const img = await loadImage(file);

  // Ladder of (max dimension, quality) attempts — later steps get aggressive.
  const attempts: Array<[number, number]> = [
    [1024, 0.8],
    [800, 0.7],
    [640, 0.6],
    [512, 0.5],
    [400, 0.45],
    [320, 0.4],
    [256, 0.35],
    [192, 0.3],
    [128, 0.3],
  ];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing isn't supported in this browser.");

  for (const [maxDim, quality] of attempts) {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, "image/webp", quality);
    if (blob && blob.size <= MAX_IMAGE_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
      return new File([blob], name, { type: "image/webp" });
    }
  }

  throw new Error(
    "This image couldn't be compressed under 24 KB. Try a simpler or smaller image.",
  );
}
