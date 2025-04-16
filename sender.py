import pandas as pd
import requests
import time
from datetime import datetime

# Load CSV file
df = pd.read_csv('E:\datw\ip_addresses.csv')

# Base URL for Flask server
URL = 'http://localhost:5000/receive'

# Convert timestamp to datetime
df['Timestamp'] = pd.to_datetime(df['Timestamp'], unit='s')

# Sort by timestamp
df = df.sort_values('Timestamp')

# Send packages with simulated delays (since timestamps are identical)
start_time = datetime.now()
for i, row in df.iterrows():
    # Simulate a small delay (e.g., 1 second apart) since timestamps are the same
    time_diff = i * 1.0  # 1 second per row
    elapsed = (datetime.now() - start_time).total_seconds()
    delay = max(0, time_diff - elapsed)
    time.sleep(delay)

    # Prepare JSON payload
    payload = {
        'ip_address': row['ip address'],
        'latitude': row['Latitude'],
        'longitude': row['Longitude'],
        'timestamp': row['Timestamp'].isoformat(),
        'suspicious': int(row['suspicious'])  # Convert 0.0 to 0
    }

    # Send POST request to Flask server
    try:
        response = requests.post(URL, json=payload)
        print(f"Sent package from {row['ip address']} - Status: {response.status_code}")
    except Exception as e:
        print(f"Error sending package: {e}")