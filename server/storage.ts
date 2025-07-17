import { 
  users, 
  trainingJobs, 
  trainedModels, 
  datasets,
  type User, 
  type InsertUser,
  type TrainingJob,
  type InsertTrainingJob,
  type TrainedModel,
  type InsertTrainedModel,
  type Dataset,
  type InsertDataset
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Training job methods
  getTrainingJob(id: number): Promise<TrainingJob | undefined>;
  getTrainingJobByJobId(jobId: string): Promise<TrainingJob | undefined>;
  getUserTrainingJobs(userId: number): Promise<TrainingJob[]>;
  createTrainingJob(job: InsertTrainingJob & { userId: number }): Promise<TrainingJob>;
  updateTrainingJob(id: number, updates: Partial<TrainingJob>): Promise<TrainingJob | undefined>;
  deleteTrainingJob(id: number): Promise<boolean>;

  // Trained model methods
  getTrainedModel(id: number): Promise<TrainedModel | undefined>;
  getUserTrainedModels(userId: number): Promise<TrainedModel[]>;
  createTrainedModel(model: InsertTrainedModel & { userId: number }): Promise<TrainedModel>;
  updateTrainedModel(id: number, updates: Partial<TrainedModel>): Promise<TrainedModel | undefined>;
  deleteTrainedModel(id: number): Promise<boolean>;

  // Dataset methods
  getDataset(id: number): Promise<Dataset | undefined>;
  getUserDatasets(userId: number): Promise<Dataset[]>;
  createDataset(dataset: InsertDataset & { userId: number }): Promise<Dataset>;
  deleteDataset(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trainingJobs: Map<number, TrainingJob>;
  private trainedModels: Map<number, TrainedModel>;
  private datasets: Map<number, Dataset>;
  private currentUserId: number;
  private currentTrainingJobId: number;
  private currentTrainedModelId: number;
  private currentDatasetId: number;

  constructor() {
    this.users = new Map();
    this.trainingJobs = new Map();
    this.trainedModels = new Map();
    this.datasets = new Map();
    this.currentUserId = 1;
    this.currentTrainingJobId = 1;
    this.currentTrainedModelId = 1;
    this.currentDatasetId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Training job methods
  async getTrainingJob(id: number): Promise<TrainingJob | undefined> {
    return this.trainingJobs.get(id);
  }

  async getTrainingJobByJobId(jobId: string): Promise<TrainingJob | undefined> {
    return Array.from(this.trainingJobs.values()).find(job => job.jobId === jobId);
  }

  async getUserTrainingJobs(userId: number): Promise<TrainingJob[]> {
    return Array.from(this.trainingJobs.values()).filter(job => job.userId === userId);
  }

  async createTrainingJob(jobData: InsertTrainingJob & { userId: number }): Promise<TrainingJob> {
    const id = this.currentTrainingJobId++;
    const jobId = `job_${Math.random().toString(36).substr(2, 8)}`;
    const job: TrainingJob = {
      ...jobData,
      id,
      jobId,
      status: "pending",
      progress: 0,
      currentEpoch: 0,
      loss: null,
      datasetPath: null,
      modelPath: null,
      config: null,
      logs: null,
      startTime: null,
      endTime: null,
      systemPrompt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.trainingJobs.set(id, job);
    return job;
  }

  async updateTrainingJob(id: number, updates: Partial<TrainingJob>): Promise<TrainingJob | undefined> {
    const job = this.trainingJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates, updatedAt: new Date() };
    this.trainingJobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteTrainingJob(id: number): Promise<boolean> {
    return this.trainingJobs.delete(id);
  }

  // Trained model methods
  async getTrainedModel(id: number): Promise<TrainedModel | undefined> {
    return this.trainedModels.get(id);
  }

  async getUserTrainedModels(userId: number): Promise<TrainedModel[]> {
    return Array.from(this.trainedModels.values()).filter(model => model.userId === userId);
  }

  async createTrainedModel(modelData: InsertTrainedModel & { userId: number }): Promise<TrainedModel> {
    const id = this.currentTrainedModelId++;
    const model: TrainedModel = {
      ...modelData,
      id,
      size: modelData.size || null,
      trainingJobId: modelData.trainingJobId || null,
      deployed: false,
      deploymentEndpoint: null,
      createdAt: new Date(),
    };
    this.trainedModels.set(id, model);
    return model;
  }

  async updateTrainedModel(id: number, updates: Partial<TrainedModel>): Promise<TrainedModel | undefined> {
    const model = this.trainedModels.get(id);
    if (!model) return undefined;
    
    const updatedModel = { ...model, ...updates };
    this.trainedModels.set(id, updatedModel);
    return updatedModel;
  }

  async deleteTrainedModel(id: number): Promise<boolean> {
    return this.trainedModels.delete(id);
  }

  // Dataset methods
  async getDataset(id: number): Promise<Dataset | undefined> {
    return this.datasets.get(id);
  }

  async getUserDatasets(userId: number): Promise<Dataset[]> {
    return Array.from(this.datasets.values()).filter(dataset => dataset.userId === userId);
  }

  async createDataset(datasetData: InsertDataset & { userId: number }): Promise<Dataset> {
    const id = this.currentDatasetId++;
    const dataset: Dataset = {
      ...datasetData,
      id,
      exampleCount: datasetData.exampleCount || null,
      createdAt: new Date(),
    };
    this.datasets.set(id, dataset);
    return dataset;
  }

  async deleteDataset(id: number): Promise<boolean> {
    return this.datasets.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Training job methods
  async getTrainingJob(id: any): Promise<TrainingJob | undefined> {
    const [job] = await db.select().from(trainingJobs).where(eq(trainingJobs.jobId, id));
    return job || undefined;
  }

  async getTrainingJobByJobId(jobId: string): Promise<TrainingJob | undefined> {
    const [job] = await db.select().from(trainingJobs).where(eq(trainingJobs.jobId, jobId));
    return job || undefined;
  }

  async getUserTrainingJobs(userId: number): Promise<TrainingJob[]> {
    return await db.select().from(trainingJobs).where(eq(trainingJobs.userId, userId));
  }

  async createTrainingJob(jobData: InsertTrainingJob & { userId: number }): Promise<TrainingJob> {
    const jobId = `job_${Math.random().toString(36).substr(2, 8)}`;
    const [job] = await db
      .insert(trainingJobs)
      .values({
        ...jobData,
        jobId,
        status: "pending",
        progress: 0,
        currentEpoch: 0,
      })
      .returning();
    return job;
  }

  async updateTrainingJob(id: number, updates: Partial<TrainingJob>): Promise<TrainingJob | undefined> {
    const [job] = await db
      .update(trainingJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trainingJobs.id, id))
      .returning();
    return job || undefined;
  }

  async deleteTrainingJob(id: number): Promise<boolean> {
    const result = await db.delete(trainingJobs).where(eq(trainingJobs.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Trained model methods
  async getTrainedModel(id: number): Promise<TrainedModel | undefined> {
    const [model] = await db.select().from(trainedModels).where(eq(trainedModels.id, id));
    return model || undefined;
  }

  async getUserTrainedModels(userId: number): Promise<TrainedModel[]> {
    return await db.select().from(trainedModels).where(eq(trainedModels.userId, userId));
  }

  async createTrainedModel(modelData: InsertTrainedModel & { userId: number }): Promise<TrainedModel> {
    const [model] = await db
      .insert(trainedModels)
      .values({
        ...modelData,
        deployed: false,
      })
      .returning();
    return model;
  }

  async updateTrainedModel(id: number, updates: Partial<TrainedModel>): Promise<TrainedModel | undefined> {
    const [model] = await db
      .update(trainedModels)
      .set(updates)
      .where(eq(trainedModels.id, id))
      .returning();
    return model || undefined;
  }

  async deleteTrainedModel(id: number): Promise<boolean> {
    const result = await db.delete(trainedModels).where(eq(trainedModels.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Dataset methods
  async getDataset(id: number): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));
    return dataset || undefined;
  }

  async getUserDatasets(userId: number): Promise<Dataset[]> {
    return await db.select().from(datasets).where(eq(datasets.userId, userId));
  }

  async createDataset(datasetData: InsertDataset & { userId: number }): Promise<Dataset> {
    const [dataset] = await db
      .insert(datasets)
      .values(datasetData)
      .returning();
    return dataset;
  }

  async deleteDataset(id: number): Promise<boolean> {
    const result = await db.delete(datasets).where(eq(datasets.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();
