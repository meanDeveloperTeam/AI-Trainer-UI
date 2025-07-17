import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const trainingJobs = pgTable("training_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  jobId: text("job_id").notNull().unique(),
  framework: text("framework").notNull(), // 'ollama', 'vllm', 'transformers'
  baseModel: text("base_model").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'training', 'completed', 'failed', 'cancelled'
  progress: real("progress").default(0),
  currentEpoch: integer("current_epoch").default(0),
  totalEpochs: integer("total_epochs").notNull(),
  loss: real("loss"),
  learningRate: real("learning_rate").notNull(),
  batchSize: integer("batch_size").notNull(),
  contextLength: integer("context_length").notNull(),
  systemPrompt: text("system_prompt"),
  datasetPath: text("dataset_path"),
  modelPath: text("model_path"),
  config: jsonb("config"),
  logs: text("logs"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trainedModels = pgTable("trained_models", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  trainingJobId: integer("training_job_id").references(() => trainingJobs.id),
  name: text("name").notNull(),
  framework: text("framework").notNull(),
  baseModel: text("base_model").notNull(),
  modelPath: text("model_path").notNull(),
  size: real("size"), // in bytes (using real for bigint compatibility)
  deployed: boolean("deployed").default(false),
  deploymentEndpoint: text("deployment_endpoint"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const datasets = pgTable("datasets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  size: integer("size").notNull(),
  type: text("type").notNull(), // 'text', 'json', 'csv', 'jsonl'
  exampleCount: integer("example_count"),
  filePath: text("file_path").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTrainingJobSchema = createInsertSchema(trainingJobs).omit({
  id: true,
  userId: true,
  jobId: true,
  status: true,
  progress: true,
  currentEpoch: true,
  startTime: true,
  endTime: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainedModelSchema = createInsertSchema(trainedModels).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTrainingJob = z.infer<typeof insertTrainingJobSchema>;
export type TrainingJob = typeof trainingJobs.$inferSelect;

export type InsertTrainedModel = z.infer<typeof insertTrainedModelSchema>;
export type TrainedModel = typeof trainedModels.$inferSelect;

export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Dataset = typeof datasets.$inferSelect;
