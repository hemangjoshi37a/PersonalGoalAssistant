from transformers import pipeline, AutoModelForCausalLM, AutoTokenizer
from .knowledge_base import get_expert_plan

# Lazy-loaded globals
_model = None
_tokenizer = None
_gpt3_pipeline = None

def get_gpt_pipeline():
    """Lazy loads the GPT pipeline to prevent blocking server startup."""
    global _model, _tokenizer, _gpt3_pipeline
    if _gpt3_pipeline is None:
        print("[*] Initializing GPT-Neo Engine... (This will take a moment)")
        # Using AutoModel/AutoTokenizer is generally safer and more flexible
        _tokenizer = AutoTokenizer.from_pretrained("EleutherAI/gpt-neo-125M")
        _model = AutoModelForCausalLM.from_pretrained("EleutherAI/gpt-neo-125M")
        _gpt3_pipeline = pipeline('text-generation', model=_model, tokenizer=_tokenizer, device='cpu')
    return _gpt3_pipeline

def classify_goal(goal):
    goal = goal.lower()
    subcategory = None
    
    if any(k in goal for k in ["run", "fitness", "workout", "weight", "kg", "health", "marathon", "5k", "10k", "gym", "cardio", "diet", "muscle"]):
        category = "fitness"
        if "5k" in goal: subcategory = "5k"
        elif "marathon" in goal: subcategory = "marathon"
        return category, subcategory
        
    if any(k in goal for k in ["speak", "language", "translate", "gujrati", "gujarati", "spanish", "french", "hindi", "vocabulary", "fluent", "dialect"]):
        category = "languages"
        if "gujrati" in goal or "gujarati" in goal: subcategory = "gujrati"
        return category, subcategory
        
    if any(k in goal for k in ["learn", "study", "code", "programming", "course", "skill", "book", "read", "python", "java", "javascript", "develop", "build", "master"]):
        category = "skills"
        if "python" in goal: subcategory = "python"
        return category, subcategory
        
    if any(k in goal for k in ["travel", "trip", "visit", "flight", "hotel", "vacation", "holiday", "itinerary", "backpack"]):
        return "travel", None

    if any(k in goal for k in ["money", "finance", "invest", "budget", "debt", "savings", "wealth", "portfolio", "stocks", "crypto"]):
        return "finance", None

    if any(k in goal for k in ["job", "career", "resume", "interview", "promotion", "salary", "linkedin", "network", "business", "startup"]):
        return "career", None
        
    return "general", None

def generate_subtasks(user_goal, intensity='balanced', persona='strategist'):
    category, subcategory = classify_goal(user_goal)
    
    # HYBRID RETRIEVAL: Check Expert Knowledge Base first
    expert_plan = get_expert_plan(category, subcategory)
    if expert_plan:
        print(f"[*] EKB Match Found: Using expert blueprint for {category}/{subcategory}")
        # Slice expert plan based on intensity
        if intensity == 'blitz':
            return expert_plan[:4]
        elif intensity == 'mastery':
            return expert_plan + [
                "Conduct a 360-degree review of all mission deliverables.",
                "Establish a long-term sustainability framework for this objective."
            ]
        return expert_plan

    # Persona guidance for the system prompt
    persona_profiles = {
        'strategist': {
            'role': "Logical Strategist",
            'voice': "professional, efficient, and objective",
            'focus': "maximizing probability of success through logic"
        },
        'sergeant': {
            'role': "Elite Drill Sergeant",
            'voice': "commanding, direct, and high-intensity",
            'focus': "raw action, discipline, and immediate execution"
        },
        'zen': {
            'role': "Mindful Sensei",
            'voice': "calm, balanced, and sustainable",
            'focus': "flow, mental readiness, and long-term well-being"
        },
        'optimizer': {
            'role': "Growth Hacker",
            'voice': "data-driven, innovative, and opportunistic",
            'focus': "finding leverage points and unconventional shortcuts"
        }
    }

    profile = persona_profiles.get(persona, persona_profiles['strategist'])

    # Intensity logic for prompting
    intensity_guidance = {
        'blitz':    "Focus: High speed, minimal overhead. Output 3-5 critical steps only.",
        'balanced': "Focus: Well-rounded progression. Output 6-8 comprehensive steps.",
        'mastery':  "Focus: Deep expertise and long-term excellence. Output 10-12 granular, high-intensity steps."
    }

    templates = {
        "fitness":  "Example Goal: Get fit\nSteps: 1. Assess current fitness level 2. Join a gym 3. Start cardio 3x weekly\n",
        "languages":"Example Goal: Learn a language\nSteps: 1. Find a native tutor 2. Download audio lessons 3. Practice pronunciation daily\n",
        "skills":   "Example Goal: Master a tool\nSteps: 1. Read documentation 2. Watch tutorials 3. Build a demo project\n",
        "travel":   "Example Goal: Holiday planning\nSteps: 1. Check passport validity 2. Book tickets 3. Pack essentials\n",
        "finance":  "Example Goal: Improve finances\nSteps: 1. Track all expenses 2. Build a monthly budget 3. Start an emergency fund\n",
        "career":   "Example Goal: Advance career\nSteps: 1. Update resume 2. Research target roles 3. Reach out to 5 contacts\n",
        "general":  "Example Goal: Accomplish task\nSteps: 1. Plan scope 2. Gather tools 3. Finalize output\n"
    }

    prompt = (
        f"Role: {profile['role']}\n"
        f"Voice: Speak in a {profile['voice']} tone.\n"
        f"Mission Focus: {profile['focus']}.\n"
        f"Intensity Context: {intensity_guidance.get(intensity, intensity_guidance['balanced'])}\n"
        "Restriction: Output ONLY specific actionable steps. No advice. No meta-planning.\n"
        f"{templates.get(category, templates['general'])}"
        f"Goal: {user_goal}\n"
        "Actionable Steps:\n1."
    )

    gpt3_pipeline = get_gpt_pipeline()
    output = gpt3_pipeline(
        prompt,
        max_new_tokens=200,
        do_sample=True,
        temperature=0.7,
        repetition_penalty=1.5,
        pad_token_id=_tokenizer.eos_token_id if _tokenizer else 50256
    )[0]['generated_text']
    
    if "Actionable Steps:" in output:
        roadmap_part = output.split("Actionable Steps:")[1].strip()
    else:
        roadmap_part = output.replace(prompt, "").strip()
        
    lines = roadmap_part.split('\n')
    subtasks = []
    
    # Refined ACTION-ONLY FILTER: only truly useless lines are rejected
    # (previously too aggressive — now only rejects lines < 4 words or entirely composed of stop words)
    STOP_WORDS = {"a", "an", "the", "is", "in", "on", "of", "for", "to", "and", "or", "with", "it", "be", "as", "at"}
    
    for line in lines:
        clean_line = line.strip().lstrip('0123456789.-) ')
        if not clean_line or len(clean_line) < 10:
            continue

        words = clean_line.lower().split()
        if len(words) < 4:
            continue

        # Only reject if the line has NO meaningful content word (all stop words or 1-2 letter words)
        meaningful_words = [w for w in words if w not in STOP_WORDS and len(w) > 2]
        if len(meaningful_words) < 2:
            continue
            
        subtasks.append(clean_line)
        
    # Professional fallback if AI fails to generate anything useful
    if len(subtasks) < 2:
        return [
            f"Identify the specific technical requirements for '{user_goal}'.",
            "Establish a 30-minute daily deep-work window for this mission.",
            "Research three proven frameworks used by top performers in this area.",
            "Build a weekly review cadence to measure and adjust your approach.",
            "Consolidate all learned materials into a summary deliverable.",
            "Conduct a final performance review against your initial objectives."
        ]
        
    return subtasks

import time
import json

def generate_subtasks_stream(goal: str, intensity: str, persona: str):
    """
    Generator function that streams subtasks one by one for real-time frontend UI.
    Yields Server-Sent Events (SSE) formatted strings.
    """
    yield f"data: {json.dumps({'status': 'Initializing strategic neural pathways...'})}\n\n"
    time.sleep(0.5)

    profile = get_persona_profile(persona)
    category = classify_goal(goal)
    
    yield f"data: {json.dumps({'status': f'Mission classified as: {category.upper()}'})}\n\n"
    time.sleep(0.5)

    intensity_guidance = {
        "blitz": "URGENT ACTION. Maximum speed and density.",
        "balanced": "STEADY PACING. Sustainable daily progress.",
        "mastery": "DEEP FOCUS. High quality, slow burn execution."
    }

    templates = {
        "fitness":  "Example Goal: Get fit\nSteps: 1. Assess current fitness level 2. Join a gym 3. Start cardio 3x weekly\n",
        "languages":"Example Goal: Learn a language\nSteps: 1. Find a native tutor 2. Download audio lessons 3. Practice pronunciation daily\n",
        "skills":   "Example Goal: Master a tool\nSteps: 1. Read documentation 2. Watch tutorials 3. Build a demo project\n",
        "travel":   "Example Goal: Holiday planning\nSteps: 1. Check passport validity 2. Book tickets 3. Pack essentials\n",
        "finance":  "Example Goal: Improve finances\nSteps: 1. Track all expenses 2. Build a monthly budget 3. Start an emergency fund\n",
        "career":   "Example Goal: Advance career\nSteps: 1. Update resume 2. Research target roles 3. Reach out to 5 contacts\n",
        "general":  "Example Goal: Accomplish task\nSteps: 1. Plan scope 2. Gather tools 3. Finalize output\n"
    }

    prompt = (
        f"Role: {profile['role']}\n"
        f"Voice: Speak in a {profile['voice']} tone.\n"
        f"Mission Focus: {profile['focus']}.\n"
        f"Intensity Context: {intensity_guidance.get(intensity, intensity_guidance['balanced'])}\n"
        "Restriction: Output ONLY specific actionable steps. No advice. No meta-planning.\n"
        f"{templates.get(category, templates['general'])}"
        f"Goal: {goal}\n"
        "Actionable Steps:\n1."
    )

    yield f"data: {json.dumps({'status': 'Generating actionable sub-directives...'})}\n\n"
    
    gpt3_pipeline = get_gpt_pipeline()
    output = gpt3_pipeline(
        prompt,
        max_new_tokens=200,
        do_sample=True,
        temperature=0.7,
        repetition_penalty=1.5,
        pad_token_id=_tokenizer.eos_token_id if _tokenizer else 50256
    )[0]['generated_text']
    
    if "Actionable Steps:" in output:
        roadmap_part = output.split("Actionable Steps:")[1].strip()
    else:
        roadmap_part = output.replace(prompt, "").strip()
        
    lines = roadmap_part.split('\n')
    subtasks = []
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line: continue
        # Filter out meta-talk
        if "sure, I can help" in line.lower() or "here are" in line.lower(): continue
        if line.lower() == "actionable steps:": continue
        
        # Clean prefix digits "1. " or "- "
        clean_line = line
        if clean_line[0].isdigit() and len(clean_line) > 1 and clean_line[1] in ('.', ')', '-'):
            clean_line = clean_line[2:].strip()
        elif clean_line.startswith('- ') or clean_line.startswith('* '):
            clean_line = clean_line[2:].strip()
            
        if len(clean_line) > 5:
            subtasks.append(clean_line)
            # Yield each subtask to the stream with a slight delay for dramatic effect
            yield f"data: {json.dumps({'subtask': clean_line, 'status': f'Directive {len(subtasks)} appended.'})}\n\n"
            time.sleep(0.4)

    # Fallback if generation fails
    if not subtasks:
        subtasks = ["Initialize structural parameters", "Execute primary heuristic", "Monitor feedback loop"]
        for st in subtasks:
            yield f"data: {json.dumps({'subtask': st})}\n\n"
            time.sleep(0.4)

    yield f"data: {json.dumps({'status': 'Mission blueprint crystallized.', 'final_subtasks': subtasks})}\n\n"
    yield "data: [DONE]\n\n"