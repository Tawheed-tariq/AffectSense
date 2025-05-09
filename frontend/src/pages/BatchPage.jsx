import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmotionChart from '../components/EmotionChart';
import { Folder, Upload, Check, AlertTriangle, Save, PlusCircle, Home } from 'lucide-react';
import { useSessionContext } from '../context/SessionContext';
import { folderProcessing } from '../utils/routes';

export default function BatchPage() {
  const navigate = useNavigate();
  const { 
    activeSession, 
    startSession, 
    endSession, 
    sessionName, 
    setSessionName 
  } = useSessionContext();
  
  const [emotionData, setEmotionData] = useState(null);
  const [processingFolder, setProcessingFolder] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showSessionInput, setShowSessionInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const folderInputRef = useRef(null);

  const handleFolderUpload = async (event) => {
    const files = event.target.files;
    if (files.length === 0) return;

    setSelectedFiles(Array.from(files));
    setErrorMessage('');

    if (!activeSession) {
      setErrorMessage("Please start a session before selecting files");
      return;
    }

    processFolder(files);
  };

  const processFolder = async (files) => {
    setProcessingFolder(true);
    setProcessingProgress(0);
    setProcessingComplete(false);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }
      formData.append('session_id', activeSession?.id);

      const response = await axios.post(folderProcessing, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProcessingProgress(progress);
        }
      });

      console.log('Folder processing complete:', response.data);
      setProcessingComplete(true);
      if (response.data.lastResult) {
        setEmotionData(response.data.lastResult);
      }
    } catch (error) {
      console.error('Error processing folder:', error);
      setErrorMessage('Error processing folder: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingFolder(false);
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
    
    // Process the pending folder if images are selected
    if (selectedFiles.length > 0) {
      processFolder(selectedFiles);
    }
  };

  const handleSaveSession = async () => {
    await endSession();
    setSelectedFiles([]);
  };

  const handleFolderButtonClick = () => {
    if (!activeSession) {
      setErrorMessage("Please start a session before selecting files");
      setShowSessionInput(true);
    } else {
      folderInputRef.current.click();
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
          <h1 className="text-3xl font-bold text-gray-800">Batch Processing</h1>
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
          <h2 className="text-xl font-semibold mb-4">Process Image Folder</h2>
          
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Folder size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Upload a folder of images for batch processing</p>
              
              {selectedFiles.length > 0 && (
                <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded-md">
                  {selectedFiles.length} files selected
                </div>
              )}
              
              {errorMessage && (
                <div className="mb-4 p-2 bg-red-50 text-red-700 rounded-md flex items-center">
                  <AlertTriangle size={16} className="mr-2" />
                  {errorMessage}
                </div>
              )}
              
              <button 
                onClick={handleFolderButtonClick}
                className="flex items-center justify-center mx-auto px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="mr-2" size={18} />
                Select Image Folder
              </button>
              <input 
                type="file" 
                ref={folderInputRef} 
                onChange={handleFolderUpload} 
                webkitdirectory="" 
                directory=""
                multiple
                className="hidden" 
              />
            </div>
            
            {processingFolder && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-blue-700">Processing images...</span>
                  <span className="text-blue-700">{processingProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {processingComplete && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                <Check size={20} className="text-green-600 mr-2" />
                <span className="text-green-700">
                  Processing complete! Results saved.
                </span>
              </div>
            )}

            {showSessionInput && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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
            
            <div className="flex justify-between">
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
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Batch Results</h2>
          {emotionData ? (
            <div>
              <p className="mb-4 text-gray-700">Showing analysis for the last processed image:</p>
              <EmotionChart data={emotionData} />
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <p className="text-lg flex items-center">
                  <span className="mr-2">Dominant Emotion:</span> 
                  <span className="font-bold text-blue-700">{emotionData.predicted_class}</span>
                </p>
                <p className="mt-2 text-gray-600">
                  Complete results are saved.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 flex flex-col items-center">
              <AlertTriangle size={48} className="text-gray-400 mb-3" />
              <p className="text-lg">No batch processing results</p>
              <p className="text-sm mt-1">Process a folder of images to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}