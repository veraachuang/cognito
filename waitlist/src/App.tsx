import React, { useState, useEffect } from 'react';
import { Brain, FileText, LayoutList, Upload } from 'lucide-react';
import WaitlistForm from './components/WaitlistForm';
import logoImage from './logo.png';

const previews = [
  {
    title: 'Brain Dump',
    content: 'Write freely about your topic...',
    icon: Brain
  },
  {
    title: 'Smart Outline',
    content: '1. Introduction\n2. Key Points\n3. Conclusion',
    icon: LayoutList
  },
  {
    title: 'Document Analysis',
    content: 'Analyzing document structure and content...',
    icon: FileText
  },
  {
    title: 'Upload & Process',
    content: 'Drop your documents here to analyze',
    icon: Upload
  }
];

function App() {
  const [currentPreview, setCurrentPreview] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPreview((prev) => (prev + 1) % previews.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f2eb] flex items-center justify-center relative overflow-hidden py-12 px-4">
      <div className="absolute inset-0 bg-noise opacity-10"></div>
      
      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left content - Text and form */}
        <div className="w-full lg:w-1/2 lg:pr-8 animate-fade-in order-2 lg:order-1">
          <div className="mb-8 flex">
            <img src={logoImage} alt="Cognito Logo" className="h-10 -ml-1" />
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Transform How You <span className="text-[#c82e2e]">Think & Write</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-700 mb-8">
            A Chrome extension that helps you organize thoughts, generate outlines, and analyze your writing in real-time.
          </p>

          <WaitlistForm />
        </div>

        {/* Right content - Preview cards */}
        <div className="w-full lg:w-1/2 flex justify-center items-center relative h-[300px] md:h-[400px] lg:h-[500px] order-1 lg:order-2">
          {previews.map((preview, index) => (
            <div
              key={index}
              className={`absolute bg-white rounded-2xl shadow-2xl p-4 md:p-6 w-[280px] md:w-[350px] lg:w-[400px] transition-all duration-500 ${
                index === currentPreview
                  ? 'opacity-100 translate-y-0 rotate-3 animate-float'
                  : 'opacity-0 translate-y-8 rotate-3'
              }`}
              style={{
                top: '50%',
                transform: `translateY(-50%) ${index === currentPreview ? 'rotate(3deg)' : 'rotate(3deg) translateY(2rem)'}`,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <preview.icon className="h-5 w-5 md:h-6 md:w-6 text-[#c82e2e]" />
                  <span className="font-medium text-gray-900">{preview.title}</span>
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 md:p-4 min-h-[150px] md:min-h-[200px] animate-typing">
                <p className="text-sm md:text-base text-gray-600 whitespace-pre-line">{preview.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;