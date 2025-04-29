import React, { useState } from 'react';
import { Send, Check, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const WaitlistForm = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setIsError(true);
      setErrorMessage('Please enter your email address');
      return;
    }
    
    if (!validateEmail(email)) {
      setIsError(true);
      setErrorMessage('Please enter a valid email address');
      return;
    }
    
    setIsError(false);
    setErrorMessage('');
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/join-waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }
      
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error joining waitlist:', error);
      setIsError(true);
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Failed to join waitlist. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {isSubmitted ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 text-sm md:text-base">
            Thanks for joining! We'll notify you when Cognito is ready.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <input
              type="email"
              placeholder="Enter your email address"
              className={`flex-1 px-4 py-3 rounded-lg sm:rounded-r-none border ${
                isError ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#c82e2e] focus:border-transparent`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`bg-[#c82e2e] text-white px-6 py-3 rounded-lg sm:rounded-l-none font-medium hover:bg-[#b52727] transition-colors duration-300 flex items-center justify-center gap-2 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>Loading<span className="animate-pulse">...</span></>
              ) : (
                <>Join <Send className="h-4 w-4" /></>
              )}
            </button>
          </div>
          {isError && (
            <div className="mt-2 text-red-600 text-sm flex items-center gap-1">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default WaitlistForm;