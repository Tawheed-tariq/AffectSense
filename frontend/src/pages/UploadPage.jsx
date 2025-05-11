import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmotionChart from '../components/EmotionChart';
import { Upload, Clock, Check, AlertTriangle, Save, PlusCircle, Home, Image, Loader } from 'lucide-react';
import { useSessionContext } from '../context/SessionContext';
import { processFrame } from '../utils/routes';

export default function UploadPage() {
  const navigate = useNavigate();
  const { 
    activeSession, 
    startSession, 
    endSession, 
    sessionName, 
    setSessionName 
  } = useSessionContext();
  
  const [emotionData, setEmotionData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showSessionInput, setShowSessionInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  const processImage = async (imageSrc) => {
    setUploading(true);
    try {
      const response = await axios.post(processFrame, {
        image: imageSrc,
        session_id: activeSession?.id
      });
      
      setEmotionData(response.data);
    } catch (error) {
      console.error('Error processing image:', error);
      setErrorMessage('Error processing image: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleUploadImage = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFileName(file.name);
      setErrorMessage('');
      
      if (!activeSession) {
        setErrorMessage("Please start a session before uploading an image");
        setShowSessionInput(true);
        sessionStorage.setItem('pendingImageData', URL.createObjectURL(file));
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          processImage(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleStartNewSession = async () => {
    if (!sessionName) {
      setErrorMessage("Please enter a session name");
      return;
    }
    
    await startSession(sessionName);
    setShowSessionInput(false);
    setErrorMessage('');
    
    // Process the pending image if exists
    const pendingImageData = sessionStorage.getItem('pendingImageData');
    if (pendingImageData) {
      fetch(pendingImageData)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = (e) => {
            processImage(e.target.result);
          };
          reader.readAsDataURL(blob);
          sessionStorage.removeItem('pendingImageData');
        });
    }
  };

  const handleSaveSession = async () => {
    await endSession();
    setEmotionData(null);
    setSelectedFileName('');
  };

  const handleImageButtonClick = () => {
    if (!activeSession) {
      setErrorMessage("Please start a session before uploading an image");
      setShowSessionInput(true);
    } else {
      fileInputRef.current.click();
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-800">Upload Photo</h1>
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
          <h2 className="text-xl font-semibold mb-4">Upload Image</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Image size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Upload an image to detect emotions</p>
            
            {selectedFileName && (
              <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded-md">
                Selected: {selectedFileName}
              </div>
            )}
            
            {errorMessage && (
              <div className="mb-4 p-2 bg-red-50 text-red-700 rounded-md flex items-center">
                <AlertTriangle size={16} className="mr-2" />
                {errorMessage}
              </div>
            )}
            
            <button 
              onClick={handleImageButtonClick}
              className="flex items-center justify-center mx-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              <Upload className="mr-2" size={18} />
              Select Photo
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleUploadImage} 
              accept="image/*" 
              className="hidden" 
            />
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
          {uploading ? (
            <div className="text-center py-12 flex flex-col items-center">
              <Loader size={64} className="animate-spin text-blue-500 mb-4" />
              <p className="mt-2 text-gray-600">Processing image...</p>
            </div>
          ) : emotionData ? (
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
              <p className="text-lg">No emotion data available</p>
              <p className="text-sm mt-1">Upload an image to analyze emotions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}