# --------------------------------------------------------
# AffectSense
# Copyright 2025 Tavaheed Tariq , GAASH LAB
# --------------------------------------------------------

from flask import Blueprint, request, jsonify
from datetime import datetime
import traceback

from database import get_db_connection, current_session_id

sessions_bp = Blueprint('sessions', __name__)

@sessions_bp.route('/api/session/start', methods=['POST'])
def start_session():
    """Start a new emotion tracking session"""
    global current_session_id
    data = request.json
    session_name = data.get('name', f'Session {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO sessions (start_time, name) VALUES (?, ?)",
            (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), session_name)
        )
        conn.commit()
        session_id = cursor.lastrowid
        current_session_id = session_id
        
        return jsonify({'session_id': session_id})
    except Exception as e:
        print(f"Error starting session: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@sessions_bp.route('/api/session/end', methods=['POST'])
def end_session():
    """End the current emotion tracking session"""
    global current_session_id
    if current_session_id:
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE sessions SET end_time = ? WHERE id = ?",
                (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), current_session_id)
            )
            conn.commit()
            session_id = current_session_id
            current_session_id = None
            return jsonify({'ended_session_id': session_id})
        except Exception as e:
            print(f"Error ending session: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
        finally:
            if conn:
                conn.close()
    return jsonify({'error': 'No active session'}), 400

@sessions_bp.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Get list of all sessions"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions ORDER BY start_time DESC")
        sessions = [dict(row) for row in cursor.fetchall()]
        return jsonify(sessions)
    except Exception as e:
        print(f"Error retrieving sessions: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@sessions_bp.route('/api/session/<int:session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a session and its associated emotion records"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if session exists
        cursor.execute("SELECT id, start_time, end_time FROM sessions WHERE id = ?", (session_id,))
        session = cursor.fetchone()
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Delete associated emotion records using timestamp range
        start_time, end_time = session['start_time'], session['end_time']
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
        print(f"Error deleting session: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@sessions_bp.route('/api/session/current', methods=['GET'])
def get_current_session():
    """Get the currently active session, if any"""
    global current_session_id
    if current_session_id:
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM sessions WHERE id = ?", (current_session_id,))
            session = cursor.fetchone()
            
            if session:
                return jsonify(dict(session))
            else:
                current_session_id = None
                return jsonify({'error': 'Session not found'}), 404
        except Exception as e:
            print(f"Error retrieving current session: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
        finally:
            if conn:
                conn.close()
    else:
        return jsonify({'active': False}), 200