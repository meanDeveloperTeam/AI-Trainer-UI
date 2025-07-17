import sys
import json
import os
import pandas as pd
import time

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer, DataCollatorForLanguageModeling, TrainerCallback

# --- Real-time logging function ---
def log(progress, epoch, loss, status):
    print(json.dumps({
        "progress": progress,
        "currentEpoch": epoch,
        "loss": round(loss, 4),
        "status": status
    }))
    sys.stdout.flush()

# --- Argument parsing ---
if len(sys.argv) < 4:
    print("Usage: train_model.py <model_name_or_path> <dataset.csv> <output_dir>", file=sys.stderr)
    sys.exit(1)

# --- Argument variables ---
# model_name can be a Hugging Face Hub ID or a local path
model_name = sys.argv[1]
dataset_path = sys.argv[2]
output_dir = os.path.abspath(sys.argv[3]) # Output directory should always be an absolute path

# Replace backslashes with forward slashes for compatibility in output_dir
if os.name == 'nt':
    output_dir = output_dir.replace('\\', '/')

# --- Load model & tokenizer ---
try:
    # Attempt to load from Hub or cache first.
    # from_pretrained handles both repo IDs and local paths (including cache).
    # Remove local_files_only=True to allow Hub download if not cached.
    # Define a temporary offload folder within the output directory
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch.float16)
except Exception as e:
    print(f"Initial load failed for {model_name}: {e}. Attempting to load without device_map and offload_folder in fallback...", file=sys.stderr)
    try:
        # Re-attempt without local_files_only, allowing download if not cached, and without device_map/offload_folder
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        tokenizer.pad_token = tokenizer.eos_token
        model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch.float16)
        print(f"Successfully re-attempted load for: {model_name}", file=sys.stderr)
    except Exception as e_local:
        print(f"Error loading model or tokenizer from {model_name} (both Hub/cache and re-attempt failed): {e_local}", file=sys.stderr)
        sys.exit(1)

# --- Prepare for LoRA ---
# Move model to CPU to ensure all parameters are on a concrete device before PEFT
model = model.to("cpu")
model = prepare_model_for_kbit_training(model)
peft_config = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=["c_attn"],
    lora_dropout=0.1,
    bias="none",
    task_type="CAUSAL_LM"
)
model = get_peft_model(model, peft_config)

# --- Load CSV and prepare dataset ---
df = pd.read_csv(dataset_path)
df = df.dropna()
dataset = Dataset.from_pandas(df)

def format_example(example):
    return {
        "text": f"<|user|>\n{example['prompt']}\n<|assistant|>\n{example['response']}"
    }

dataset = dataset.map(format_example)
tokenized = dataset.map(lambda e: tokenizer(e["text"], truncation=True, padding="max_length", max_length=512), batched=True)

# --- Training args ---
training_args = TrainingArguments(
    output_dir=output_dir, # Use the provided output directory
    per_device_train_batch_size=2,
    num_train_epochs=3,
    logging_steps=1,
    save_steps=50,
    warmup_steps=5,
    save_total_limit=1,
    report_to=[],
    fp16=True
)

# --- Data collator ---
data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

# --- Logging callback ---
class ProgressCallback(TrainerCallback):
    def __init__(self, total_epochs):
        self.total_epochs = total_epochs

    def on_init_end(self, args, state, control, **kwargs):
        # This method is required by TrainerCallback, even if it does nothing
        return control

    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs is not None and 'loss' in logs:
            progress = int((logs["epoch"] / self.total_epochs) * 100)
            log(progress, int(logs["epoch"]), logs["loss"], f"Epoch {int(logs['epoch'])} in progress...")

# --- Train ---
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized,
    tokenizer=tokenizer,
    data_collator=data_collator,
    callbacks=[ProgressCallback(training_args.num_train_epochs)]
)

trainer.train()

# Save the final trained model to a specific subdirectory within the output directory
final_model_path = os.path.join(output_dir, "final_model")
os.makedirs(final_model_path, exist_ok=True) # Ensure the directory exists

try:
    trainer.save_model(final_model_path)
    # Log the actual path where the model is saved
    log(100, int(training_args.num_train_epochs), 0.05, f"Training completed successfully. Model saved to {final_model_path}")
    # Also print the final model path explicitly for the Node.js service to capture
    print(f"FINAL_MODEL_PATH:{final_model_path}")
except Exception as e:
    print(f"Error saving model to {final_model_path}: {e}", file=sys.stderr)
    log(100, int(training_args.num_train_epochs), 0.05, f"Training completed, but failed to save model: {e}")
    sys.exit(1) # Indicate failure if saving fails

sys.exit(0) # Indicate success
