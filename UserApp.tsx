

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppView, User, VoiceState, Post, Comment, ScrollState, Notification, Campaign } from './types';
import AuthScreen from './components/AuthScreen';
import FeedScreen from './components/FeedScreen';
import CreatePostScreen from './components/CreatePostScreen';
import CreateCommentScreen from './components/CreateCommentScreen';
import ProfileScreen from './components/ProfileScreen';
import SettingsScreen from './components/SettingsScreen';
import MessageScreen from './components/MessageScreen';
import PostDetailScreen from './components/PostDetailScreen';
import FriendsScreen from './components/FriendsScreen';
import SearchResultsScreen from './components/SearchResultsScreen';
import VoiceCommandInput from './components/VoiceCommandInput';
import NotificationPanel from './components/NotificationPanel';
import Sidebar from './components/Sidebar';
import Icon from './components/Icon';
import AdModal from './components/AdModal';
import { geminiService } from './services/geminiService';
import { TTS_PROMPTS, IMAGE_GENERATION_COST } from './constants';
import ConversationsScreen from './components/ConversationsScreen';
import SponsorCenterScreen from './components/SponsorCenterScreen';
import CampaignViewerModal from './components/CampaignViewerModal';
import MobileBottomNav from './components/MobileBottomNav';


// --- Web Speech API Setup ---
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}
// --------------------------

interface ViewState {
  view: AppView;
  props?: any;
}

const UserApp: React.FC = () => {
  const [viewStack, setViewStack] = useState<ViewState[]>([{ view: AppView.AUTH }]);
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [campaignForAd, setCampaignForAd] = useState<Campaign | null>(null);
  const [viewingAd, setViewingAd] = useState<Post | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [ttsMessage, setTtsMessage] = useState<string>(TTS_PROMPTS.welcome);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [scrollState, setScrollState] = useState<ScrollState>('none');
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const currentView = viewStack[viewStack.length - 1];
  const unreadNotificationCount = notifications.filter(n => !n.read).length;
  const friendRequestCount = (currentView.props?.requests as User[] || []).length; // Used for badge on sidebar

  const navigate = (view: AppView, props: any = {}) => {
    setNotificationPanelOpen(false); // Close panel on any navigation
    setViewStack(stack => [...stack, { view, props }]);
  };

  const goBack = () => {
    if (viewStack.length > 1) {
      setViewStack(stack => stack.slice(0, -1));
    }
  };
  
  const handleStartMessage = (recipient: User) => navigate(AppView.MESSAGES, { recipient, ttsMessage: TTS_PROMPTS.message_screen_loaded(recipient.name) });

  const handleCommand = useCallback((command: string) => {
    setVoiceState(VoiceState.PROCESSING);
    setScrollState('none');
    setLastCommand(command);
  }, []);

  const handleCommandProcessed = useCallback(() => {
    setLastCommand(null);
    setVoiceState(VoiceState.IDLE);
  }, []);


  // --- Real-time Simulation Effect ---
  useEffect(() => {
    if (!user) return;
    
    // Fetch notifications frequently to catch campaign approvals
    const notificationInterval = setInterval(async () => {
        const notifs = await geminiService.getNotifications(user.id);
        if (notifs.length !== notifications.length) {
            setNotifications(notifs);
        }
    }, 5000);

    const feedInterval = setInterval(async () => {
        // Fetch feed less frequently
        const feedPosts = await geminiService.getFeed(user.id);
        setPosts(feedPosts);
    }, 10000);


    return () => {
        clearInterval(notificationInterval);
        clearInterval(feedInterval);
    };
  }, [user, notifications.length]);


  // --- Speech Recognition Effects ---
  useEffect(() => {
    if (!recognition) return;

    recognition.onstart = () => {
      setVoiceState(VoiceState.LISTENING);
      setTtsMessage("Listening...");
    };
    recognition.onend = () => {
      if(voiceState === VoiceState.LISTENING) {
        setVoiceState(VoiceState.IDLE);
      }
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setVoiceState(VoiceState.IDLE);
      if(event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setTtsMessage("Microphone access denied. Please enable it in your browser settings.");
      }
    };
    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript;
      handleCommand(command);
    };
  }, [handleCommand, voiceState]);

  const handleMicClick = () => {
    if (!recognition) {
        alert("Speech recognition is not supported in your browser.");
        return;
    }
    if (voiceState === VoiceState.LISTENING) {
        recognition.stop();
    } else {
        recognition.start();
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
            setNotificationPanelOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAuthSuccess = async (authedUser: User) => {
    if (authedUser.isBanned) {
        setTtsMessage(TTS_PROMPTS.login_banned);
        setUser(null);
        setViewStack([{ view: AppView.AUTH }]);
        return;
    }
    setUser(authedUser);
    setTtsMessage(TTS_PROMPTS.login_success(authedUser.name));
    setViewStack([{ view: AppView.FEED }]);
    setIsLoadingFeed(true);
    
    const [feedPosts, notifs, friendsList] = await Promise.all([
      geminiService.getFeed(authedUser.id),
      geminiService.getNotifications(authedUser.id),
      geminiService.getFriendsList(authedUser.id)
    ]);
    setPosts(feedPosts);
    setNotifications(notifs);
    setFriends(friendsList);
    setIsLoadingFeed(false);
  };
  
  const handleToggleNotifications = async () => {
      const isOpen = !isNotificationPanelOpen;
      setNotificationPanelOpen(isOpen);
      if (isOpen && user) {
          await geminiService.markNotificationsAsRead();
          const notifs = await geminiService.getNotifications(user.id);
          setNotifications(notifs);
      }
  }

  const handleNotificationClick = (notification: Notification) => {
    setNotificationPanelOpen(false);
    if(notification.post) {
        navigate(AppView.POST_DETAILS, { postId: notification.post.id });
    } else if (notification.type === 'friend_request') {
        navigate(AppView.FRIENDS);
    } else if (notification.type === 'campaign_approved' || notification.type === 'campaign_rejected') {
        navigate(AppView.SPONSOR_CENTER);
    }
  }
  
  const handleUpdateSettings = async (updatedSettings: Partial<User>) => {
    if(!user) return;
    const updatedUser = await geminiService.updateProfile(user.id, updatedSettings);
    if(updatedUser) {
      setUser(updatedUser);
      setTtsMessage(TTS_PROMPTS.settings_saved);
    }
  };
  
  const handleBlockUser = async (targetUser: User) => {
    if (!user || !targetUser) return;
    const success = await geminiService.blockUser(user.id, targetUser.id);
    if(success) {
      const updatedUser = { ...user, blockedUserIds: [...user.blockedUserIds, targetUser.id] };
      setUser(updatedUser);
      const feedPosts = await geminiService.getFeed(updatedUser.id);
      setPosts(feedPosts);
      setTtsMessage(TTS_PROMPTS.user_blocked(targetUser.name));
      if(currentView.view === AppView.PROFILE && currentView.props?.userName === targetUser.name) goBack();
      if(currentView.view === AppView.MESSAGES && currentView.props?.recipient?.id === targetUser.id) goBack();
    }
  };
  
  const handleUnblockUser = async (targetUser: User) => {
     if (!user || !targetUser) return;
     const success = await geminiService.unblockUser(user.id, targetUser.id);
     if (success) {
        setUser(u => u ? ({ ...u, blockedUserIds: u.blockedUserIds.filter(id => id !== targetUser.id)}) : null);
        setTtsMessage(TTS_PROMPTS.user_unblocked(targetUser.name));
     }
  };
  
  const handleRewardedAdClick = async (campaign: Campaign) => {
    if (!user) return;

    // Perform instant action based on the campaign passed to this function
    if (campaign.websiteUrl) {
      window.open(campaign.websiteUrl, '_blank', 'noopener,noreferrer');
    } else if (campaign.allowDirectMessage && campaign.sponsorId) {
      const sponsorUser = await geminiService.getUserById(campaign.sponsorId);
      if (sponsorUser) {
        handleStartMessage(sponsorUser);
      }
    }

    // Now, start the ad watching process for the reward using the same campaign
    setTtsMessage("Loading your reward...");
    setCampaignForAd(campaign);
    setIsShowingAd(true);
  };


  const handleAdComplete = async (campaignId?: string) => {
    setIsShowingAd(false);
    setCampaignForAd(null);
    if (!user) return;

    if (campaignId) {
        await geminiService.trackAdView(campaignId);
    }
    
    setTtsMessage("Claiming your reward...");
    const result = await geminiService.claimReward(user.id);
    if (result.success && result.newCoinBalance !== undefined) {
      setUser(u => u ? ({ ...u, voiceCoins: result.newCoinBalance }) : null);
      setTtsMessage(TTS_PROMPTS.reward_claim_success(result.claimedAmount));
    } else {
      setTtsMessage("Sorry, there was an error claiming your reward.");
    }
  };

  const handleAdSkip = () => {
    setIsShowingAd(false);
    setCampaignForAd(null);
    setTtsMessage("Ad skipped. No reward was earned.");
  };

  const handleDeductCoinsForImage = async (): Promise<boolean> => {
    if (!user) return false;

    const cost = IMAGE_GENERATION_COST;
    if ((user.voiceCoins || 0) < cost) {
        setTtsMessage(TTS_PROMPTS.image_generation_insufficient_coins(cost, user.voiceCoins || 0));
        return false;
    }

    setTtsMessage("Processing transaction...");
    const result = await geminiService.deductCoins(user.id, cost);
    
    if (result.success && result.newCoinBalance !== undefined) {
        setUser(u => u ? { ...u, voiceCoins: result.newCoinBalance } : null);
        setTtsMessage(TTS_PROMPTS.image_generation_success_with_coins(cost));
        return true;
    } else {
        setTtsMessage(TTS_PROMPTS.transaction_failed);
        return false;
    }
  };
  
  const handleAdViewed = async (campaignId: string) => {
    await geminiService.trackAdView(campaignId);
    console.log(`Tracked view for campaign: ${campaignId}`);
  };

  const handleAdClick = async (post: Post) => {
    if (!post.isSponsored) return;

    // Track the click first
    if (post.campaignId) {
      await geminiService.trackAdClick(post.campaignId);
      console.log(`Tracked click for campaign: ${post.campaignId}`);
    }

    // 1. Prioritize external URL
    if (post.websiteUrl) {
      window.open(post.websiteUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 2. Check for direct message option
    if (post.allowDirectMessage && post.sponsorId) {
      const sponsorUser = await geminiService.getUserById(post.sponsorId);
      if (sponsorUser) {
        handleStartMessage(sponsorUser);
      }
      return;
    }

    // 3. Fallback to viewing the ad in a modal
    setViewingAd(post);
  };

  const handleStartCreatePost = () => navigate(AppView.CREATE_POST);
  const handlePostCreated = (newPost: Post) => {
    setPosts(currentPosts => [newPost, ...currentPosts]);
    goBack();
    setTtsMessage("Your post is live! Returning to your feed.");
  };
  
  const handleCommentPosted = (newComment: Comment | null, postId: string) => {
    if (newComment === null) {
        // This means the user is suspended
        setTtsMessage(TTS_PROMPTS.comment_suspended);
        // Refresh user data to get suspension details if needed
        geminiService.getUserById(user!.id).then(freshUser => {
            if (freshUser) setUser(freshUser);
        });
        goBack(); // Go back from create comment screen
        return;
    }
    setPosts(currentPosts => currentPosts.map(p => p.id === postId ? { ...p, comments: [newComment, ...p.comments], commentCount: p.commentCount + 1 } : p));
    setViewStack(stack => [...stack.slice(0, -1), { view: AppView.POST_DETAILS, props: { postId, newlyAddedCommentId: newComment.id } }]);
  }
  
  const handleLikePost = async (postId: string) => {
    if (!user) return;
    const postToLike = posts.find(p => p.id === postId) || await geminiService.getPostById(postId);
    if (!postToLike || postToLike.isSponsored) return;

    const liked = await geminiService.likePost(user.id, postId);
    if (liked) {
      setPosts(currentPosts => currentPosts.map(p => {
          if (p.id === postId && !p.likedBy.some(u => u.id === user.id)) {
              setTtsMessage(TTS_PROMPTS.like_success(p.author.name));
              return { ...p, likeCount: p.likeCount + 1, likedBy: [...p.likedBy, user]};
          }
          return p;
      }));
    }
  }

  const handleOpenProfile = (userName: string) => navigate(AppView.PROFILE, { userName });
  const handleViewPost = (postId: string) => navigate(AppView.POST_DETAILS, { postId });
  const handleEditProfile = () => navigate(AppView.SETTINGS, { ttsMessage: TTS_PROMPTS.settings_opened });
  const handleStartComment = (postId: string) => {
    if(user?.commentingSuspendedUntil && new Date(user.commentingSuspendedUntil) > new Date()) {
        setTtsMessage(TTS_PROMPTS.comment_suspended);
        return;
    }
    navigate(AppView.CREATE_COMMENT, { postId });
  }
  const handleOpenConversation = async (peer: User) => {
    if (!user) return;
    await geminiService.markConversationAsRead(user.id, peer.id);
    navigate(AppView.MESSAGES, { recipient: peer, ttsMessage: TTS_PROMPTS.message_screen_loaded(peer.name) });
  };
  
  const handleSidebarNavigate = (viewName: 'feed' | 'friends' | 'settings' | 'profile' | 'messages' | 'sponsor_center') => {
    setNotificationPanelOpen(false);
    switch(viewName) {
        case 'feed':
            setViewStack([{ view: AppView.FEED }]);
            break;
        case 'friends':
            navigate(AppView.FRIENDS);
            break;
        case 'settings':
            navigate(AppView.SETTINGS);
            break;
        case 'profile':
            if (user) navigate(AppView.PROFILE, { userName: user.name });
            break;
        case 'messages':
            navigate(AppView.CONVERSATIONS);
            break;
        case 'sponsor_center':
            navigate(AppView.SPONSOR_CENTER);
            break;
    }
  }
  
  const handleHeaderSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = headerSearchQuery.trim();
    if (!query) return;

    const results = await geminiService.searchUsers(query);
    setSearchResults(results);
    navigate(AppView.SEARCH_RESULTS, { query });
    setHeaderSearchQuery('');
  };

  const renderView = () => {
    if(!user && currentView.view !== AppView.AUTH) {
        setViewStack([{ view: AppView.AUTH }]);
        return <AuthScreen onAuthSuccess={handleAuthSuccess} ttsMessage={ttsMessage} onSetTtsMessage={setTtsMessage} lastCommand={lastCommand}/>
    }

    const commonScreenProps = {
      currentUser: user,
      onSetTtsMessage: setTtsMessage,
      lastCommand: lastCommand,
      onCommandProcessed: handleCommandProcessed,
      scrollState: scrollState,
      onSetScrollState: setScrollState,
      onGoBack: goBack,
      onNavigate: navigate,
      onOpenProfile: handleOpenProfile,
      onBlockUser: handleBlockUser,
      friends,
      setSearchResults,
    };

    switch (currentView.view) {
      case AppView.AUTH:
        return <AuthScreen onAuthSuccess={handleAuthSuccess} ttsMessage={ttsMessage} onSetTtsMessage={setTtsMessage} lastCommand={lastCommand} />;
      case AppView.FEED:
        return <FeedScreen {...commonScreenProps} isLoading={isLoadingFeed} posts={posts} onViewPost={handleViewPost} onLikePost={handleLikePost} onStartCreatePost={handleStartCreatePost} onRewardedAdClick={handleRewardedAdClick} onAdViewed={handleAdViewed} onAdClick={handleAdClick} />;
      case AppView.PROFILE:
        return <ProfileScreen {...commonScreenProps} userName={currentView.props.userName} onStartMessage={handleStartMessage} onEditProfile={handleEditProfile} onViewPost={handleViewPost} onLikePost={handleLikePost}/>;
      case AppView.POST_DETAILS:
        return <PostDetailScreen {...commonScreenProps} postId={currentView.props.postId} newlyAddedCommentId={currentView.props.newlyAddedCommentId} onStartComment={handleStartComment} onLikePost={handleLikePost} />;
      case AppView.FRIENDS:
        return <FriendsScreen {...commonScreenProps} />;
      case AppView.SEARCH_RESULTS:
        return <SearchResultsScreen {...commonScreenProps} results={searchResults} query={currentView.props.query} />;
      case AppView.SETTINGS:
        return <SettingsScreen {...commonScreenProps} onUpdateSettings={handleUpdateSettings} onUnblockUser={handleUnblockUser} />;
      case AppView.CREATE_POST:
        return <CreatePostScreen {...commonScreenProps} user={user!} onPostCreated={handlePostCreated} onDeductCoinsForImage={handleDeductCoinsForImage} />;
      case AppView.CREATE_COMMENT:
        return <CreateCommentScreen {...commonScreenProps} user={user!} postId={currentView.props.postId} onCommentPosted={handleCommentPosted} />;
      case AppView.CONVERSATIONS:
        return <ConversationsScreen {...commonScreenProps} onOpenConversation={handleOpenConversation} />;
      case AppView.MESSAGES:
        return <MessageScreen {...commonScreenProps} recipientUser={currentView.props.recipient} onGoBack={goBack} />;
      case AppView.SPONSOR_CENTER:
        return <SponsorCenterScreen {...commonScreenProps} />;
      default:
        return <div className="text-white p-8">Unknown view</div>;
    }
  };

  const renderVoiceFab = () => {
    if (!user) return null;

    const getFabIcon = () => {
        switch (voiceState) {
            case VoiceState.PROCESSING:
                return <Icon name="logo" className="w-8 h-8 animate-spin" />;
            case VoiceState.LISTENING:
            default:
                return <Icon name="mic" className="w-8 h-8" />;
        }
    };
    
    const getFabClass = () => {
        let base = "fixed bottom-28 right-5 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg z-50 transition-all duration-300 ease-in-out md:hidden";
        switch (voiceState) {
            case VoiceState.LISTENING:
                return `${base} bg-rose-500 ring-4 ring-rose-500/50 animate-pulse`;
            case VoiceState.PROCESSING:
                 return `${base} bg-yellow-600 cursor-not-allowed`;
            default: // IDLE
                return `${base} bg-rose-600 hover:bg-rose-500 hover:scale-105`;
        }
    };

    return (
        <button onClick={handleMicClick} disabled={voiceState === VoiceState.PROCESSING} className={getFabClass()} aria-label="Activate voice command">
            {getFabIcon()}
        </button>
    );
  };


  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col font-sans">
      <header className="flex-shrink-0 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 p-3 flex justify-between items-center text-slate-100 gap-4 z-20">
        <div className="flex items-center gap-3 flex-shrink-0">
            {viewStack.length > 1 && currentView.view !== AppView.MESSAGES ? (
              <button onClick={goBack} aria-label="Go back" className="p-2 rounded-full hover:bg-slate-700 transition-colors">
                <Icon name="back" className="w-6 h-6 text-slate-300"/>
              </button>
            ) : (
              <button onClick={() => setViewStack([{ view: AppView.FEED }])} className="flex items-center gap-2">
                 <Icon name="logo" className="w-8 h-8 text-rose-500 ml-2" />
              </button>
            )}
            <h1 className="text-xl font-bold hidden sm:block">VoiceBook</h1>
        </div>
        
        {user && (
           <div className="flex-grow max-w-xl mx-auto hidden md:block">
                <form onSubmit={handleHeaderSearchSubmit} className="relative">
                     <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                        </svg>
                    </div>
                    <input 
                        type="search"
                        value={headerSearchQuery}
                        onChange={(e) => setHeaderSearchQuery(e.target.value)}
                        placeholder="Search VoiceBook..."
                        className="bg-slate-800 border border-slate-700 text-slate-100 text-base rounded-full focus:ring-rose-500 focus:border-rose-500 block w-full pl-11 p-2.5 transition"
                    />
                </form>
           </div>
        )}
        
        {user && currentView.view !== AppView.MESSAGES && (
            <div ref={notificationPanelRef} className="flex items-center gap-2 sm:gap-4 flex-shrink-0 relative">
                 <button onClick={handleToggleNotifications} aria-label="Open notifications" className="p-2 rounded-full hover:bg-slate-700 transition-colors relative">
                    <Icon name="bell" className="w-6 h-6 text-slate-300"/>
                    {unreadNotificationCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white border-2 border-slate-900">{unreadNotificationCount}</span>
                    )}
                </button>
                <button onClick={() => navigate(AppView.SETTINGS)} aria-label="Open settings" className="p-2 rounded-full hover:bg-slate-700 transition-colors hidden md:block">
                    <Icon name="settings" className="w-6 h-6 text-slate-300"/>
                </button>
                <button onClick={() => handleOpenProfile(user.name)} aria-label="Open your profile" className="flex items-center gap-2">
                    <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full border-2 border-slate-600 hover:border-rose-500 transition" />
                </button>
                {isNotificationPanelOpen && (
                    <NotificationPanel 
                        notifications={notifications}
                        onClose={() => setNotificationPanelOpen(false)}
                        onNotificationClick={handleNotificationClick}
                    />
                )}
            </div>
        )}
      </header>
      
      <div className="flex flex-grow overflow-hidden">
        {user && (
            <Sidebar 
                currentUser={user}
                onNavigate={handleSidebarNavigate}
                onCreatePost={handleStartCreatePost}
                friendRequestCount={friendRequestCount}
                activeView={currentView.view}
                voiceCoins={user.voiceCoins || 0}
            />
        )}
        <main className="flex-grow overflow-hidden relative">
          <div className="h-full w-full absolute inset-0">
              {renderView()}
          </div>
        </main>
      </div>


      <footer className="flex-shrink-0 z-10 md:z-30">
        <div className="bg-slate-800 p-3 text-center text-rose-300/80 text-sm border-t border-slate-700 min-h-[48px] flex items-center justify-center">
            <p>{ttsMessage}</p>
        </div>
        <div className={!user ? 'block' : 'hidden md:block'}>
            <VoiceCommandInput 
                onSendCommand={handleCommand} 
                voiceState={voiceState}
                onMicClick={handleMicClick}
            />
        </div>
      </footer>

      {user && (
        <MobileBottomNav 
            onNavigate={handleSidebarNavigate}
            onCreatePost={handleStartCreatePost}
            friendRequestCount={friendRequestCount}
            activeView={currentView.view}
        />
      )}
      
      {user && renderVoiceFab()}

      {isShowingAd && user && (
            <AdModal 
                campaign={campaignForAd}
                onComplete={handleAdComplete}
                onSkip={handleAdSkip}
            />
      )}

      {viewingAd && (
        <CampaignViewerModal post={viewingAd} onClose={() => setViewingAd(null)} />
      )}
    </div>
  );
};

export default UserApp;