import boto3
import re
from botocore.exceptions import ClientError
from decimal import Decimal

# --- CONFIGURATION ---
AWS_ACCESS_KEY = "AKIA6JCHAB6TNETVWYN6"
AWS_SECRET_KEY = "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"
REGION = "ap-southeast-5" 
TABLE_NAME = "GroceryCatalog"

def parse_shelf_life(value):
    """Converts '1 Year' -> 365, '2 Weeks' -> 14"""
    # If it's already a number, skip
    if isinstance(value, (int, float, Decimal)):
        return None
        
    val_str = str(value).lower().strip()
    
    # Extract number
    match = re.search(r'\d+', val_str)
    if not match:
        return 7 
        
    number = int(match.group())
    
    if 'year' in val_str:
        return number * 365
    elif 'month' in val_str:
        return number * 30
    elif 'week' in val_str:
        return number * 7
    else:
        return number # Assume days if no unit

def fix_data():
    session = boto3.Session(
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=REGION
    )
    
    dynamodb = session.resource('dynamodb')
    table = dynamodb.Table(TABLE_NAME)

    print(f"🚀 Scanning table: {TABLE_NAME}...")
    
    # Scan table
    response = table.scan()
    items = response.get('Items', [])
    
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response.get('Items', []))

    print(f"Found {len(items)} items. Checking shelfLife...")

    updated_count = 0
    
    for item in items:
        # Get Key Values
        cat_val = item.get('category')
        name_val = item.get('name')
        current_shelf_life = item.get('shelfLife')
        
        # Calculate new integer value
        new_val = parse_shelf_life(current_shelf_life)
        
        # Only update if it's currently a string (parse returned a number)
        if new_val is not None:
            try:
                print(f"🔧 Fixing '{name_val}': '{current_shelf_life}' -> {new_val}")
                
                table.update_item(
                    # ⚠️ CRITICAL: Must use BOTH keys
                    Key={
                        'category': cat_val,
                        'name': name_val
                    },
                    UpdateExpression="set shelfLife = :val",
                    ExpressionAttributeValues={
                        ':val': new_val
                    }
                )
                updated_count += 1
            except ClientError as e:
                print(f"❌ Error updating {name_val}: {e}")

    print("\n" + "="*40)
    print(f"✅ COMPLETE! Updated {updated_count} items to Integers.")

if __name__ == "__main__":
    fix_data()