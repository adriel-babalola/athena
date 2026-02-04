import { BookOpen } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-[#1E3A5F] text-white px-6 lg:px-10 py-4 flex items-center justify-between border-b border-[#152C4A]">
      <div className="flex items-center gap-3">
        <div className=" rounded flex items-center justify-center">
          <img src="./logo-white.svg" alt="" className='w-auto h-6' />
        </div>
        <div>
      
        </div>
      </div>
      <p className="hidden sm:block text-sm text-white/70">AI Study Companion</p>
    </header>
  );
}