# --------------------------------------------------------
# AffectSense
# Copyright 2025 Tavaheed Tariq
# --------------------------------------------------------

import sqlite3
import traceback
from datetime import datetime

current_session_id = None
emotion_buffer = []
BUFFER_SIZE = 10  # Number of readings to buffer before database write

def get_db_connection():
    """Create and return a database connection"""
    conn = sqlite3.connect('emotions.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables if they don't exist"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_time TEXT,
                end_time TEXT,
                name TEXT
            )
        """)
        
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
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

def save_single_emotion(emotion):
    """Save a single emotion record to the database"""
    if not emotion or 'session_id' not in emotion:
        print("Warning: Cannot save emotion without session_id")
        return False
        
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
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
                emotion['session_id']
            )
        )
        conn.commit()
        print(f"Single emotion data saved successfully for session {emotion['session_id']}.")
        return True
    except Exception as e:
        print(f"Error saving single emotion to database: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def save_emotions_to_db():
    """Save buffered emotion data to database"""
    global emotion_buffer
    if not emotion_buffer:
        print("No emotions in buffer to save.")
        return False
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        saved_count = 0
        
        for emotion in emotion_buffer:
            if 'session_id' not in emotion or emotion['session_id'] is None:
                print(f"Warning: Skipping emotion without session_id: {emotion.get('timestamp')}")
                continue
                
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
                    emotion['session_id']
                )
            )
            saved_count += 1
            
        conn.commit()
        print(f"Saved {saved_count} emotions from buffer to database.")
        emotion_buffer.clear()  # Clear buffer after successful save
        return True
    except Exception as e:
        print(f"Error saving emotions to database: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def force_save_remaining_emotions():
    """Force save any remaining emotions in the buffer"""
    if emotion_buffer:
        print(f"Force saving {len(emotion_buffer)} remaining emotions in buffer.")
        return save_emotions_to_db()
    return False