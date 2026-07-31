export interface StrategyVariable {
  id: string;
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  value: unknown;
  defaultValue: unknown;
  options?: string[];
}

export interface StrategyDefinition {
  id: string;
  name: string;
  description?: string;
  variables: StrategyVariable[];
  createdAt: number;
  updatedAt: number;
}
