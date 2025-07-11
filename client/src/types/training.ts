export type Framework = 'ollama' | 'vllm' | 'transformers';

export type TrainingStatus = 'pending' | 'training' | 'completed' | 'failed' | 'cancelled';

export interface TrainingProgress {
  progress: number;
  currentEpoch: number;
  loss?: number;
  status: TrainingStatus;
}

export interface ModelTestResult {
  response: string;
  responseTime: number;
  tokens: number;
}
