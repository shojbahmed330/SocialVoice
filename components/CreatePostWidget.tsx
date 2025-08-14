import React from 'react';
import type { User } from '../types';
import Icon from './Icon';

interface CreatePostWidgetProps {
  user: User;
  onClick: () => void;
}

const CreatePostWidget: React.FC<CreatePostWidgetProps> = ({ user, onClick }) => {
  return (
    <div className="bg-slate-800 rounded-2xl p-4 w-full max-w-lg mx-auto">
      <div className="flex items-center gap-4">
        <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full" />
        <button
          onClick={onClick}
          className="flex-grow text-left bg-slate-700/80 hover:bg-slate-700 rounded-full px-5 py-3 text-slate-400 transition-colors"
        >
          What's on your mind, {user.name.split(' ')[0]}?
        </button>
      </div>
      <div className="border-t border-slate-700 mt-4 pt-3 flex justify-around">
        <button onClick={onClick} className="flex items-center gap-2 text-slate-300 hover:bg-slate-700/50 px-4 py-2 rounded-lg transition-colors">
          <Icon name="mic" className="w-6 h-6 text-rose-500" />
          <span className="font-semibold">Voice Post</span>
        </button>
         <button onClick={onClick} className="flex items-center gap-2 text-slate-300 hover:bg-slate-700/50 px-4 py-2 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-semibold">Image Post</span>
        </button>
      </div>
    </div>
  );
};

export default CreatePostWidget;