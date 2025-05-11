import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CameraComponent from '../components/CameraComponent';
import EmotionChart from '../components/EmotionChart';
import { Camera, Video, XCircle, Check, AlertTriangle, Clock, Save, PlusCircle, Home } from 'lucide-react';
import { useSessionContext } from '../context/SessionContext';
import { processFrame } from '../utils/routes';

export default function CameraPage() {
  const navigate = useNavigate();
  const { 
    activeSession, 
    startSession, 
    endSession, 
    sessionName, 
    setSessionName 
  } = useSessionContext();
  
  const [emotionData, setEmotionData] = useState(null);
  const [isContinuous, setIsContinuous] = useState(false);
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const [showSessionInput, setShowSessionInput] = useState(false);

  const captureEmotion = async (imageSrc) => {
    // Check if session is active first
    if (!activeSession) {
      setShowSessionInput(true);
      return;
    }
    
    try {
      const response = await axios.post(processFrame, {
        image: imageSrc,
        session_id: activeSession?.id,
        isCamera: true
      });
      
      setEmotionData(response.data);
    } catch (error) {
      console.error('Error capturing emotion:', error);
    }
  };

  const startContinuousCapture = async () => {
    if (!activeSession) {
      setShowSessionInput(true);
      return;
    }

    setIsContinuous(true);
    intervalRef.current = setInterval(() => {
      if (videoRef.current) {
        captureEmotion(videoRef.current.getScreenshot());
      }
    }, 1000); // Capture every second
  };

  const stopContinuousCapture = () => {
    setIsContinuous(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleStartNewSession = async () => {
    if (!sessionName) {
      alert("Please enter a session name");
      return;
    }
    
    await startSession(sessionName);
    setShowSessionInput(false);
    
    if (isContinuous) {
      startContinuousCapture();
    }
  };

  const handleSaveSession = async () => {
    await endSession();
    stopContinuousCapture();
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          >
            <Home size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Camera Detection</h1>
        </div>
        
        {activeSession && (
          <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center">
            <Check size={16} className="mr-1" />
            Session Active: {activeSession.name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Camera Feed</h2>
          
          <CameraComponent 
            ref={videoRef} 
            onCapture={captureEmotion} 
          />
          
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => videoRef.current && captureEmotion(videoRef.current.getScreenshot())}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              <Camera className="mr-2" size={18} />
              Capture Emotion
            </button>
            
            {!isContinuous ? (
              <button
                onClick={startContinuousCapture}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
              >
                <Video className="mr-2" size={18} />
                Start Continuous Capture
              </button>
            ) : (
              <button
                onClick={stopContinuousCapture}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                <XCircle className="mr-2" size={18} />
                Stop Continuous Capture
              </button>
            )}
          </div>
          
          {showSessionInput && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Session Name</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter session name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button 
                  onClick={handleStartNewSession}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Start
                </button>
              </div>
            </div>
          )}
          
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setShowSessionInput(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
            >
              <PlusCircle className="mr-2" size={18} />
              New Session
            </button>
            
            <button
              onClick={handleSaveSession}
              disabled={!activeSession}
              className={`flex items-center px-4 py-2 rounded-md transition ${
                activeSession 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="mr-2" size={18} />
              Save & End Session
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Emotion Analysis</h2>
          {emotionData ? (
            <div>
              <EmotionChart data={emotionData} />
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <p className="text-lg flex items-center">
                  <span className="mr-2">Dominant Emotion:</span> 
                  <span className="font-bold text-blue-700">{emotionData.predicted_class}</span>
                </p>
                <p className="text-sm text-gray-600 mt-2 flex items-center">
                  <Clock size={14} className="mr-1" />
                  Detected at: {new Date(emotionData.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 flex flex-col items-center">
              <AlertTriangle size={48} className="text-gray-400 mb-3" />
              <p className="text-lg">No emotion data captured yet</p>
              <p className="text-sm mt-1">Capture an emotion to analyze</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}