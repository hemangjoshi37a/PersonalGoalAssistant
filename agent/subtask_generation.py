import os
import json
import google.generativeai as genai
from .knowledge_base import get_expert_plan

# Initialize Gemini
genai.configure(api_key=os.environ.get('GEMINI_API_KEY', ''))
_model = genai.GenerativeModel('gemini-1.5-flash')

def get_persona_profile(persona):
    profiles = {
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
    return profiles.get(persona, profiles['strategist'])

def classify_goal_with_ai(goal):
    """Uses Gemini to classify the goal more accurately than keyword matching."""
    prompt = (
        f"Classify this goal into one of these categories: fitness, languages, skills, travel, finance, career, or general.\n"
        f"Goal: \"{goal}\"\n"
        f"Return ONLY the category name in lowercase."
    )
    try:
        response = _model.generate_content(prompt)
        category = response.text.strip().lower()
        valid_categories = ["fitness", "languages", "skills", "travel", "finance", "career", "general"]
        return category if category in valid_categories else "general"
    except:
        return "general"

def generate_subtasks(user_goal, intensity='balanced', persona='strategist'):
    """
    Synchronous version of subtask generation.
    """
    category = classify_goal_with_ai(user_goal)
    
    # HYBRID RETRIEVAL: Check Expert Knowledge Base first
    # (Subcategory detection still uses simple matching for EKB)
    subcategory = None
    if category == "fitness":
        if "5k" in user_goal: subcategory = "5k"
        elif "marathon" in user_goal: subcategory = "marathon"
    elif category == "languages" and ("gujrati" in user_goal.lower() or "gujarati" in user_goal.lower()):
        subcategory = "gujrati"
    elif category == "skills" and "python" in user_goal.lower():
        subcategory = "python"

    expert_plan = get_expert_plan(category, subcategory)
    if expert_plan:
        print(f"[*] EKB Match Found: Using expert blueprint for {category}/{subcategory}")
        if intensity == 'blitz': return expert_plan[:4]
        if intensity == 'mastery': return expert_plan + ["Refine and optimize performance.", "Establish long-term sustainability."]
        return expert_plan

    profile = get_persona_profile(persona)
    intensity_guidance = {
        'blitz': "Focus: High speed, minimal overhead. 3-5 critical steps.",
        'balanced': "Focus: Well-rounded progression. 6-8 comprehensive steps.",
        'mastery': "Focus: Deep expertise. 10-12 granular steps."
    }

    prompt = (
        f"Role: {profile['role']}. Voice: {profile['voice']}. Focus: {profile['focus']}.\n"
        f"Intensity: {intensity_guidance.get(intensity, 'balanced')}\n"
        f"Goal: {user_goal}\n\n"
        "Generate a structured list of actionable sub-tasks. "
        "Return ONLY the tasks, one per line, no numbers, no formatting."
    )

    try:
        response = _model.generate_content(prompt)
        lines = [line.strip() for line in response.text.split('\n') if line.strip()]
        return lines if len(lines) > 2 else ["Analyze requirements", "Execute primary action", "Review results"]
    except Exception as e:
        print(f"[!] Gemini generation error: {e}")
        return ["Analyze requirements", "Execute primary action", "Review results"]

def generate_subtasks_stream(goal: str, intensity: str, persona: str):
    """
    Generator function that streams subtasks one by one.
    """
    yield f"data: {json.dumps({'status': 'Initializing strategic neural pathways...'})}\n\n"
    
    category = classify_goal_with_ai(goal)
    yield f"data: {json.dumps({'status': f'Mission classified as: {category.upper()}'})}\n\n"

    profile = get_persona_profile(persona)
    intensity_guidance = {
        "blitz": "URGENT ACTION. Maximum speed.",
        "balanced": "STEADY PACING. Sustainable progress.",
        "mastery": "DEEP FOCUS. High quality burn."
    }

    prompt = (
        f"Role: {profile['role']}. Voice: {profile['voice']}. Focus: {profile['focus']}.\n"
        f"Intensity: {intensity_guidance.get(intensity, 'balanced')}\n"
        f"Goal: {goal}\n\n"
        "Generate 5-10 actionable sub-tasks. "
        "Return ONLY the tasks, one per line, no numbers, no bullets."
    )

    yield f"data: {json.dumps({'status': 'Generating actionable sub-directives...'})}\n\n"
    
    try:
        response = _model.generate_content(prompt, stream=True)
        subtasks = []
        
        # Buffer to handle line breaks within chunks if necessary, though Gemini usually streams lines well
        current_buffer = ""
        
        for chunk in response:
            if chunk.text:
                current_buffer += chunk.text
                if '\n' in current_buffer:
                    parts = current_buffer.split('\n')
                    # Process all but the last part (which might be incomplete)
                    for line in parts[:-1]:
                        clean_line = line.strip().lstrip('0123456789.-) ')
                        if len(clean_line) > 5:
                            subtasks.append(clean_line)
                            yield f"data: {json.dumps({'subtask': clean_line, 'status': f'Directive {len(subtasks)} appended.'})}\n\n"
                    current_buffer = parts[-1]

        # Handle remaining buffer
        if current_buffer.strip():
            clean_line = current_buffer.strip().lstrip('0123456789.-) ')
            if len(clean_line) > 5:
                subtasks.append(clean_line)
                yield f"data: {json.dumps({'subtask': clean_line, 'status': f'Directive {len(subtasks)} appended.'})}\n\n"

        if not subtasks:
            subtasks = ["Initialize structural parameters", "Execute primary heuristic", "Monitor feedback loop"]
            for st in subtasks:
                yield f"data: {json.dumps({'subtask': st})}\n\n"

        yield f"data: {json.dumps({'status': 'Mission blueprint crystallized.', 'final_subtasks': subtasks})}\n\n"
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e), 'status': 'Generation failed.'})}\n\n"
        yield "data: [DONE]\n\n"