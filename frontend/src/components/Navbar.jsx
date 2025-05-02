import { Link } from 'react-router-dom';
import { Camera, Database } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between">
          <div className="flex space-x-7">
            <div className="flex items-center py-4 px-2">
              <span className="font-semibold text-gray-500 text-lg">AffectSense</span>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className="py-4 px-2 text-gray-500 font-semibold hover:text-blue-500 transition duration-300 flex items-center"
            >
              <Camera className="mr-2" size={18} />
              Detection
            </Link>
            <Link
              to="/sessions"
              className="py-4 px-2 text-gray-500 font-semibold hover:text-blue-500 transition duration-300 flex items-center"
            >
              <Database className="mr-2" size={18} />
              Sessions
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}