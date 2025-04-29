import React, { useState, useEffect } from 'react';
import { Send, Check, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

// Use an environment variable with fallback to production URL
// Handle localhost better for mobile devices
const getApiUrl = () => {
  // Environment variable always takes precedence
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // On mobile devices, always use the production URL with www subdomain
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    return 'https://www.trycognito.app';
  }
  
  // Otherwise use window.location.origin with fallback
  const origin = window.location.origin;
  return origin.includes('localhost') ? 'http://localhost:3001' : origin;
};

const API_URL = getApiUrl();
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Ensure we have a full URL with protocol for API calls
const ensureFullUrl = (url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

const WaitlistForm = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [connectionError, setConnectionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // Keep debug info but don't show by default
  const [debugInfo, setDebugInfo] = useState({
    apiUrl: API_URL,
    isMobile: isMobile,
    timestamp: new Date().toISOString()
  });
  // Debugging mode - set to false by default
  const [showDebug, setShowDebug] = useState(false);

  // Log debug info on component mount
  useEffect(() => {
    console.log('WaitlistForm mounted', { 
      apiUrl: API_URL, 
      isMobile: isMobile,
      userAgent: navigator.userAgent
    });
    
    // Check API connection on initial load in a less aggressive way
    checkApiConnection();
  }, []);

  // Function to check API connection
  const checkApiConnection = async () => {
    try {
      setIsLoading(true);
      setConnectionError(false);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
      
      // Make sure we use the full URL with https for mobile
      const healthUrl = isMobile ? 
        'https://www.trycognito.app/api/health' : 
        `${API_URL}/api/health`;
      
      setDebugInfo(prev => ({
        ...prev,
        checkingEndpoint: healthUrl,
        checkStartTime: new Date().toISOString()
      }));
      
      // Use health endpoint rather than join-waitlist for connection check
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': navigator.userAgent
        },
        cache: 'no-store', // Prevent caching issues on mobile
        mode: 'cors' // Explicitly set CORS mode
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
        console.warn('API check returned non-OK status:', response.status);
        // Don't set error unless explicitly necessary
        // setConnectionError(true);
      }
    } catch (error: unknown) {
      console.error('API connection check failed:', error);
      // Only show error if we need to
      // setConnectionError(true);
      
      // Update debug info with error details
      setDebugInfo(prev => ({
        ...prev,
        connectionError: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        checkEndTime: new Date().toISOString()
      }));
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
      // First try direct JSON method
      let success = await submitViaJson();
      
      // If we're on mobile and the JSON method failed, try the GET method
      if (!success && isMobile) {
        success = await submitViaGetMethod();
      }
      
      if (success) {
        setIsSubmitted(true);
      } else {
        throw new Error("Failed to submit");
      }
    } catch (error: unknown) {
      console.error('Failed to submit email:', error);
      setIsError(true);
      setConnectionError(true);
      
      // Update debug info with error details
      setDebugInfo(prev => ({
        ...prev,
        finalError: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : 'Unknown',
        submissionEndTime: new Date().toISOString()
      }));
      
      if (error instanceof Error) {
        setErrorMessage('Error connecting to waitlist. Please try again.');
      } else {
        setErrorMessage('Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // JSON submission method
  const submitViaJson = async (): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    // Make sure we have a full URL with https:// for API submission
    const fullApiUrl = ensureFullUrl(API_URL);
    
    // For mobile, explicitly use the production URL with https and www
    const submissionUrl = isMobile ? 
      'https://www.trycognito.app/api/join-waitlist' : 
      `${fullApiUrl}/api/join-waitlist`;
    
    setDebugInfo(prev => ({
      ...prev,
      submittingJsonTo: submissionUrl,
      jsonSubmitStartTime: new Date().toISOString(),
      usingMobileEndpoint: isMobile
    }));
    
    try {
      const response = await fetch(submissionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
        credentials: 'omit', // Avoid cookies/credentials for simpler CORS
        cache: 'no-store', // Prevent caching issues on mobile
        mode: 'cors' // Explicitly set CORS mode
      });
      
      clearTimeout(timeoutId);
      
      setDebugInfo(prev => ({
        ...prev,
        jsonSubmitStatus: response.status,
        jsonSubmitOk: response.ok,
        jsonSubmitEndTime: new Date().toISOString()
      }));
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      return true;
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        jsonSubmitError: error instanceof Error ? error.message : String(error),
        jsonSubmitEndTime: new Date().toISOString()
      }));
      throw error;
    }
  };
  
  // GET method as fallback for mobile devices
  const submitViaGetMethod = async (): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    // Always use the production URL with www for mobile GET requests
    const submissionUrl = `https://www.trycognito.app/api/join-waitlist?email=${encodeURIComponent(email)}&direct=false`;
    
    setDebugInfo(prev => ({
      ...prev,
      submittingGetTo: submissionUrl,
      getSubmitStartTime: new Date().toISOString()
    }));
    
    try {
      const response = await fetch(submissionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
        credentials: 'omit', // Avoid cookies/credentials for simpler CORS
        cache: 'no-store', // Prevent caching issues
        mode: 'cors' // Explicitly set CORS mode
      });
      
      clearTimeout(timeoutId);
      
      setDebugInfo(prev => ({
        ...prev,
        getSubmitStatus: response.status,
        getSubmitOk: response.ok,
        getSubmitEndTime: new Date().toISOString()
      }));
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      return true;
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        getSubmitError: error instanceof Error ? error.message : String(error),
        getSubmitEndTime: new Date().toISOString()
      }));
      throw error;
    }
  };

  // Manual debug mode toggle
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setIsError(false);
    setErrorMessage('');
    checkApiConnection();
  };

  // Toggle debug info display
  const toggleDebug = () => {
    setShowDebug(prev => !prev);
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
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="mt-1">{errorMessage}</p>
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <button 
                    type="button" 
                    onClick={handleRetry}
                    className="text-red-700 bg-red-100 px-3 py-1 rounded-md hover:bg-red-200 transition-colors flex items-center justify-center gap-1 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" /> Try Again
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Only show debug info if explicitly enabled */}
          {showDebug && (
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
              <details open>
                <summary className="cursor-pointer">Connection Details</summary>
                <div className="mt-2 overflow-x-auto">
                  <pre className="text-[10px] whitespace-pre-wrap">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
          
          {/* Hidden debug toggle - tap 5 times on the bottom of the form */}
          <div 
            className="h-4 w-full mt-2 opacity-0" 
            onClick={() => {
              if (!showDebug) {
                const now = Date.now();
                const clicks = (window as any)._debugClicks || [];
                clicks.push(now);
                // Only keep clicks from the last 3 seconds
                const recentClicks = clicks.filter((t: number) => now - t < 3000);
                (window as any)._debugClicks = recentClicks;
                
                if (recentClicks.length >= 5) {
                  toggleDebug();
                  (window as any)._debugClicks = [];
                }
              } else {
                toggleDebug();
              }
            }}
          ></div>
        </form>
      )}
    </div>
  );
}

export default WaitlistForm;