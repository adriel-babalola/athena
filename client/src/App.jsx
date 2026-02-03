import { useState } from 'react';
import './App.css'
import { Search, BookOpen, RotateCcw, Lightbulb, AlertCircle } from 'lucide-react';
import Header from './components/Header';
import VideoCard from './components/VideoCard';
import LoadingState from './components/LoadingState';
import { findVideosForText } from './services/geminiAPI';

function App() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const data = await findVideosForText(inputText);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAgain = () => {
    setResults(null);
    setError(null);
    setInputText('');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-[900px] mx-auto w-full px-6 py-10">
        
        {/* Input Section */}
        {!results && !loading && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-5 h-5 text-[#1E3A5F]" />
              <h2 className="text-xl font-semibold text-[#1A202C]">New Study Session</h2>
            </div>
            
            <div className="bg-white rounded border border-[#E2E6EB] p-6 shadow-sm">
              <label className="block mb-4">
                <p className="text-[#1A202C] font-medium mb-3">
                  Paste text you're struggling to understand
                </p>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter complex concepts, textbook paragraphs, or research notes here..."
                  className="w-full h-44 rounded border border-[#E2E6EB] p-4 text-[#1A202C] placeholder:text-[#9CA3AF] resize-none outline-none"
                  disabled={loading}
                />
              </label>
              
              <div className="flex justify-end">
                <button
                  onClick={handleSearch}
                  disabled={!inputText.trim() || loading}
                  className="bg-[#1E3A5F] hover:bg-[#152C4A] disabled:bg-[#9CA3AF] text-white px-6 py-2.5 rounded font-medium transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
                >
                  <Search className="w-4 h-4" />
                  <span>Help Me Understand</span>
                </button>
              </div>
            </div>
          </section>
        )}
        
        {/* Loading */}
        {loading && <LoadingState />}
        
        {/* Error */}
        {error && !loading && (
          <div className="bg-white rounded border border-red-200 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#1A202C] mb-1">Something went wrong</h3>
                <p className="text-[#5A6677] text-sm mb-4">{error}</p>
                <button
                  onClick={handleSearchAgain}
                  className="bg-[#1E3A5F] hover:bg-[#152C4A] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Results */}
        {results && !loading && (
          <div className="space-y-8">
            
            {/* Overview Card */}
            <div className="bg-white rounded border-l-4 border-l-[#1E3A5F] border-y border-r border-[#E2E6EB] p-6 shadow-sm">
              <h3 className="text-[#1E3A5F] font-semibold text-xs uppercase tracking-widest mb-3">
                Quick Overview
              </h3>
              <p className="text-[#1A202C] leading-relaxed text-lg">
                {results.overview}
              </p>
            </div>
            
            {/* Key Concepts */}
            {results.key_concepts && results.key_concepts.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#5A6677] uppercase tracking-widest mb-3">
                  Key Concepts
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.key_concepts.map((concept, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-[#FBF6E9] text-[#1E3A5F] border border-[#E8D5A3] rounded-sm text-sm font-medium"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Videos */}
            {results.videos && results.videos.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#5A6677] uppercase tracking-widest mb-4">
                  Recommended Videos
                </h3>
                <div className="space-y-3">
                  {results.videos.map((video, index) => (
                    <VideoCard key={index} video={video} index={index} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Study Tip */}
            {results.study_tip && (
              <div className="bg-[#FBF6E9] rounded border border-[#E8D5A3] p-5 flex gap-4">
                <div className="w-10 h-10 bg-[#C9A227] rounded flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1A202C] mb-1">Study Tip</h3>
                  <p className="text-[#5A6677] leading-relaxed">{results.study_tip}</p>
                </div>
              </div>
            )}
            
            {/* Search Again */}
            <div className="pt-4">
              <button
                onClick={handleSearchAgain}
                className="w-full bg-white hover:bg-[#F7F8FA] border border-[#E2E6EB] text-[#1E3A5F] font-medium py-3 rounded transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Start New Session
              </button>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="py-6 border-t border-[#E2E6EB] text-center">
        <p className="text-sm text-[#5A6677]">
          © 2024 Athena · AI Study Companion
        </p>
      </footer>
    </div>
  );
}

export default App;