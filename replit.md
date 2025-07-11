# AI Model Training Platform

## Overview

This is a full-stack web application for training AI models across multiple frameworks (Ollama, vLLM, and Transformers). The platform provides a comprehensive interface for dataset upload, model configuration, training monitoring, and model deployment with real-time updates via WebSocket connections.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM (ACTIVE)
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Real-time Communication**: WebSocket server for training updates
- **File Upload**: Multer for handling dataset uploads
- **Session Management**: PostgreSQL-based session store
- **Storage**: Switched from MemStorage to DatabaseStorage for persistent data

### Database Schema
The application uses PostgreSQL with the following main tables:
- `users`: User authentication and management
- `training_jobs`: Training job tracking with status, progress, and configuration
- `trained_models`: Metadata for completed models
- `datasets`: File information for uploaded training datasets

## Key Components

### Training Framework Services
- **OllamaService**: Handles local Ollama model training
- **VLLMService**: Manages vLLM server-based training
- **TransformersService**: Orchestrates Hugging Face Transformers fine-tuning

### WebSocket Integration
- Real-time training progress updates
- Job status broadcasting to connected clients
- Client subscription management for specific training jobs

### File Management
- Secure file upload with size limits (500MB)
- Dataset storage and metadata tracking
- Model artifact management

### UI Components
- **Dashboard**: Main interface with framework selection tabs
- **FileUpload**: Drag-and-drop dataset upload with progress tracking
- **ModelConfig**: Training parameter configuration forms
- **TrainingStatus**: Real-time training progress display
- **PerformanceChart**: Training metrics visualization
- **ModelTesting**: Interface for testing trained models
- **Deployment**: Model deployment management

## Data Flow

1. **Dataset Upload**: Users upload training datasets via drag-and-drop interface
2. **Model Configuration**: Training parameters are configured through form validation
3. **Training Initiation**: Jobs are queued and assigned unique IDs
4. **Real-time Updates**: WebSocket connections provide live training progress
5. **Model Storage**: Completed models are stored with metadata
6. **Deployment**: Models can be deployed to various endpoints

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon Database client for serverless PostgreSQL
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Headless UI components for accessibility
- **react-hook-form**: Form state management and validation
- **zod**: Runtime type validation and schema definition
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **typescript**: Type safety and development experience
- **vite**: Fast build tool and development server
- **drizzle-kit**: Database migration and schema management

## Deployment Strategy

### Development
- Vite development server with HMR (Hot Module Replacement)
- TypeScript compilation with incremental builds
- Real-time error overlay for debugging

### Production Build
- Vite builds optimized React client bundle
- esbuild compiles server code to single ESM bundle
- Static files served from `dist/public` directory

### Database Management
- Drizzle migrations stored in `./migrations` directory
- Schema definitions in `./shared/schema.ts`
- PostgreSQL database provisioned via environment variables

### Environment Configuration
- `NODE_ENV` for environment detection
- `DATABASE_URL` for PostgreSQL connection
- Framework-specific URLs (OLLAMA_URL, VLLM_URL) for external services

## Recent Changes
- **Database Integration (Latest)**: Added PostgreSQL database with Drizzle ORM
  - Created database connection in `server/db.ts`
  - Replaced MemStorage with DatabaseStorage for persistent data
  - Migrated all CRUD operations to use PostgreSQL
  - Fixed TypeScript compatibility issues with database operations

The application follows a modular architecture with clear separation between client and server code, shared type definitions, and comprehensive error handling throughout the system.