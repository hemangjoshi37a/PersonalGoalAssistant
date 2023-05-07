import os
import numpy as np
import pandas as pd
import gym

from environments.custom_env import CustomEnv
from models.rl_agent import RLAgent
from utils.data_processing import preprocess_data

def main():
    # Load and preprocess data
    data_path = os.path.join("data", "raw_data.csv")
    preprocessed_data_path = os.path.join("data", "preprocessed", "preprocessed_data.csv")
    preprocess_data(data_path, preprocessed_data_path)

    # Create custom environment
    env = CustomEnv(preprocessed_data_path)

    # Initialize RL agent
    agent = RLAgent(env)

    # Train agent
    agent.train()

    # Set a goal for the agent
    agent.set_goal("Your goal here")

    # Run agent
    agent.run()

if __name__ == "__main__":
    main()