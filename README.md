# PersonalGoalAssistant

A reinforcement learning-based personal goal assistant that mimics user behavior and operates autonomously to achieve user-defined goals.

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/PersonalGoalAssistant.git
```

2. Install the required packages:
```
pip install -r requirements.txt
```

## Usage

TBD: Add instructions for using the software


## Data Storage with Milvus

This project uses [Milvus](https://milvus.io/) for storing and managing multi-modal user data in the form of vector embeddings. Milvus is an open-source vector database that supports similarity search and other vector-based operations.

### Setup

1. Make sure you have a running Milvus instance. Follow the [official Milvus installation guide](https://milvus.io/docs/v2.3.0-beta/install_standalone-operator.md) to set up a local Milvus instance using Docker.

2. Install the Milvus Python SDK:

```
pip install pymilvus
```

### Usage

The `utils/milvus_storage.py` file contains functions to create a Milvus collection and insert multi-modal user data as vector embeddings. To store your data in Milvus, follow these steps:

1. Preprocess your data and convert it into appropriate vector embeddings using pre-trained models or custom feature extraction techniques.

2. Use the functions in `utils/milvus_storage.py` to create a Milvus collection and insert the embeddings.

For more information on working with Milvus, refer to the [official Milvus documentation](https://milvus.io/docs/overview.md)