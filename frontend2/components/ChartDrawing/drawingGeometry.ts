import type { Chart as ChartJS } from 'chart.js';
import type { Drawing, DrawingPoint } from '../../features/drawings/drawingSlice';

export type PixelPoint = {
  x: number;
  y: number;
};

export type ChartCoordinateMapper = {
  timeToX: (time: number) => number;
  priceToY: (price: number) => number;
  xToTime: (x: number) => number;
  yToPrice: (y: number) => number;
};

export type MarketCandleForSnap = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export function createCoordinateMapper(chart: ChartJS): ChartCoordinateMapper | null {
  const xScale = chart.scales.x;
  const yScale = chart.scales.y;

  if (!xScale || !yScale) return null;

  return {
    timeToX: (time) => xScale.getPixelForValue(time),
    priceToY: (price) => yScale.getPixelForValue(price),
    xToTime: (x) => Number(xScale.getValueForPixel(x)),
    yToPrice: (y) => Number(yScale.getValueForPixel(y)),
  };
}

export function worldToPixel(point: DrawingPoint, mapper: ChartCoordinateMapper): PixelPoint {
  return {
    x: mapper.timeToX(point.time),
    y: mapper.priceToY(point.price),
  };
}

export function pixelToWorld(point: PixelPoint, mapper: ChartCoordinateMapper): DrawingPoint {
  return {
    time: mapper.xToTime(point.x),
    price: mapper.yToPrice(point.y),
  };
}

export function snapToNearestOhlc(
  point: DrawingPoint,
  candles: MarketCandleForSnap[],
  mapper: ChartCoordinateMapper,
  maxDistancePx = 18
): DrawingPoint {
  let nearest: DrawingPoint | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  const pointer = worldToPixel(point, mapper);

  for (const candle of candles) {
    for (const price of [candle.open, candle.high, candle.low, candle.close]) {
      const candidate = { time: candle.time, price };
      const pixel = worldToPixel(candidate, mapper);
      const distance = Math.hypot(pointer.x - pixel.x, pointer.y - pixel.y);

      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }
  }

  return nearest && nearestDistance <= maxDistancePx ? nearest : point;
}

function distanceToSegment(point: PixelPoint, start: PixelPoint, end: PixelPoint) {
  const lengthSquared = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) /
        lengthSquared
    )
  );

  return Math.hypot(point.x - (start.x + t * (end.x - start.x)), point.y - (start.y + t * (end.y - start.y)));
}

export function getAnchorHit(
  drawing: Drawing,
  point: PixelPoint,
  mapper: ChartCoordinateMapper,
  radius = 9
) {
  if (drawing.locked || drawing.visible === false) return -1;

  return drawing.points.findIndex((anchor) => {
    const pixel = worldToPixel(anchor, mapper);
    return Math.hypot(point.x - pixel.x, point.y - pixel.y) <= radius;
  });
}

export function isDrawingHit(
  drawing: Drawing,
  point: PixelPoint,
  mapper: ChartCoordinateMapper,
  chartArea: { left: number; right: number; top: number; bottom: number }
) {
  if (drawing.visible === false) return false;

  const pixels = drawing.points.map((item) => worldToPixel(item, mapper));

  if (drawing.type === 'horizontalLine') {
    const y = pixels[0]?.y;
    return typeof y === 'number' && point.x >= chartArea.left && point.x <= chartArea.right && Math.abs(point.y - y) <= 6;
  }

  if (drawing.type === 'rectangle' && pixels.length >= 2) {
    const left = Math.min(pixels[0].x, pixels[1].x);
    const right = Math.max(pixels[0].x, pixels[1].x);
    const top = Math.min(pixels[0].y, pixels[1].y);
    const bottom = Math.max(pixels[0].y, pixels[1].y);
    const nearEdge =
      Math.abs(point.x - left) <= 6 ||
      Math.abs(point.x - right) <= 6 ||
      Math.abs(point.y - top) <= 6 ||
      Math.abs(point.y - bottom) <= 6;

    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom && nearEdge;
  }

  if (drawing.type === 'text' && pixels[0]) {
    return point.x >= pixels[0].x && point.x <= pixels[0].x + 160 && point.y >= pixels[0].y - 24 && point.y <= pixels[0].y + 10;
  }

  if (drawing.type === 'freehand') {
    return pixels.some((pixel, index) => index > 0 && distanceToSegment(point, pixels[index - 1], pixel) <= 6);
  }

  return pixels.some((pixel, index) => index > 0 && distanceToSegment(point, pixels[index - 1], pixel) <= 6);
}

export function findDrawingAtPoint(
  drawings: Drawing[],
  point: PixelPoint,
  mapper: ChartCoordinateMapper,
  chartArea: { left: number; right: number; top: number; bottom: number }
) {
  for (let index = drawings.length - 1; index >= 0; index -= 1) {
    const drawing = drawings[index];
    const anchorIndex = getAnchorHit(drawing, point, mapper);
    if (anchorIndex >= 0) return { drawing, anchorIndex };

    if (isDrawingHit(drawing, point, mapper, chartArea)) return { drawing, anchorIndex: -1 };
  }

  return null;
}
