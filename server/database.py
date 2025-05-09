# --------------------------------------------------------
# AffectSense
# Copyright 2025 Tavaheed Tariq
# --------------------------------------------------------

import sqlite3
import traceback

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
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        print(f"Saving single emotion data to database: {emotion}")
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
        print("Single emotion data saved successfully.")
    except Exception as e:
        print(f"Error saving single emotion to database: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

def save_emotions_to_db():
    """Save buffered emotion data to database"""
    global emotion_buffer
    if not emotion_buffer:
        return
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        for emotion in emotion_buffer:
            print(f"Saving emotion data to database: {emotion}")
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
        emotion_buffer = []
    except Exception as e:
        print(f"Error saving emotions to database: {e}")
        traceback.print_exc()
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()