import React, { useState, useEffect } from 'react';
import { Send, Check, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

// Use an environment variable with fallback to both production and local endpoints
// Add explicit mobile detection and debug info
const API_URL = import.meta.env.VITE_API_URL || window.location.origin || 'http://localhost:3001';
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const WaitlistForm = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [connectionError, setConnectionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState({
    apiUrl: API_URL,
    isMobile: isMobile
  });

  // Log debug info on component mount
  useEffect(() => {
    console.log('WaitlistForm mounted', { 
      apiUrl: API_URL, 
      isMobile: isMobile,
      userAgent: navigator.userAgent
    });
    
    // Check API connection on initial load for mobile
    if (isMobile) {
      checkApiConnection();
    }
  }, []);

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
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout (increased for mobile)
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        checkingEndpoint: `${API_URL}/api/join-waitlist`,
        checkStartTime: new Date().toISOString()
      }));
      
      const response = await fetch(`${API_URL}/api/join-waitlist`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Accept': '*/*',
          'User-Agent': navigator.userAgent
        }
      });
      
      clearTimeout(timeoutId);
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        connectionStatus: response.status,
        connectionOk: response.ok,
        checkEndTime: new Date().toISOString()
      }));
      
      if (response.ok) {
        setConnectionError(false);
      } else {
        setConnectionError(true);
        setErrorMessage(`Server returned ${response.status}. Please try again.`);
      }
    } catch (error: unknown) {
      console.error('API connection check failed:', error);
      setConnectionError(true);
      
      // Update debug info with error details
      setDebugInfo(prev => ({
        ...prev,
        connectionError: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        checkEndTime: new Date().toISOString()
      }));
      
      setErrorMessage(
        error instanceof Error && error.name === 'AbortError'
          ? 'Connection timed out. Please check your internet connection.'
          : `Connection error: ${error instanceof Error ? error.message : String(error)}. Please try again later.`
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
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout (increased for mobile)
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        submittingTo: `${API_URL}/api/join-waitlist`,
        submissionStartTime: new Date().toISOString(),
        emailLength: email.length
      }));
      
      const response = await fetch(`${API_URL}/api/join-waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': navigator.userAgent
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
        credentials: 'omit' // Avoid cookies/credentials for simpler CORS
      });
      
      clearTimeout(timeoutId);
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        submissionStatus: response.status,
        submissionOk: response.ok,
        submissionEndTime: new Date().toISOString()
      }));
      
      let data: { error?: string; message?: string } = {};
      try {
        data = await response.json();
        
        // Update debug info with response data
        setDebugInfo(prev => ({
          ...prev,
          responseData: JSON.stringify(data).substring(0, 100)
        }));
      } catch (e: unknown) {
        console.error('Error parsing response:', e);
        data = { error: 'Could not parse server response' };
        
        // Update debug info with parsing error
        setDebugInfo(prev => ({
          ...prev,
          responseParseError: e instanceof Error ? e.message : String(e)
        }));
      }
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      setIsSubmitted(true);
    } catch (error: unknown) {
      console.error('Error joining waitlist:', error);
      setIsError(true);
      
      // Update debug info with error details
      setDebugInfo(prev => ({
        ...prev,
        submissionError: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : 'Unknown',
        submissionEndTime: new Date().toISOString()
      }));
      
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

  // Try a direct API fallback for severe connection issues
  const handleDirectSubmit = async () => {
    if (!email || !validateEmail(email)) {
      setIsError(true);
      setErrorMessage('Please enter a valid email address');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Fallback to a more direct method for severe connection issues
      const encodedEmail = encodeURIComponent(email);
      const fallbackUrl = `${API_URL}/api/join-waitlist?email=${encodedEmail}&direct=true`;
      window.open(fallbackUrl, '_blank');
      
      // Assume success after opening the window
      setIsSubmitted(true);
    } catch (error: unknown) {
      console.error('Direct submission error:', error);
      setIsError(true);
      setErrorMessage('Could not complete request. Please try again later.');
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
              autoComplete="email"
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
                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <button 
                      type="button" 
                      onClick={handleRetry}
                      className="text-red-700 bg-red-100 px-3 py-1 rounded-md hover:bg-red-200 transition-colors flex items-center justify-center gap-1 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" /> Try Again
                    </button>
                    
                    {isMobile && (
                      <button 
                        type="button" 
                        onClick={handleDirectSubmit}
                        className="text-red-700 bg-red-100 px-3 py-1 rounded-md hover:bg-red-200 transition-colors flex items-center justify-center gap-1 text-xs"
                      >
                        <Send className="h-3 w-3" /> Direct Submit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Show connection info on mobile */}
          {isMobile && connectionError && (
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
              <details>
                <summary className="cursor-pointer">Connection Details</summary>
                <div className="mt-2 overflow-x-auto">
                  <pre className="text-[10px] whitespace-pre-wrap">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default WaitlistForm;