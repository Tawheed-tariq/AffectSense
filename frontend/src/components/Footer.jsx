import { Mail, MapPin, Phone, Globe } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-lg font-medium mb-2">Gaash Lab</h3>
            <div className="flex flex-col space-y-2 text-sm text-gray-300">
              <div className="flex items-center">
                <MapPin size={16} className="mr-2" />
                <span>Department of Information Technology <br/> National Institute of Technology, Srinagar <br/> Jammu and Kashmir - 190006</span>
              </div>
              <div className="flex items-center">
                <Mail size={16} className="mr-2" />
                <a href="mailto:tawheedtariq090@gmail.com" className="hover:text-blue-300 transition duration-300">
                  tawheedtariq090@gmail.com
                </a>
              </div>
              <div className="flex items-center">
                <Globe size={16} className="mr-2" />
                <a href="https://tavaheed.netlify.app" target="_blank" rel="noopener noreferrer" className="hover:text-blue-300 transition duration-300">
                  tavaheed.netlify.app
                </a>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-300">
            <p>© {currentYear} Gaash Lab. All rights reserved.</p>
            <p>AffectSense — Advancing emotion detection technology</p>
            <p>Designed by <a href="https://tavaheed.netlify.app" target="_blank" rel="noopener noreferrer" className="hover:text-blue-300 transition duration-300">Tavaheed Tariq</a></p>
          </div>
        </div>
      </div>
    </footer>
  );
}