from flask import request, jsonify
from functools import wraps

def validate_json_schema(required_fields=None, expected_types=None):
    """
    Decorator to validate incoming JSON requests.
    - required_fields: List of strings (e.g., ['goal', 'intensity'])
    - expected_types: Dict mapping fields to expected Python types (e.g., {'habit_id': int})
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'Request must be JSON'}), 400
            
            data = request.get_json()
            if data is None:
                return jsonify({'error': 'Invalid JSON payload'}), 400

            if required_fields:
                missing = [field for field in required_fields if field not in data]
                if missing:
                    return jsonify({'error': f'Missing required fields: {", ".join(missing)}'}), 400

            if expected_types:
                for field, expected_type in expected_types.items():
                    if field in data:
                        value = data[field]
                        try:
                            # Allow casting from string if needed, or strictly enforce type
                            if expected_type == int:
                                data[field] = int(value)
                            elif expected_type == float:
                                data[field] = float(value)
                            elif expected_type == bool:
                                if str(value).lower() in ['true', '1', 'yes']: data[field] = True
                                elif str(value).lower() in ['false', '0', 'no']: data[field] = False
                                else: data[field] = bool(value)
                            elif expected_type == str:
                                data[field] = str(value)
                        except (ValueError, TypeError):
                            return jsonify({'error': f'Invalid type for {field}. Expected {expected_type.__name__}.'}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
