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

# Load configuration
cfg = load_config()

# Setup transforms for the model
transform = transforms.Compose([
    transforms.Resize((cfg['training']['image_size'], cfg['training']['image_size'])),
    transforms.Grayscale(num_output_channels=3) if cfg['training']['grayscale'] else transforms.Lambda(lambda x: x),
    transforms.ToTensor(),
    transforms.Normalize([0.5], [0.5])
])

# Get class names from config
class_names = cfg['dataset']['class_names']

# Load face cascade classifier
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def process_frame(frame, model, device):
    """
    Process a frame to detect faces and predict emotions.
    
    Args:
        frame: The input frame (numpy array)
        model: The emotion recognition model
        device: The device to run inference on
        
    Returns:
        Dictionary containing emotion predictions
    """
    try:
        results = []
        faces_found = False
        
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        faces = face_cascade.detectMultiScale(gray_frame, scaleFactor=1.1, minNeighbors=5)
        
        if len(faces) == 0:
            empty_result = {
                'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 
                'faces': [],
                'faces_found': False
            }

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