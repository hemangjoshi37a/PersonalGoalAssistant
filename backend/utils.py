import json
import re

def extract_json(text):
    """
    Robustly extracts JSON from a string that might contain markdown fences or extra text.
    Finds the first '[' or '{' and the last ']' or '}'.
    """
    try:
        # Try finding a list first (common for our subtasks/gauntlets)
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        
        # Try finding an object
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
            
        # Fallback to direct load
        return json.loads(text)
    except Exception as e:
        print(f"[!] JSON Extraction failed: {e}")
        # Final attempt: strip everything before/after fences
        clean = text.strip()
        if '```' in clean:
            parts = clean.split('```')
            for part in parts:
                p = part.strip()
                if p.startswith('json'): p = p[4:].strip()
                try:
                    return json.loads(p)
                except:
                    continue
        raise e
