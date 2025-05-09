# --------------------------------------------------------
# AffectSense
# Copyright 2025 Tavaheed Tariq
# --------------------------------------------------------

from flask import Blueprint, jsonify, send_file
import pandas as pd
import io
import traceback

from database import get_db_connection

data_bp = Blueprint('data', __name__)

@data_bp.route('/api/session/<int:session_id>/export', methods=['GET'])
def export_session_data(session_id):
    """Export session data as CSV"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        session = cursor.fetchone()
        session_name = session['name'] if session else ''
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        cursor.execute("""
            SELECT timestamp, angry, disgust, fear, happy, sad, surprise, neutral, predicted_class
            FROM emotion_records 
            WHERE session_id = ? 
            ORDER BY timestamp
        """, (session_id,))
        records = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        df = pd.DataFrame(records)
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        
        # Create in-memory file-like object
        mem = io.BytesIO()
        mem.write(csv_buffer.getvalue().encode('utf-8'))
        mem.seek(0)
        
        return send_file(
            mem,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'emotion_session_{session_name}.csv'
        )
    except Exception as e:
        print(f"Error exporting session data: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@data_bp.route('/api/latest-emotions', methods=['GET'])
def get_latest_emotions():
    """Get the most recent emotion records"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get the most recent 100 emotion records
        cursor.execute("""
            SELECT timestamp, angry, disgust, fear, happy, sad, surprise, neutral, predicted_class
            FROM emotion_records ORDER BY timestamp DESC LIMIT 100
        """)
        records = [dict(row) for row in cursor.fetchall()]
        conn.close()
        records.reverse()  # Return in chronological order
        
        return jsonify(records)
    except Exception as e:
        print(f"Error retrieving latest emotions: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@data_bp.route('/api/session/<int:session_id>/emotions', methods=['GET'])
def get_session_emotions(session_id):
    """Get all emotion records for a specific session"""
    try:
        conn = get_db_connection()
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
        conn.close()
        return jsonify(records)
    except Exception as e:
        print(f"Error retrieving session emotions: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500