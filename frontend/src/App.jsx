import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DetectionPage from './pages/DetectionPage';
import SessionsPage from './pages/SessionPage';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<DetectionPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;