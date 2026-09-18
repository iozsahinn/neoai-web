/**
 * Utility to parse AI bounding box string format:
 * "<classId> <x1> <y1> <x2> <y2>" (e.g. "2 0.500334 0.242744 0.999331 0.144809")
 * where coordinates are normalized between 0.0 and 1.0.
 *
 * @param {string|object} line - Space-separated bounding box line or existing bbox object
 * @param {number|string} [index=0] - Optional index or identifier
 * @returns {object|null} - Normalized & percentage bbox object
 */
export function parseAiBbox(line, index = 0) {
  if (typeof line === "object" && line !== null) {
    if (typeof line.leftPercent === "number" && typeof line.topPercent === "number") {
      return line;
    }
    if (line.topLeft && line.bottomRight) {
      const x1 = line.topLeft.x <= 1 ? line.topLeft.x : line.topLeft.x / 400;
      const y1 = line.topLeft.y <= 1 ? line.topLeft.y : line.topLeft.y / 400;
      const x2 = line.bottomRight.x <= 1 ? line.bottomRight.x : line.bottomRight.x / 400;
      const y2 = line.bottomRight.y <= 1 ? line.bottomRight.y : line.bottomRight.y / 400;
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      return {
        id: line.id || `bbox-${index}`,
        classId: line.classId ?? 1,
        leftPercent: left * 100,
        topPercent: top * 100,
        widthPercent: width * 100,
        heightPercent: height * 100,
        normalized: { x1: left, y1: top, x2: left + width, y2: top + height }
      };
    }
  }

  if (typeof line !== "string") {
    return null;
  }

  const parts = line.trim().split(/\s+/).map(Number);
  if (parts.length < 5 || parts.some(isNaN)) {
    return null;
  }

  const [classId, rawX1, rawY1, rawX2, rawY2] = parts;
  const left = Math.max(0, Math.min(rawX1, rawX2));
  const top = Math.max(0, Math.min(rawY1, rawY2));
  const width = Math.min(1 - left, Math.abs(rawX2 - rawX1));
  const height = Math.min(1 - top, Math.abs(rawY2 - rawY1));

  return {
    id: `ai-bbox-${classId}-${index}`,
    classId,
    leftPercent: left * 100,
    topPercent: top * 100,
    widthPercent: width * 100,
    heightPercent: height * 100,
    normalized: {
      x1: left,
      y1: top,
      x2: left + width,
      y2: top + height
    }
  };
}

/**
 * Parse multiple lines of AI output
 * @param {Array<string>|string} lines
 * @returns {Array<object>}
 */
export function parseAiBboxLines(lines) {
  if (!lines) return [];
  const lineArray = Array.isArray(lines) ? lines : String(lines).split("\n");
  return lineArray.map((l, i) => parseAiBbox(l, i)).filter(Boolean);
}

/**
 * Utility to draw/burn bounding box rectangles onto an image data URL or image source
 * using an off-screen HTML5 Canvas.
 * 
 * @param {string} imageSrc - Base64 data URL or image URL
 * @param {Array} rectangles - Array of rectangle coordinates (normalized, percentage, or legacy format)
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

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(2, lineWidth * (canvas.width / referenceWidth));
        ctx.lineJoin = "round";

        rectangles.forEach((rawRect, index) => {
          const rect = parseAiBbox(rawRect, index);
          if (!rect) return;

          let x, y, width, height;
          if (rect.normalized) {
            x = rect.normalized.x1 * canvas.width;
            y = rect.normalized.y1 * canvas.height;
            width = (rect.normalized.x2 - rect.normalized.x1) * canvas.width;
            height = (rect.normalized.y2 - rect.normalized.y1) * canvas.height;
          } else if (typeof rect.leftPercent === "number") {
            x = (rect.leftPercent / 100) * canvas.width;
            y = (rect.topPercent / 100) * canvas.height;
            width = (rect.widthPercent / 100) * canvas.width;
            height = (rect.heightPercent / 100) * canvas.height;
          } else if (rect.topLeft && rect.bottomRight) {
            const scaleX = canvas.width / referenceWidth;
            const scaleY = canvas.height / referenceHeight;
            x = rect.topLeft.x * scaleX;
            y = rect.topLeft.y * scaleY;
            width = (rect.bottomRight.x - rect.topLeft.x) * scaleX;
            height = (rect.bottomRight.y - rect.topLeft.y) * scaleY;
          } else {
            return;
          }

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
