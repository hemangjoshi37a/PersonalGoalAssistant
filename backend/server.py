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
from backend.models import db, Mission, Subtask, Habit, HabitLog, UserStats
from backend.validators import validate_json_schema

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
                mission = Mission(goal=goal, intensity=intensity, status="active")
                db.session.add(mission)
                db.session.commit()
                for task_text in final_subtasks:
                    st = Subtask(mission_id=mission.id, name=task_text, status="pending")
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
            award_xp(50)
    
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"[*] Life Engine online (Vite Proxy: http://localhost:{port})")
    app.run(host='0.0.0.0', port=port, debug=True)
