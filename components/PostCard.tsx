

import React, { useRef, useEffect } from 'react';
import type { Post, User } from '../types';
import Icon from './Icon';
import Waveform from './Waveform';

interface PostCardProps {
  post: Post;
  currentUser?: User; // Optional, to check if the current user has liked this post
  isActive: boolean;
  isPlaying: boolean;
  onPlayPause: () => void;
  onLike: (postId: string) => void;
  onViewPost: (postId: string) => void;
  onAuthorClick: (authorName: string) => void;
  onAdClick?: (post: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUser, isActive, isPlaying, onPlayPause, onLike, onViewPost, onAuthorClick, onAdClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isLiked = currentUser ? post.likedBy.some(u => u.id === currentUser.id) : false;

  const timeAgo = new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      if (isActive) {
        videoElement.play().catch(error => console.log("Autoplay prevented:", error));
      } else {
        videoElement.pause();
        videoElement.currentTime = 0;
      }
    }
  }, [isActive]);

  const handleLike = (e: React.MouseEvent) => {
      e.stopPropagation();
      onLike(post.id);
  }
  
  const handleView = () => {
      onViewPost(post.id);
  }

  const handleAuthor = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!post.isSponsored) {
        onAuthorClick(post.author.name);
      }
  }

  const handleAdClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.campaignId && onAdClick) {
        onAdClick(post);
    }
  };
  
  const getAdButtonText = () => {
    if (post.websiteUrl) return "Visit Site";
    if (post.allowDirectMessage) return "Send Message";
    return "Learn More";
  };

  const getPostTypeString = () => {
    if (post.isSponsored) return 'Sponsored';
    const type = post.videoUrl ? 'Video' : post.imageUrl ? 'Image' : 'Voice';
    const durationString = post.duration > 0 ? ` · ${post.duration}s` : '';
    return `${timeAgo} · ${type}${durationString}`;
  }


  return (
    <div
      onClick={handleView}
      className={`
        bg-slate-800/70 backdrop-blur-md rounded-2xl p-5 sm:p-6 w-full max-w-lg mx-auto transition-all duration-300 ease-in-out
        ${!post.isSponsored ? 'cursor-pointer hover:bg-slate-800' : ''}
        ${isActive ? 'border-rose-500/30 ring-1 ring-rose-500/30 shadow-2xl shadow-rose-900/40' : 'border border-slate-700/50'}
      `}
    >
      <button onClick={handleAuthor} className="flex items-center text-left mb-4 group w-full">
        <img src={post.author.avatarUrl} alt={post.author.name} className="w-12 h-12 rounded-full mr-4 transition-all duration-300 group-hover:ring-2 group-hover:ring-offset-2 group-hover:ring-offset-slate-800 group-hover:ring-rose-500" />
        <div>
          <p className="font-bold text-slate-100 text-lg transition-colors group-hover:text-rose-400">{post.isSponsored ? post.sponsorName : post.author.name}</p>
          <p className="text-slate-400 text-sm">{getPostTypeString()}</p>
        </div>
      </button>

      {post.caption && <p className="text-slate-200 mb-4 text-lg leading-relaxed">{post.caption}</p>}
      
      {/* Media Display Logic */}
      <div className="mb-4">
        {post.videoUrl ? (
            <div className="rounded-xl overflow-hidden aspect-video bg-black">
                <video
                    ref={videoRef}
                    src={post.videoUrl}
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                />
            </div>
        ) : post.imageUrl ? (
            <div className="rounded-xl overflow-hidden aspect-square bg-slate-700">
                <img src={post.imageUrl} alt={post.imagePrompt || 'Post image'} className="w-full h-full object-cover" />
            </div>
        ) : post.audioUrl !== '#' && (
             <div className="relative h-24 bg-slate-900/40 rounded-xl overflow-hidden group/waveform">
                <Waveform isPlaying={isPlaying && isActive} />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover/waveform:opacity-100 transition-opacity duration-300">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onPlayPause();
                    }}
                    className="w-16 h-16 rounded-full bg-rose-600/70 text-white flex items-center justify-center transform scale-75 group-hover/waveform:scale-100 transition-transform duration-300 ease-in-out hover:bg-rose-500"
                    aria-label={isPlaying ? "Pause post" : "Play post"}
                >
                    <Icon name={isPlaying && isActive ? 'pause' : 'play'} className="w-8 h-8" />
                </button>
                </div>
            </div>
        )}
      </div>


      <div className="flex items-center text-slate-400 gap-2 sm:gap-4">
        {post.isSponsored ? (
            <button onClick={handleAdClick} className="flex-grow flex items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-sky-600 text-white hover:bg-sky-500 transition-colors duration-200">
              <span className="font-semibold text-base">{getAdButtonText()}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </button>
        ) : (
            <>
                <button onClick={handleLike} className={`flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-rose-500/10 hover:text-rose-400 transition-colors duration-200 ${isLiked ? 'text-rose-500' : ''}`}>
                  <Icon name="like" className={`w-6 h-6 transition-all ${isLiked ? 'fill-current' : ''}`} />
                  <span className="font-semibold text-base">{post.likeCount}</span>
                </button>
                <button onClick={handleView} className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-sky-500/10 hover:text-sky-400 transition-colors duration-200">
                  <Icon name="comment" className="w-6 h-6" />
                  <span className="font-semibold text-base hidden sm:block">Comment</span>
                  <span className="font-semibold text-base">{post.commentCount}</span>
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-green-500/10 hover:text-green-400 transition-colors duration-200 ml-auto">
                  <Icon name="share" className="w-6 h-6" />
                  <span className="font-semibold text-base hidden sm:block">Share</span>
                </button>
            </>
        )}
      </div>
    </div>
  );
};

export default PostCard;