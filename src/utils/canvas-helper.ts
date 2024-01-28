export function calculateBBoxWithoutPadding(canvas: any, inputBBox: { minX: number; maxX: number; minY: number; maxY: number }) {
  // Extract canvas dimensions
  const canvasWidth = canvas.canvasRect.width
  const canvasHeight = canvas.canvasRect.height

  // Check if canvas dimensions are non-zero
  if (canvasWidth !== 0 && canvasHeight !== 0) {
    // Calculate the scaling factor
    var scaleFactor = 1 / 1.1

    // Calculate the width and height adjustments
    var widthAdjustment = (1 - scaleFactor) * (inputBBox.maxX - inputBBox.minX)
    var heightAdjustment = (1 - scaleFactor) * (inputBBox.maxY - inputBBox.minY)

    // Apply adjustments to the bounding box
    var adjustedBBox = {
      minX: inputBBox.minX + widthAdjustment / 2,
      maxX: inputBBox.maxX - widthAdjustment / 2,
      minY: inputBBox.minY + heightAdjustment / 2,
      maxY: inputBBox.maxY - heightAdjustment / 2
    }

    // Return the adjusted bounding box without changing the viewport
    return adjustedBBox
  }

  // Return the original bounding box if canvas dimensions are zero
  return inputBBox
}