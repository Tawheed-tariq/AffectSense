# 🎭 AffectSense

<div align="center">
  <img src="https://img.shields.io/badge/Deep%20Learning-Emotion%20Detection-blue?style=for-the-badge&logo=tensorflow" alt="Deep Learning">
  <img src="https://img.shields.io/badge/CNN-ResNet50-green?style=for-the-badge&logo=python" alt="CNN ResNet50">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Flask-Backend-000000?style=for-the-badge&logo=flask" alt="Flask">
</div>

<div align="center">
  <h3>🧠 Advanced Emotion Detection System</h3>
  <p><em>A state-of-the-art CNN-based emotion recognition model powered by ResNet50 architecture</em></p>
</div>

---


## 🎯 Overview

**AffectSense** is a cutting-edge emotion detection system that leverages the power of Convolutional Neural Networks (CNN) with ResNet50 backbone architecture. The system provides real-time emotion recognition capabilities through an intuitive web interface built with React and Flask.


---



## 🚀 Quick Start

### Prerequisites

```bash
# Python >= 3.9
python --version

# Node.js >= 18
node --version
npm --version
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Tawheed-tariq/AffectSense.git
   cd AffectSense
   ```

2. **Backend Setup**
   ```bash
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   cd server
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

---

## 📥 Model Setup

> ⚠️ **Important**: The model weights are not included in the repository due to size constraints.

### Step 1: Download Model Weights

1. Visit the Hugging Face model repository: [AffectSense Model](https://huggingface.co/tawheed-tariq/AffectSense/tree/main)
2. Download all three model weights and place in `server/checkpoints/`.
---

## ⚙️ Configuration

### Update Model Path

After downloading the model weights, update the config file `server/configs/config.yaml` and change the `ckpt` varaible.

---

## 🖥️ Usage

### Starting the Application

1. **Start the Flask Backend**:
   ```bash
   cd server
   python app.py
   ```
   🌐 Backend will run on: `http://localhost:5000`

2. **Start the React Frontend**:
   ```bash
   cd client
   npm start
   ```
   🌐 Frontend will run on: `http://localhost:5173`

Open the frontend Url to use the model


---

<div align="center">
  <sub>Made with 🔥 by <a href="https://github.com/Tawheed-tariq">Tawheed Tariq</a></sub>
</div>
