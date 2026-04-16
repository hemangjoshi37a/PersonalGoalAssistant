import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add project root to sys.path to allow importing from agent, models, etc.
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

# Import agent logic
from agent.subtask_generation import generate_subtasks
from agent.task_execution import perform_subtask

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/run', methods=['POST'])
def run_agent():
    # Handle both JSON and form data
    if request.is_json:
        data = request.get_json()
        goal = data.get('goal')
    else:
        goal = request.form.get('goal')

    if not goal:
        return jsonify({'error': 'No goal provided'}), 400

    print(f"[*] Starting agent with goal: {goal}")

    # Generate subtasks
    subtasks = generate_subtasks(f"Generate a list of subtasks for accomplishing the goal: {goal}")

    # Execute the subtasks
    agent_output = []
    for index, subtask in enumerate(subtasks, start=1):
        print(f"Debug: Starting subtask {index}: {subtask}")
        status = perform_subtask(subtask)
        print(f"Debug: Finished subtask {index}: {subtask} - {status}")
        agent_output.append({
            'step': index,
            'action': subtask,
            'status': status
        })

    response = {
        'result': f'RL agent ran successfully with goal: {goal}',
        'agent_output': agent_output,
        'subtasks': subtasks
    }
    return jsonify(response)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Personal Goal Assistant API is running'})

if __name__ == '__main__':
    # Default port 5000
    port = int(os.environ.get('PORT', 5000))
    print(f"[*] Backend server starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
