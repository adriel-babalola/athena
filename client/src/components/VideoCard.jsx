import { Play, Clock, Eye } from 'lucide-react';

const difficultyConfig = {
  beginner: { 
    class: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    label: 'Beginner'
  },
  intermediate: { 
    class: 'bg-[#FBF6E9] text-[#92710C] border border-[#E8D5A3]',
    label: 'Intermediate'
  },
  advanced: { 
    class: 'bg-slate-100 text-slate-700 border border-slate-200',
    label: 'Advanced'
  },
};

export default function VideoCard({ video, index }) {
  const formatViews = (count) => {
    if (!count) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K views`;
    return `${count} views`;
  };

  const difficulty = difficultyConfig[video.difficulty] || difficultyConfig.intermediate;

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded border border-[#E2E6EB] hover:border-[#1E3A5F] hover:shadow-md transition-all group"
    >
      <div className="flex">
        {/* Thumbnail */}
        {video.thumbnail && (
          <div className="relative flex-shrink-0 w-44 h-28">
            <img 
              src={video.thumbnail} 
              alt={video.title}
              className="w-full h-full object-cover"
            />
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
              <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="white" />
            </div>
            {/* Duration */}
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded-sm font-medium">
              {video.duration}
            </div>
            {/* Step number */}
            <div className="absolute top-2 left-2 w-6 h-6 bg-[#1E3A5F] text-white rounded-sm flex items-center justify-center text-xs font-bold">
              {index + 1}
            </div>
          </div>
        )}
        
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="font-semibold text-[#1A202C] leading-tight line-clamp-2">{video.title}</h4>
            {video.difficulty && (
              <span className={`flex-shrink-0 px-2 py-0.5 rounded-sm text-xs font-medium uppercase tracking-wide ${difficulty.class}`}>
                {difficulty.label}
              </span>
            )}
          </div>
          
          <p className="text-sm text-[#5A6677] mb-3">{video.channel}</p>
          
          <div className="flex items-center gap-4 text-xs text-[#5A6677]">
            {video.viewCount > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{formatViews(video.viewCount)}</span>
              </div>
            )}
            <span className="text-[#1E3A5F] font-medium group-hover:underline">
              Watch on YouTube →
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}