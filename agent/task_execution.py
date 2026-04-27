import time

def perform_subtask(subtask):
    """
    Simulates the execution of a subtask.
    In a true industry-level setup, this would either dispatch to a worker queue
    or await a user's confirmation of completion.
    """
    # Simulate processing time safely without locking the OS or moving the mouse
    time.sleep(0.5)
    
    # Return a simulated success status
    return "completed_simulation"
