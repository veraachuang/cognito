import React from 'react';
import { Brain, Twitter, Github, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="py-12 px-4 sm:px-6 relative z-10 border-t border-gray-200">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-2 mb-6 md:mb-0">
            <Brain className="h-6 w-6 text-[#c82e2e]" />
            <span className="font-semibold text-xl text-[#c82e2e]">Cognito</span>
          </div>
          
          <div className="flex space-x-8 mb-6 md:mb-0">
            <a href="#" className="text-gray-600 hover:text-[#c82e2e] transition-colors duration-300">Features</a>
            <a href="#" className="text-gray-600 hover:text-[#c82e2e] transition-colors duration-300">About</a>
            <a href="#" className="text-gray-600 hover:text-[#c82e2e] transition-colors duration-300">FAQ</a>
            <a href="#waitlist" className="text-gray-600 hover:text-[#c82e2e] transition-colors duration-300">Waitlist</a>
          </div>
          
          <div className="flex space-x-4">
            <a href="#" className="text-gray-600 hover:text-[#c82e2e] transition-colors duration-300">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-600 hover:text-[#c82e2e] transition-colors duration-300">
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-600 hover:text-[#c82e2e] transition-colors duration-300">
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Cognito. All rights reserved.</p>
          <div className="mt-2 flex justify-center space-x-6">
            <a href="#" className="hover:text-[#c82e2e] transition-colors duration-300">Privacy Policy</a>
            <a href="#" className="hover:text-[#c82e2e] transition-colors duration-300">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;