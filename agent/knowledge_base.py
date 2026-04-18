# Expert Knowledge Base (EKB)
# Contains 'Gold Standard' plans for common personal goals to avoid AI hallucinations.

EXPERTS = {
    "languages": {
        "gujrati": [
            "Week 1: Fundamentals - Learn the Gujarati alphabet (Mula-aksara) and basic vowel signs.",
            "Week 1: Foundations - Master numbers 1-20 and common greetings (Kem cho, Namaste).",
            "Week 1: Vocabulary - Memorize 50 essential nouns for household objects and food.",
            "Week 2: Grammar - Study basic sentence structure (Subject-Object-Verb) and present tense.",
            "Week 2: Practice - Build simple sentences for daily activities using 20 core verbs.",
            "Week 2: Immersion - Listen to Gujarati nursery rhymes and simple folk stories to catch phonetics.",
            "Week 3: Conversation - Practice 'Ordering Food' and 'Asking Directions' scenarios.",
            "Week 3: Refinement - Master possessive pronouns (maru, taru) and common adjectives.",
            "Week 3: Final Mission - Conduct a 5-minute conversation with a native speaker or language partner.",
            "Final Review: Consolidate all lessons into a personal cheat sheet for long-term retention."
        ],
        "general": [
            "Phase 1: Master the phonetic foundation and alphabet of the target language.",
            "Phase 1: Build a core vocabulary of the 100 most used words.",
            "Phase 2: Study basic Subject-Verb-Object structures and daily greetings.",
            "Phase 2: Implement daily immersion by listening to 15 minutes of local audio.",
            "Phase 3: Conduct simple roleplay scenarios (shopping, introductions).",
            "Phase 3: Use spaced repetition apps to lock in long-term vocabulary retention."
        ]
    },
    "fitness": {
        "5k": [
            "Week 1: Base - Walk 10 mins, Run 1 min (Repeated 6 times) for 3 days a week.",
            "Week 2: Build - Walk 5 mins, Run 2 mins (Repeated 5 times) for 3 days a week.",
            "Week 4: Stamina - Continuous 10-minute run followed by 2 min walk.",
            "Week 6: Push - Continuous 20-minute run at a steady pace.",
            "Week 8: Race - 30-minute steady run covering the full 5km distance.",
            "Recovery: Follow every run day with a mobility and stretching session."
        ],
        "marathon": [
            "Months 1-2: Base Building - Establish a 20-mile weekly average mileage.",
            "Month 3: Strength - Introduce weekly hill repeats and tempo runs.",
            "Month 4: Distance - Weekly long run reaching 18-20 miles.",
            "Month 5: Taper - Reduce mileage by 40% while maintaining intensity.",
            "Race Day: Follow a strict hydration and carbohydrate loading protocol."
        ]
    },
    "skills": {
        "python": [
            "Phase 1: Setup - Install Python 3.x and VS Code with required extensions.",
            "Phase 1: Basics - Master Variables, Data Types (String, Int, List), and Loops.",
            "Phase 2: Logic - Practice Conditionals (If/Else) and Function definitions.",
            "Phase 2: Project - Build a 'Command Line To-Do List' using file I/O operations.",
            "Phase 3: Advanced - Introduction to Classes (OOP) and external libraries like Pandas.",
            "Phase 3: Deployment - Host a simple project on GitHub and document the README."
        ]
    }
}

def get_expert_plan(category, subcategory=None):
    if category in EXPERTS:
        if subcategory and subcategory in EXPERTS[category]:
            return EXPERTS[category][subcategory]
        return EXPERTS[category].get("general", [])
    return None
