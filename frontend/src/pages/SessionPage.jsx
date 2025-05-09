import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SessionTable from '../components/SessionTable';
import { Download, RefreshCw, Trash2, Search, X, AlertTriangle } from 'lucide-react';
import { getSessions } from '../utils/routes';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [emotionRecords, setEmotionRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [emotionStats, setEmotionStats] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  const modalRef = useRef(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(getSessions);
      setSessions(response.data);
      setFilteredSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      showNotification('Failed to fetch sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmotionRecords = async (sessionId) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/session/${sessionId}/emotions`);
      setEmotionRecords(response.data);
      calculateEmotionDistribution(response.data);
    } catch (error) {
      console.error('Error fetching emotion records:', error);
      showNotification('Failed to fetch emotion records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateEmotionDistribution = (records) => {
    if (!records.length) return;
    
    const stats = {};
    let totalCount = 0;
    console.log(records)
    // Count occurrences of each emotion
    records.forEach(record => {
      const emotion = record.predicted_class || 'Unknown';
      stats[emotion] = (stats[emotion] || 0) + 1;
      totalCount++;
    });
    
    Object.keys(stats).forEach(emotion => {
      stats[emotion] = {
        count: stats[emotion],
        percentage: (stats[emotion] / totalCount) * 100
      };
    });
    
    setEmotionStats(stats);
  };

  const exportSessionData = async (sessionId, sessionName) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/session/${sessionId}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `session_${sessionName}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('Session data exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting session data:', error);
      showNotification('Failed to export session data', 'error');
    }
  };

  const openDeleteModal = (sessionId) => {
    setSessionToDelete(sessionId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSessionToDelete(null);
  };

  const deleteSession = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/session/${sessionToDelete}`);
      
      // Refresh the sessions list
      await fetchSessions();
      
      // If the deleted session was selected, clear the selection
      if (selectedSession === sessionToDelete) {
        setSelectedSession(null);
        setEmotionRecords([]);
        setEmotionStats({});
      }
      
      showNotification('Session deleted successfully', 'success');
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting session:', error);
      showNotification('Failed to delete session', 'error');
      closeDeleteModal();
    }
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (!value.trim()) {
      setFilteredSessions(sessions);
      return;
    }
    
    const filtered = sessions.filter(session => 
      session.name.toLowerCase().includes(value.toLowerCase()) ||
      new Date(session.start_time).toLocaleString().toLowerCase().includes(value.toLowerCase())
    );
    
    setFilteredSessions(filtered);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilteredSessions(sessions);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchEmotionRecords(selectedSession);
    } else {
      setEmotionStats({});
    }
  }, [selectedSession]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeDeleteModal();
      }
    };

    if (showDeleteModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteModal]);

  // Emotion colors for the distribution
  const emotionColors = {
    'Happy': 'bg-yellow-400',
    'Sad': 'bg-blue-400',
    'Angry': 'bg-red-500',
    'Surprised': 'bg-purple-400',
    'Neutral': 'bg-gray-400',
    'Fear': 'bg-green-400',
    'Disgust': 'bg-emerald-600',
    'Unknown': 'bg-gray-300'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Session Records</h1>
        <button
          onClick={fetchSessions}
          className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
        >
          <RefreshCw className="mr-2" size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-4">
          <div className="relative mb-4">
            <div className="flex items-center border rounded-md overflow-hidden">
              <div className="pl-3 text-gray-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search sessions..."
                className="w-full py-2 px-2 outline-none text-sm"
              />
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  className="pr-3 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
          
          <h2 className="text-lg font-semibold mb-4">Sessions</h2>
          {loading && filteredSessions.length === 0 ? (
            <div className="text-center py-10">Loading sessions...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {searchTerm ? 'No matching sessions found' : 'No sessions found'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-md border ${
                    selectedSession === session.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div 
                    onClick={() => setSelectedSession(session.id)}
                    className="cursor-pointer p-3"
                  >
                    <div className="font-medium">{session.name}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(session.start_time).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Duration: {session.end_time ? 
                        `${Math.round((new Date(session.end_time) - new Date(session.start_time)) / 60000)} mins` : 
                        'Incomplete'}
                    </div>
                  </div>
                  
                  <div className="flex border-t border-gray-100">
                    <button
                      onClick={() => exportSessionData(session.id, session.name)}
                      className="flex-1 py-2 px-2 flex justify-center items-center text-blue-600 hover:bg-green-50 transition rounded-bl-md"
                      title="Export session data"
                    >
                      <Download size={18} className="mr-1" />
                      <span className="text-sm">Export</span>
                    </button>
                    
                    <div className="w-px bg-gray-100"></div>
                    
                    <button
                      onClick={() => openDeleteModal(session.id)}
                      className="flex-1 py-2 px-2 flex justify-center items-center text-red-600 hover:bg-red-50 transition rounded-br-md"
                      title="Delete session"
                    >
                      <Trash2 size={18} className="mr-1" />
                      <span className="text-sm">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">
            {selectedSession ? `Emotion Records - Session ${selectedSession}` : 'Select a session'}
          </h2>
          {loading && selectedSession ? (
            <div className="text-center py-10">Loading records...</div>
          ) : selectedSession ? (
            <>
              <SessionTable records={emotionRecords} />
              
              {Object.keys(emotionStats).length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-md font-medium mb-3">Emotion Distribution</h3>
                  <div className="space-y-3">
                    {Object.keys(emotionStats)
                      .sort((a, b) => emotionStats[b].count - emotionStats[a].count)
                      .map(emotion => (
                        <div key={emotion} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{emotion}</span>
                            <span className="text-gray-500">
                              {emotionStats[emotion].count} ({emotionStats[emotion].percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div 
                              className={`${emotionColors[emotion] || 'bg-blue-500'} h-2.5 rounded-full`} 
                              style={{ width: `${emotionStats[emotion].percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-gray-500">
              Select a session to view its emotion records
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm bg-opacity-5 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-gray-100 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center text-red-500 mb-4">
              <AlertTriangle size={24} className="mr-2" />
              <h3 className="text-xl font-bold">Delete Session</h3>
            </div>
            <p className="mb-6">Are you sure you want to delete this session? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button 
                onClick={deleteSession}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-md shadow-lg z-50 flex items-center ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification({ show: false, message: '', type: '' })}
            className="ml-3 text-white"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}