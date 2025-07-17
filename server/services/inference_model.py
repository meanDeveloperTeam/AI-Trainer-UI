import sys
import torch
import os
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel, PeftConfig # Import PeftModel and PeftConfig

# --- Argument parsing ---
if len(sys.argv) < 3:
    print("Usage: inference_model.py <model_path> <prompt>", file=sys.stderr)
    sys.exit(1)

model_path = sys.argv[1] # This is now the path to the finetuned model (e.g., final_model)
prompt = sys.argv[2]

# --- Load model & tokenizer ---
try:
    # Load the PEFT config to get the base model name
    config = PeftConfig.from_pretrained(model_path)
    base_model_name = config.base_model_name_or_path

    # Load the base model
    print(f"Loading base model: {base_model_name}", file=sys.stderr)
    base_model = AutoModelForCausalLM.from_pretrained(base_model_name, torch_dtype=torch.float16)

    # Load the PEFT adapter
    print(f"Loading PEFT adapter from: {model_path}", file=sys.stderr)
    model = PeftModel.from_pretrained(base_model, model_path)

    # Merge the LoRA layers with the base model for inference
    print("Merging PEFT adapters...", file=sys.stderr)
    model = model.merge_and_unload()

    # Load the tokenizer from the finetuned model path
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    tokenizer.pad_token = tokenizer.eos_token # Ensure pad token is set

except Exception as e:
    print(f"Error loading model or tokenizer from {model_path}: {e}", file=sys.stderr)
    sys.exit(1)

# --- Perform inference and stream output ---
try:
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device) # Move inputs to model device

    # Generate text iteratively to simulate streaming
    # This is a simplified approach; a real streaming implementation
    # might involve generating token by token and decoding.
    # For demonstration, we'll generate the full text and then
    # print it word by word with flushing.

    outputs = model.generate(inputs.input_ids, max_length=100, num_return_sequences=1, do_sample=True, top_k=50, top_p=0.95)
    generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

    # Simulate streaming by printing word by word
    words = generated_text.split()
    for i, word in enumerate(words):
        print(word + (" " if i < len(words) - 1 else ""), end='', flush=True)
        # Optional: add a small delay to simulate streaming speed
        # import time
        # time.sleep(0.05)

    print("", flush=True) # Ensure a final newline

except Exception as e:
    print(f"Error during inference: {e}", file=sys.stderr)
    sys.exit(1)

sys.exit(0) # Indicate success
