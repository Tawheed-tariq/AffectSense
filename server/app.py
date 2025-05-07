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
import traceback

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

# Load Haar Cascade for face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Initialize SQLite database
def init_db():
    conn = None
    try:
        conn = sqlite3.connect('emotions.db')
        cursor = conn.cursor()
        
        # Create sessions table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_time TEXT,
                end_time TEXT,
                name TEXT
            )
        """)
        
        # Create emotion_records table if not exists
        cursor.execute("""
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
                predicted_class TEXT,
                session_id INTEGER,
                
                FOREIGN KEY(session_id) REFERENCES sessions(id)
            )
        """)
        
        conn.commit()
    except Exception as e:
        print(f"Error initializing database: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback()
    finally:
        if conn:
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
    
    conn = None
    try:
        conn = sqlite3.connect('emotions.db')
        cursor = conn.cursor()
        
        # Ensure tables exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_time TEXT,
                end_time TEXT,
                name TEXT
            )
        """)
        conn.commit()
        
        # Insert new session
        cursor.execute(
            "INSERT INTO sessions (start_time, name) VALUES (?, ?)",
            (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), session_name)
        )
        conn.commit()
        current_session_id = cursor.lastrowid
        
        return jsonify({'session_id': current_session_id})
    except Exception as e:
        print(f"Error starting session: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

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
        results = []
        faces_found = False
        
        # Convert frame to grayscale for face detection
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces using the cascade classifier
        faces = face_cascade.detectMultiScale(gray_frame, scaleFactor=1.1, minNeighbors=5)
        
        # If no faces are detected, return empty results
        if len(faces) == 0:
            empty_result = {
                'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 
                'faces': [],
                'faces_found': False
            }
            # Add empty emotion values for backward compatibility
            for emotion in class_names:
                empty_result[emotion] = 0.0
            empty_result['predicted_class'] = 'No face detected'
            empty_result['confidence'] = 0.0
            return empty_result
        
        faces_found = True
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        faces_data = []
        
        # Process each detected face
        for (x, y, w, h) in faces:
            # Extract face region
            face_img = frame[y:y+h, x:x+w]
            
            # Convert face to PIL Image
            image = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))
            
            # Apply transformations and run inference
            image_tensor = transform(image).unsqueeze(0).to(device)
            with torch.no_grad():
                output = model(image_tensor)
                probs = F.softmax(output, dim=1)
                confidence, pred = torch.max(probs, dim=1)
            
            # Get prediction class and probabilities
            pred_class = class_names[pred.item()]
            probabilities = {class_names[i]: float(probs[0][i].item()) for i in range(len(class_names))}
            
            # Create face data dictionary with bounding box info
            face_data = {
                **probabilities,
                'predicted_class': pred_class,
                'confidence': float(confidence.item())
            }
            faces_data.append(face_data)
            
            # Save to database if session is active
            if current_session_id:
                db_entry = {
                    'timestamp': timestamp,
                    **probabilities,
                    'predicted_class': pred_class,
                    'session_id': current_session_id
                }
                emotion_buffer.append(db_entry)
                if len(emotion_buffer) >= BUFFER_SIZE:
                    save_emotions_to_db()
        
        # Create results with both the original format (for backward compatibility)
        # and the new format with face detection details
        result = {
            'timestamp': timestamp,
            'faces_found': faces_found
        }
        
        # For backward compatibility, add the first face's emotion data to the root level
        if faces_data:
            first_face = faces_data[0]
            # Add emotion probabilities to root level
            for emotion in class_names:
                result[emotion] = first_face.get(emotion, 0)
            # Add predicted class to root level
            result['predicted_class'] = first_face['predicted_class']
            result['confidence'] = first_face['confidence']
        
        # Also include detailed face data
        result['faces'] = faces_data
        
        return result
    except Exception as e:
        print(f"Error processing frame: {e}")
        traceback.print_exc()
        return None

def save_emotions_to_db():
    global emotion_buffer
    if not emotion_buffer:
        return
    
    conn = sqlite3.connect('emotions.db')
    cursor = conn.cursor()
    for emotion in emotion_buffer:
        cursor.execute(
            """INSERT INTO emotion_records 
            (timestamp, angry, disgust, fear, happy, sad, surprise, neutral, predicted_class, session_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                emotion['timestamp'],
                emotion.get('Angry', 0),
                emotion.get('Disgust', 0),
                emotion.get('Fear', 0),
                emotion.get('Happy', 0),
                emotion.get('Sad', 0),
                emotion.get('Surprise', 0),
                emotion.get('Neutral', 0),
                emotion['predicted_class'],
                emotion.get('session_id')
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
        image_data = request.json['image'].split(',')[1] if ',' in request.json['image'] else request.json['image']
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
        print(f"Error processing API request: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/session/<int:session_id>', methods=['DELETE'])
def delete_session(session_id):
    conn = None
    try:
        conn = sqlite3.connect('emotions.db')
        cursor = conn.cursor()
        
        # Check if session exists
        cursor.execute("SELECT id, start_time, end_time FROM sessions WHERE id = ?", (session_id,))
        session = cursor.fetchone()
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Delete associated emotion records using timestamp range
        start_time, end_time = session[1], session[2]
        if end_time:
            cursor.execute("""
                DELETE FROM emotion_records 
                WHERE timestamp BETWEEN ? AND ?
            """, (start_time, end_time))
        else:
            cursor.execute("""
                DELETE FROM emotion_records 
                WHERE timestamp >= ?
            """, (start_time,))
        
        # Delete the session
        cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
        
        return jsonify({'message': 'Session deleted successfully'}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500
    finally:
        if conn:
            conn.close()

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
        
        cursor.execute("""
            SELECT timestamp, angry, disgust, fear, happy, sad, surprise, neutral, predicted_class
            FROM emotion_records 
            WHERE session_id = ? 
            ORDER BY timestamp
        """, (session_id,))
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
        cursor.execute("""
            SELECT timestamp, angry, disgust, fear, happy, sad, surprise, neutral, predicted_class
            FROM emotion_records ORDER BY timestamp DESC LIMIT 100
        """)
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
        cursor.execute("""
            SELECT e.timestamp, e.angry, e.disgust, e.fear, e.happy, e.sad, e.surprise, e.neutral, 
                   e.predicted_class
            FROM emotion_records e
            JOIN sessions s ON e.session_id = s.id
            WHERE s.id = ?
            ORDER BY e.timestamp
        """, (session_id,))
        
        records = [dict(row) for row in cursor.fetchall()]
        return jsonify(records)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)