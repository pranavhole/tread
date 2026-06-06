export const formatPrice = (price: number): string => {
  const safePrice = Number.isFinite(price) ? price : 0;
  return safePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatCurrencyValue = (
  value: number,
  currency: 'USDT' | 'INR' = 'USDT'
): string => {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatCompactNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercent = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const formatMarketSymbol = (symbol: string): string => {
  if (symbol.endsWith('USDT')) {
    return `${symbol.slice(0, -4)} / USDT`;
  }

  return symbol;
};

export const getBaseAsset = (symbol: string): string => {
  return symbol.endsWith('USDT') ? symbol.slice(0, -4) : symbol;
};

export const formatQty = (qty: number): string => {
  return qty.toFixed(4);
};

export const formatPnL = (pnl: number) => {
  const sign = pnl >= 0 ? '+' : '';
  const colorClass = pnl >= 0 ? 'text-brand-green' : 'text-brand-red';
  return {
    text: `${sign}${pnl.toFixed(2)}`,
    colorClass,
  };
};

export const formatTimestamp = (ts: number | string): string => {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const formatDateTime = (ts?: number | string | null): string => {
  if (!ts) return '--';
  const date = new Date(ts);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
