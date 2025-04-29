import React from 'react';
import { Brain } from 'lucide-react';

const Header = () => {
  return (
    <header className="w-full py-6 px-4 sm:px-6 relative z-10">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-8 w-8 text-[#c82e2e]" />
          <span className="font-semibold text-2xl text-[#c82e2e]">Cognito</span>
        </div>
        <a 
          href="#waitlist" 
          className="bg-[#c82e2e] text-white px-5 py-2 rounded-md font-medium hover:bg-[#b52727] transition-all duration-300"
        >
          Join Waitlist
        </a>
      </div>
    </header>
  );
};

export default Header;