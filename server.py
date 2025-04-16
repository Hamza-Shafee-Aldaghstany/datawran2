from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes by default

# Store received packages
traffic_data = []

@app.route('/receive', methods=['POST'])
def receive_package():
    package = request.get_json()
    traffic_data.append(package)
    print(f"Received package from {package['ip_address']}")
    return jsonify({'status': 'success'}), 200

@app.route('/data', methods=['GET'])
def get_data():
    return jsonify(traffic_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)