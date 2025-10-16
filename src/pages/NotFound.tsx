import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated 404 with floating effect */}
        <div className="relative mb-8">
          <h1 className="text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 animate-pulse">
            404
          </h1>
          <div className="absolute inset-0 text-9xl md:text-[12rem] font-bold text-gray-200 -z-10 blur-sm">
            404
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Oops! Page Not Found
          </h2>
          
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            The page you're looking for seems to have vanished into the digital void. 
            Don't worry, even the best explorers sometimes take a wrong turn!
          </p>

          {/* Decorative elements */}
          <div className="flex justify-center space-x-2 my-8">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              to="/" 
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🏠 Go Home
            </Link>
            
            <button 
              onClick={() => window.history.back()}
              className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              ← Go Back
            </button>
          </div>

          {/* Helpful suggestions */}
          <div className="mt-12 p-6 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">What can you do?</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Check the URL for typos</li>
              <li>• Use the navigation menu to find what you need</li>
              <li>• Contact support if you believe this is an error</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}