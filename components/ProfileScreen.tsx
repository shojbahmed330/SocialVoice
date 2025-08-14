

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Post, FriendshipStatus, ScrollState, AppView } from '../types';
import PostCard from './PostCard';
import Icon from './Icon';
import { geminiService } from '../services/geminiService';
import { TTS_PROMPTS } from '../constants';

interface ProfileScreenProps {
  userName: string;
  currentUser: User;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onStartMessage: (recipient: User) => void;
  onEditProfile: () => void;
  onViewPost: (postId: string) => void;
  onOpenProfile: (userName: string) => void;
  onLikePost: (postId: string) => void;
  onBlockUser: (user: User) => void;
  
  onCommandProcessed: () => void;
  scrollState: ScrollState;
  onSetScrollState: (state: ScrollState) => void;
  onNavigate: (view: AppView, props?: any) => void;
  onGoBack: () => void;
}

const AboutItem: React.FC<{iconName: React.ComponentProps<typeof Icon>['name'], children: React.ReactNode}> = ({iconName, children}) => (
    <div className="flex items-start gap-3 text-slate-300">
        <Icon name={iconName} className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0"/>
        <p>{children}</p>
    </div>
);


const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
    userName, currentUser, onSetTtsMessage, lastCommand, onStartMessage, 
    onEditProfile, onViewPost, onOpenProfile, onLikePost, onBlockUser, scrollState,
    onCommandProcessed, onSetScrollState, onNavigate, onGoBack
}) => {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const user = await geminiService.getUserProfile(userName);
      if (user) {
        setProfileUser(user);
        const userPosts = await geminiService.getPostsByUser(user.id);
        setPosts(userPosts);
        onSetTtsMessage(TTS_PROMPTS.profile_loaded(user.name, user.id === currentUser.id));
      } else {
        onSetTtsMessage(`Profile for ${userName} not found.`);
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [userName, currentUser.id, onSetTtsMessage]);

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
  
  const handleComment = () => {
     if (posts.length > 0) {
        onViewPost(posts[currentPostIndex].id);
     }
  }

  const handleCommand = useCallback(async (command: string) => {
    if (!profileUser) {
        onCommandProcessed();
        return;
    };
    
    try {
        const context = { userNames: [profileUser.name] };
        const intentResponse = await geminiService.processIntent(command, context);
        
        switch (intentResponse.intent) {
          // --- Profile Specific Intents ---
          case 'intent_next_post':
            if(posts.length > 0) {
                isProgrammaticScroll.current = true;
                setCurrentPostIndex(prev => (prev + 1) % posts.length);
                setIsPlaying(true);
            }
            break;
          case 'intent_previous_post':
            if (posts.length > 0) {
                isProgrammaticScroll.current = true;
                setCurrentPostIndex(prev => (prev - 1 + posts.length) % posts.length);
                setIsPlaying(true);
            }
            break;
          case 'intent_play_post':
            if (posts.length > 0) setIsPlaying(true);
            break;
          case 'intent_pause_post':
            setIsPlaying(false);
            break;
          case 'intent_like':
            if(posts.length > 0) {
                onLikePost(posts[currentPostIndex].id);
            }
            break;
          case 'intent_comment':
          case 'intent_view_comments':
            handleComment();
            break;
          case 'intent_add_friend':
            if (profileUser.id !== currentUser.id) {
              const result = await geminiService.addFriend(currentUser.id, profileUser.id);
              if (result.success) {
                setProfileUser(u => u ? { ...u, friendshipStatus: FriendshipStatus.REQUEST_SENT } : null);
                onSetTtsMessage(TTS_PROMPTS.friend_request_sent(profileUser.name));
              } else if(result.reason === 'friends_of_friends'){
                onSetTtsMessage(TTS_PROMPTS.friend_request_privacy_block(profileUser.name));
              }
            }
            break;
          case 'intent_block_user':
            if (profileUser.id !== currentUser.id) {
              onBlockUser(profileUser);
            }
            break;
          case 'intent_send_message':
             if (profileUser.id !== currentUser.id) {
                onStartMessage(profileUser);
             }
            break;
          case 'intent_edit_profile':
            if (profileUser.id === currentUser.id) {
                onEditProfile();
            }
            break;
            
          // --- Global Intents ---
          case 'intent_go_back':
            onGoBack();
            break;
          case 'intent_open_friends_page':
              onNavigate(AppView.FRIENDS);
              break;
          case 'intent_open_messages':
              onNavigate(AppView.CONVERSATIONS);
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
          default:
              onSetTtsMessage(TTS_PROMPTS.error_generic);
              break;
        }
    } catch (error) {
        console.error("Error processing command in ProfileScreen:", error);
        onSetTtsMessage(TTS_PROMPTS.error_generic);
    } finally {
        onCommandProcessed();
    }
  }, [
      profileUser, posts, currentPostIndex, onSetTtsMessage, onStartMessage, 
      currentUser.id, onEditProfile, onViewPost, onLikePost, onBlockUser,
      onCommandProcessed, onGoBack, onNavigate, onSetScrollState
  ]);

  useEffect(() => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);


  useEffect(() => {
    if (!isProgrammaticScroll.current || posts.length === 0) return;

    const postListContainer = scrollContainerRef.current?.querySelector('#post-list-container');
    if (postListContainer && postListContainer.children.length > currentPostIndex) {
        const cardElement = postListContainer.children[currentPostIndex] as HTMLElement;
        if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const timeout = setTimeout(() => {
                isProgrammaticScroll.current = false;
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }
  }, [currentPostIndex, posts]);

  const renderActionButtons = () => {
    if (!profileUser || currentUser.id === profileUser.id) return null;

    const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50";

    return (
        <>
            {profileUser.friendshipStatus === FriendshipStatus.FRIENDS ? (
                <button disabled className={`${baseClasses} bg-slate-700 text-slate-300`}>Friends</button>
            ) : profileUser.friendshipStatus === FriendshipStatus.REQUEST_SENT ? (
                <button disabled className={`${baseClasses} bg-slate-700 text-slate-300`}>Request Sent</button>
            ) : (
                <button 
                    onClick={() => handleCommand('add friend')} 
                    className={`${baseClasses} bg-rose-600 text-white hover:bg-rose-500`}
                >
                    <Icon name="add-friend" className="w-5 h-5"/>
                    Add Friend
                </button>
            )}
            <button onClick={() => onStartMessage(profileUser)} className={`${baseClasses} bg-sky-600 text-white hover:bg-sky-500`}>
                 <Icon name="message" className="w-5 h-5"/>
                 Message
            </button>
        </>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p className="text-slate-300 text-xl">Loading profile...</p></div>;
  }

  if (!profileUser) {
    return <div className="flex items-center justify-center h-full"><p className="text-slate-300 text-xl">User not found.</p></div>;
  }

  const isOwnProfile = profileUser.id === currentUser.id;

  return (
    <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto bg-slate-900">
        <div className="max-w-4xl mx-auto">
            <header className="relative">
                <img src={profileUser.coverPhotoUrl} alt={`${profileUser.name}'s cover photo`} className="w-full h-48 sm:h-72 object-cover" />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                        <img src={profileUser.avatarUrl} alt={profileUser.name} className="w-28 h-28 sm:w-40 sm:h-40 rounded-full border-4 border-slate-900" />
                        <div className="flex-grow text-center sm:text-left mb-2">
                            <h2 className="text-3xl font-bold text-slate-100">{profileUser.name}</h2>
                            <p className="text-slate-400 mt-1">{profileUser.bio}</p>
                        </div>
                         <div className="flex justify-center sm:justify-end gap-3 mb-2">
                            {isOwnProfile ? (
                                <button onClick={onEditProfile} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors bg-slate-600 text-white hover:bg-slate-500">
                                    <Icon name="edit" className="w-5 h-5"/>
                                    Edit Profile
                                </button>
                            ) : renderActionButtons()}
                        </div>
                    </div>
                </div>
            </header>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-6">
                <aside className="md:col-span-5 space-y-6">
                    <div className="bg-slate-800 p-4 rounded-lg">
                        <h3 className="font-bold text-xl text-slate-100 mb-4">About</h3>
                        <div className="space-y-3">
                            {isOwnProfile && profileUser.voiceCoins !== undefined && (
                                <AboutItem iconName="coin">
                                    You have <strong className="text-yellow-400 font-bold">{profileUser.voiceCoins}</strong> Voice Coins
                                </AboutItem>
                            )}
                            {profileUser.work && <AboutItem iconName="briefcase">Works at <strong>{profileUser.work}</strong></AboutItem>}
                            {profileUser.education && <AboutItem iconName="academic-cap">Studied at <strong>{profileUser.education}</strong></AboutItem>}
                            {profileUser.currentCity && <AboutItem iconName="map-pin">Lives in <strong>{profileUser.currentCity}</strong></AboutItem>}
                            {profileUser.hometown && <AboutItem iconName="home">From <strong>{profileUser.hometown}</strong></AboutItem>}
                            {profileUser.relationshipStatus && <AboutItem iconName="like">{profileUser.relationshipStatus}</AboutItem>}
                        </div>
                    </div>
                </aside>

                <main id="post-list-container" className="md:col-span-7 flex flex-col gap-8">
                     {posts.length > 0 ? posts.map((post, index) => (
                        <div key={post.id} className="w-full snap-center">
                            <PostCard 
                                post={post} 
                                currentUser={currentUser}
                                isActive={index === currentPostIndex}
                                isPlaying={isPlaying && index === currentPostIndex}
                                onPlayPause={() => {
                                    setIsPlaying(p => index === currentPostIndex ? !p : true);
                                    if(index !== currentPostIndex) {
                                        isProgrammaticScroll.current = true;
                                        setCurrentPostIndex(index);
                                    }
                                }}
                                onLike={onLikePost}
                                onViewPost={onViewPost}
                                onAuthorClick={() => {}}
                            />
                        </div>
                    )) : (
                      <div className="bg-slate-800 p-8 rounded-lg text-center text-slate-400">
                          <p>{profileUser.name} hasn't posted anything yet.</p>
                      </div>
                    )}
                </main>
            </div>
        </div>
    </div>
  );
};

export default ProfileScreen;