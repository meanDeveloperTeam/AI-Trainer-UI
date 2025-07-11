import { TrainingJob, TrainedModel } from "@shared/schema";
import { storage } from "../storage";
import { OllamaService } from "./ollama";
import { VLLMService } from "./vllm";
import { TransformersService } from "./transformers";

export class TrainingService {
  private ollamaService: OllamaService;
  private vllmService: VLLMService;
  private transformersService: TransformersService;
  private broadcastFunction: ((jobId: string, update: any) => void) | null = null;
  private activeJobs: Map<string, any> = new Map();

  constructor() {
    this.ollamaService = new OllamaService();
    this.vllmService = new VLLMService();
    this.transformersService = new TransformersService();
  }

  setBroadcastFunction(fn: (jobId: string, update: any) => void) {
    this.broadcastFunction = fn;
  }

  async startTraining(job: TrainingJob): Promise<void> {
    try {
      // Update job status
      await storage.updateTrainingJob(job.id, { 
        status: 'training', 
        startTime: new Date() 
      });

      // Broadcast update
      this.broadcastUpdate(job.jobId, {
        status: 'training',
        progress: 0,
        currentEpoch: 0
      });

      // Select appropriate service based on framework
      let service;
      switch (job.framework) {
        case 'ollama':
          service = this.ollamaService;
          break;
        case 'vllm':
          service = this.vllmService;
          break;
        case 'transformers':
          service = this.transformersService;
          break;
        default:
          throw new Error(`Unsupported framework: ${job.framework}`);
      }

      // Start training with progress callback
      const trainingProcess = service.startTraining(job, (progress) => {
        this.handleTrainingProgress(job, progress);
      });

      this.activeJobs.set(job.jobId, trainingProcess);

      // Wait for training to complete
      const result = await trainingProcess;
      
      // Training completed successfully
      await storage.updateTrainingJob(job.id, { 
        status: 'completed',
        progress: 100,
        endTime: new Date(),
        modelPath: result.modelPath
      });

      // Create trained model record
      await storage.createTrainedModel({
        trainingJobId: job.id,
        name: `${job.baseModel}-custom-${Date.now()}`,
        framework: job.framework,
        baseModel: job.baseModel,
        modelPath: result.modelPath,
        size: result.size,
        userId: job.userId!
      });

      this.broadcastUpdate(job.jobId, {
        status: 'completed',
        progress: 100
      });

      this.activeJobs.delete(job.jobId);
    } catch (error) {
      console.error('Training error:', error);
      
      await storage.updateTrainingJob(job.id, { 
        status: 'failed',
        endTime: new Date(),
        logs: error instanceof Error ? error.message : 'Unknown error'
      });

      this.broadcastUpdate(job.jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.activeJobs.delete(job.jobId);
    }
  }

  async stopTraining(jobId: string): Promise<void> {
    const process = this.activeJobs.get(jobId);
    if (process && process.stop) {
      await process.stop();
      this.activeJobs.delete(jobId);
    }
  }

  async deployModel(model: TrainedModel, framework: string): Promise<string> {
    switch (framework) {
      case 'ollama':
        return await this.ollamaService.deployModel(model);
      case 'vllm':
        return await this.vllmService.deployModel(model);
      default:
        throw new Error(`Deployment not supported for framework: ${framework}`);
    }
  }

  async testModel(model: TrainedModel, prompt: string): Promise<any> {
    switch (model.framework) {
      case 'ollama':
        return await this.ollamaService.testModel(model, prompt);
      case 'vllm':
        return await this.vllmService.testModel(model, prompt);
      default:
        throw new Error(`Testing not supported for framework: ${model.framework}`);
    }
  }

  async getAvailableModels(framework: string): Promise<string[]> {
    switch (framework) {
      case 'ollama':
        return await this.ollamaService.getAvailableModels();
      case 'vllm':
        return await this.vllmService.getAvailableModels();
      case 'transformers':
        return await this.transformersService.getAvailableModels();
      default:
        return [];
    }
  }

  private async handleTrainingProgress(job: TrainingJob, progress: any): Promise<void> {
    await storage.updateTrainingJob(job.id, {
      progress: progress.progress,
      currentEpoch: progress.currentEpoch,
      loss: progress.loss
    });

    this.broadcastUpdate(job.jobId, progress);
  }

  private broadcastUpdate(jobId: string, update: any): void {
    if (this.broadcastFunction) {
      this.broadcastFunction(jobId, update);
    }
  }
}
