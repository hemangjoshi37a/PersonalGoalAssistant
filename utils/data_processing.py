import os
import pandas as pd

def preprocess_data(data_path, preprocessed_data_path):
    # Read raw data
    raw_data = pd.read_csv(data_path)

    # Preprocess data
    # Add your data preprocessing steps here

    # Save preprocessed data
    raw_data.to_csv(preprocessed_data_path, index=False)

def load_preprocessed_data(preprocessed_data_path):
    return pd.read_csv(preprocessed_data_path)
