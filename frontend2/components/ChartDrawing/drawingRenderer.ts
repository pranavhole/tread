import type { Drawing } from '../../features/drawings/drawingSlice';
import type { ChartCoordinateMapper } from './drawingGeometry';
import { worldToPixel } from './drawingGeometry';

type ChartArea = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

function applyStyle(ctx: CanvasRenderingContext2D, drawing: Drawing, highlighted: boolean) {
  ctx.strokeStyle = highlighted ? '#ffffff' : drawing.style.stroke;
  ctx.lineWidth = highlighted ? drawing.style.width + 1 : drawing.style.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(drawing.style.dash ?? []);
}

function drawAnchors(ctx: CanvasRenderingContext2D, drawing: Drawing, mapper: ChartCoordinateMapper) {
  ctx.setLineDash([]);
  ctx.fillStyle = '#0b0e11';
  ctx.strokeStyle = '#f0b90b';
  ctx.lineWidth = 1.5;

  drawing.points.forEach((point) => {
    const pixel = worldToPixel(point, mapper);
    ctx.beginPath();
    ctx.arc(pixel.x, pixel.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function drawLine(ctx: CanvasRenderingContext2D, points: ReturnType<typeof worldToPixel>[]) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  ctx.lineTo(points[1].x, points[1].y);
  ctx.stroke();
}

function drawFreehand(ctx: CanvasRenderingContext2D, points: ReturnType<typeof worldToPixel>[]) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.stroke();
}

export function renderDrawing(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing,
  mapper: ChartCoordinateMapper,
  chartArea: ChartArea,
  selected: boolean,
  hovered: boolean
) {
  if (drawing.visible === false) return;

  const highlighted = selected || hovered;
  const pixels = drawing.points.map((point) => worldToPixel(point, mapper));

  ctx.save();
  ctx.beginPath();
  ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
  ctx.clip();
  applyStyle(ctx, drawing, highlighted);

  if (drawing.type === 'trendLine') {
    drawLine(ctx, pixels);
  }

  if (drawing.type === 'horizontalLine' && pixels[0]) {
    ctx.beginPath();
    ctx.moveTo(chartArea.left, pixels[0].y);
    ctx.lineTo(chartArea.right, pixels[0].y);
    ctx.stroke();
  }

  if (drawing.type === 'rectangle' && pixels.length >= 2) {
    const left = Math.min(pixels[0].x, pixels[1].x);
    const top = Math.min(pixels[0].y, pixels[1].y);
    const width = Math.abs(pixels[1].x - pixels[0].x);
    const height = Math.abs(pixels[1].y - pixels[0].y);

    if (drawing.style.fill) {
      ctx.fillStyle = drawing.style.fill;
      ctx.fillRect(left, top, width, height);
    }
    ctx.strokeRect(left, top, width, height);
  }

  if (drawing.type === 'freehand') {
    drawFreehand(ctx, pixels);
  }

  if (drawing.type === 'fib' && pixels.length >= 2) {
    const left = Math.min(pixels[0].x, pixels[1].x);
    const right = Math.max(pixels[0].x, pixels[1].x);
    const topPrice = drawing.points[0].price;
    const bottomPrice = drawing.points[1].price;

    ctx.font = '11px Inter, ui-sans-serif, system-ui';
    ctx.fillStyle = '#cbd5e1';
    ctx.textBaseline = 'middle';

    fibLevels.forEach((level) => {
      const price = topPrice + (bottomPrice - topPrice) * level;
      const y = mapper.priceToY(price);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillText(`${(level * 100).toFixed(level === 0 || level === 1 ? 0 : 1)}%`, right + 6, y);
    });
  }

  if (drawing.type === 'text' && pixels[0]) {
    ctx.setLineDash([]);
    ctx.font = '600 13px Inter, ui-sans-serif, system-ui';
    ctx.fillStyle = highlighted ? '#ffffff' : drawing.style.stroke;
    ctx.textBaseline = 'bottom';
    ctx.fillText(drawing.text ?? 'Annotation', pixels[0].x, pixels[0].y);
  }

  if (highlighted && !drawing.locked) drawAnchors(ctx, drawing, mapper);
  ctx.restore();
}

export function renderDrawings(
  ctx: CanvasRenderingContext2D,
  drawings: Drawing[],
  mapper: ChartCoordinateMapper,
  chartArea: ChartArea,
  selectedDrawingId: string | null,
  hoveredDrawingId: string | null,
  preview?: Drawing | null
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawings.forEach((drawing) => {
    renderDrawing(
      ctx,
      drawing,
      mapper,
      chartArea,
      drawing.id === selectedDrawingId,
      drawing.id === hoveredDrawingId
    );
  });

  if (preview) {
    renderDrawing(ctx, preview, mapper, chartArea, false, true);
  }
}
