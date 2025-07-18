import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertTrainingJobSchema, insertDatasetSchema } from "@shared/schema";
import { TrainingService } from "./services/training";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

const trainingService = new TrainingService();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'subscribe' && data.jobId) {
          // Subscribe to training job updates
          (ws as any).jobId = data.jobId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Function to broadcast training updates
  const broadcastTrainingUpdate = (jobId: string, update: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && (client as any).jobId === jobId) {
        client.send(JSON.stringify({
          type: 'training_update',
          jobId,
          ...update
        }));
      }
    });
  };

  // Set up training service to use WebSocket broadcast
  trainingService.setBroadcastFunction(broadcastTrainingUpdate);

  // Dataset upload endpoint
  app.post('/api/datasets/upload', upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { originalname, filename, size, mimetype } = req.file;
      const userId = 1; // Mock user ID - would come from auth

      // Determine file type
      let type = 'text';
      if (originalname.endsWith('.json')) type = 'json';
      else if (originalname.endsWith('.csv')) type = 'csv';
      else if (originalname.endsWith('.jsonl')) type = 'jsonl';

      // Count examples (simplified)
      let exampleCount = 0;
      try {
        const content = fs.readFileSync(req.file.path, 'utf8');
        if (type === 'jsonl') {
          exampleCount = content.split('\n').filter(line => line.trim()).length;
        } else if (type === 'json') {
          const data = JSON.parse(content);
          exampleCount = Array.isArray(data) ? data.length : 1;
        } else if (type === 'csv') {
          exampleCount = content.split('\n').length - 1; // minus header
        }
      } catch (error) {
        console.error('Error counting examples:', error);
      }

      const dataset = await storage.createDataset({
        filename,
        originalName: originalname,
        size,
        type,
        exampleCount,
        filePath: req.file.path,
        userId
      });

      res.json(dataset);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  // Get user datasets
  app.get('/api/datasets', async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const datasets = await storage.getUserDatasets(userId);
      res.json(datasets);
    } catch (error) {
      console.error('Get datasets error:', error);
      res.status(500).json({ message: 'Failed to get datasets' });
    }
  });

  // Delete dataset
  app.delete('/api/datasets/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);

      if (!dataset) {
        return res.status(404).json({ message: 'Dataset not found' });
      }

      // Delete file
      try {
        fs.unlinkSync(dataset.filePath);
      } catch (error) {
        console.error('Error deleting file:', error);
      }

      await storage.deleteDataset(id);
      res.json({ message: 'Dataset deleted' });
    } catch (error) {
      console.error('Delete dataset error:', error);
      res.status(500).json({ message: 'Failed to delete dataset' });
    }
  });

  // Create training job
  app.post('/api/training/jobs', async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const jobData = insertTrainingJobSchema.parse(req.body);

      // Ensure dataset path is provided for real training
      if (!jobData.datasetPath) {
        return res.status(400).json({ message: 'Dataset path is required for training' });
      }

      const job = await storage.createTrainingJob({ ...jobData, userId });

      // Start training asynchronously
      trainingService.startTraining(job);

      res.json(job);
    } catch (error) {
      console.error('Create training job error:', error);
      res.status(500).json({ message: 'Failed to create training job' });
    }
  });

  // Get training jobs
  app.get('/api/training/jobs', async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const jobs = await storage.getUserTrainingJobs(userId);
      res.json(jobs);
    } catch (error) {
      console.error('Get training jobs error:', error);
      res.status(500).json({ message: 'Failed to get training jobs' });
    }
  });

  // Get training job by ID
  app.get('/api/training/jobs/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const job = await storage.getTrainingJob(id);

      if (!job) {
        return res.status(404).json({ message: 'Training job not found' });
      }

      res.json(job);
    } catch (error) {
      console.error('Get training job error:', error);
      res.status(500).json({ message: 'Failed to get training job' });
    }
  });

  // Stop training job
  app.post('/api/training/jobs/:id/stop', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getTrainingJob(id);

      if (!job) {
        return res.status(404).json({ message: 'Training job not found' });
      }

      await trainingService.stopTraining(job.jobId);
      const updatedJob = await storage.updateTrainingJob(id, { status: 'cancelled' });

      res.json(updatedJob);
    } catch (error) {
      console.error('Stop training job error:', error);
      res.status(500).json({ message: 'Failed to stop training job' });
    }
  });

  // Get trained models
  app.get('/api/models', async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const models = await storage.getUserTrainedModels(userId);
      res.json(models);
    } catch (error) {
      console.error('Get models error:', error);
      res.status(500).json({ message: 'Failed to get models' });
    }
  });

  // Deploy model
  app.post('/api/models/:id/deploy', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { framework } = req.body;

      const model = await storage.getTrainedModel(id);
      if (!model) {
        return res.status(404).json({ message: 'Model not found' });
      }

      const endpoint = await trainingService.deployModel(model, framework);
      const updatedModel = await storage.updateTrainedModel(id, { 
        deployed: true, 
        deploymentEndpoint: endpoint 
      });

      res.json(updatedModel);
    } catch (error) {
      console.error('Deploy model error:', error);
      res.status(500).json({ message: 'Failed to deploy model' });
    }
  });

  // Test model
  app.post('/api/models/:id/test', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { prompt } = req.body;

      const model = await storage.getTrainedModel(id);
      if (!model) {
        return res.status(404).json({ message: 'Model not found' });
      }

      // Set headers for Server-Sent Events / streaming text
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await trainingService.testModelStream(model, prompt, (chunk: string) => {
        // 🔥 Send chunk as text stream
        res.write(`${chunk}`);
      });

      res.end(); // End after streaming
    } catch (error) {
      console.error('Streaming test model failed:', error);
      res.status(500).json({ message: 'Failed to test model stream' });
    }
  });

  // Get available models for a framework
  app.get('/api/models/available', async (req, res) => {
    try {
      const framework = req.query.framework as string || 'ollama';
      const models = await trainingService.getAvailableModels(framework);
      res.json(models);
    } catch (error) {
      console.error('Error fetching available models:', error);
      res.status(500).json({ error: 'Failed to fetch available models' });
    }
  });

  // Check Ollama status
  app.get('/api/ollama/status', async (req, res) => {
    try {
      const { OllamaService } = await import('./services/ollama');
      const ollamaService = new OllamaService();
      const models = await ollamaService.getAvailableModels();
      res.json({ 
        status: 'connected', 
        modelsCount: models.length,
        models: models.slice(0, 5) // Show first 5 models
      });
    } catch (error) {
      res.json({ 
        status: 'disconnected', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Pull a model in Ollama
  app.post('/api/ollama/pull', async (req, res) => {
    try {
      const { model } = req.body;
      if (!model) {
        return res.status(400).json({ error: 'Model name is required' });
      }

      const { OllamaService } = await import('./services/ollama');
      const ollamaService = new OllamaService();
      await ollamaService.pullModel(model);

      res.json({ success: true, message: `Model ${model} pulled successfully` });
    } catch (error) {
      console.error('Error pulling model:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to pull model' });
    }
  });

  // Get base models available for download
  app.get('/api/ollama/base-models', async (req, res) => {
    try {
      const { OllamaService } = await import('./services/ollama');
      const ollamaService = new OllamaService();
      const models = await ollamaService.getAvailableBaseModels();
      res.json(models);
    } catch (error) {
      console.error('Error fetching base models:', error);
      res.status(500).json({ error: 'Failed to fetch base models' });
    }
  });

  return httpServer;
}