interface ResolveInitialOrderPriceArgs {
  type: 'MARKET' | 'LIMIT' | 'STOP_LIMIT';
  requestedPrice?: number;
  readMarketPrice: () => Promise<string | null>;
}

export const resolveInitialOrderPrice = async ({
  type,
  requestedPrice,
  readMarketPrice,
}: ResolveInitialOrderPriceArgs) => {
  if (type !== 'MARKET') {
    return requestedPrice ?? 0;
  }

  const marketPrice = await readMarketPrice();
  if (!marketPrice) {
    throw new Error('Market price unavailable');
  }

  const parsedPrice = Number.parseFloat(marketPrice);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    throw new Error('Market price unavailable');
  }

  return parsedPrice;
};
