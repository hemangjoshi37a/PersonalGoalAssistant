from transformers import pipeline, GPTNeoForCausalLM, GPT2Tokenizer
from .knowledge_base import get_expert_plan

def get_gpt3_model_and_tokenizer():
    model = GPTNeoForCausalLM.from_pretrained("EleutherAI/gpt-neo-125M")
    tokenizer = GPT2Tokenizer.from_pretrained("EleutherAI/gpt-neo-125M")
    return model, tokenizer

model, tokenizer = get_gpt3_model_and_tokenizer()

def classify_goal(goal):
    goal = goal.lower()
    subcategory = None
    
    if any(k in goal for k in ["run", "fitness", "workout", "weight", "kg", "health", "marathon", "5k", "10k"]):
        category = "fitness"
        if "5k" in goal: subcategory = "5k"
        elif "marathon" in goal: subcategory = "marathon"
        return category, subcategory
        
    if any(k in goal for k in ["speak", "language", "translate", "gujrati", "spanish", "french", "hindi", "vocabulary"]):
        category = "languages"
        if "gujrati" in goal: subcategory = "gujrati"
        return category, subcategory
        
    if any(k in goal for k in ["learn", "study", "code", "programming", "course", "skill", "book", "read", "python", "java"]):
        category = "skills"
        if "python" in goal: subcategory = "python"
        return category, subcategory
        
    if any(k in goal for k in ["travel", "trip", "visit", "flight", "hotel", "vacation", "holiday", "itinerary"]):
        return "travel", None
        
    return "general", None

def generate_subtasks(user_goal):
    category, subcategory = classify_goal(user_goal)
    
    # HYBRID RETRIEVAL: Check Expert Knowledge Base first
    expert_plan = get_expert_plan(category, subcategory)
    if expert_plan:
        print(f"[*] EKB Match Found: Using expert blueprint for {category}/{subcategory}")
        return expert_plan

    # If no expert plan, fallback to AI generation with strict Action-Only filters
    templates = {
        "fitness": "Example Goal: Get fit\nSteps: 1. Assess BMI 2. Join a gym 3. Start cardio sessions\n",
        "languages": "Example Goal: Learn a dialect\nSteps: 1. Find a native tutor 2. Download audio lessons 3. Practice daily pronunciation\n",
        "skills": "Example Goal: Master a tool\nSteps: 1. Read documentation 2. Watch tutorials 3. Build a demo project\n",
        "travel": "Example Goal: Holiday planning\nSteps: 1. Check passport validity 2. Book tickets 3. Pack essentials\n",
        "general": "Example Goal: Accomplish task\nSteps: 1. Plan scope 2. Gather tools 3. Finalize output\n"
    }

    prompt = (
        "Role: Professional Action Planner\n"
        "Restriction: Output ONLY specific actionable steps. No advice. No meta-planning.\n"
        f"{templates.get(category, templates['general'])}"
        f"Goal: {user_goal}\n"
        "Actionable Steps:\n1."
    )
    
    gpt3_pipeline = pipeline('text-generation', model=model, tokenizer=tokenizer, device='cpu')
    output = gpt3_pipeline(prompt, max_new_tokens=200, do_sample=True, temperature=0.7, repetition_penalty=1.5, pad_token_id=tokenizer.eos_token_id)[0]['generated_text']
    
    if "Actionable Steps:" in output:
        roadmap_part = output.split("Actionable Steps:")[1].strip()
    else:
        roadmap_part = output.replace(prompt, "").strip()
        
    lines = roadmap_part.split('\n')
    subtasks = []
    
    # ACTION-ONLY FILTER: Reject 'Meta-Advice'
    meta_words = ["strategy", "plan", "milestone", "goal", "execute", "focus", "create", "approach"]
    
    for line in lines:
        clean_line = line.strip().lstrip('0123456789. ')
        if not clean_line or len(clean_line) < 10:
            continue
            
        # Reject if the line is just a meta-advice sentence (no specific action)
        words = clean_line.lower().split()
        if len(words) < 4: # Too short to be an actionable step
            continue
            
        # If it's just meta-advice (e.g., 'Create a strategy')
        if all(word in meta_words or len(word) < 3 for word in words):
            continue
            
        subtasks.append(clean_line)
            
    # Professional fallback if AI fails to be actionable
    if len(subtasks) < 2:
        return [
            f"Identify the specific technical requirements for '{user_goal}'.",
            "Establish a 30-minute daily deep-work window for this mission.",
            "Consolidate all learned materials into a summary deliverable.",
            "Conduct a final performance review against your initial objectives."
        ]
        
    return subtasks