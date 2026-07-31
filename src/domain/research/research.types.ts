export interface ResearchSession {
  id: string;
  name: string;
  symbol: string;
  baseTimeframe: string;
  startOffset: number;
  currentOffset: number;
  isPlaying: boolean;
  playbackSpeed: number;
  timestamp: number;
}
