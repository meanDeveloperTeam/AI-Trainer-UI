import { TrainingJob, TrainedModel } from "@shared/schema";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TransformersService {
  async startTraining(job: TrainingJob, progressCallback: (progress: any) => void): Promise<string> { // Change return type to Promise<string>
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, 'train_model.py');
      const baseModelPath = job.baseModel; // Assuming job.baseModel is the HF model path/name
      const datasetPath = job.datasetPath;
      const outputDirPath = job.modelPath; // This is now provided by TrainingService
      let finalModelPath: string | null = null; // To store the final model path

      if (!baseModelPath) {
        reject(new Error('Base model path is required for Transformers training.'));
        return;
      }
      if (!datasetPath) {
        reject(new Error('Dataset path is required for Transformers training.'));
        return;
      }
      if (!outputDirPath) { // This check should ideally not be hit now, but keep for safety
        reject(new Error('Output model path is required for Transformers training.'));
        return;
      }

      console.log(`Starting Transformers training with script: ${scriptPath}`);
      console.log(`Base model: ${baseModelPath}`);
      console.log(`Dataset: ${datasetPath}`);
      console.log(`Output directory: ${outputDirPath}`); // Log the output directory

      const pythonArgs = [scriptPath, baseModelPath, datasetPath, outputDirPath];
      console.log('Spawning python3 with args:', pythonArgs); // Log the arguments array

      // Pass base model path, dataset path, and output directory as arguments
      const child: ChildProcessWithoutNullStreams = spawn('python3', pythonArgs);

      let stderrOutput = '';

      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('FINAL_MODEL_PATH:')) {
            finalModelPath = trimmed.substring('FINAL_MODEL_PATH:'.length).trim();
            console.log('Captured final model path:', finalModelPath);
          } else {
            const looksLikeJSON = trimmed.startsWith('{') &&
                                  trimmed.endsWith('}') &&
                                  /"\w+"\s*:/.test(trimmed);
            // Only attempt to parse lines that look like JSON objects
            if (looksLikeJSON) {
              try {
                const parsed = JSON.parse(trimmed);
                progressCallback(parsed); // Expects { progress, currentEpoch, loss, status }
              } catch (err) {
                console.error('Failed to parse training output line (JSON expected):', line, err);
              }
            } else {
              // Log non-JSON lines, which might be progress bars or other script output
              console.log('Non-JSON training output:', line);
            }
          }
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        console.error('PYTHON STDERR:', output);
        stderrOutput += output; // Accumulate stderr for error reporting
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('Transformers training completed successfully.');
          if (finalModelPath) {
            resolve(finalModelPath); // Resolve with the final model path
          } else {
            reject(new Error('Training completed successfully, but final model path was not captured.'));
          }
        } else {
          console.error(`Transformers training failed with exit code ${code}.`);
          reject(new Error(`❌ Training failed with exit code ${code}\nStderr: ${stderrOutput}`));
        }
      });

      child.on('error', (err) => {
        console.error('Failed to start training process:', err);
        reject(new Error(`❌ Failed to start training process: ${err.message}`));
      });

      // Return process object with stop method
      return {
        stop: () => {
          if (!child.killed) {
            console.log('Stopping Transformers training process...');
            child.kill('SIGINT'); // Send interrupt signal
          }
        }
      };
    });
  }

  async deployModel(model: TrainedModel): Promise<string> {
    throw new Error('Direct deployment not supported for Transformers models. Use download instead.');
  }

  async testModel(model: TrainedModel, prompt: string, onChunk: (chunk: any) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, 'inference_model.py');
      const modelPath = path.join(model.modelPath, 'final_model'); // Path to the trained HF model, including final_model subdirectory
      const promptArg = prompt;

      if (!modelPath) {
        reject(new Error('Trained model path is required for Transformers inference.'));
        return;
      }

      console.log(`Starting Transformers inference with script: ${scriptPath}`);
      console.log(`Model path: ${modelPath}`);
      console.log(`Prompt: ${promptArg}`);

      const child: ChildProcessWithoutNullStreams = spawn('python3', [scriptPath, modelPath, promptArg]);

      let stderrOutput = '';

      child.stdout.on('data', (data) => {
        // The Python script prints chunks of text
        onChunk(data.toString());
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        console.error('PYTHON INFERENCE STDERR:', output);
        stderrOutput += output; // Accumulate stderr for error reporting
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('Transformers inference completed successfully.');
          resolve(); // Resolve when the stream ends
        } else {
          console.error(`Transformers inference failed with exit code ${code}.`);
          reject(new Error(`❌ Inference failed with exit code ${code}\nStderr: ${stderrOutput}`));
        }
      });

      child.on('error', (err) => {
        console.error('Failed to start inference process:', err);
        reject(new Error(`❌ Failed to start inference process: ${err.message}`));
      });

      // Note: A stop method could be added here if needed to interrupt inference
    });
  }

  async getAvailableModels(): Promise<string[]> {
    return [
      'microsoft/DialoGPT-medium',
      'microsoft/DialoGPT-large',
      'facebook/blenderbot-400M-distill',
      'facebook/blenderbot-1B-distill',
      'microsoft/phi-2',
      'codellama/CodeLlama-7b-Python-hf',
      'WizardLM/WizardCoder-Python-7B-V1.0'
    ];
  }
}
