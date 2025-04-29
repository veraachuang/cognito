import React from 'react';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 px-4 sm:px-6 z-10">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Unlock Your <span className="text-[#c82e2e]">Writing Potential</span> with Cognito
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 mb-10 max-w-3xl mx-auto leading-relaxed">
          The Chrome extension that transforms how you think, write, and organize ideas. Smart analysis, powerful outlines, all in your browser.
        </p>
        <div className="flex justify-center">
          <a 
            href="#waitlist" 
            className="inline-flex items-center gap-2 bg-[#c82e2e] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#b52727] transition-all duration-300 hover:gap-3 shadow-lg hover:shadow-xl"
          >
            Get Early Access <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;