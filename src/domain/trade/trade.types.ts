export type OrderType = 'market' | 'limit' | 'stop';
export type OrderSide = 'buy' | 'sell';

export interface Order {
  id: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
}

export interface Position {
  id: string;
  symbol: string;
  side: OrderSide;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  size: number;
  entryTimestamp: number;
  exitPrice?: number;
  exitTimestamp?: number;
  realizedPnL?: number;
  status: 'open' | 'closed';
}
