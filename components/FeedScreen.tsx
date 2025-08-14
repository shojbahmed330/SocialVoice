import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post, User, ScrollState, Campaign, AppView } from '../types';
import PostCard from './PostCard';
import CreatePostWidget from './CreatePostWidget';
import SkeletonPostCard from './SkeletonPostCard';
import { geminiService } from '../services/geminiService';
import { TTS_PROMPTS } from '../constants';
import RewardedAdWidget from './RewardedAdWidget';

interface FeedScreenProps {
  isLoading: boolean;
  posts: Post[];
  currentUser: User;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onOpenProfile: (userName: string) => void;
  onViewPost: (postId: string) => void;
  onLikePost: (postId: string) => void;
  onStartCreatePost: () => void;
  onRewardedAdClick: (campaign: Campaign) => void;
  onAdViewed: (campaignId: string) => void;
  onAdClick: (post: Post) => void;
  
  // New props for handling all commands locally
  onCommandProcessed: () => void;
  scrollState: ScrollState;
  onSetScrollState: (state: ScrollState) => void;
  onNavigate: (view: AppView, props?: any) => void;
  friends: User[];
  setSearchResults: (results: User[]) => void;
}

const FeedScreen: React.FC<FeedScreenProps> = ({
    isLoading, posts, currentUser, onSetTtsMessage, lastCommand, onOpenProfile,
    onViewPost, onLikePost, onStartCreatePost, onRewardedAdClick, onAdViewed,
    onAdClick, onCommandProcessed, scrollState, onSetScrollState, onNavigate, friends, setSearchResults
}) => {
  const [currentPostIndex, setCurrentPostIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rewardedCampaign, setRewardedCampaign] = useState<Campaign | null>(null);
  
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const isInitialLoad = useRef(true);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    if (!isLoading && posts.length > 0 && isInitialLoad.current) {
      onSetTtsMessage(TTS_PROMPTS.feed_loaded);
    }
  }, [posts.length, isLoading, onSetTtsMessage]);
  
  useEffect(() => {
    const fetchRewardedCampaign = async () => {
        const camp = await geminiService.getRandomActiveCampaign();
        setRewardedCampaign(camp);
    };

    if (!isLoading) {
        fetchRewardedCampaign();
    }
  }, [isLoading]);

  // Handle continuous scrolling via voice command
  useEffect(() => {
    const scrollContainer = feedContainerRef.current;
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
  
  const handleCommand = useCallback(async (command: string) => {
    try {
        const userNamesOnScreen = posts.map(p => p.isSponsored ? p.sponsorName as string : p.author.name);
        const allContextNames = [...userNamesOnScreen, ...friends.map(f => f.name)];
        const intentResponse = await geminiService.processIntent(command, { userNames: [...new Set(allContextNames)] });
        
        const { intent, slots } = intentResponse;

        switch (intent) {
          // --- Feed Specific Intents ---
          case 'intent_next_post':
            isProgrammaticScroll.current = true;
            setCurrentPostIndex(prev => (prev < 0 ? 0 : (prev + 1) % posts.length));
            setIsPlaying(true);
            break;
          case 'intent_previous_post':
            isProgrammaticScroll.current = true;
            setCurrentPostIndex(prev => (prev > 0 ? prev - 1 : posts.length - 1));
            setIsPlaying(true);
            break;
          case 'intent_play_post':
            if (currentPostIndex === -1 && posts.length > 0) {
                isProgrammaticScroll.current = true;
                setCurrentPostIndex(0);
            }
            setIsPlaying(true);
            break;
          case 'intent_pause_post':
            setIsPlaying(false);
            break;
          case 'intent_like':
            if (slots?.target_name) {
                const targetName = slots.target_name as string;
                const postToLike = posts.find(p => !p.isSponsored && p.author.name === targetName);
                if (postToLike) {
                    onLikePost(postToLike.id);
                } else {
                    onSetTtsMessage(`I couldn't find a post by ${targetName} to like.`);
                }
            } else if (currentPostIndex !== -1 && posts[currentPostIndex] && !posts[currentPostIndex].isSponsored) {
              onLikePost(posts[currentPostIndex].id);
            }
            break;
          case 'intent_comment':
          case 'intent_view_comments':
          case 'intent_view_comments_by_author':
            if (slots?.target_name) {
                const targetName = slots.target_name as string;
                const postToView = posts.find(p => !p.isSponsored && p.author.name === targetName);
                if (postToView) {
                    onViewPost(postToView.id);
                } else {
                    onSetTtsMessage(`I can't find a post by ${targetName} to view comments on.`);
                }
            } else if (currentPostIndex !== -1 && posts[currentPostIndex] && !posts[currentPostIndex].isSponsored) {
                onViewPost(posts[currentPostIndex].id);
            }
            break;

          // --- Global Intents Handled Here ---
          case 'intent_open_profile':
            if (slots?.target_name) {
              onOpenProfile(slots.target_name as string);
            } else if (currentPostIndex !== -1 && posts[currentPostIndex] && !posts[currentPostIndex].isSponsored) {
                onOpenProfile(posts[currentPostIndex].author.name);
            }
            break;
          case 'intent_create_post':
              onStartCreatePost();
              break;
          case 'intent_open_friends_page':
              onNavigate(AppView.FRIENDS);
              break;
          case 'intent_open_messages':
              onNavigate(AppView.CONVERSATIONS);
              break;
          case 'intent_open_settings':
              onNavigate(AppView.SETTINGS);
              break;
          case 'intent_search_user':
            if (slots?.target_name) {
                const query = slots.target_name as string;
                const results = await geminiService.searchUsers(query);
                setSearchResults(results);
                onNavigate(AppView.SEARCH_RESULTS, { query });
            }
            break;
          case 'intent_scroll_down':
              onSetScrollState('down');
              break;
          case 'intent_scroll_up':
              onSetScrollState('up');
              break;
          case 'intent_stop_scroll':
              onSetScrollState('none');
              break;
          case 'intent_help':
              onSetTtsMessage(TTS_PROMPTS.feed_loaded);
              break;
          default:
              onSetTtsMessage(TTS_PROMPTS.error_generic);
              break;
        }
    } catch (error) {
        console.error("Error processing command in FeedScreen:", error);
        onSetTtsMessage(TTS_PROMPTS.error_generic);
    } finally {
        onCommandProcessed();
    }
  }, [
      posts, currentPostIndex, friends, onOpenProfile, onLikePost, onViewPost, onSetTtsMessage, onStartCreatePost, 
      onNavigate, onSetScrollState, setSearchResults, onCommandProcessed
  ]);


  useEffect(() => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);

  // Effect for PROGRAMMATIC scrolling (when voice command changes index)
  useEffect(() => {
    if (isInitialLoad.current || posts.length === 0 || currentPostIndex < 0 || !isProgrammaticScroll.current) return;

    const cardElement = postRefs.current[currentPostIndex];
    if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const scrollTimeout = setTimeout(() => {
            isProgrammaticScroll.current = false;
        }, 1000); // Allow time for scroll animation to finish
        
        return () => clearTimeout(scrollTimeout);
    }
  }, [currentPostIndex, posts]);

  // Effect for tracking ad views and other logic when active post changes
  useEffect(() => {
    if (isInitialLoad.current || posts.length === 0 || currentPostIndex < 0) return;
    
    const activePost = posts[currentPostIndex];
    if (activePost?.isSponsored && activePost.campaignId) {
        onAdViewed(activePost.campaignId);
    }
  }, [currentPostIndex, posts, onAdViewed]);

  // Effect for MANUAL scrolling detection using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            if (isProgrammaticScroll.current) return;

            const intersectingEntries = entries.filter(entry => entry.isIntersecting);
            if (intersectingEntries.length > 0) {
                const mostVisibleEntry = intersectingEntries.reduce((prev, current) => 
                    prev.intersectionRatio > current.intersectionRatio ? prev : current
                );
                
                const indexStr = (mostVisibleEntry.target as HTMLElement).dataset.index;
                if (indexStr) {
                    const index = parseInt(indexStr, 10);
                    if (currentPostIndex !== index) {
                         setCurrentPostIndex(index);
                         setIsPlaying(false);
                    }
                }
            }
        },
        { 
            root: feedContainerRef.current,
            threshold: 0.6, // Fire when 60% of the element is visible
        }
    );

    const currentPostRefs = postRefs.current;
    currentPostRefs.forEach(ref => {
        if (ref) observer.observe(ref);
    });

    return () => {
        currentPostRefs.forEach(ref => {
            if (ref) observer.unobserve(ref);
        });
    };
  }, [posts, currentPostIndex]);


  useEffect(() => {
    if (posts.length > 0 && !isLoading && isInitialLoad.current) {
        isInitialLoad.current = false;
        // Do not set active post on load to prevent auto-scrolling.
        // Let the intersection observer handle it when user scrolls.
    }
  }, [posts, isLoading]);

  if (isLoading) {
    return (
      <div className="h-full w-full overflow-y-auto p-4 md:p-8">
        <div className="flex flex-col items-center justify-start gap-12">
          <SkeletonPostCard />
          <SkeletonPostCard />
          <SkeletonPostCard />
        </div>
      </div>
    );
  }

  if (posts.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 p-8 text-center">
        <h2 className="text-slate-300 text-2xl font-bold">Welcome to your feed!</h2>
        <p className="text-slate-400 max-w-sm">It's looking a little empty here. Why not break the ice and create your first voice post?</p>
        <div className="w-full max-w-lg">
            <CreatePostWidget user={currentUser} onClick={onStartCreatePost} />
        </div>
      </div>
    );
  }

  return (
    <div ref={feedContainerRef} className="h-full w-full overflow-y-auto p-4 md:p-8">
        <div className="flex flex-col items-center justify-start gap-12">
            <div className="w-full">
               <CreatePostWidget user={currentUser} onClick={onStartCreatePost} />
            </div>
             <div className="w-full">
               <RewardedAdWidget campaign={rewardedCampaign} onAdClick={onRewardedAdClick} />
            </div>
            {posts.map((post, index) => (
                <div 
                    key={`${post.id}-${index}`} 
                    className="w-full"
                    ref={el => { postRefs.current[index] = el; }}
                    data-index={index}
                >
                    <PostCard 
                        post={post} 
                        currentUser={currentUser}
                        isActive={index === currentPostIndex}
                        isPlaying={isPlaying && index === currentPostIndex}
                        onPlayPause={() => {
                            if (post.isSponsored && (post.videoUrl || post.imageUrl)) return;
                            if (index === currentPostIndex) {
                                setIsPlaying(p => !p)
                            } else {
                                isProgrammaticScroll.current = true;
                                setCurrentPostIndex(index);
                                setIsPlaying(true);
                            }
                        }}
                        onLike={onLikePost}
                        onViewPost={onViewPost}
                        onAuthorClick={onOpenProfile}
                        onAdClick={onAdClick}
                    />
                </div>
            ))}
        </div>
    </div>
  );
};

export default FeedScreen;
