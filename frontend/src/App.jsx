// --------------------------------------------------------
// AffectSense
// Copyright 2025 Tavaheed Tariq
// --------------------------------------------------------


import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DetectionHome from './pages/DetectionHome';
import SessionsPage from './pages/SessionPage';
import CamersPage from './pages/CameraPage';
import UploadPage from './pages/UploadPage';  
import BatchPage from './pages/BatchPage';
import Navbar from './components/Navbar';
import { SessionProvider } from './context/SessionContext';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <SessionProvider>
        <div className="min-h-screen bg-gray-100 flex flex-col">
          <Navbar />
          <div className="container mx-auto px-4 py-8 flex-grow">
            <Routes>
              <Route path="/" element={<DetectionHome />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/camera" element={<CamersPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/batch" element={<BatchPage />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </SessionProvider>
    </Router>
  );
}

export default App;