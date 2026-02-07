import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css'
import { BookOpen, RotateCcw, Lightbulb, AlertCircle, Paperclip, Send, X } from 'lucide-react';
import Header from './components/Header';
import VideoCard from './components/VideoCard';
import LoadingState from './components/LoadingState';
import { findVideosForText, findVideosForImage } from './services/geminiAPI';

function App() {
  const [inputText, setInputText] = useState('');
  const [inputImage, setInputImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleSearch = useCallback(async () => {
    if (!inputText.trim() && !inputImage) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      let data;
      if (inputImage) {
        data = await findVideosForImage(inputImage);
      } else {
        data = await findVideosForText(inputText);
      }
      setResults(data);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [inputText, inputImage]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        setInputImage(base64);
        setImagePreview(base64);
        setInputText('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items || [];
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result;
            setInputImage(base64);
            setImagePreview(base64);
            setInputText('');
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  const clearImage = () => {
    setInputImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Global Enter key listener when image is loaded (so Enter sends even without textarea)
  const handleGlobalKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey && inputImage && !loading && !results) {
      e.preventDefault();
      handleSearch();
    }
  }, [inputImage, loading, results, handleSearch]);

  useEffect(() => {
    if (inputImage) {
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [inputImage, handleGlobalKeyDown]);

  const handleSearchAgain = () => {
    setResults(null);
    setError(null);
    setInputText('');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-225 mx-auto w-full px-6 py-10">
        
        {/* Input Section */}
        {!results && !loading && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-5 h-5 text-[#1E3A5F]" />
              <h2 className="text-xl font-semibold text-[#1A202C]">New Study Session</h2>
            </div>
            
            <div className="bg-white rounded-xl border border-[#E2E6EB] shadow-lg hover:shadow-md transition-shadow">
              <div className="p-4 space-y-4">
                {!imagePreview ? (
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder="Ask anything or paste an image with Ctrl+V..."
                    className="w-full h-40 rounded-md border-0 p-4 text-[#1A202C] placeholder:text-[#9CA3AF] resize-none outline-none focus:border-[#1E3A5F] bg-[#FAFBFC]"
                    disabled={loading}
                  />
                ) : (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-40 max-w-full object-contain rounded-lg border border-[#E2E6EB] p-2 bg-[#FAFBFC]"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors shadow-md"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E6EB] bg-[#FAFBFC] rounded-b-2xl">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={loading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="p-2.5 text-[#1E3A5F] hover:bg-[#F0F3F7] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:text-[#1E3A5F]"
                  title="Attach image (or paste with Ctrl+V)"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="text-xs text-[#9CA3AF] ml-2">Ctrl+V to paste</div>
                <button
                  onClick={handleSearch}
                  disabled={(!inputText.trim() && !imagePreview) || loading}
                  className="ml-auto bg-[#1E3A5F] hover:bg-[#152C4A] disabled:bg-[#D1D5DB] text-white px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 disabled:cursor-not-allowed hover:shadow-md"
                >
                  <Send className="w-4 h-4" />
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
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
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
                <div className="w-10 h-10 bg-[#C9A227] rounded flex items-center justify-center shrink-0">
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
          © 2026 Athena · RIEL Inc
        </p>
      </footer>
    </div>
  );
}

export default App;