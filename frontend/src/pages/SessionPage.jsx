import { useState, useEffect } from 'react';
import axios from 'axios';
import SessionTable from '../components/SessionTable';
import { Download, RefreshCw } from 'lucide-react';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [emotionRecords, setEmotionRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmotionRecords = async (sessionId) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/session/${sessionId}/emotions`);
      setEmotionRecords(response.data);
    } catch (error) {
      console.error('Error fetching emotion records:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportSessionData = async (sessionId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/session/${sessionId}/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `emotion_session_${sessionId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting session data:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchEmotionRecords(selectedSession);
    }
  }, [selectedSession]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Session Records</h1>
        <button
          onClick={fetchSessions}
          className="flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
        >
          <RefreshCw className="mr-2" size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Sessions</h2>
          {loading && sessions.length === 0 ? (
            <div className="text-center py-10">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No sessions found</div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session.id)}
                  className={`p-3 rounded-md cursor-pointer ${
                    selectedSession === session.id
                      ? 'bg-blue-100 border border-blue-300'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{session.name}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(session.start_time).toLocaleString()}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-400">
                      Duration: {session.end_time ? 
                        `${Math.round((new Date(session.end_time) - new Date(session.start_time)) / 60000)} mins` : 
                        'Incomplete'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSessionData(session.id);
                      }}
                      className="text-blue-500 hover:text-blue-700 text-xs flex items-center"
                    >
                      <Download size={14} className="mr-1" />
                      Export
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
            <SessionTable records={emotionRecords} />
          ) : (
            <div className="text-center py-10 text-gray-500">
              Select a session to view its emotion records
            </div>
          )}
        </div>
      </div>
    </div>
  );
}