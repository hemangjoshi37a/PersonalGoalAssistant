from agent.input_control import move_mouse_to, press_key, click

def perform_subtask(subtask):
    # This is a simple example; you should modify the function to execute more complex subtasks
    if "move_mouse_to" in subtask:
        x, y = map(int, subtask.split()[-2:])
        move_mouse_to(x, y)
        return "success"
    elif "press_key" in subtask:
        key = subtask.split()[-1]
        press_key(key)
        return "success"
    elif "click" in subtask:
        click()
        return "success"
    else:
        return "unknown"
