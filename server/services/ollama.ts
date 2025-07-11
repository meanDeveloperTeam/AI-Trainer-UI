import { TrainingJob, TrainedModel } from "@shared/schema";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export class OllamaService {
  private ollamaUrl: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  async startTraining(job: TrainingJob, progressCallback: (progress: any) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      // Simulate training progress for Ollama
      let progress = 0;
      let currentEpoch = 0;
      let loss = 1.0;

      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
          progress = 100;
          currentEpoch = job.totalEpochs;
          clearInterval(interval);
          
          // Simulate model creation
          const modelPath = path.join('models', `${job.baseModel}-custom-${Date.now()}`);
          fs.mkdirSync(modelPath, { recursive: true });
          
          resolve({
            modelPath,
            size: 1024 * 1024 * 500 // 500MB
          });
        } else {
          currentEpoch = Math.floor((progress / 100) * job.totalEpochs);
          loss = Math.max(0.1, loss - Math.random() * 0.1);
        }

        progressCallback({
          progress: Math.min(100, progress),
          currentEpoch,
          loss: parseFloat(loss.toFixed(3))
        });
      }, 2000);

      // Return process object with stop method
      return {
        stop: () => {
          clearInterval(interval);
          reject(new Error('Training stopped'));
        }
      };
    });
  }

  async deployModel(model: TrainedModel): Promise<string> {
    try {
      // Create Ollama model from trained weights
      const modelName = model.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      // This would typically involve creating a Modelfile and running ollama create
      const endpoint = `${this.ollamaUrl}/api/generate`;
      
      return endpoint;
    } catch (error) {
      throw new Error(`Failed to deploy model to Ollama: ${error}`);
    }
  }

  async testModel(model: TrainedModel, prompt: string): Promise<any> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.name,
          prompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        response: data.response,
        responseTime: data.total_duration / 1000000, // Convert to ms
        tokens: data.eval_count
      };
    } catch (error) {
      throw new Error(`Failed to test model: ${error}`);
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      // Ollama not running locally - this is expected in development
      // Return popular models for demo purposes
      return ['llama3.1:8b', 'llama3.1:70b', 'phi3:mini', 'codellama:7b', 'mistral:7b', 'gemma:7b', 'llama2:13b'];
    }
  }
}
