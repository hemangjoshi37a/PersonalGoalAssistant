import os
import sys

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

from flask import Flask, render_template, request, jsonify
from main import main
from agent.subtask_generation import generate_subtasks
from agent.input_control import move_mouse_to, press_key, click
from agent.task_execution import perform_subtask

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')
@app.route('/run', methods=['POST'])
def run_agent():
    goal = request.form.get('goal')

    # Generate subtasks
    subtasks = generate_subtasks(f"Generate a list of subtasks for accomplishing the goal: {goal}")

    # Execute the subtasks (replace this with actual execution)
    agent_output = []  # Initialize an empty list for agent output
    for index, subtask in enumerate(subtasks, start=1):
        print(f"Debug: Starting subtask {index}: {subtask}")
        status = perform_subtask(subtask)
        print(f"Debug: Finished subtask {index}: {subtask} - {status}")
        agent_output.append({
            'step': index,
            'action': subtask,
            'status': status
        })

    response = {'result': f'RL agent ran successfully with goal: {goal}', 'agent_output': agent_output, 'subtasks': subtasks}
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)