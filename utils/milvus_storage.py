from pymilvus import DataType, CollectionSchema, FieldSchema, Collection

def create_milvus_collection(collection_name, embeddings, vector_dim=128):
    # Define the primary key field
    primary_key_field = FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True)

    # Define the vector field
    vector_field = FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=vector_dim)

    # Combine fields into a schema
    fields = [primary_key_field, vector_field]
    schema = CollectionSchema(fields=fields, description='User data collection')

    # Create collection
    collection = Collection(name=collection_name, schema=schema)
    return collection

def insert_vectors_to_milvus(collection_name, embeddings):
    # Get the Milvus collection
    collection = Collection(name=collection_name)

    # Create a list of primary key values
    # If auto_id=True, you can use an empty list, and Milvus will generate primary key values for you
    primary_key_values = []

    # Insert data into the collection
    mr = collection.insert([primary_key_values, embeddings])
    collection.load()  # Load the collection into memory
