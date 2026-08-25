/**
 * Utility to draw/burn bounding box rectangles onto an image data URL or image source
 * using an off-screen HTML5 Canvas.
 * 
 * @param {string} imageSrc - Base64 data URL or image URL
 * @param {Array<{topLeft: {x: number, y: number}, bottomRight: {x: number, y: number}}>} rectangles - Array of rectangle coordinates
 * @param {object} [options] - Styling options for rectangles
 * @returns {Promise<string>} - Returns Promise resolving to composite image data URL
 */
export function burnRectanglesOnImage(imageSrc, rectangles = [], options = {}) {
  if (!imageSrc) {
    return Promise.resolve("");
  }

  if (!Array.isArray(rectangles) || rectangles.length === 0) {
    return Promise.resolve(imageSrc);
  }

  const {
    strokeColor = "#00FF00",
    lineWidth = 3,
    referenceWidth = 400,
    referenceHeight = 400
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.naturalWidth || img.width || referenceWidth;
        canvas.height = img.naturalHeight || img.height || referenceHeight;

        // Draw original (or preprocessed) image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const scaleX = canvas.width / referenceWidth;
        const scaleY = canvas.height / referenceHeight;

        // Draw each rectangle
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(2, lineWidth * Math.min(scaleX, scaleY));
        ctx.lineJoin = "round";

        rectangles.forEach((rect) => {
          if (!rect?.topLeft || !rect?.bottomRight) {
            return;
          }

          // If coordinates are normalized or based on reference coordinate space:
          const x = rect.topLeft.x * scaleX;
          const y = rect.topLeft.y * scaleY;
          const width = (rect.bottomRight.x - rect.topLeft.x) * scaleX;
          const height = (rect.bottomRight.y - rect.topLeft.y) * scaleY;

          ctx.strokeRect(x, y, width, height);
        });

        resolve(canvas.toDataURL("image/jpeg", 0.95));
      } catch (err) {
        console.warn("Failed to burn rectangles onto image canvas, falling back to raw image:", err);
        resolve(imageSrc);
      }
    };

    img.onerror = () => {
      resolve(imageSrc);
    };

    img.src = imageSrc;
  });
}
