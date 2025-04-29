import React, { useState, useEffect } from 'react';
import { Send, Check, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

// Use an environment variable with fallback to both production and local endpoints
const API_URL = import.meta.env.VITE_API_URL || window.location.origin || 'http://localhost:3001';

const WaitlistForm = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [connectionError, setConnectionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Check API connection on component mount and when retry is attempted
  useEffect(() => {
    if (retryCount > 0) {
      checkApiConnection();
    }
  }, [retryCount]);

  // Function to check API connection
  const checkApiConnection = async () => {
    try {
      setIsLoading(true);
      setConnectionError(false);
      
      // Try a simple HEAD request to check if the API is reachable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
      
      const response = await fetch(`${API_URL}/api/join-waitlist`, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setConnectionError(false);
      } else {
        setConnectionError(true);
        setErrorMessage('Server is reachable but returned an error. Please try again.');
      }
    } catch (error) {
      console.error('API connection check failed:', error);
      setConnectionError(true);
      setErrorMessage(
        error instanceof Error && error.name === 'AbortError'
          ? 'Connection timed out. Please check your internet connection.'
          : 'Could not connect to server. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

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
    setConnectionError(false);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
      
      const response = await fetch(`${API_URL}/api/join-waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Could not parse server response' };
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }
      
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error joining waitlist:', error);
      setIsError(true);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setConnectionError(true);
          setErrorMessage('Request timed out. Please check your connection and try again.');
        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          setConnectionError(true);
          setErrorMessage('Network error. Please check your connection and try again.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage('Failed to join waitlist. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setIsError(false);
    setErrorMessage('');
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
              ) : connectionError ? (
                <>Retry <RefreshCw className="h-4 w-4" /></>
              ) : (
                <>Join <Send className="h-4 w-4" /></>
              )}
            </button>
          </div>
          
          {isError && (
            <div className="mt-3 text-red-600 text-sm flex items-start gap-2 bg-red-50 p-3 rounded-md border border-red-100">
              {connectionError ? (
                <WifiOff className="h-4 w-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{connectionError ? 'Connection Error' : 'Error'}</p>
                <p className="mt-1">{errorMessage}</p>
                {connectionError && (
                  <button 
                    type="button" 
                    onClick={handleRetry}
                    className="mt-2 text-red-700 bg-red-100 px-3 py-1 rounded-md hover:bg-red-200 transition-colors flex items-center gap-1 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" /> Try Again
                  </button>
                )}
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default WaitlistForm;