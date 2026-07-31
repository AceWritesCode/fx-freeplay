export interface AnalysisReport {
  sessionId: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  equityCurve: { timestamp: number; balance: number }[];
}
