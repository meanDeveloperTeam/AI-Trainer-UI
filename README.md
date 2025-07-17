# AI Trainer UI

## Project Overview

AI Trainer UI is a full-stack application designed to facilitate the training, management, and inference of AI models. It provides a user-friendly interface for interacting with various models, managing datasets, and monitoring training processes. The backend is built with Node.js (Express) and TypeScript, while the frontend is developed using React.

## Features

- **Model Management**: Support for various AI models (Ollama, Hugging Face Transformers, vLLM).
- **Training Capabilities**: Train and fine-tune models using custom datasets.
- **Inference**: Perform real-time inference with deployed models.
- **User Interface**: Intuitive React-based frontend for easy interaction.
- **Database Integration**: Persistent storage for application data using Drizzle ORM.
- **Real-time Communication**: WebSocket integration for live updates during training and inference.

## Technologies Used

### Frontend
- **React**: A JavaScript library for building user interfaces.
- **Vite**: A fast build tool for modern web projects.
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
- **Radix UI**: A collection of unstyled, accessible UI components.
- **TanStack Query**: For data fetching, caching, and synchronization.
- **Wouter**: A tiny, dependency-free router for React.

### Backend
- **Node.js**: JavaScript runtime environment.
- **Express.js**: A fast, unopinionated, minimalist web framework for Node.js.
- **TypeScript**: A superset of JavaScript that adds static types.
- **Drizzle ORM**: A modern TypeScript ORM for SQL databases.
- **PostgreSQL (Neon Database)**: Serverless PostgreSQL for database management.
- **Socket.IO**: For real-time, bidirectional event-based communication.
- **Multer**: Middleware for handling `multipart/form-data`, primarily used for uploading files.
- **Passport.js**: Authentication middleware for Node.js.

### AI/ML
- **Ollama**: Run large language models locally.
- **Hugging Face Transformers**: State-of-the-art Machine Learning for PyTorch, TensorFlow, and JAX.
- **vLLM**: A fast and efficient inference engine for LLMs.
- **Python**: Used for model training and inference scripts.

## Setup Instructions

Follow these steps to set up and run the project locally.

### Prerequisites

- Node.js (v18 or higher)
- npm (or yarn/pnpm)
- Python (v3.8 or higher)
- Docker (optional, for database or local LLMs)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/AI-Trainer-UI.git
cd AI-Trainer-UI
```

### 2. Environment Variables

Create a `.env` file in the root directory and add the necessary environment variables.

```env
# Database
DATABASE_URL="your_neon_database_connection_string"
SESSION_SECRET="a_strong_secret_for_express_session"

# Ollama (if running locally)
OLLAMA_HOST="http://localhost:11434" # Or your Ollama server address

# Other configurations as needed
```

### 3. Install Dependencies

Install both backend and frontend dependencies:

```bash
npm install
```

### 4. Database Setup

This project uses Drizzle ORM with PostgreSQL. You can use a service like Neon for a serverless PostgreSQL database.

- **Push Schema to Database**:
  ```bash
  npm run db:push
  ```

### 5. Running AI Models (Ollama, Transformers, vLLM)

Depending on the models you plan to use, you might need to set up additional services:

- **Ollama**:
  Download and install Ollama from [ollama.com](https://ollama.com/).
  Pull the desired models (e.g., `ollama pull llama3`).
  Ensure Ollama server is running on `OLLAMA_HOST` specified in `.env`.

- **Hugging Face Transformers / vLLM**:
  The Python scripts (`server/services/train_model.py`, `server/services/inference_model.py`) handle interactions with these libraries. Ensure you have the necessary Python dependencies installed.
  ```bash
  # You might need to create a Python virtual environment and install these
  pip install transformers torch accelerate vllm
  ```
  (Specific setup for vLLM might involve GPU drivers and more complex configurations.)

### 6. Run the Application

Start the development server:

```bash
npm run dev
```

This command will start both the backend server and the frontend development server. The application should be accessible at `http://localhost:5173` (or another port if configured differently by Vite).

## Usage

- Navigate to the application in your browser.
- Explore the dashboard to manage models, initiate training, and perform inference.
- Upload datasets for training.
- Monitor training progress and view model performance.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature-name`).
3. Make your changes.
4. Commit your changes (`git commit -m 'feat: Add new feature'`).
5. Push to the branch (`git push origin feature/your-feature-name`).
6. Open a Pull Request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
