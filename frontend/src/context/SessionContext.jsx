// --------------------------------------------------------
// AffectSense
// Copyright 2025 Tavaheed Tariq
// --------------------------------------------------------


import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentSession } from '../utils/routes';

const SessionContext = createContext();

export function useSessionContext() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null);
  const [sessionName, setSessionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for existing session on load
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const response = await axios.get(getCurrentSession);
        if (response.data && response.data.active) {
          setActiveSession({
            id: response.data.session_id,
            name: response.data.name
          });
        }
      } catch (err) {
        console.error('Error checking session status:', err);
        // No active session, so we don't need to handle this error
      }
    };

    checkExistingSession();
  }, []);

  const startSession = async (name) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://localhost:5000/api/session/start', { name });
      setActiveSession({
        id: response.data.session_id,
        name: name
      });
      setSessionName('');
      return response.data.session_id;
    } catch (err) {
      console.error('Error starting session:', err);
      setError('Failed to start session. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    
    setLoading(true);
    setError(null);
    try {
      await axios.post('http://localhost:5000/api/session/end', { 
        session_id: activeSession.id 
      });
      setActiveSession(null);
    } catch (err) {
      console.error('Error ending session:', err);
      setError('Failed to end session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    activeSession,
    sessionName,
    setSessionName,
    startSession,
    endSession,
    loading,
    error
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}