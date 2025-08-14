

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Post, User, Comment, ScrollState } from '../types';
import PostCard from './PostCard';
import CommentCard from './CommentCard';
import { geminiService } from '../services/geminiService';
import { TTS_PROMPTS } from '../constants';
import Icon from './Icon';

interface PostDetailScreenProps {
  postId: string;
  newlyAddedCommentId?: string;
  currentUser: User;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onStartComment: (postId: string) => void;
  onLikePost: (postId: string) => void;
  onOpenProfile: (userName: string) => void;
  scrollState: ScrollState;
}

const PostDetailScreen: React.FC<PostDetailScreenProps> = ({ postId, newlyAddedCommentId, currentUser, onSetTtsMessage, lastCommand, onStartComment, onLikePost, onOpenProfile, scrollState }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playingCommentId, setPlayingCommentId] = useState<string | null>(null);
  const playbackTimeoutRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchPostDetails = useCallback(async () => {
      const fetchedPost = await geminiService.getPostById(postId);
      setPost(fetchedPost);
      return fetchedPost;
  }, [postId]);


  useEffect(() => {
    let isMounted = true;
    
    const initialFetch = async () => {
      setIsLoading(true);
      const fetchedPost = await fetchPostDetails();
      if (!isMounted) return;

      setIsLoading(false);
      onSetTtsMessage(TTS_PROMPTS.post_details_loaded);

      if (newlyAddedCommentId) {
        setPlayingCommentId(newlyAddedCommentId);
        const newComment = fetchedPost?.comments.find(c => c.id === newlyAddedCommentId);
        if (newComment) {
          const timeoutId = setTimeout(() => {
            if (isMounted) setPlayingCommentId(null);
            playbackTimeoutRef.current = null;
          }, newComment.duration * 1000);
          playbackTimeoutRef.current = timeoutId as any;
        }
      }
    };
    
    initialFetch();
    
    // Polling for live comments
    const commentInterval = setInterval(async () => {
        const freshPost = await geminiService.getPostById(postId);
        if (isMounted && freshPost && post && freshPost.commentCount > post.commentCount) {
            setPost(freshPost);
        }
    }, 5000);

    return () => {
        isMounted = false;
        clearInterval(commentInterval);
        if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current);
        }
    }
  }, [postId, newlyAddedCommentId, fetchPostDetails, onSetTtsMessage, post]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || scrollState === 'none') {
        return;
    }

    let animationFrameId: number;
    const animateScroll = () => {
        if (scrollState === 'down') {
            scrollContainer.scrollTop += 2;
        } else if (scrollState === 'up') {
            scrollContainer.scrollTop -= 2;
        }
        animationFrameId = requestAnimationFrame(animateScroll);
    };

    animationFrameId = requestAnimationFrame(animateScroll);

    return () => {
        cancelAnimationFrame(animationFrameId);
    };
  }, [scrollState]);
  
  const handlePlayComment = useCallback((comment: Comment) => {
    if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
        playbackTimeoutRef.current = null;
    }

    if (playingCommentId === comment.id) {
        setPlayingCommentId(null);
    } else {
        setPlayingCommentId(comment.id);
        const timeoutId = setTimeout(() => {
            setPlayingCommentId(null);
            playbackTimeoutRef.current = null;
        }, comment.duration * 1000);
        playbackTimeoutRef.current = timeoutId as any;
    }
  }, [playingCommentId]);

  const handleCommand = useCallback(async (command: string) => {
    const intentResponse = await geminiService.processIntent(command);
    if (!post) return;

    switch (intentResponse.intent) {
        case 'intent_like':
            onLikePost(post.id);
            break;
        case 'intent_comment':
            onStartComment(post.id);
            break;
        case 'intent_play_comment_by_author':
            if (intentResponse.slots?.target_name) {
                const targetName = (intentResponse.slots.target_name as string).toLowerCase();
                const commentToPlay = post.comments.find(c => 
                    c.author.name.toLowerCase().includes(targetName)
                );
                
                if (commentToPlay) {
                    handlePlayComment(commentToPlay);
                    onSetTtsMessage(`Playing comment from ${commentToPlay.author.name}.`);
                } else {
                    onSetTtsMessage(`Sorry, I couldn't find a comment from ${targetName} on this post.`);
                }
            }
            break;
    }
  }, [post, onLikePost, onStartComment, handlePlayComment, onSetTtsMessage]);

  useEffect(() => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);


  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p className="text-slate-300 text-xl">Loading post...</p></div>;
  }

  if (!post) {
    return <div className="flex items-center justify-center h-full"><p className="text-slate-300 text-xl">Post not found.</p></div>;
  }

  return (
    <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto">
      <div className="max-w-lg mx-auto p-4 sm:p-8 flex flex-col gap-6">
        <PostCard
          post={post}
          currentUser={currentUser}
          isActive={true}
          isPlaying={false} // Main post doesn't auto-play here
          onPlayPause={() => {}} // Could be implemented if desired
          onLike={onLikePost}
          onViewPost={() => {}} // Already on the view
          onAuthorClick={onOpenProfile}
        />

        <div className="bg-slate-800/50 rounded-xl p-4">
             <h3 className="text-lg font-bold text-slate-200 mb-3">Comments ({post.commentCount})</h3>
             <button onClick={() => onStartComment(post.id)} className="w-full flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-lg transition-colors mb-4">
                <Icon name="mic" className="w-6 h-6" />
                <span>Record a Comment</span>
             </button>
             <div className="flex flex-col gap-3">
                {post.comments.length > 0 ? post.comments.map(comment => (
                    <CommentCard 
                        key={comment.id} 
                        comment={comment}
                        isPlaying={playingCommentId === comment.id}
                        onPlayPause={() => handlePlayComment(comment)}
                        onAuthorClick={onOpenProfile}
                    />
                )) : (
                    <p className="text-slate-400 text-center py-4">Be the first to comment.</p>
                )}
             </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4">
            <h3 className="text-lg font-bold text-slate-200 mb-3">Liked By ({post.likeCount})</h3>
            <div className="flex flex-wrap gap-2">
                {post.likedBy.length > 0 ? post.likedBy.map(user => (
                    <button key={user.id} onClick={() => onOpenProfile(user.name)} className="group">
                        <img src={user.avatarUrl} alt={user.name} title={user.name} className="w-10 h-10 rounded-full transition-all group-hover:ring-2 group-hover:ring-rose-400" />
                    </button>
                )) : (
                    <p className="text-slate-400">No likes yet.</p>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default PostDetailScreen;