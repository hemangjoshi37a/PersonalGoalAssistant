import os
import numpy as np
import pandas as pd
import gym

from environments.custom_env import CustomEnv
from models.rl_agent import RLAgent
from utils.data_processing import preprocess_data, load_preprocessed_data, generate_embeddings
from utils.milvus_storage import create_milvus_collection, insert_vectors_to_milvus

from agent.input_control import move_mouse_to, press_key
from agent.screen_capture import capture_screen
from agent.subtask_generation import generate_subtasks
from agent.real_world_actions import perform_real_world_actions

# Your reinforcement learning agent's code here
def run_agent(agent, env, goal, subtask_generation_func):
    # Generate subtasks from the main goal
    subtasks = subtask_generation_func(goal)
    
    # For each subtask, interact with the environment to train the agent
    for subtask in subtasks:
        print(f"Current subtask: {subtask}")
        state = env.reset(subtask)
        done = False
        
        while not done:
            # Agent selects action based on the current state
            action = agent.select_action(state)
            
            # Perform action and get the next state, reward, and whether the subtask is completed
            next_state, reward, done, _ = env.step(action)
            
            # Agent learns from the transition (state, action, reward, next_state)
            agent.learn(state, action, reward, next_state)
            
            # Update the state for the next iteration
            state = next_state
    
    # After training, use the learned policy to perform actions in the real world
    perform_real_world_actions(agent)


def main():
    # Load and preprocess data
    data_path = os.path.join("data", "raw_data.csv")
    preprocessed_data_path = os.path.join("data", "preprocessed", "preprocessed_data.csv")
    preprocess_data(data_path, preprocessed_data_path)

    # Load preprocessed data
    preprocessed_data = load_preprocessed_data(preprocessed_data_path)

    # Generate embeddings for the data
    embeddings = generate_embeddings(preprocessed_data)

    # Create a Milvus collection and insert embeddings
    collection_name = "user_data"
    create_milvus_collection(collection_name, embeddings)
    insert_vectors_to_milvus(collection_name, embeddings)

    # Create custom environment
    env = CustomEnv(preprocessed_data)

    # Initialize RL agent
    agent = RLAgent(env)

    # Train agent
    agent.train()

    # Set a goal for the agent
    agent.set_goal("Your goal here")

    # With these lines:
    goal = "Your goal here"
    run_agent(agent, env, goal, generate_subtasks)

if __name__ == "__main__":
    main()
