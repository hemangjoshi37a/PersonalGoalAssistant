"""
server.py
Main entry point for the Personal Goal Assistant Flask Backend.
Provides RESTful endpoints for mission planning, execution tracking, and analytics.
"""

import os
import sys
import math
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any, List

from flask import Flask, request, jsonify, Response, abort
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Project Path Calibration
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

# Internal Imports
from agent.subtask_generation import generate_subtasks, generate_subtasks_stream
from agent.task_execution import perform_subtask
from backend.models import db, Mission, Subtask, Habit, HabitLog, UserStats, Gauntlet, GauntletDay, OracleBrief
from backend.validators import validate_json_schema
from backend.utils import extract_json

def create_app() -> Flask:
    """
    Application factory for the Flask server.
    """
    app = Flask(__name__)
    CORS(app)

    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///goals.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = os.environ.get('SQLALCHEMY_TRACK_MODIFICATIONS', 'False').lower() == 'true'

    db.init_app(app)

    with app.app_context():
        db.create_all()

    return app

app = create_app()

@app.errorhandler(Exception)
def handle_exception(e):
    """Global error handler to ensure JSON responses on failure."""
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return jsonify(error=e.name, description=e.description), e.code
    
    print(f"[!] Unhandled Exception: {e}")
    import traceback; traceback.print_exc()
    return jsonify(error="Internal Server Error", description=str(e)), 500

@app.route('/run', methods=['POST'])
@validate_json_schema(expected_types={'goal': str, 'intensity': str, 'persona': str})
def run_agent() -> Tuple[Response, int]:
    """
    Initiates the RL agent to plan and execute a goal.
    Returns:
        JSON response with mission details and agent logs.
    """
    try:
        data = request.get_json()
        goal = data.get('goal')
        intensity = data.get('intensity', 'balanced')
        persona = data.get('persona', 'strategist')

        if not goal:
            return jsonify({'error': 'No goal provided'}), 400

        # Validate intensity and persona values
        valid_intensities = ['blitz', 'balanced', 'mastery']
        valid_personas = ['strategist', 'sergeant', 'zen', 'optimizer']
        if intensity not in valid_intensities:
            intensity = 'balanced'
        if persona not in valid_personas:
            persona = 'strategist'

        print(f"[*] Dispatching mission: {goal} [Intensity: {intensity}, Persona: {persona}]")

        # Persistence Sequence
        new_mission = Mission(goal=goal, intensity=intensity)
        db.session.add(new_mission)
        db.session.commit()

        # Strategic planning via agent
        subtasks_text = generate_subtasks(goal, intensity=intensity, persona=persona)

        # Execution Sequence
        agent_output = []
        for index, task_text in enumerate(subtasks_text, start=1):
            st = Subtask(mission_id=new_mission.id, text=task_text, order=index)
            db.session.add(st)
            
            # Simulated RL Execution
            status = perform_subtask(task_text)
            agent_output.append({
                'step': index,
                'action': task_text,
                'status': status
            })
        
        db.session.commit()

        return jsonify({
            'mission_id': new_mission.id,
            'result': f'Strategic objectives for "{goal}" crystallized.',
            'agent_output': agent_output,
            'subtasks': new_mission.to_dict()['subtasks']
        }), 200

    except Exception as e:
        print(f"Error during agent run: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/run/stream', methods=['POST'])
@validate_json_schema(expected_types={'goal': str, 'intensity': str, 'persona': str})
def run_agent_stream():
    """
    Initiates the RL agent and streams the output via Server-Sent Events.
    """
    data = request.get_json()
    goal = data.get('goal')
    intensity = data.get('intensity', 'balanced')
    persona = data.get('persona', 'strategist')

    if not goal:
        return jsonify({'error': 'No goal provided'}), 400

    def generate():
        final_subtasks = None
        for chunk in generate_subtasks_stream(goal, intensity, persona):
            yield chunk
            if "final_subtasks" in chunk:
                try:
                    import json
                    data_str = chunk.replace("data: ", "").strip()
                    parsed = json.loads(data_str)
                    if "final_subtasks" in parsed:
                        final_subtasks = parsed["final_subtasks"]
                except Exception as e:
                    print("Stream parse error:", e)
        
        # Save to DB inside application context after stream generation
        if final_subtasks:
            with app.app_context():
                mission = Mission(goal=goal, intensity=intensity)
                db.session.add(mission)
                db.session.commit()
                for i, task_text in enumerate(final_subtasks, 1):
                    st = Subtask(mission_id=mission.id, text=task_text, order=i)
                    db.session.add(st)
                db.session.commit()

    return Response(generate(), mimetype='text/event-stream')

# --- Mission Control ---

@app.route('/missions', methods=['GET'])
def get_missions() -> Response:
    """
    Retrieves historical mission telemetry.
    """
    missions = Mission.query.order_by(Mission.timestamp.desc()).all()
    return jsonify([m.to_dict() for m in missions])

@app.route('/missions/<int:mission_id>/complete', methods=['PATCH'])
def complete_mission(mission_id: int) -> Response:
    """
    Marks an entire mission as completed and awards bonus XP.
    """
    mission = db.session.get(Mission, mission_id)
    if not mission:
        abort(404, description="Mission not found")
    
    if not mission.is_completed:
        mission.is_completed = True
        award_xp(200)  # Bonus XP for completing entire mission
    
    db.session.commit()
    return jsonify({
        'success': True,
        'mission': mission.to_dict(),
        'userStats': UserStats.query.first().to_dict()
    })

def award_xp(amount: int):
    """Awards XP to the user, creating the stats record if it doesn't exist."""
    stats = UserStats.query.first()
    if not stats:
        stats = UserStats(xp=0)
        db.session.add(stats)
    stats.xp += amount
    db.session.commit()

@app.route('/user/stats', methods=['GET'])
def get_user_stats() -> Response:
    """Retrieves current mastery stats."""
    stats = UserStats.query.first()
    if not stats:
        stats = UserStats(xp=0)
        db.session.add(stats)
        db.session.commit()
    return jsonify(stats.to_dict())

@app.route('/subtasks/<int:subtask_id>', methods=['PATCH'])
def update_subtask(subtask_id: int) -> Response:
    """
    Updates the completion state of a specific subtask and awards XP.
    """
    data = request.get_json()
    if not data:
        abort(400, description="Request body required")

    # Fix: Use session.get() instead of deprecated query.get_or_404()
    subtask = db.session.get(Subtask, subtask_id)
    if not subtask:
        abort(404, description="Subtask not found")
    
    if 'is_completed' in data:
        was_completed = subtask.is_completed
        subtask.is_completed = bool(data['is_completed'])
        
        # Award XP if transitioning from Incomplete to Complete
        if not was_completed and subtask.is_completed:
            subtask.completed_at = datetime.utcnow()
            award_xp(50)
        elif was_completed and not subtask.is_completed:
            subtask.completed_at = None
    
    db.session.commit()

    # Check if all subtasks for this mission are done → auto-complete mission
    mission = db.session.get(Mission, subtask.mission_id)
    if mission and all(st.is_completed for st in mission.subtasks) and not mission.is_completed:
        mission.is_completed = True
        award_xp(200)
        db.session.commit()

    stats = UserStats.query.first()
    return jsonify({
        'success': True, 
        'subtask': subtask.to_dict(),
        'userStats': stats.to_dict() if stats else {}
    })

@app.route('/analytics/stats', methods=['GET'])
def get_analytics_stats() -> Response:
    """
    Aggregates performance metrics across all missions.
    """
    total = Mission.query.count()
    completed = Mission.query.filter_by(is_completed=True).count()
    
    success_rate = (completed / total * 100) if total > 0 else 0
    
    return jsonify({
        'totalMissions': total,
        'completedMissions': completed,
        'successRate': round(success_rate, 1),
        'distribution': {
            'blitz': Mission.query.filter_by(intensity='blitz').count(),
            'balanced': Mission.query.filter_by(intensity='balanced').count(),
            'mastery': Mission.query.filter_by(intensity='mastery').count()
        }
    })

@app.route('/analytics/topology', methods=['GET'])
def get_topology() -> Response:
    """
    Generates a graph-based representation of mission networks.
    """
    missions = Mission.query.order_by(Mission.timestamp.desc()).limit(10).all()
    nodes = []
    links = []
    
    for m in missions:
        m_id = f"m_{m.id}"
        nodes.append({
            'id': m_id,
            'label': m.goal,
            'type': 'mission',
            'intensity': m.intensity,
            'completed': m.is_completed
        })
        
        for st in m.subtasks:
            st_id = f"st_{st.id}"
            nodes.append({'id': st_id, 'label': st.text, 'type': 'subtask', 'completed': st.is_completed})
            links.append({'source': m_id, 'target': st_id})
            
    return jsonify({'nodes': nodes, 'links': links})

@app.route('/health', methods=['GET'])
def health_check() -> Response:
    """
    System health diagnostics.
    """
    return jsonify({'status': 'healthy', 'message': 'API v2.2.0 Operational'})

# --- Quantum Forge ---

@app.route('/forge/habits', methods=['GET', 'POST'])
@validate_json_schema(expected_types={'name': str, 'cue': str, 'frequency': str})
def handle_habits() -> Response:
    if request.method == 'POST':
        data = request.json
        name = data.get('name', '').strip() if data else ''
        if not name:
            return jsonify({'error': 'Habit name is required'}), 400
        new_habit = Habit(
            name=name,
            cue=data.get('cue', '').strip() or None,
            frequency=data.get('frequency', 'daily')
        )
        db.session.add(new_habit)
        db.session.commit()
        return jsonify({'success': True, 'habit': new_habit.to_dict()})
    
    return jsonify([h.to_dict() for h in Habit.query.order_by(Habit.created_at.desc()).all()])

@app.route('/forge/habits/<int:habit_id>', methods=['DELETE'])
def delete_habit(habit_id: int) -> Response:
    """Deletes a habit and all its logs."""
    habit = db.session.get(Habit, habit_id)
    if not habit:
        abort(404, description="Habit not found")
    db.session.delete(habit)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/forge/log', methods=['POST'])
@validate_json_schema(required_fields=['habit_id'], expected_types={'habit_id': int, 'status': str})
def log_habit() -> Response:
    """Records a habit completion and awards XP."""
    data = request.json

    # Fix: Validate that habit_id is a valid integer
    try:
        habit_id = int(data.get('habit_id'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid habit_id — must be an integer'}), 400

    status = data.get('status', 'completed')

    habit = db.session.get(Habit, habit_id)
    if not habit:
        abort(404, description="Habit not found")

    new_log = HabitLog(habit_id=habit.id, status=status)
    db.session.add(new_log)
    
    if status == 'completed':
        award_xp(25)
        
    db.session.commit()

    stats = UserStats.query.first()
    return jsonify({
        'success': True,
        'log': new_log.to_dict(),
        'userStats': stats.to_dict() if stats else {}
    })

@app.route('/forge/predict', methods=['GET'])
def predict_habits() -> Response:
    """Generates projections for habits based on recent activity (last 7 days)."""
    habits = Habit.query.all()
    projections = []
    
    cutoff = datetime.utcnow() - timedelta(days=7)

    for h in habits:
        # Count logs in the last 7 days for recency-weighted consistency
        recent_logs = [l for l in h.logs if l.timestamp >= cutoff and l.status == 'completed']
        total_logs = len([l for l in h.logs if l.status == 'completed'])
        
        # Consistency: percentage of last 7 days covered
        days_active = len(set(l.timestamp.date() for l in recent_logs))
        consistency = min(100, round(days_active / 7 * 100))

        # Streak: consecutive days from today backwards
        streak = _calculate_streak(h.logs)

        if consistency >= 71:
            persona = 'Elite Executor'
            prediction_30 = f"At this velocity, expect {min(100, consistency + 10)}% mastery in 30 days. Consistency is your superpower."
            prediction_365 = "Full behavioral integration predicted within 3 months. You're building an identity, not just a habit."
        elif consistency >= 43:
            persona = 'Strategist'
            prediction_30 = f"Projected to reach {min(100, consistency + 15)}% consistency in 30 days with daily commitment."
            prediction_365 = "Strong momentum. Expect compounding returns in performance and mental clarity by Q3."
        else:
            persona = 'Novice'
            prediction_30 = f"Currently at {consistency}% weekly coverage. Adding 1 more session this week doubles your momentum."
            prediction_365 = "Early stage. Focus on removing friction — habit stacking and environment design will accelerate gains."
        
        projections.append({
            'habit': h.name,
            'persona': persona,
            'consistency': consistency,
            'streak': streak,
            'totalLogs': total_logs,
            'prediction30Days': prediction_30,
            'prediction365Days': prediction_365
        })
        
    return jsonify({'projections': projections})

def _calculate_streak(logs: list) -> int:
    """Calculates the current consecutive-day streak for a list of HabitLogs."""
    completed_dates = sorted(
        set(l.timestamp.date() for l in logs if l.status == 'completed'),
        reverse=True
    )
    if not completed_dates:
        return 0

    today = datetime.utcnow().date()
    streak = 0
    expected = today

    for d in completed_dates:
        if d == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif d == today - timedelta(days=1) and streak == 0:
            # Allow streak to start from yesterday
            streak += 1
            expected = d - timedelta(days=1)
        else:
            break

    return streak

@app.route('/analytics/aura', methods=['GET'])
def get_aura_analytics() -> Response:
    """Calculates the user's personality aura based on mission data."""
    missions = Mission.query.all()
    if not missions:
        return jsonify({
            'type': 'Neutral Entity',
            'color': 'hsla(220, 20%, 60%, 0.5)',
            'description': 'Awaiting mission data to crystallize your aura. Launch your first mission to begin.',
            'stats': {'blitz': 0, 'balanced': 0, 'mastery': 0}
        })
    
    blitz = Mission.query.filter_by(intensity='blitz').count()
    balanced = Mission.query.filter_by(intensity='balanced').count()
    mastery = Mission.query.filter_by(intensity='mastery').count()
    
    total = len(missions)
    
    # Logic to determine aura type
    if blitz > balanced and blitz > mastery:
        aura_type = "Sonic Catalyst"
        color = "hsla(190, 100%, 50%, 0.6)"  # Cyan
        desc = "Your energy is fast and decisive. You thrive in high-velocity execution and rapid iteration."
    elif mastery > balanced and mastery > blitz:
        aura_type = "Eternal Architect"
        color = "hsla(280, 100%, 70%, 0.6)"  # Purple
        desc = "You seek depth and perfection. Your growth is structured, deliberate, and immutable."
    elif balanced >= blitz and balanced >= mastery:
        aura_type = "Harmonic Warden"
        color = "hsla(140, 60%, 50%, 0.6)"  # Green
        desc = "You maintain a perfect equilibrium between speed and quality. Consistency is your edge."
    else:
        aura_type = "Rising Strategist"
        color = "hsla(40, 90%, 60%, 0.6)"   # Gold
        desc = "Your pattern is still forming. Every mission refines your unique resonance signature."
        
    return jsonify({
        'type': aura_type,
        'color': color,
        'description': desc,
        'stats': {
            'blitz': round(blitz / total * 100) if total else 0,
            'balanced': round(balanced / total * 100) if total else 0,
            'mastery': round(mastery / total * 100) if total else 0
        }
    })

@app.route('/analytics/knowledge', methods=['GET'])
def get_knowledge_graph() -> Response:
    """Returns the expert knowledge base formatted for 3D graph visualization."""
    from agent.knowledge_base import EXPERTS
    
    nodes = []
    links = []
    
    # Root Node
    nodes.append({"id": "EKB", "label": "Expert Knowledge", "type": "root", "color": "#00d2ff"})
    
    for category, subcats in EXPERTS.items():
        cat_id = f"cat_{category}"
        nodes.append({"id": cat_id, "label": category.upper(), "type": "category", "color": "#bf9eff"})
        links.append({"source": "EKB", "target": cat_id})
        
        for subcat, steps in subcats.items():
            sub_id = f"sub_{category}_{subcat}"
            nodes.append({"id": sub_id, "label": subcat.replace('_', ' ').title(), "type": "subcategory", "color": "#00d2ff"})
            links.append({"source": cat_id, "target": sub_id})
            
            # Limit steps to avoid clutter, show first 3 as sub-nodes
            for i, step in enumerate(steps[:3]):
                step_id = f"step_{category}_{subcat}_{i}"
                nodes.append({"id": step_id, "label": f"Step {i+1}", "type": "step", "color": "#ffffff", "full_text": step})
                links.append({"source": sub_id, "target": step_id})
                
    return jsonify({"nodes": nodes, "links": links})

@app.route('/chronos/schedule', methods=['GET'])
def get_chronos_schedule() -> Response:
    """
    Generates a dynamic daily schedule based on real time of day and active missions.
    Falls back to an optimized template if no missions exist.
    """
    now = datetime.utcnow()
    current_hour = now.hour

    # Fetch most recent active mission subtasks for context
    recent_mission = Mission.query.filter_by(is_completed=False).order_by(Mission.timestamp.desc()).first()

    # Build a dynamic schedule anchored to current time
    def _time_str(hour: int, minute: int = 0) -> str:
        return f"{hour:02d}:{minute:02d}"

    # Template blocks: (hour_offset, task_name, intensity, base_status)
    BLOCKS = [
        (0,  "Morning Priming & Intention Setting", 0.3),
        (1,  "Deep Work Session I",                 0.9),
        (3,  "Active Recovery & Nutrition",          0.2),
        (5,  "Skill Engraving Block",               0.7),
        (7,  "Mission Review & Progress Log",        0.5),
        (9,  "Evening Wind-Down & Rest Sync",        0.1),
    ]

    # Anchor start to a sensible morning hour (8 AM if current is night, else now)
    start_hour = 8 if current_hour < 6 or current_hour > 22 else current_hour

    schedule = []
    for i, (offset, default_task, intensity) in enumerate(BLOCKS):
        block_hour = (start_hour + offset) % 24
        task_name = default_task

        # Inject real mission subtask names into the deep-work slots
        if recent_mission and i == 1 and recent_mission.subtasks:
            pending = [st for st in recent_mission.subtasks if not st.is_completed]
            if pending:
                task_name = pending[0].text[:50] + ('...' if len(pending[0].text) > 50 else '')

        # Determine status relative to current time
        if block_hour < current_hour:
            status = 'completed'
        elif block_hour == current_hour:
            status = 'active'
        else:
            status = 'pending'

        schedule.append({
            "time": _time_str(block_hour),
            "task": task_name,
            "intensity": intensity,
            "status": status
        })

    # Calculate efficiency based on completed blocks
    completed_count = sum(1 for s in schedule if s['status'] == 'completed')
    total_count = len(schedule)
    efficiency = round((completed_count / total_count * 100) if total_count > 0 else 75)

    return jsonify({
        "day": f"Cycle {now.strftime('%d')}",
        "efficiency": max(efficiency, 10),  # Minimum 10% to avoid empty display
        "currentMission": recent_mission.goal if recent_mission else None,
        "schedule": schedule
    })


# ────────────────────────────────────────────
# MOMENTUM MATRIX — Activity Heatmap
# ────────────────────────────────────────────

@app.route('/analytics/heatmap', methods=['GET'])
def get_heatmap() -> Response:
    """
    Returns daily activity counts for the last 90 days.
    Combines subtask completions + habit log completions per calendar day.
    """
    from sqlalchemy import func, cast, Date

    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=89)

    # Subtask completions by day
    subtask_counts = (
        db.session.query(
            func.date(Subtask.completed_at).label('day'),
            func.count(Subtask.id).label('cnt')
        )
        .filter(
            Subtask.is_completed == True,
            Subtask.completed_at >= datetime.combine(start_date, datetime.min.time())
        )
        .group_by(func.date(Subtask.completed_at))
        .all()
    )

    # Habit completions by day
    habit_counts = (
        db.session.query(
            func.date(HabitLog.timestamp).label('day'),
            func.count(HabitLog.id).label('cnt')
        )
        .filter(
            HabitLog.status == 'completed',
            HabitLog.timestamp >= datetime.combine(start_date, datetime.min.time())
        )
        .group_by(func.date(HabitLog.timestamp))
        .all()
    )

    # Gauntlet completions by day
    gauntlet_counts = (
        db.session.query(
            func.date(GauntletDay.completed_at).label('day'),
            func.count(GauntletDay.id).label('cnt')
        )
        .filter(
            GauntletDay.is_completed == True,
            GauntletDay.completed_at >= datetime.combine(start_date, datetime.min.time())
        )
        .group_by(func.date(GauntletDay.completed_at))
        .all()
    )

    # Merge counts
    day_map: Dict[str, int] = {}
    for row in subtask_counts:
        day_map[str(row.day)] = day_map.get(str(row.day), 0) + row.cnt
    for row in habit_counts:
        day_map[str(row.day)] = day_map.get(str(row.day), 0) + row.cnt
    for row in gauntlet_counts:
        day_map[str(row.day)] = day_map.get(str(row.day), 0) + row.cnt

    # Fill all 90 days (zero-count days included)
    result = []
    for i in range(90):
        d = (start_date + timedelta(days=i)).isoformat()
        result.append({'date': d, 'count': day_map.get(d, 0)})

    return jsonify(result)


# ────────────────────────────────────────────
# ORACLE FEED — AI Daily Briefing (SSE)
# ────────────────────────────────────────────

@app.route('/oracle/brief', methods=['POST'])
def oracle_brief() -> Response:
    """
    Generates and streams a personalized daily mission brief using the AI.
    Checks for an existing brief for today before generating.
    """
    import json as _json
    now = datetime.utcnow()
    today = now.date()
    hour = now.hour
    time_of_day = "morning" if hour < 12 else ("afternoon" if hour < 17 else "evening")

    # Check persistence first
    existing = OracleBrief.query.filter_by(date=today).first()
    if existing:
        def stream_existing():
            yield f"data: {_json.dumps({'text': existing.content})}\n\n"
            yield f"data: {_json.dumps({'done': True})}\n\n"
        return Response(stream_existing(), mimetype='text/event-stream')

    # Gather context: active missions + pending subtasks
    active_missions = Mission.query.filter_by(is_completed=False).order_by(Mission.timestamp.desc()).limit(3).all()
    active_habits = Habit.query.order_by(Habit.created_at.desc()).limit(5).all()

    mission_context = ""
    for m in active_missions:
        pending = [st.text for st in m.subtasks if not st.is_completed][:3]
        mission_context += f"\n• Mission: {m.goal}\n  Pending steps: {', '.join(pending) if pending else 'All complete'}"

    habit_context = ", ".join(h.name for h in active_habits) if active_habits else "No habits tracked yet"

    prompt = (
        f"You are Oracle, an elite AI life coach. Generate a personalized daily mission brief for this {time_of_day}.\n\n"
        f"Active Missions:{mission_context if mission_context else chr(10) + '  No active missions yet.'}\n"
        f"Tracked Habits: {habit_context}\n\n"
        "Format your response as:\n"
        "DAILY BRIEF — [DATE]\n\n"
        "FOCUS DIRECTIVE\n[2 sentence priority focus]\n\n"
        "TOP 3 ACTIONS\n1. [Action]\n2. [Action]\n3. [Action]\n\n"
        "ORACLE INSIGHT\n[1 powerful motivational insight specific to their missions]\n\n"
        "Keep the tone sharp, energetic, and military-precise. Max 200 words."
    )

    def generate():
        try:
            import google.generativeai as genai
            genai.configure(api_key=os.environ.get('GEMINI_API_KEY', ''))
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt, stream=True)
            full_text = ""
            for chunk in response:
                if chunk.text:
                    full_text += chunk.text
                    data = _json.dumps({'text': chunk.text})
                    yield f"data: {data}\n\n"
            
            # Persist after full generation
            if full_text:
                with app.app_context():
                    new_brief = OracleBrief(date=today, content=full_text)
                    db.session.add(new_brief)
                    db.session.commit()

            yield f"data: {_json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {_json.dumps({'error': str(e), 'done': True})}\n\n"

    return Response(generate(), mimetype='text/event-stream')


# ────────────────────────────────────────────
# GAUNTLET PROTOCOL — Multi-Day Challenge Mode
# ────────────────────────────────────────────

@app.route('/gauntlet/generate', methods=['POST'])
def gauntlet_generate() -> Response:
    """
    Generates a structured N-day challenge plan using the AI and saves it.
    """
    import json as _json
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    goal = data.get('goal', '').strip()
    duration = int(data.get('duration', 7))

    if not goal:
        return jsonify({'error': 'Goal is required'}), 400
    if duration not in [7, 14, 30]:
        duration = 7

    try:
        import google.generativeai as genai
        genai.configure(api_key=os.environ.get('GEMINI_API_KEY', ''))
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = (
            f"You are a elite personal coach. Create a precise {duration}-day challenge plan for this goal: \"{goal}\".\n\n"
            f"Return ONLY a valid JSON array with exactly {duration} objects, each with:\n"
            f"- \"day\": integer (1 to {duration})\n"
            f"- \"task\": string (1 specific, actionable task for that day, max 100 chars)\n\n"
            f"Example format: [{{'day': 1, 'task': 'Define your baseline...'}}]\n"
            f"No markdown, no explanation, just the JSON array."
        )

        response = model.generate_content(prompt)
        days_data = extract_json(response.text)

        # Save to DB
        gauntlet = Gauntlet(goal=goal, duration=duration)
        db.session.add(gauntlet)
        db.session.flush()

        for item in days_data[:duration]:
            day = GauntletDay(
                gauntlet_id=gauntlet.id,
                day_number=int(item.get('day', 1)),
                task_text=str(item.get('task', ''))
            )
            db.session.add(day)

        db.session.commit()
        return jsonify({'success': True, 'gauntlet': gauntlet.to_dict()})

    except Exception as e:
        db.session.rollback()
        print(f"[!] Gauntlet generation error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/gauntlet/list', methods=['GET'])
def gauntlet_list() -> Response:
    """Returns all gauntlets ordered newest first."""
    gauntlets = Gauntlet.query.order_by(Gauntlet.created_at.desc()).all()
    return jsonify([g.to_dict() for g in gauntlets])


@app.route('/gauntlet/<int:gauntlet_id>/day/<int:day_id>', methods=['PATCH'])
def gauntlet_complete_day(gauntlet_id: int, day_id: int) -> Response:
    """Marks a single gauntlet day as completed and awards XP."""
    day = db.session.get(GauntletDay, day_id)
    if not day or day.gauntlet_id != gauntlet_id:
        abort(404, description="Gauntlet day not found")

    if not day.is_completed:
        day.is_completed = True
        day.completed_at = datetime.utcnow()
        award_xp(30)

    db.session.commit()
    gauntlet = db.session.get(Gauntlet, gauntlet_id)
    stats = UserStats.query.first()
    return jsonify({
        'success': True,
        'gauntlet': gauntlet.to_dict(),
        'userStats': stats.to_dict() if stats else {}
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"[*] Life Engine online (Vite Proxy: http://localhost:{port})")
    app.run(host='0.0.0.0', port=port, debug=True)
