// --------------------------------------------------------
// AffectSense
// Copyright 2025 Tavaheed Tariq , GAASH LAB
// --------------------------------------------------------


import { useNavigate } from 'react-router-dom';
import { Camera, Image, Folder } from 'lucide-react';
import { useSessionContext } from '../context/SessionContext';

export default function DetectionHome() {
  const navigate = useNavigate();
  const { activeSession } = useSessionContext();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Emotion Detection</h1>
        {activeSession && (
          <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Active Session: {activeSession.name}
          </span>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-xl font-medium mb-6">How would you like to detect emotions?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={() => navigate('/camera')}
            className="flex flex-col items-center justify-center p-6 border-2 border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition duration-300"
          >
            <Camera size={48} className="text-blue-500 mb-4" />
            <span className="text-lg font-medium">Use Camera</span>
            <p className="text-sm text-gray-500 mt-2">Detect emotions in real-time using your webcam</p>
          </button>
          
          <button 
            onClick={() => navigate('/upload')}
            className="flex flex-col items-center justify-center p-6 border-2 border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-400 transition duration-300"
          >
            <Image size={48} className="text-purple-500 mb-4" />
            <span className="text-lg font-medium">Upload Photo</span>
            <p className="text-sm text-gray-500 mt-2">Analyze emotion from a single image</p>
          </button>
          
          <button 
            onClick={() => navigate('/batch')}
            className="flex flex-col items-center justify-center p-6 border-2 border-green-200 rounded-lg hover:bg-green-50 hover:border-green-400 transition duration-300"
          >
            <Folder size={48} className="text-green-500 mb-4" />
            <span className="text-lg font-medium">Process Image Folder</span>
            <p className="text-sm text-gray-500 mt-2">Batch process multiple images at once</p>
          </button>
        </div>
      </div>
    </div>
  );
}