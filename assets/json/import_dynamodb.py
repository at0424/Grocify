import boto3
import json
import decimal

TABLE_NAME = 'GroceryCatalog'
JSON_FILE = 'item_seed_data.json'

MY_ACCESS_KEY = 'AKIA6JCHAB6TNETVWYN6'
MY_SECRET_KEY = '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'
MY_REGION = 'ap-southeast-5' 

dynamodb = boto3.resource('dynamodb', region_name=MY_REGION)
table = dynamodb.Table(TABLE_NAME)

dynamodb = boto3.resource(
    'dynamodb',
    region_name=MY_REGION,
    aws_access_key_id=MY_ACCESS_KEY,
    aws_secret_access_key=MY_SECRET_KEY
)

table = dynamodb.Table(TABLE_NAME)

def load_data():
    try:
        # Load the JSON file
        with open(JSON_FILE) as f:
            grocery_list = json.load(f, parse_float=decimal.Decimal)
        
        print(f"Loaded {len(grocery_list)} items. Starting import...")

        # Batch write to DynamoDB
        with table.batch_writer() as batch:
            for item in grocery_list:
                batch.put_item(Item=item)
                print(f"Added: {item['name']}")

        print("\n Import Complete!")

    except Exception as e:
        print(f" Error: {e}")

if __name__ == '__main__':
    load_data()