from pymilvus import DataType, CollectionSchema, FieldSchema, Collection, connections
import logging

try:
    connections.connect("default", host="localhost", port="19530")
    MILVUS_AVAILABLE = True
except Exception as e:
    logging.warning(f"Could not connect to Milvus: {e}. Using mock mode.")
    MILVUS_AVAILABLE = False

class MockCollection:
    def __init__(self, name, schema=None):
        self.name = name
        self.schema = schema
    def insert(self, data):
        logging.info(f"Mock insert into {self.name}")
        return None
    def load(self):
        logging.info(f"Mock load {self.name}")
        pass

def create_milvus_collection(collection_name, embeddings, vector_dim=128):
    if not MILVUS_AVAILABLE:
        return MockCollection(collection_name)
    
    # Define the primary key field
    primary_key_field = FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True)

    # Define the vector field
    vector_field = FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=vector_dim)

    # Combine fields into a schema
    fields = [primary_key_field, vector_field]
    schema = CollectionSchema(fields=fields, description='User data collection')

    try:
        # Create collection
        collection = Collection(name=collection_name, schema=schema)
        return collection
    except Exception as e:
        logging.error(f"Failed to create collection: {e}")
        return MockCollection(collection_name)

def insert_vectors_to_milvus(collection_name, embeddings):
    if not MILVUS_AVAILABLE:
        logging.info("Milvus unavailable, skipping insert.")
        return
    
    try:
        # Get the Milvus collection
        collection = Collection(name=collection_name)

        # Create a list of primary key values
        # If auto_id=True, you can use an empty list, and Milvus will generate primary key values for you
        primary_key_values = []

        # Insert data into the collection
        mr = collection.insert([primary_key_values, embeddings])
        collection.load()  # Load the collection into memory
    except Exception as e:
        logging.error(f"Failed to insert vectors: {e}")

