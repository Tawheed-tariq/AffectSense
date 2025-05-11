# --------------------------------------------------------
# AffectSense
# Copyright 2025 Tavaheed Tariq
# --------------------------------------------------------

import cv2
import numpy as np
import base64
import traceback
import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
import torch

from utils.image_processing import process_frame
from database import (
    current_session_id, 
    save_emotions_to_db, 
    save_single_emotion, 
    emotion_buffer,
    force_save_remaining_emotions,
    BUFFER_SIZE
)

detection_bp = Blueprint('detection', __name__)

# Access global model from app
@detection_bp.record
def record_params(setup_state):
    global model, device
    app = setup_state.app
    model = app.config.get('model', None)
    device = app.config.get('device', None)
    if model is None:
        # Access from app context as fallback
        from app import model as global_model
        from app import device as global_device
        model = global_model
        device = global_device

@detection_bp.route('/api/process_frame', methods=['POST'])
def api_process_frame():
    """Process a single frame and return emotion predictions"""
    if 'image' not in request.json:
        return jsonify({'error': 'No image data provided'}), 400
    
    try:
        isCamera = request.json.get('isCamera', False)
        session_id = request.json.get('session_id', current_session_id)
        if not session_id:
            return jsonify({'error': 'No session ID provided or active'}), 400
            
        image_data = request.json['image'].split(',')[1] if ',' in request.json['image'] else request.json['image']
        image_bytes = base64.b64decode(image_data)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None or frame.size == 0:
            return jsonify({'error': 'Invalid image data'}), 400
        
        # Pass use_retinaface=False when isCamera is True for faster processing
        result = process_frame(frame, model, device, session_id, use_retinaface=(not isCamera))
        
        if result:
            result['session_id'] = session_id
            
            saved = save_single_emotion(result)
            if not saved:
                current_app.logger.warning(f"Failed to save emotion for session {session_id}")
                
            return jsonify(result)
        else:
            return jsonify({'error': 'Failed to process frame'}), 500
    except Exception as e:
        print(f"Error processing API request: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@detection_bp.route('/api/process_folder', methods=['POST'])
def process_folder():
    """Process a folder of images for batch analysis"""
    if 'images' not in request.files:
        return jsonify({'error': 'No images provided'}), 400

    session_id = request.form.get('session_id')
    
    if not session_id:
        return jsonify({'error': 'No session ID specified'}), 400
    
    try:
        images = request.files.getlist('images')
        results = []
        last_result = None
        processed_count = 0
        
        global emotion_buffer
        emotion_buffer.clear()
        
        for image_file in images:
            try:
                img_bytes = image_file.read()
                nparr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if img is None or img.size == 0:
                    print(f"Warning: Could not decode image {image_file.filename}")
                    continue
                
                result = process_frame(img, model, device, session_id)
                
                if result:
                    result['filename'] = image_file.filename
                    result['session_id'] = session_id 
                    
                    results.append(result)
                    last_result = result
                    
                    emotion_buffer.append(result)
                    processed_count += 1
                    
                    if len(emotion_buffer) >= BUFFER_SIZE:
                        print(f"Saving batch of {len(emotion_buffer)} emotions")
                        save_emotions_to_db()
            except Exception as e:
                print(f"Error processing image {image_file.filename}: {e}")
                continue
        
        if emotion_buffer:
            print(f"Saving remaining {len(emotion_buffer)} emotions")
            force_save_remaining_emotions()
        
        return jsonify({
            'message': f'Processed {processed_count} images',
            'resultsCount': processed_count,
            'savedCount': len(results),
            'lastResult': last_result
        })
        
    except Exception as e:
        if emotion_buffer:
            force_save_remaining_emotions()
            
        print(f"Error processing folder: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500