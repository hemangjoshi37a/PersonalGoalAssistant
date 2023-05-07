# PersonalGoalAssistant

A reinforcement learning-based personal goal assistant that mimics user behavior and operates autonomously to achieve user-defined goals.

![Screenshot from 2023-05-07 17-31-54](https://user-images.githubusercontent.com/12392345/236676233-2f25d830-3aa5-4898-a864-0b8ae6b8bbbe.png)

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

1. Run the Flask web application:
```
python app.py
```

2. Open a web browser and navigate to `http://127.0.0.1:5000/` to access the Personal Goal Assistant interface.

3. Enter a goal in the input field and click "Run RL Agent" to execute the reinforcement learning agent.

The agent will generate subtasks based on the provided goal and execute them using keyboard and mouse actions.

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

## 📫 How to reach me
[<img height="36" src="https://cdn.simpleicons.org/similarweb"/>](https://hjlabs.in/) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/WhatsApp"/>](https://wa.me/917016525813) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/telegram"/>](https://t.me/hjlabs) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/Gmail"/>](mailto:hemangjoshi37a@gmail.com) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/LinkedIn"/>](https://www.linkedin.com/in/hemang-joshi-046746aa) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/facebook"/>](https://www.facebook.com/hemangjoshi37) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/Twitter"/>](https://twitter.com/HemangJ81509525) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/tumblr"/>](https://www.tumblr.com/blog/hemangjoshi37a-blog) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/StackOverflow"/>](https://stackoverflow.com/users/8090050/hemang-joshi) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/Instagram"/>](https://www.instagram.com/hemangjoshi37) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/Pinterest"/>](https://in.pinterest.com/hemangjoshi37a) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/Blogger"/>](http://hemangjoshi.blogspot.com) &nbsp;
[<img height="36" src="https://cdn.simpleicons.org/gitlab"/>](https://gitlab.com/hemangjoshi37a) &nbsp;
