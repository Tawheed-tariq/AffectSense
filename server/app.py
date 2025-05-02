# app.py
import os
import cv2
import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import pandas as pd
import numpy as np
from datetime import datetime
import sqlite3
import base64
from flask import Flask, request, jsonify, Response, send_file
from flask_cors import CORS
import threading
import time
import json
import io

# Import your model components
from models.resnet_emotion import EmotionResNet
from config import load_config

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load configuration and model
cfg = load_config()
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = EmotionResNet(num_classes=cfg['training']['num_classes'], pretrained=cfg['training']['pretrained']).to(device)
checkpoint = torch.load(cfg['test']['ckpt'], map_location=device)
model.load_state_dict(checkpoint['model_state_dict'])
model.eval()

# Set up transformation pipeline
transform = transforms.Compose([
    transforms.Resize((cfg['training']['image_size'], cfg['training']['image_size'])),
    transforms.Grayscale(num_output_channels=3) if cfg['training']['grayscale'] else transforms.Lambda(lambda x: x),
    transforms.ToTensor(),
    transforms.Normalize([0.5], [0.5])
])

class_names = cfg['dataset']['class_names']

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect('emotions.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS emotion_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        angry REAL,
        disgust REAL,
        fear REAL,
        happy REAL,
        sad REAL,
        surprise REAL,
        neutral REAL,
        predicted_class TEXT
    )
    ''')
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT,
        end_time TEXT,
        name TEXT
    )
    ''')
    conn.commit()
    conn.close()

init_db()

# Global variables for session management
current_session_id = None
emotion_buffer = []
BUFFER_SIZE = 10  # Number of readings to buffer before database write

# Session management
@app.route('/api/session/start', methods=['POST'])
def start_session():
    global current_session_id
    data = request.json
    session_name = data.get('name', f'Session {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    
    conn = sqlite3.connect('emotions.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sessions (start_time, name) VALUES (?, ?)",
        (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), session_name)
    )
    conn.commit()
    current_session_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'session_id': current_session_id})

@app.route('/api/session/end', methods=['POST'])
def end_session():
    global current_session_id
    if current_session_id:
        conn = sqlite3.connect('emotions.db')
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE sessions SET end_time = ? WHERE id = ?",
            (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), current_session_id)
        )
        conn.commit()
        conn.close()
        session_id = current_session_id
        current_session_id = None
        return jsonify({'ended_session_id': session_id})
    return jsonify({'error': 'No active session'}), 400

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    conn = sqlite3.connect('emotions.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions ORDER BY start_time DESC")
    sessions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(sessions)

# Function to process a frame and get emotion predictions
def process_frame(frame):
    try:
        # Convert frame to PIL Image
        image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        # Apply transformations and run inference
        image_tensor = transform(image).unsqueeze(0).to(device)
        with torch.no_grad():
            output = model(image_tensor)
            probs = F.softmax(output, dim=1)
            confidence, pred = torch.max(probs, dim=1)
        
        # Get prediction class and probabilities
        pred_class = class_names[pred.item()]
        probabilities = {class_names[i]: float(probs[0][i].item()) for i in range(len(class_names))}
        
        # Add timestamp and predicted class
        result = {
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            **probabilities,
            'predicted_class': pred_class
        }
        
        # Save to database if session is active
        if current_session_id:
            emotion_buffer.append(result)
            if len(emotion_buffer) >= BUFFER_SIZE:
                save_emotions_to_db()
        
        return result
    except Exception as e:
        print(f"Error processing frame: {e}")
        return None

def save_emotions_to_db():
    global emotion_buffer
    if not emotion_buffer:
        return
    
    conn = sqlite3.connect('emotions.db')
    cursor = conn.cursor()
    for emotion in emotion_buffer:
        cursor.execute(
            "INSERT INTO emotion_records (timestamp, angry, disgust, fear, happy, sad, surprise, neutral, predicted_class) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                emotion['timestamp'],
                emotion['Angry'],
                emotion['Disgust'],
                emotion['Fear'],
                emotion['Happy'],
                emotion['Sad'],
                emotion['Surprise'],
                emotion['Neutral'],
                emotion['predicted_class']
            )
        )
    conn.commit()
    conn.close()
    emotion_buffer = []

@app.route('/api/process_frame', methods=['POST'])
def api_process_frame():
    if 'image' not in request.json:
        return jsonify({'error': 'No image data provided'}), 400
    
    try:
        # Decode the base64 image
        print("Received image data")
        print(request.json['image'])
        image_data = request.json['image'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        # Convert to numpy array
        print("Decoding image data")
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Process the frame
        print("Processing frame")
        result = process_frame(frame)
        if result:
            return jsonify(result)
        else:
            return jsonify({'error': 'Failed to process frame'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/session/<int:session_id>/export', methods=['GET'])
def export_session_data(session_id):
    try:
        conn = sqlite3.connect('emotions.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get session info
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        session = cursor.fetchone()
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Get all emotion records for the session
        # Note: This is simplified - in a real app, you'd need to associate records with sessions
        cursor.execute("SELECT * FROM emotion_records ORDER BY timestamp")
        records = [dict(row) for row in cursor.fetchall()]
        
        # Create CSV file
        df = pd.DataFrame(records)
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        
        # Create in-memory file-like object
        mem = io.BytesIO()
        mem.write(csv_buffer.getvalue().encode('utf-8'))
        mem.seek(0)
        
        # Send CSV file
        return send_file(
            mem,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'emotion_session_{session_id}.csv'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/latest-emotions', methods=['GET'])
def get_latest_emotions():
    try:
        conn = sqlite3.connect('emotions.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get the most recent 100 emotion records
        cursor.execute("SELECT * FROM emotion_records ORDER BY timestamp DESC LIMIT 100")
        records = [dict(row) for row in cursor.fetchall()]
        records.reverse()  # Return in chronological order
        
        return jsonify(records)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/session/<int:session_id>/emotions', methods=['GET'])
def get_session_emotions(session_id):
    try:
        conn = sqlite3.connect('emotions.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get emotion records for the session
        # Note: You might need to modify this query based on how you associate records with sessions
        cursor.execute("""
            SELECT e.* 
            FROM emotion_records e
            WHERE e.timestamp >= (SELECT s.start_time FROM sessions s WHERE s.id = ?)
            AND (e.timestamp <= (SELECT s.end_time FROM sessions s WHERE s.id = ?) OR 
                (SELECT s.end_time FROM sessions s WHERE s.id = ?) IS NULL)
            ORDER BY e.timestamp
        """, (session_id, session_id, session_id))
        
        records = [dict(row) for row in cursor.fetchall()]
        return jsonify(records)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)