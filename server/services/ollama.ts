import { TrainingJob, TrainedModel } from "@shared/schema";
import { Ollama } from 'ollama';
import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export class OllamaService {
  private ollama: Ollama;
  private ollamaUrl: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://0.0.0.0:11434';
    this.ollama = new Ollama({ host: this.ollamaUrl });
  }

  async startTraining(job: TrainingJob, progressCallback: (progress: any) => void): Promise<any> {
    try {
      await this.checkOllamaConnection();

      // 1. Process the dataset
      const trainingData = await this.processDatasetForTraining(job.datasetPath);
      this.validateTrainingData(trainingData); // Validate data format

      // 2. Create the fine-tuning Modelfile
      const modelfileContent = await this.createFineTuningModelfile(job, trainingData);

      // 3. Determine the name for the new fine-tuned model
      const newModelName = await this.getNextModelName(job.baseModel);

      // 4. Use ollama create to build the fine-tuned model
      // The createModel method handles spawning the ollama process and reporting progress
      await this.createModelWithProgress(newModelName, modelfileContent, progressCallback);

      // 5. Get model size and return details
      const modelSize = await this.getModelSize(newModelName);

      // Ollama models don't have a traditional 'modelPath' in the filesystem sense
      // The model is managed by Ollama. We can return the model name as the identifier.
      // The storage will store the modelName in the modelPath field.
      return newModelName; // Return the actual Ollama model name

    } catch (error) {
      console.error('Ollama training error:', error);
      throw new Error(`❌ Ollama training failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Helper method to wrap createModel and handle progress reporting
  private async createModelWithProgress(modelName: string, modelfile: string, progressCallback: (progress: any) => void): Promise<void> {
    const tempDir = path.join('temp', modelName.replace(/[:]/g, '_')); // Use safe name for temp dir
    fs.mkdirSync(tempDir, { recursive: true });

    return new Promise(async (resolve, reject) => {
      try {
        const modelfilePath = path.join(tempDir, 'Modelfile');
        fs.writeFileSync(modelfilePath, modelfile);

        const child = spawn('ollama', ['create', modelName, '-f', modelfilePath]);

        child.stdout.on('data', (data) => {
          const output = data.toString();
          // Parse ollama create output for progress (this might be basic)
          // Ollama create output is often lines like "transferring 100%" or "creating 100%"
          const match = output.match(/(\w+)\s+(\d+)%/);
          if (match) {
            const status = match[1];
            const progress = parseInt(match[2], 10);
            // Map ollama status to a generic progress format
            progressCallback({
              progress: progress,
              currentEpoch: 0, // Ollama create doesn't have epochs like traditional training
              loss: 0, // No loss reported during creation
              status: `${status} ${progress}%`
            });
          } else {
             // Log other output lines
             console.log('Ollama create output:', output.trim());
          }
        });

        child.stderr.on('data', (data) => {
          console.error('Ollama create error:', data.toString());
          // Ollama often prints progress to stderr, try parsing it too
          const output = data.toString();
          const match = output.match(/(\w+)\s+(\d+)%/);
          if (match) {
            const status = match[1];
            const progress = parseInt(match[2], 10);
            progressCallback({
              progress: progress,
              currentEpoch: 0,
              loss: 0,
              status: `${status} ${progress}%`
            });
          } else {
             console.error('Ollama create stderr:', output.trim());
          }
        });

        child.on('close', async (code) => {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (e) {
            console.warn('Failed to clean up temp directory:', e);
          }

          if (code === 0) {
            console.log(`Ollama model ${modelName} created successfully.`);
            // Final progress update
            progressCallback({
              progress: 100,
              currentEpoch: 0,
              loss: 0,
              status: 'Model creation completed.'
            });
            resolve();
          } else {
            reject(new Error(`Ollama model creation failed with exit code ${code}`));
          }
        });

        child.on('error', (err) => {
           try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (e) {
            console.warn('Failed to clean up temp directory on error:', e);
          }
          reject(err);
        });

      } catch (error) {
         try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (e) {
            console.warn('Failed to clean up temp directory on error:', e);
          }
        reject(error);
      }
    });
  }

  async deployModel(model: TrainedModel): Promise<string> {
    try {
      await this.checkOllamaConnection();

      // Model is already deployed when created in Ollama
      const endpoint = `${this.ollamaUrl}/api/generate`;
      return endpoint;
    } catch (error) {
      throw new Error(`Failed to deploy model to Ollama: ${error}`);
    }
  }

  async testModelStream(model: TrainedModel, prompt: string, onChunk: (chunk: any) => void): Promise<void> {
    try {
      await this.checkOllamaConnection();

      const stream = await this.ollama.generate({
        model: model.name,
        prompt: prompt,
        stream: true
      });

      for await (const chunk of stream) {
        if (typeof chunk.response === 'string') {
          onChunk(chunk.response); // 🔥 Stream chunk to callback
        }
      }
    } catch (error) {
      throw new Error(`Streaming failed: ${error}`);
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      await this.checkOllamaConnection();

      const response = await this.ollama.list();
      return response.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.warn('Ollama not available, returning popular models for demo:', error);
      // Return popular models for demo purposes when Ollama is not running
      return ['llama3.1:8b', 'llama3.1:70b', 'phi3:mini', 'codellama:7b', 'mistral:7b', 'gemma:7b', 'llama2:13b'];
    }
  }

  async pullModel(modelName: string): Promise<void> {
    try {
      // Check if model already exists
      const models = await this.ollama.list();
      const modelExists = models.models?.some((model: any) => model.name === modelName);

      if (!modelExists) {
        console.log(`Pulling model ${modelName}...`);
        const response = await this.ollama.pull({
          model: modelName,
          stream: true
        });

        // Process pull progress
        for await (const part of response) {
          console.log(`Pull progress: ${part.status}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to pull model ${modelName}: ${error}`);
    }
  }

  async deleteModel(modelName: string): Promise<void> {
    try {
      await this.ollama.delete({ model: modelName });
    } catch (error) {
      throw new Error(`Failed to delete model ${modelName}: ${error}`);
    }
  }

  private async checkOllamaConnection(): Promise<void> {
    try {
      await this.ollama.list();
    } catch (error) {
      throw new Error(`Cannot connect to Ollama at ${this.ollamaUrl}. Make sure Ollama is running.`);
    }
  }

  private async processDatasetForTraining(datasetPath: string | null | undefined): Promise<any[]> {
    if (!datasetPath) {
      throw new Error('Dataset path is required for training');
    }

    try {
      const content = fs.readFileSync(datasetPath, 'utf8');
      let trainingData: any[] = [];

      // Parse different file formats
      if (datasetPath.endsWith('.jsonl')) {
        trainingData = content.split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      } else if (datasetPath.endsWith('.json')) {
        const data = JSON.parse(content);
        trainingData = Array.isArray(data) ? data : [data];
      } else if (datasetPath.endsWith('.csv')) {
        // Simple CSV parsing for instruction-response pairs
        const lines = content.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, '')); // Trim and remove \r from headers

        trainingData = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = values[index]?.trim() || ''; // Use cleaned header
          });
          return obj;
        });
      } else {
        // Treat as plain text, split into conversations
        const conversations = content.split('\n\n').filter(conv => conv.trim());
        trainingData = conversations.map((conv, index) => ({
          instruction: `Conversation ${index + 1}`,
          response: conv.trim()
        }));
      }

      console.log(`Processed ${trainingData.length} training examples from ${datasetPath}`);
      if (datasetPath.endsWith('.csv')) { // Only log headers if it's a CSV
        const lines = content.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/\r$/, '')); // Re-define headers for logging scope
        console.log('CSV Headers (cleaned):', headers); // Updated debug log
      }
      console.log('First few training examples:', trainingData.slice(0, 2)); // Add debug log
      return trainingData;
    } catch (error) {
      throw new Error(`Failed to process dataset: ${error}`);
    }
  }

  private async createFineTuningModelfile(job: TrainingJob, trainingData: any[]): Promise<string> {
    // Create training examples in the format Ollama expects
    const examples = trainingData // Limit examples for performance
      .map(example => {
        // Prioritize 'prompt' and 'response' as per test_dataset.csv
        if (example.prompt && example.response) {
          return `Q: ${example.prompt}\nA: ${example.response}`;
        } else if (example.instruction && example.response) {
          return `Q: ${example.instruction}\nA: ${example.response}`;
        } else if (example.input && example.output) {
          return `Q: ${example.input}\nA: ${example.output}`;
        } else if (example.question && example.answer) {
          return `Q: ${example.question}\nA: ${example.answer}`;
        } else {
          // Fallback for other formats
          const keys = Object.keys(example);
          const inputKey = keys.find(k => k.includes('input') || k.includes('question') || k.includes('prompt')) || keys[0];
          const outputKey = keys.find(k => k.includes('output') || k.includes('answer') || k.includes('response')) || keys[1];

          if (inputKey && outputKey && example[inputKey] && example[outputKey]) {
            return `Q: ${example[inputKey]}\nA: ${example[outputKey]}`;
          }
          return null;
        }
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    // Create comprehensive Modelfile with training data
    return `FROM ${job.baseModel}

# System prompt
${job.systemPrompt ? `SYSTEM "${job.systemPrompt}"` : 'SYSTEM "You are a helpful AI assistant that has been fine-tuned on custom data."'}

# Training parameters
PARAMETER temperature ${job.learningRate || 0.7}
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx ${job.contextLength || 4096}
PARAMETER num_predict 512
PARAMETER repeat_penalty 1.1

# Fine-tuning examples
TEMPLATE """{{ if .System }}<|system|>
{{ .System }}<|end|>
{{ end }}{{ if .Prompt }}<|user|>
{{ .Prompt }}<|end|>
<|assistant|>
{{ end }}"""

# Training data examples
${examples ? `# Training Examples:\n# ${examples.replace(/\n/g, '\n# ')}` : ''}

# Additional parameters for fine-tuning
PARAMETER num_batch ${job.batchSize || 4}
`;
  }

  // Validate training data format
  private validateTrainingData(data: any[]): boolean {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Training data must be a non-empty array');
    }

    const validExamples = data.filter(example => {
      if (!example || typeof example !== 'object') return false;

      // Check for common instruction-response formats, including 'prompt' and 'response'
      const hasInstructionResponse = example.instruction && example.response;
      const hasInputOutput = example.input && example.output;
      const hasPromptResponse = example.prompt && example.response; // Added check for prompt/response
      const hasPromptCompletion = example.prompt && example.completion;
      const hasQuestionAnswer = example.question && example.answer;

      return hasInstructionResponse || hasInputOutput || hasPromptResponse || hasPromptCompletion || hasQuestionAnswer;
    });

    if (validExamples.length === 0) {
      throw new Error('No valid training examples found. Expected format: {instruction: "...", response: "..."} or similar');
    }

    if (validExamples.length < data.length * 0.8) {
      console.warn(`Only ${validExamples.length}/${data.length} examples are in valid format`);
    }

    return true;
  }

  private async getModelSize(modelName: string): Promise<number> {
    try {
      const models = await this.ollama.list();
      const model = models.models?.find((m: any) => m.name === modelName);
      return model?.size || 1024 * 1024 * 500; // Default to 500MB
    } catch (error) {
      return 1024 * 1024 * 500; // Default to 500MB
    }
  }

  // Method to show available models that can be pulled
  async getAvailableBaseModels(): Promise<string[]> {
    // Popular models available on Ollama
    return [
      'llama3.1:8b',
      'llama3.1:70b',
      'llama3.2:3b',
      'phi3:mini',
      'phi3:medium',
      'codellama:7b',
      'codellama:13b',
      'mistral:7b',
      'gemma:7b',
      'gemma2:9b',
      'qwen2:7b',
      'deepseek-coder:6.7b',
      'llama2:7b',
      'llama2:13b'
    ];
  }

  // Method to get model information
  async getModelInfo(modelName: string): Promise<any> {
    try {
      const response = await this.ollama.show({ model: modelName });
      return response;
    } catch (error) {
      throw new Error(`Failed to get model info for ${modelName}: ${error}`);
    }
  }

  // Advanced: Try LoRA fine-tuning if Ollama supports it
  private async attemptLoRAFineTuning(job: TrainingJob, trainingData: any[]): Promise<boolean> {
    try {
      // Check if Ollama supports LoRA fine-tuning
      // This is experimental and depends on Ollama version
      const loraConfig = {
        base_model: job.baseModel,
        dataset: trainingData,
        epochs: job.totalEpochs,
        learning_rate: job.learningRate,
        batch_size: job.batchSize,
        context_length: job.contextLength
      };

      // For now, return false as this requires specific Ollama setup
      // In future versions, this could call Ollama's fine-tuning API
      console.log('LoRA fine-tuning config prepared:', loraConfig);
      return false;
    } catch (error) {
      console.warn('LoRA fine-tuning not available:', error);
      return false;
    }
  }

  private async createModel(job: TrainingJob, modelName: string, modelfile: string): Promise<void> {
    const tempDir = path.join('temp', modelName);
    fs.mkdirSync(tempDir, { recursive: true });
    
    try {
      const modelfilePath = path.join(tempDir, 'Modelfile');
      fs.writeFileSync(modelfilePath, modelfile);

      const { stdout, stderr } = await execAsync(
        `ollama create ${modelName} -f ${modelfilePath}`,
        { timeout: 3600000 } // 1 hour timeout
      );

      console.log('Model creation output:', stdout);
      if (stderr) console.error('Creation errors:', stderr);

      // Verify creation
      const models = await this.ollama.list();
      if (!models.models?.some(m => m.name === modelName)) {
        throw new Error('Model not found after creation');
      }
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Failed to clean up temp directory:', e);
      }
    }
  }

  private async getNextModelName(baseModel: string): Promise<string> {
    const existingModels = await this.ollama.list();

    // Match names like "phi3-1", "phi3-2", etc.
    const regex = new RegExp(`^${baseModel}-(\\d+)$`);
    let maxIndex = 0;

    for (const model of existingModels.models || []) {
      const match = model.name.match(regex);
      if (match && match[1]) {
        const index = parseInt(match[1], 10);
        if (!isNaN(index) && index > maxIndex) {
          maxIndex = index;
        }
      }
    }

    // Even if no match found, maxIndex stays 0 → starts from 1
    return `${baseModel}-${maxIndex + 1}`;
  }
}
