"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Check,
  ChevronDown,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Chart } from "react-chartjs-2";

import {
  BarController,
  BarElement,
  Chart as ChartJS,
  ChartData,
  ChartDataset,
  ChartOptions,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
  TooltipItem,
} from "chart.js";

import zoomPlugin from "chartjs-plugin-zoom";
import {
  CandlestickController,
  CandlestickElement,
} from "chartjs-chart-financial";

import "chartjs-adapter-date-fns";

import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { getCandles } from "../../features/market/marketSlice";
import { formatMarketSymbol, formatPercent, formatPrice } from "../../utils/format";
import DrawingCanvasOverlay from "../ChartDrawing/DrawingCanvasOverlay";
import DrawingToolbar from "../ChartDrawing/DrawingToolbar";
import { exportMergedChartImage } from "../ChartDrawing/exportChartImage";
import {
  INDICATORS,
  READY_INDICATOR_IDS,
  type IndicatorId,
} from "./indicatorCatalog";

ChartJS.register(
  TimeScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  CandlestickController,
  CandlestickElement,
  Tooltip,
  Legend,
  zoomPlugin
);

type CandlePoint = {
  x: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

type LinePoint = {
  x: number;
  y: number | null;
};

type MarketCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type ZoomableChart = ChartJS<"candlestick"> & {
  resetZoom: () => void;
  zoom: (amount: number) => void;
};

const INDICATOR_COLORS: Record<string, string> = {
  sma20: "#f0b90b",
  sma50: "#8b5cf6",
  ema9: "#38bdf8",
  ema21: "#22c55e",
  ema50: "#f97316",
  bbUpper: "#94a3b8",
  bbMiddle: "#64748b",
  bbLower: "#94a3b8",
  vwap: "#e879f9",
  rsi14: "#60a5fa",
  macd: "#14b8a6",
  macdSignal: "#f43f5e",
  stoch14: "#a3e635",
  stochSignal: "#facc15",
  atr14: "#fb7185",
};

const ONE_MINUTE_MS = 60_000;
const TIME_RANGES = [
  { id: "15m", label: "15m", durationMs: 15 * ONE_MINUTE_MS },
  { id: "1h", label: "1H", durationMs: 60 * ONE_MINUTE_MS },
  { id: "1d", label: "1D", durationMs: 24 * 60 * ONE_MINUTE_MS },
  { id: "1w", label: "1W", durationMs: 7 * 24 * 60 * ONE_MINUTE_MS },
  { id: "1mo", label: "1M", durationMs: 30 * 24 * 60 * ONE_MINUTE_MS },
  { id: "1y", label: "1Y", durationMs: 365 * 24 * 60 * ONE_MINUTE_MS },
  { id: "all", label: "All", durationMs: null },
] as const;
type TimeRangeId = (typeof TIME_RANGES)[number]["id"];
const TIME_RANGE_INTERVALS: Record<TimeRangeId, string> = {
  "15m": "1m",
  "1h": "1m",
  "1d": "5m",
  "1w": "30m",
  "1mo": "4h",
  "1y": "1d",
  all: "1d",
};
const localTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
const localDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const localDayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
});

function formatRangeTick(value: number, timeRange: TimeRangeId) {
  if (timeRange === "1y" || timeRange === "all") return localDayFormatter.format(new Date(value));
  if (timeRange === "1w" || timeRange === "1mo") return formatLocalDateTime(value);
  return formatLocalTime(value);
}

function formatLocalTime(value: number) {
  return localTimeFormatter.format(new Date(value));
}

function formatLocalDateTime(value: number) {
  return localDateTimeFormatter.format(new Date(value));
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sma(values: number[], period: number) {
  return values.map((_, index) => {
    if (index < period - 1) return null;
    return average(values.slice(index - period + 1, index + 1));
  });
}

function ema(values: number[], period: number) {
  const multiplier = 2 / (period + 1);
  let previous: number | null = null;

  return values.map((value, index) => {
    if (index < period - 1) return null;

    if (previous === null) {
      previous = average(values.slice(index - period + 1, index + 1));
      return previous;
    }

    previous = value * multiplier + previous * (1 - multiplier);
    return previous;
  });
}

function emaNullable(values: Array<number | null>, period: number) {
  const result: Array<number | null> = Array(values.length).fill(null);
  const valid = values
    .map((value, index) => ({ value, index }))
    .filter((item): item is { value: number; index: number } => item.value !== null);
  const emaValues = ema(valid.map((item) => item.value), period);

  valid.forEach((item, index) => {
    result[item.index] = emaValues[index];
  });

  return result;
}

function bollinger(values: number[], period: number) {
  const middle = sma(values, period);
  const upper: Array<number | null> = [];
  const lower: Array<number | null> = [];

  values.forEach((_, index) => {
    if (index < period - 1 || middle[index] === null) {
      upper.push(null);
      lower.push(null);
      return;
    }

    const window = values.slice(index - period + 1, index + 1);
    const mean = middle[index] as number;
    const variance = average(window.map((value) => (value - mean) ** 2));
    const deviation = Math.sqrt(variance);

    upper.push(mean + deviation * 2);
    lower.push(mean - deviation * 2);
  });

  return { upper, middle, lower };
}

function vwap(candles: MarketCandle[]) {
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;

  return candles.map((candle) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativePriceVolume += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
    return cumulativeVolume ? cumulativePriceVolume / cumulativeVolume : null;
  });
}

function rsi(values: number[], period: number) {
  const result: Array<number | null> = Array(values.length).fill(null);
  let gain = 0;
  let loss = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    gain += Math.max(change, 0);
    loss += Math.max(-change, 0);
  }

  let averageGain = gain / period;
  let averageLoss = loss / period;
  result[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    result[index] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  }

  return result;
}

function atr(candles: Array<{ high: number; low: number; close: number }>, period: number) {
  const ranges = candles.map((candle, index) => {
    if (index === 0) return candle.high - candle.low;
    const previousClose = candles[index - 1].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });

  return sma(ranges, period);
}

function stochastic(candles: Array<{ high: number; low: number; close: number }>, period: number) {
  const k = candles.map((candle, index) => {
    if (index < period - 1) return null;

    const window = candles.slice(index - period + 1, index + 1);
    const high = Math.max(...window.map((item) => item.high));
    const low = Math.min(...window.map((item) => item.low));

    return high === low ? 50 : ((candle.close - low) / (high - low)) * 100;
  });

  return { k, d: sma(k.map((value) => value ?? 0), 3) };
}

function toLineData(candles: Array<{ time: number }>, values: Array<number | null>): LinePoint[] {
  return candles.map((candle, index) => ({
    x: candle.time,
    y: values[index] ?? null,
  }));
}

function makeLineDataset(
  label: string,
  data: LinePoint[],
  color: string,
  yAxisID = "y"
): ChartDataset<"line", LinePoint[]> {
  return {
    type: "line",
    label,
    data,
    yAxisID,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 1.5,
    pointRadius: 0,
    pointHoverRadius: 0,
    tension: 0.18,
    spanGaps: true,
  };
}

const ChartArea: React.FC = () => {
  const dispatch = useAppDispatch();
  const chartRef = useRef<ChartJS<"candlestick"> | null>(null);
  const chartShellRef = useRef<HTMLDivElement | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const indicatorDropdownRef = useRef<HTMLDivElement | null>(null);

  const candles = useAppSelector((state) => state.market.candles);
  const currentPrice = useAppSelector((state) => state.market.currentPrice);
  const activeSymbol = useAppSelector((state) => state.market.activeSymbol);
  const currentChange24h = useAppSelector(
    (state) => state.marketDirectory.changes[activeSymbol] ?? 0
  );
  const activeDrawingTool = useAppSelector((state) => state.drawings.activeTool);

  const [timeRange, setTimeRange] = useState<TimeRangeId>("1h");
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [indicatorDropdownOpen, setIndicatorDropdownOpen] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorId[]>([
    "ema21",
    "vwap",
  ]);
  const [chartNow, setChartNow] = useState(() => Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const candleRequest = { symbol: activeSymbol, interval: TIME_RANGE_INTERVALS[timeRange] };

    dispatch(getCandles(candleRequest));

    const interval = setInterval(() => {
      dispatch(getCandles(candleRequest));
    }, 60_000);

    return () => clearInterval(interval);
  }, [activeSymbol, dispatch, timeRange]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        indicatorDropdownRef.current &&
        !indicatorDropdownRef.current.contains(event.target as Node)
      ) {
        setIndicatorDropdownOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setChartNow(Date.now());
    }, 15_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === chartShellRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const visibleCandles = useMemo(() => {
    const selectedRange = TIME_RANGES.find((range) => range.id === timeRange);
    if (!selectedRange?.durationMs) return candles;

    const rangeStart = chartNow - selectedRange.durationMs;
    return candles.filter((candle) => candle.time >= rangeStart);
  }, [candles, chartNow, timeRange]);

  const chartBounds = useMemo(() => {
    const firstCandle = visibleCandles.at(0);
    const latestCandle = visibleCandles.at(-1);

    if (!firstCandle || !latestCandle) return undefined;

    const hasSingleCandle = firstCandle.time === latestCandle.time;

    return {
      min: hasSingleCandle ? firstCandle.time - ONE_MINUTE_MS : firstCandle.time,
      max: Math.max(chartNow, latestCandle.time + ONE_MINUTE_MS),
    };
  }, [chartNow, visibleCandles]);

  const candleData: CandlePoint[] = useMemo(() => {
    return visibleCandles.map((candle) => ({
      x: candle.time,
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
    }));
  }, [visibleCandles]);

  const indicatorDatasets = useMemo(() => {
    const closes = visibleCandles.map((candle) => candle.close);
    const datasets: ChartDataset<"line", LinePoint[]>[] = [];

    if (selectedIndicators.includes("sma20")) {
      datasets.push(makeLineDataset("SMA 20", toLineData(visibleCandles, sma(closes, 20)), INDICATOR_COLORS.sma20));
    }

    if (selectedIndicators.includes("sma50")) {
      datasets.push(makeLineDataset("SMA 50", toLineData(visibleCandles, sma(closes, 50)), INDICATOR_COLORS.sma50));
    }

    if (selectedIndicators.includes("ema9")) {
      datasets.push(makeLineDataset("EMA 9", toLineData(visibleCandles, ema(closes, 9)), INDICATOR_COLORS.ema9));
    }

    if (selectedIndicators.includes("ema21")) {
      datasets.push(makeLineDataset("EMA 21", toLineData(visibleCandles, ema(closes, 21)), INDICATOR_COLORS.ema21));
    }

    if (selectedIndicators.includes("ema50")) {
      datasets.push(makeLineDataset("EMA 50", toLineData(visibleCandles, ema(closes, 50)), INDICATOR_COLORS.ema50));
    }

    if (selectedIndicators.includes("bb20")) {
      const bands = bollinger(closes, 20);
      datasets.push(makeLineDataset("BB Upper", toLineData(visibleCandles, bands.upper), INDICATOR_COLORS.bbUpper));
      datasets.push(makeLineDataset("BB Middle", toLineData(visibleCandles, bands.middle), INDICATOR_COLORS.bbMiddle));
      datasets.push(makeLineDataset("BB Lower", toLineData(visibleCandles, bands.lower), INDICATOR_COLORS.bbLower));
    }

    if (selectedIndicators.includes("vwap")) {
      datasets.push(makeLineDataset("VWAP", toLineData(visibleCandles, vwap(visibleCandles)), INDICATOR_COLORS.vwap));
    }

    if (selectedIndicators.includes("rsi14")) {
      datasets.push(makeLineDataset("RSI 14", toLineData(visibleCandles, rsi(closes, 14)), INDICATOR_COLORS.rsi14, "yIndicator"));
    }

    if (selectedIndicators.includes("macd")) {
      const fastEma = ema(closes, 12);
      const slowEma = ema(closes, 26);
      const macdLine = fastEma.map((fast, index) => {
        const slow = slowEma[index];
        return fast === null || slow === null ? null : fast - slow;
      });
      datasets.push(makeLineDataset("MACD", toLineData(visibleCandles, macdLine), INDICATOR_COLORS.macd, "yMacd"));
      datasets.push(makeLineDataset("MACD Signal", toLineData(visibleCandles, emaNullable(macdLine, 9)), INDICATOR_COLORS.macdSignal, "yMacd"));
    }

    if (selectedIndicators.includes("stoch14")) {
      const stoch = stochastic(visibleCandles, 14);
      datasets.push(makeLineDataset("Stoch K", toLineData(visibleCandles, stoch.k), INDICATOR_COLORS.stoch14, "yIndicator"));
      datasets.push(makeLineDataset("Stoch D", toLineData(visibleCandles, stoch.d), INDICATOR_COLORS.stochSignal, "yIndicator"));
    }

    if (selectedIndicators.includes("atr14")) {
      datasets.push(makeLineDataset("ATR 14", toLineData(visibleCandles, atr(visibleCandles, 14)), INDICATOR_COLORS.atr14, "yAtr"));
    }

    return datasets;
  }, [selectedIndicators, visibleCandles]);

  const chartData = useMemo(() => {
    const candleDataset: ChartDataset<"candlestick", CandlePoint[]> = {
      label: formatMarketSymbol(activeSymbol),
      data: candleData,
      borderColors: {
        up: "#16c784",
        down: "#ea3943",
        unchanged: "#848e9c",
      },
      backgroundColors: {
        up: "rgba(22, 199, 132, 0.72)",
        down: "rgba(234, 57, 67, 0.72)",
        unchanged: "rgba(132, 142, 156, 0.72)",
      },
    };

    return {
      datasets: [candleDataset, ...indicatorDatasets],
    } as unknown as ChartData<"candlestick", CandlePoint[]>;
  }, [activeSymbol, candleData, indicatorDatasets]);

  const chartOptions: ChartOptions<"candlestick"> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    animation: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          color: "#a7b1c2",
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
        borderColor: "#2a2e39",
        borderWidth: 1,
        titleColor: "#cbd5e1",
        bodyColor: "#fff",
        displayColors: true,
        callbacks: {
          title: (items) => {
            const raw = items[0]?.raw as CandlePoint | LinePoint | undefined;
            return raw ? formatLocalDateTime(raw.x) : "";
          },
          label: (ctx: TooltipItem<"candlestick">) => {
            const datasetType = (ctx.dataset as { type?: string }).type;

            if (datasetType === "line") {
              const point = ctx.raw as LinePoint;
              return `${ctx.dataset.label}: ${point.y === null ? "-" : formatPrice(point.y)}`;
            }

            const candle = ctx.raw as CandlePoint;
            return [
              `Open: ${formatPrice(candle.o)}`,
              `High: ${formatPrice(candle.h)}`,
              `Low: ${formatPrice(candle.l)}`,
              `Close: ${formatPrice(candle.c)}`,
            ];
          },
        },
      },
      zoom: {
        limits: {
          x: { min: "original", max: "original" },
        },
        pan: {
          enabled: true,
          mode: "x",
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          drag: {
            enabled: activeDrawingTool === "select",
            backgroundColor: "rgba(247, 147, 26, 0.16)",
            borderColor: "#f7931a",
            borderWidth: 1,
          },
          mode: "x",
        },
      },
    },
    scales: {
      x: {
        type: "time",
        min: chartBounds?.min,
        max: chartBounds?.max,
        time: {
          unit: "minute",
        },
        grid: {
          color: "rgba(42, 46, 57, 0.72)",
        },
        ticks: {
          color: "#848e9c",
          maxRotation: 0,
          callback: (value) => formatRangeTick(Number(value), timeRange),
        },
      },
      y: {
        position: "right",
        grid: {
          color: "rgba(42, 46, 57, 0.72)",
        },
        ticks: {
          color: "#848e9c",
          callback: (value) => formatPrice(Number(value)),
        },
      },
      yIndicator: {
        display: selectedIndicators.some((indicator) => indicator === "rsi14" || indicator === "stoch14"),
        position: "left",
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: "#64748b",
        },
      },
      yMacd: {
        display: selectedIndicators.includes("macd"),
        position: "left",
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: "#64748b",
        },
      },
      yAtr: {
        display: selectedIndicators.includes("atr14"),
        position: "left",
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: "#64748b",
        },
      },
    },
  }), [activeDrawingTool, chartBounds, selectedIndicators, timeRange]);

  const filteredIndicators = useMemo(() => {
    const query = indicatorSearch.trim().toLowerCase();

    if (!query) return INDICATORS;

    return INDICATORS.filter((indicator) =>
      `${indicator.label} ${indicator.shortLabel} ${indicator.group} ${indicator.status}`
        .toLowerCase()
        .includes(query)
    );
  }, [indicatorSearch]);

  const toggleIndicator = (indicator: IndicatorId) => {
    if (!READY_INDICATOR_IDS.has(indicator)) return;

    setSelectedIndicators((current) =>
      current.includes(indicator)
        ? current.filter((item) => item !== indicator)
        : [...current, indicator]
    );
    setIndicatorSearch("");
    setIndicatorDropdownOpen(false);
  };

  const zoomInChart = () => {
    (chartRef.current as ZoomableChart | null)?.zoom(1.18);
  };

  const zoomOutChart = () => {
    (chartRef.current as ZoomableChart | null)?.zoom(0.82);
  };

  const resetZoom = () => {
    (chartRef.current as ZoomableChart | null)?.resetZoom();
    setTimeRange("1h");
  };

  const exportChart = () => {
    const chartCanvas = chartRef.current?.canvas;
    const drawingCanvas = drawingCanvasRef.current;

    if (!chartCanvas || !drawingCanvas) return null;

    return exportMergedChartImage(chartCanvas, drawingCanvas);
  };

  const toggleFullscreen = async () => {
    const chartShell = chartShellRef.current;

    if (!chartShell) return;

    if (document.fullscreenElement === chartShell) {
      await document.exitFullscreen();
      return;
    }

    if (chartShell.requestFullscreen) {
      await chartShell.requestFullscreen();
      return;
    }

    setIsFullscreen((current) => !current);
  };

  return (
    <div
      ref={chartShellRef}
      className={`flex h-full w-full flex-col bg-[#0b0e11] ${
        isFullscreen ? "fixed inset-0 z-[60] min-h-screen" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2e39] px-4 py-2">
        <div className="min-w-[180px]">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">{formatMarketSymbol(activeSymbol)}</h2>
            <span className="inline-flex items-center gap-1 rounded border border-[#16c784]/35 px-2 py-0.5 text-xs text-[#16c784]">
              <Activity size={12} />
              Live
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold text-white">${formatPrice(currentPrice)}</p>
            <span className={currentChange24h >= 0 ? "text-sm text-[#16c784]" : "text-sm text-[#ea3943]"}>
              {formatPercent(currentChange24h)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-8 items-center rounded border border-[#2a2e39] bg-[#11151d]">
            <button
              type="button"
              onClick={zoomOutChart}
              className="grid h-8 w-8 place-items-center text-[#a7b1c2] hover:text-white"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              onClick={zoomInChart}
              className="grid h-8 w-8 place-items-center border-l border-[#2a2e39] text-[#a7b1c2] hover:text-white"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="grid h-8 w-8 place-items-center border-l border-[#2a2e39] text-[#a7b1c2] hover:text-white"
              title="Reset zoom"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="grid h-8 w-8 place-items-center rounded border border-[#2a2e39] bg-[#11151d] text-[#a7b1c2] hover:text-white"
            title={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <div className="flex h-8 items-center rounded border border-[#2a2e39] bg-[#11151d] text-xs">
            {TIME_RANGES.map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => setTimeRange(range.id)}
                className={`h-8 px-2.5 ${
                  timeRange === range.id
                    ? "bg-[#f7931a]/20 text-[#f7931a]"
                    : "text-[#a7b1c2] hover:text-white"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[#2a2e39] px-4 py-2">
        <div ref={indicatorDropdownRef} className="relative min-w-[280px] flex-1 max-w-[460px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 z-10 text-[#64748b]" size={15} />
          <input
            value={indicatorSearch}
            onChange={(event) => {
              setIndicatorSearch(event.target.value);
              setIndicatorDropdownOpen(true);
            }}
            onFocus={() => setIndicatorDropdownOpen(true)}
            placeholder="Select or search indicators"
            className="h-9 w-full rounded border border-[#2a2e39] bg-[#11151d] pl-9 pr-10 text-sm text-white outline-none placeholder:text-[#64748b] focus:border-[#f7931a]"
          />
          <button
            type="button"
            onClick={() => setIndicatorDropdownOpen((open) => !open)}
            className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded text-[#64748b] hover:text-white"
            title="Open indicators"
          >
            <ChevronDown
              size={16}
              className={indicatorDropdownOpen ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </button>

          {indicatorDropdownOpen && (
            <div className="absolute left-0 right-0 top-10 z-30 max-h-80 overflow-hidden rounded border border-[#2a2e39] bg-[#0f141b] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-[#2a2e39] px-3 py-2 text-xs text-[#848e9c]">
                <span>{filteredIndicators.length} indicators</span>
                <span>{selectedIndicators.length} selected</span>
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {filteredIndicators.map((indicator) => {
                  const selected = selectedIndicators.includes(indicator.id);
                  const isReady = indicator.status === "ready";

                  return (
                    <button
                      key={indicator.id}
                      type="button"
                      disabled={!isReady}
                      onClick={() => toggleIndicator(indicator.id)}
                      title={isReady ? indicator.label : `${indicator.label} formula pending`}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                        isReady
                          ? "text-[#d1d5db] hover:bg-[#17202b] hover:text-white"
                          : "cursor-not-allowed text-[#64748b]"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{indicator.label}</span>
                        <span className="block text-xs text-[#64748b]">
                          {indicator.shortLabel} · {indicator.group}
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-2">
                        {!isReady && (
                          <span className="rounded border border-[#2a2e39] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#64748b]">
                            Soon
                          </span>
                        )}
                        {selected && isReady && (
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#f7931a]/20 text-[#f7931a]">
                            <Check size={13} />
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}

                {filteredIndicators.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-[#64748b]">
                    No indicators found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedIndicators.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-[#2a2e39] px-4 py-2">
          {selectedIndicators.map((indicatorId) => {
            const indicator = INDICATORS.find((item) => item.id === indicatorId);
            if (!indicator) return null;

            return (
              <button
                key={indicatorId}
                type="button"
                onClick={() => toggleIndicator(indicatorId)}
                className="inline-flex h-7 items-center gap-1 rounded border border-[#2a2e39] bg-[#141922] px-2 text-xs text-[#cbd5e1] hover:border-[#ea3943] hover:text-[#ea3943]"
              >
                {indicator.shortLabel}
                <X size={12} />
              </button>
            );
          })}
        </div>
      )}

      <DrawingToolbar onExport={exportChart} />

      <div className="min-h-0 flex-1 px-2 pb-3 pt-2">
        <div ref={chartContainerRef} className="relative h-full min-h-[320px] w-full">
          <Chart
            ref={chartRef}
            type="candlestick"
            data={chartData}
            options={chartOptions}
          />
          <DrawingCanvasOverlay
            chartRef={chartRef}
            candles={visibleCandles}
            canvasRef={drawingCanvasRef}
            chartContainerRef={chartContainerRef}
          />
        </div>
      </div>
    </div>
  );
};

export default ChartArea;
