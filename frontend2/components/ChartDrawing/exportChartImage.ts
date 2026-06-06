export function exportMergedChartImage(chartCanvas: HTMLCanvasElement, drawingCanvas: HTMLCanvasElement) {
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = chartCanvas.width;
  finalCanvas.height = chartCanvas.height;

  const ctx = finalCanvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create export canvas context');

  ctx.drawImage(chartCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  ctx.drawImage(drawingCanvas, 0, 0, finalCanvas.width, finalCanvas.height);

  return finalCanvas.toDataURL('image/png');
}
