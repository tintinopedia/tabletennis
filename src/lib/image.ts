/** Shrink a PNG/JPG so it fits in one Firestore document (keeps PNG transparency when it can). */
const LIMIT = 700_000; // characters of data URL

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      res(img);
    };
    img.onerror = () => rej(new Error("Could not read the image"));
    img.src = url;
  });
}

export async function compressImage(file: File): Promise<string> {
  if (!/^image\/(png|jpe?g)$/.test(file.type)) throw new Error("Please choose a PNG or JPG image.");
  const img = await load(file);
  const isPng = file.type === "image/png";
  for (const maxSide of [1800, 1400, 1100, 900, 700]) {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    if (isPng) {
      ctx.drawImage(img, 0, 0, w, h);
      const png = c.toDataURL("image/png");
      if (png.length <= LIMIT) return png;
    }
    // JPEG fallback: paint white behind transparent areas so they don't turn black
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    if (!isPng) ctx.drawImage(img, 0, 0, w, h);
    for (const q of [0.88, 0.8, 0.7, 0.6]) {
      const jpg = c.toDataURL("image/jpeg", q);
      if (jpg.length <= LIMIT) return jpg;
    }
  }
  throw new Error("That image is too large. Try a smaller one.");
}
