import os
import sys

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

from flask import Flask, render_template, request, jsonify
from main import main
from agent.subtask_generation import generate_subtasks
from agent.input_control import move_mouse_to, press_key, click

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/run', methods=['POST'])
def run_agent():
    goal = request.form.get('goal')
    # Generate subtasks
    subtasks = generate_subtasks(goal)
    print(f'{subtasks=}')

    agent_output = []

    for i, subtask in enumerate(subtasks):
        # Perform the actions based on the subtask (example)
        if 'move_mouse' in subtask:
            move_mouse_to(100, 100)  # Replace with actual x, y values
            agent_output.append({'step': i + 1, 'action': 'move_mouse', 'status': 'success'})

        elif 'press_key' in subtask:
            press_key('a')  # Replace with the actual key
            agent_output.append({'step': i + 1, 'action': 'press_key', 'status': 'success'})

        elif 'click' in subtask:
            click()  # Perform a mouse click
            agent_output.append({'step': i + 1, 'action': 'click', 'status': 'success'})

    response = {'result': f'RL agent ran successfully with goal: {goal}', 'agent_output': agent_output}
    return jsonify(response)



if __name__ == '__main__':
    app.run(debug=True)



