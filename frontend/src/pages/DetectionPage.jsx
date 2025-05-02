import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import CameraComponent from '../components/CameraComponent';
import EmotionChart from '../components/EmotionChart';
import { Camera, Video, Download } from 'lucide-react';

export default function DetectionPage() {
  const [emotionData, setEmotionData] = useState(null);
  const [isContinuous, setIsContinuous] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const videoRef = useRef(null);
  const intervalRef = useRef(null);

  const captureEmotion = async (imageSrc) => {
    try {
      const response = await axios.post('http://localhost:5000/api/process_frame', {
        image: imageSrc
      });
      setEmotionData(response.data);
      
      if (sessionActive) {
        // Data is automatically saved to DB by the backend during session
      }
    } catch (error) {
      console.error('Error capturing emotion:', error);
    }
  };

  const startContinuousCapture = async () => {
    if (!sessionActive) {
      try {
        const response = await axios.post('http://localhost:5000/api/session/start', {
          name: sessionName || `Session ${new Date().toLocaleString()}`
        });
        setSessionId(response.data.session_id);
        setSessionActive(true);
      } catch (error) {
        console.error('Error starting session:', error);
        return;
      }
    }

    setIsContinuous(true);
    intervalRef.current = setInterval(() => {
      if (videoRef.current) {
        captureEmotion(videoRef.current.getScreenshot());
      }
    }, 1000); // Capture every second
  };

  const stopContinuousCapture = async () => {
    setIsContinuous(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (sessionActive) {
      try {
        await axios.post('http://localhost:5000/api/session/end');
        setSessionActive(false);
        setSessionId(null);
      } catch (error) {
        console.error('Error ending session:', error);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Emotion Detection</h1>
        {sessionActive && (
          <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Session Active
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <CameraComponent 
            ref={videoRef} 
            onCapture={captureEmotion} 
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => captureEmotion(videoRef.current.getScreenshot())}
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
                Stop Continuous Capture
              </button>
            )}
          </div>
          {!sessionActive && isContinuous && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Name</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Enter session name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Emotion Analysis</h2>
          {emotionData ? (
            <div>
              <EmotionChart data={emotionData} />
              <div className="mt-4">
                <p className="text-lg">
                  Dominant Emotion: <span className="font-bold">{emotionData.predicted_class}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Detected at: {new Date(emotionData.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p>No emotion data captured yet</p>
              <p className="text-sm mt-1">Click "Capture Emotion" to analyze</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}