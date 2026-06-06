export type IndicatorId = string;

export type IndicatorStatus = "ready" | "catalog";

export type IndicatorDefinition = {
  id: IndicatorId;
  label: string;
  shortLabel: string;
  group:
    | "Comparison"
    | "Drawing"
    | "Money Flow"
    | "Momentum"
    | "Price Tools"
    | "Proprietary"
    | "Stops"
    | "Trend"
    | "Volatility"
    | "Volume";
  status: IndicatorStatus;
};

export const INDICATORS: IndicatorDefinition[] = [
  { id: "accumulation-distribution", label: "Accumulation Distribution", shortLabel: "Accum/Dist", group: "Money Flow", status: "catalog" },
  { id: "adx", label: "Average Directional Index", shortLabel: "ADX", group: "Trend", status: "catalog" },
  { id: "aroon", label: "Aroon Indicator", shortLabel: "Aroon", group: "Trend", status: "catalog" },
  { id: "aroon-oscillator", label: "Aroon Oscillator", shortLabel: "Aroon Osc", group: "Momentum", status: "catalog" },
  { id: "atr14", label: "Average True Range 14", shortLabel: "ATR 14", group: "Volatility", status: "ready" },
  { id: "atr-bands", label: "Average True Range Bands", shortLabel: "ATR Bands", group: "Volatility", status: "catalog" },
  { id: "atr-trailing-stops", label: "Average True Range Trailing Stops", shortLabel: "ATR Stops", group: "Stops", status: "catalog" },
  { id: "bb20", label: "Bollinger Bands 20", shortLabel: "BB 20", group: "Volatility", status: "ready" },
  { id: "bollinger-bandwidth", label: "Bollinger Bandwidth", shortLabel: "BB Width", group: "Volatility", status: "catalog" },
  { id: "bollinger-percent-b", label: "Bollinger Percent B", shortLabel: "%B", group: "Volatility", status: "catalog" },
  { id: "chaikin-money-flow", label: "Chaikin Money Flow", shortLabel: "CMF", group: "Money Flow", status: "catalog" },
  { id: "chaikin-oscillator", label: "Chaikin Oscillator", shortLabel: "Chaikin Osc", group: "Money Flow", status: "catalog" },
  { id: "chaikin-volatility", label: "Chaikin Volatility", shortLabel: "Chaikin Vol", group: "Volatility", status: "catalog" },
  { id: "chande-momentum-oscillator", label: "Chande Momentum Oscillator", shortLabel: "CMO", group: "Momentum", status: "catalog" },
  { id: "chandelier-exits", label: "Chandelier Exits", shortLabel: "Chandelier", group: "Stops", status: "catalog" },
  { id: "choppiness-index", label: "Choppiness Index", shortLabel: "Chop", group: "Volatility", status: "catalog" },
  { id: "commodity-channel-index", label: "Commodity Channel Index", shortLabel: "CCI", group: "Momentum", status: "catalog" },
  { id: "compare-prices", label: "Compare Prices", shortLabel: "Compare", group: "Comparison", status: "catalog" },
  { id: "comparison-price-indicator", label: "Comparison Price Indicator", shortLabel: "CPI", group: "Comparison", status: "catalog" },
  { id: "coppock-indicator", label: "Coppock Indicator", shortLabel: "Coppock", group: "Momentum", status: "catalog" },
  { id: "detrended-price-oscillator", label: "Detrended Price Oscillator", shortLabel: "DPO", group: "Momentum", status: "catalog" },
  { id: "directional-movement", label: "Directional Movement Index", shortLabel: "DMI", group: "Trend", status: "catalog" },
  { id: "donchian-channels", label: "Donchian Channels", shortLabel: "Donchian", group: "Trend", status: "catalog" },
  { id: "ease-of-movement", label: "Ease of Movement", shortLabel: "EOM", group: "Volume", status: "catalog" },
  { id: "elder-ray", label: "Elder Ray Index", shortLabel: "Elder Ray", group: "Momentum", status: "catalog" },
  { id: "ema9", label: "Exponential Moving Average 9", shortLabel: "EMA 9", group: "Trend", status: "ready" },
  { id: "ema21", label: "Exponential Moving Average 21", shortLabel: "EMA 21", group: "Trend", status: "ready" },
  { id: "ema50", label: "Exponential Moving Average 50", shortLabel: "EMA 50", group: "Trend", status: "ready" },
  { id: "fibonacci-retracements", label: "Fibonacci Retracements", shortLabel: "Fib Retrace", group: "Drawing", status: "catalog" },
  { id: "force-index", label: "Force Index", shortLabel: "Force", group: "Volume", status: "catalog" },
  { id: "hull-moving-average", label: "Hull Moving Average", shortLabel: "HMA", group: "Trend", status: "catalog" },
  { id: "ichimoku-cloud", label: "Ichimoku Cloud", shortLabel: "Ichimoku", group: "Trend", status: "catalog" },
  { id: "keltner-channels", label: "Keltner Channels", shortLabel: "Keltner", group: "Volatility", status: "catalog" },
  { id: "klinger-volume-oscillator", label: "Klinger Volume Oscillator", shortLabel: "Klinger", group: "Volume", status: "catalog" },
  { id: "kst", label: "Know Sure Thing", shortLabel: "KST", group: "Momentum", status: "catalog" },
  { id: "linear-regression-indicator", label: "Linear Regression Indicator", shortLabel: "LinReg", group: "Trend", status: "catalog" },
  { id: "linear-regression-slope", label: "Linear Regression Slope", shortLabel: "LinReg Slope", group: "Trend", status: "catalog" },
  { id: "macd", label: "MACD 12 26 9", shortLabel: "MACD", group: "Momentum", status: "ready" },
  { id: "macd-histogram", label: "MACD Histogram", shortLabel: "MACD Hist", group: "Momentum", status: "catalog" },
  { id: "market-thrust", label: "Market Thrust", shortLabel: "Thrust", group: "Volume", status: "catalog" },
  { id: "mass-index", label: "Mass Index", shortLabel: "Mass", group: "Volatility", status: "catalog" },
  { id: "median-price", label: "Median Price", shortLabel: "Median", group: "Price Tools", status: "catalog" },
  { id: "money-flow-index", label: "Money Flow Index", shortLabel: "MFI", group: "Money Flow", status: "catalog" },
  { id: "momentum", label: "Momentum", shortLabel: "Momentum", group: "Momentum", status: "catalog" },
  { id: "negative-volume-index", label: "Negative Volume Index", shortLabel: "NVI", group: "Volume", status: "catalog" },
  { id: "on-balance-volume", label: "On Balance Volume", shortLabel: "OBV", group: "Volume", status: "catalog" },
  { id: "parabolic-sar", label: "Parabolic SAR", shortLabel: "PSAR", group: "Stops", status: "catalog" },
  { id: "performance-index", label: "Performance Index", shortLabel: "Perf", group: "Comparison", status: "catalog" },
  { id: "percentage-price-oscillator", label: "Percentage Price Oscillator", shortLabel: "PPO", group: "Momentum", status: "catalog" },
  { id: "positive-volume-index", label: "Positive Volume Index", shortLabel: "PVI", group: "Volume", status: "catalog" },
  { id: "price-channel", label: "Price Channel", shortLabel: "Price Ch", group: "Price Tools", status: "catalog" },
  { id: "price-envelope", label: "Price Envelope", shortLabel: "Envelope", group: "Price Tools", status: "catalog" },
  { id: "price-oscillator", label: "Price Oscillator", shortLabel: "Price Osc", group: "Momentum", status: "catalog" },
  { id: "price-volume-trend", label: "Price Volume Trend", shortLabel: "PVT", group: "Volume", status: "catalog" },
  { id: "projected-aggregate-volume", label: "Projected Aggregate Volume", shortLabel: "Proj Vol", group: "Volume", status: "catalog" },
  { id: "projected-volume-at-time", label: "Projected Volume at Time", shortLabel: "PVAT", group: "Volume", status: "catalog" },
  { id: "rate-of-change", label: "Rate of Change", shortLabel: "ROC", group: "Momentum", status: "catalog" },
  { id: "relative-strength", label: "Relative Strength", shortLabel: "Rel Str", group: "Comparison", status: "catalog" },
  { id: "rsi14", label: "Relative Strength Index 14", shortLabel: "RSI 14", group: "Momentum", status: "ready" },
  { id: "safezone-stops", label: "Safezone Stops", shortLabel: "Safezone", group: "Stops", status: "catalog" },
  { id: "sma20", label: "Simple Moving Average 20", shortLabel: "SMA 20", group: "Trend", status: "ready" },
  { id: "sma50", label: "Simple Moving Average 50", shortLabel: "SMA 50", group: "Trend", status: "ready" },
  { id: "standard-deviation-channels", label: "Standard Deviation Channels", shortLabel: "StdDev Ch", group: "Volatility", status: "catalog" },
  { id: "stoch14", label: "Stochastic Oscillator 14", shortLabel: "Stoch 14", group: "Momentum", status: "ready" },
  { id: "stochastic-rsi", label: "Stochastic RSI", shortLabel: "Stoch RSI", group: "Momentum", status: "catalog" },
  { id: "swing-index", label: "Swing Index", shortLabel: "Swing", group: "Momentum", status: "catalog" },
  { id: "time-series-forecast", label: "Time Series Forecast", shortLabel: "TSF", group: "Trend", status: "catalog" },
  { id: "trix", label: "TRIX", shortLabel: "TRIX", group: "Momentum", status: "catalog" },
  { id: "twiggs-money-flow", label: "Twiggs Money Flow", shortLabel: "TMF", group: "Proprietary", status: "catalog" },
  { id: "twiggs-momentum", label: "Twiggs Momentum", shortLabel: "Twiggs Mom", group: "Proprietary", status: "catalog" },
  { id: "twiggs-smoothed-momentum", label: "Twiggs Smoothed Momentum", shortLabel: "Twiggs SM", group: "Proprietary", status: "catalog" },
  { id: "typical-price", label: "Typical Price", shortLabel: "Typical", group: "Price Tools", status: "catalog" },
  { id: "ultimate-oscillator", label: "Ultimate Oscillator", shortLabel: "Ultimate", group: "Momentum", status: "catalog" },
  { id: "vwap", label: "Volume Weighted Average Price", shortLabel: "VWAP", group: "Volume", status: "ready" },
  { id: "weighted-close", label: "Weighted Close", shortLabel: "W Close", group: "Price Tools", status: "catalog" },
  { id: "williams-percent-r", label: "Williams Percent R", shortLabel: "Williams %R", group: "Momentum", status: "catalog" },
  { id: "williams-accumulation-distribution", label: "Williams Accumulation Distribution", shortLabel: "WAD", group: "Money Flow", status: "catalog" },
  { id: "williams-alligator", label: "Williams Alligator", shortLabel: "Alligator", group: "Trend", status: "catalog" },
  { id: "williams-fractals", label: "Williams Fractals", shortLabel: "Fractals", group: "Drawing", status: "catalog" },
  { id: "zig-zag", label: "Zig Zag", shortLabel: "Zig Zag", group: "Drawing", status: "catalog" },
];

export const READY_INDICATOR_IDS = new Set(
  INDICATORS.filter((indicator) => indicator.status === "ready").map(
    (indicator) => indicator.id
  )
);
