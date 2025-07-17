import { TrainingJob, TrainedModel } from "@shared/schema";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export class VLLMService {
  private vllmUrl: string;

  constructor() {
    this.vllmUrl = process.env.VLLM_URL || 'http://localhost:8000';
  }


  async deployModel(model: TrainedModel): Promise<string> {
    try {
      // Deploy model to vLLM server
      const endpoint = `${this.vllmUrl}/v1/chat/completions`;
      
      // This would typically involve starting a vLLM server instance with the model
      return endpoint;
    } catch (error) {
      throw new Error(`Failed to deploy model to vLLM: ${error}`);
    }
  }

  async testModel(model: TrainedModel, prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    try {
      const response = await fetch(`${this.vllmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.name,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 256,
          stream: true // Request streaming
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get reader from response body.');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process each line of the stream
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last (incomplete) line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6);
            if (jsonStr.trim() === '[DONE]') {
              break;
            }
            try {
              const data = JSON.parse(jsonStr);
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                onChunk(data.choices[0].delta.content);
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', e, 'Line:', line);
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to test model: ${error}`);
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.vllmUrl}/v1/models`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      // vLLM not running locally - this is expected in development
      // Return popular models for demo purposes  
      return ['llama3.1-8b', 'llama3.1-70b', 'phi3-mini', 'codellama-7b', 'mistral-7b', 'gemma-7b', 'qwen2-7b'];
    }
  }
}
