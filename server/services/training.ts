import { TrainingJob, TrainedModel } from "@shared/schema";
import { storage } from "../storage";
import { OllamaService } from "./ollama";
import { VLLMService } from "./vllm";
import { TransformersService } from "./transformers";
import path from 'path'; // Import path module

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

  async startTraining(job: TrainingJob): Promise<string> {
    try {
      // Generate modelPath before starting training
      const modelPath = path.join('models', `${job.baseModel.replace(/[^a-zA-Z0-9-_]/g, '_')}-${job.framework}-${Date.now()}`);
      job.modelPath = modelPath; // Assign to job object

      // Update job status with the generated modelPath
      await storage.updateTrainingJob(job.id, { 
        status: 'training', 
        startTime: new Date(),
        modelPath: job.modelPath // Save the generated path to DB
      });

      // Broadcast update
      this.broadcastUpdate(job.jobId, {
        status: 'training',
        progress: 0,
        currentEpoch: 0
      });

      // Select appropriate service based on framework
      let service;
      let trainingProcess: Promise<string>; // Define type for trainingProcess

      switch (job.framework) {
        case 'ollama':
          trainingProcess = this.ollamaService.startTraining(job, (progress) => {
            this.handleTrainingProgress(job, progress);
          });
          break;
        case 'transformers':
          trainingProcess = this.transformersService.startTraining(job, (progress) => {
            this.handleTrainingProgress(job, progress);
          });
          break;
        case 'vllm':
          throw new Error('vLLM is an inference engine and does not support model training.');
        default:
          throw new Error(`Unsupported framework: ${job.framework}`);
      }

      this.activeJobs.set(job.jobId, trainingProcess);

      // Wait for training to complete and get the final model identifier (Ollama model name or file path)
      const finalModelIdentifier = await trainingProcess;
      
      // Determine the model name and path based on the framework
      let trainedModelName: string;
      let trainedModelPath: string;
      let trainedModelSize: number = 0; // Placeholder, will try to get actual size later

      if (job.framework === 'ollama') {
        trainedModelName = finalModelIdentifier; // Ollama returns the model name
        trainedModelPath = finalModelIdentifier; // For Ollama, modelPath is also the name
        // TODO: Fetch actual size from Ollama using getModelInfo if needed
      } else if (job.framework === 'transformers') {
        trainedModelName = `${job.baseModel.split('/').pop()}-finetuned-${Date.now()}`; // Generate a name for transformers
        trainedModelPath = finalModelIdentifier; // Transformers returns the file path
        // TODO: Get actual model size from file system for transformers
      } else {
        // This case should ideally not be reached if vLLM training is removed
        trainedModelName = `${job.baseModel.split('/').pop()}-finetuned-${Date.now()}`;
        trainedModelPath = finalModelIdentifier;
      }

      // Training completed successfully
      // Update status to completed.
      await storage.updateTrainingJob(job.id, { 
        status: 'completed',
        progress: 100,
        endTime: new Date(),
        modelPath: trainedModelPath // Update with the actual final model path/identifier
      });

      // Create trained model record
      if (job.userId === null) {
        throw new Error('Training job userId cannot be null when creating a trained model.');
      }
      const trainedModel = {
        userId: job.userId as number,
        trainingJobId: job.id,
        name: trainedModelName,
        framework: job.framework,
        baseModel: job.baseModel,
        modelPath: trainedModelPath,
        size: trainedModelSize, // Use the determined size
        deployed: false,
        deploymentEndpoint: null,
      };
      await storage.createTrainedModel(trainedModel);

      this.broadcastUpdate(job.jobId, {
        status: 'completed',
        progress: 100,
        modelPath: trainedModelPath // Broadcast the final model path/identifier
      });

      this.activeJobs.delete(job.jobId);
      return trainedModelPath; // Return the final model path/identifier
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
      throw error; // Re-throw the error so the caller knows it failed
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

  async testModelStream(model: TrainedModel, prompt: string, onChunk: (chunk: any) => void): Promise<void> {
    switch (model.framework) {
      case 'ollama':
        return await this.ollamaService.testModelStream(model, prompt, onChunk);
      case 'vllm':
        return await this.vllmService.testModel(model, prompt, onChunk);
      case 'transformers':
        // Now calling the real streaming inference implementation in TransformersService.testModel
        // Pass the onChunk callback down to the service method.
        await this.transformersService.testModel(model, prompt, onChunk);
        return; // testModel returns Promise<void>, so we return void here
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
