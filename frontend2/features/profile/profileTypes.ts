export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "STOP_LIMIT";
export type OrderStatus =
  | "OPEN"
  | "FILLED"
  | "PARTIAL_FILL"
  | "PARTIALLY_FILLED"
  | "CANCELLED"
  | "EXPIRED";
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "FEE";

export interface Position {
  id: string;
  symbol: string;
  qty: number;
  avgPrice: number;
  realizedPnl: number;
  leverage: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountUser {
  id: string;
  _id?: string;
  email: string;
  username?: string | null;
  balance: number;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  positions?: Position[];
}

export interface Order {
  id: string;
  symbol?: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  qty: number;
  filledQty: number;
  status: OrderStatus;
  fees?: number;
  timeInForce?: string;
  stopPrice?: number | null;
  filledAt?: string | null;
  cancelledAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
}

export interface Trade {
  id: string;
  orderId: string;
  price: number;
  qty: number;
  side: "BUY" | "SELL";
  fees: number;
  realizedPnl: number;
  isMaker: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  note?: string | null;
  createdAt: string;
}
