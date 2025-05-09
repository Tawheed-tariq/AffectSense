#!/usr/bin/env python3

# --------------------------------------------------------
# AffectSense
# Copyright 2025 Tavaheed Tariq
# --------------------------------------------------------

from flask import Flask
from flask_cors import CORS
import torch
from config import load_config
from models.resnet_emotion import EmotionResNet
from database import init_db
from routes.detection import detection_bp
from routes.sessions import sessions_bp
from routes.data import data_bp


app = Flask(__name__)
CORS(app)

cfg = load_config()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = EmotionResNet(
    num_classes=cfg['training']['num_classes'], 
    pretrained=cfg['training']['pretrained']
).to(device)
checkpoint = torch.load(cfg['test']['ckpt'], map_location=device)
model.load_state_dict(checkpoint['model_state_dict'])
model.eval()

init_db()

app.register_blueprint(detection_bp)
app.register_blueprint(sessions_bp)
app.register_blueprint(data_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5000)