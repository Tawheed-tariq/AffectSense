# --------------------------------------------------------
# AffectSense
# Copyright 2025 Tavaheed Tariq
# --------------------------------------------------------

import cv2
import torch
import torch.nn.functional as F
import numpy as np
from datetime import datetime
from PIL import Image
from torchvision import transforms
import traceback
from database import emotion_buffer, current_session_id, save_emotions_to_db, BUFFER_SIZE
from config import load_config

try:
    from retinaface import RetinaFace
    RETINAFACE_AVAILABLE = True
except ImportError:
    RETINAFACE_AVAILABLE = False
    print("\n⚠️ RetinaFace is not installed. Install it with:")
    print("pip install retina-face")

cfg = load_config()

transform = transforms.Compose([
    transforms.Resize((cfg['training']['image_size'], cfg['training']['image_size'])),
    transforms.Grayscale(num_output_channels=3) if cfg['training']['grayscale'] else transforms.Lambda(lambda x: x),
    transforms.ToTensor(),
    transforms.Normalize([0.5], [0.5])
])

class_names = cfg['dataset']['class_names']

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def get_empty_result(timestamp, session_id=None):
    empty_result = {
        'timestamp': timestamp, 
        'faces': [],
        'faces_found': False
    }

    for emotion in class_names:
        empty_result[emotion] = 0.0
    empty_result['predicted_class'] = 'No face detected'
    empty_result['confidence'] = 0.0
    
    if session_id or current_session_id:
        empty_result['session_id'] = session_id or current_session_id
        
    return empty_result

def detect_faces_retinaface(frame, conf_threshold=0.8):
    if not RETINAFACE_AVAILABLE:
        return []
    
    try:
        temp_path = "temp_frame.jpg"
        cv2.imwrite(temp_path, frame)
        
        faces = RetinaFace.detect_faces(temp_path, threshold=conf_threshold, allow_upscaling=True)
        
        try:
            import os
            os.remove(temp_path)
        except:
            pass
            
        if not faces:
            return []
            
        # Extract facial areas
        face_regions = []
        for face_id in faces:
            face_data = faces[face_id]
            x1, y1, x2, y2 = [int(coord) for coord in face_data['facial_area']]
            # Convert to (x, y, w, h) format
            face_regions.append((x1, y1, x2-x1, y2-y1))
            
        return face_regions
        
    except Exception as e:
        print(f"Error in RetinaFace detection: {e}")
        traceback.print_exc()
        return []

def process_frame(frame, model, device, session_id=None, use_retinaface=True):
    if frame is None or frame.size == 0:
        print("Warning: Empty frame received")
        return None
        
    try:
        faces_found = False
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Detect faces using RetinaFace
        face_regions = []
        if use_retinaface and RETINAFACE_AVAILABLE:
            face_regions = detect_faces_retinaface(frame)
            
        # Fall back to Haar cascade if RetinaFace didn't find any faces or is not available
        if not face_regions:
            gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            face_regions = face_cascade.detectMultiScale(
                gray_frame, 
                scaleFactor=1.1, 
                minNeighbors=5
            )
        
        if len(face_regions) == 0:
            return get_empty_result(timestamp, session_id)
        
        faces_found = True
        faces_data = []
        
        for face_coords in face_regions:
            # Extract face image
            x, y, w, h = face_coords
            # Ensure coordinates are within frame bounds
            x = max(0, x)
            y = max(0, y)
            w = min(w, frame.shape[1] - x)
            h = min(h, frame.shape[0] - y)
            
            face_img = frame[y:y+h, x:x+w]
            
            # Skip if face region is empty
            if face_img.size == 0:
                continue
                
            image = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))
            
            image_tensor = transform(image).unsqueeze(0).to(device)
            with torch.no_grad():
                output = model(image_tensor)
                probs = F.softmax(output, dim=1)
                confidence, pred = torch.max(probs, dim=1)
            
            pred_class = class_names[pred.item()]
            probabilities = {class_names[i]: float(probs[0][i].item()) for i in range(len(class_names))}
            
            face_data = {
                **probabilities,
                'predicted_class': pred_class,
                'confidence': float(confidence.item()),
                'face_coords': [int(c) for c in face_coords]  # Add face coordinates to result
            }
            faces_data.append(face_data)
        
        result = {
            'timestamp': timestamp,
            'faces_found': faces_found,
            'faces': faces_data
        }
        
        if faces_data:
            first_face = faces_data[0]
            for emotion in class_names:
                result[emotion] = first_face.get(emotion, 0)
            result['predicted_class'] = first_face['predicted_class']
            result['confidence'] = first_face['confidence']
        
        use_session_id = session_id or current_session_id
        if use_session_id:
            result['session_id'] = use_session_id
        
        return result
    except Exception as e:
        print(f"Error processing frame: {e}")
        traceback.print_exc()
        return None