# Remember to replace the sample `host`, `port`, `dim`, and `vectors` values with the 
# actual values for your setup.

from pymilvus import Milvus, DataType, CollectionSchema, FieldSchema

# Initialize Milvus client
milvus = Milvus(host='localhost', port='19530')

# Define collection schema
dim = 768 # Adjust based on your embeddings' dimensions
collection_name = 'user_data'
fields = [
    FieldSchema(name='embedding', dtype=DataType.FLOAT_VECTOR, dim=dim),
]
schema = CollectionSchema(fields=fields, description='User data collection')

# Create collection
milvus.create_collection(collection_name, schema=schema)

# Insert vectors
vectors = [
    # Add your embeddings here
]
ids = milvus.insert(collection_name, [vectors])
milvus.flush([collection_name])
