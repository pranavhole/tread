export interface PositionSnapshot {
  qty: number;
  avgPrice: number;
}

export const getBuyPositionValues = (
  position: PositionSnapshot | null,
  orderQty: number,
  fillPrice: number
) => {
  if (!position) {
    return {
      qty: orderQty,
      avgPrice: fillPrice,
    };
  }

  const totalValue = position.qty * position.avgPrice + fillPrice * orderQty;
  const totalQty = position.qty + orderQty;

  return {
    qty: totalQty,
    avgPrice: totalQty > 0 ? totalValue / totalQty : 0,
  };
};

export const getSellPositionValues = (
  position: PositionSnapshot | null,
  orderQty: number,
  realizedPnl: number
) => {
  if (!position) {
    throw new Error('Sell orders require an existing position');
  }

  const nextQty = position.qty - orderQty;

  return {
    qty: nextQty,
    avgPrice: nextQty === 0 ? 0 : position.avgPrice,
    realizedPnlIncrement: realizedPnl,
  };
};
