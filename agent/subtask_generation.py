from transformers import pipeline, GPTNeoForCausalLM, GPT2Tokenizer

def get_gpt3_model_and_tokenizer():
    model = GPTNeoForCausalLM.from_pretrained("EleutherAI/gpt-neo-125M")
    tokenizer = GPT2Tokenizer.from_pretrained("EleutherAI/gpt-neo-125M")
    return model, tokenizer

model, tokenizer = get_gpt3_model_and_tokenizer()


def generate_subtasks(prompt):
    # Change device to 'cpu' instead of 0
    gpt3_pipeline = pipeline('text-generation', model=model, tokenizer=tokenizer, device='cpu')
    generated_text = gpt3_pipeline(prompt)[0]['generated_text']
    subtasks = generated_text.split('\n')
    return subtasks