

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, ScrollState, FriendshipStatus } from '../types';
import { geminiService } from '../services/geminiService';
import { TTS_PROMPTS } from '../constants';
import Icon from './Icon';
import UserCard from './UserCard';

interface FriendsScreenProps {
  currentUser: User;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onOpenProfile: (userName: string) => void;
  scrollState: ScrollState;
}

type ActiveTab = 'requests' | 'suggestions' | 'all_friends';

const FriendsScreen: React.FC<FriendsScreenProps> = ({ currentUser, onSetTtsMessage, lastCommand, onOpenProfile, scrollState }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('requests');
  const [requests, setRequests] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [allFriends, setAllFriends] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [reqs, suggs, friends] = await Promise.all([
      geminiService.getFriendRequests(currentUser.id),
      geminiService.getRecommendedFriends(currentUser.id),
      geminiService.getFriendsList(currentUser.id),
    ]);
    setRequests(reqs);
    setSuggestions(suggs);
    setAllFriends(friends);
    setIsLoading(false);
    
    // Set initial tab based on data
    if (reqs.length > 0) {
        setActiveTab('requests');
    } else if (suggs.length > 0) {
        setActiveTab('suggestions');
    } else {
        setActiveTab('all_friends');
    }

  }, [currentUser.id]);

  useEffect(() => {
    fetchData();
    onSetTtsMessage(TTS_PROMPTS.friends_loaded);
  }, [fetchData, onSetTtsMessage]);

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

  const handleAccept = useCallback(async (requestingUser: User) => {
    await geminiService.acceptFriendRequest(currentUser.id, requestingUser.id);
    onSetTtsMessage(TTS_PROMPTS.friend_request_accepted(requestingUser.name));
    fetchData(); // Refresh all lists
  }, [currentUser.id, fetchData, onSetTtsMessage]);
  
  const handleDecline = useCallback(async (requestingUser: User) => {
    await geminiService.declineFriendRequest(currentUser.id, requestingUser.id);
    onSetTtsMessage(TTS_PROMPTS.friend_request_declined(requestingUser.name));
    fetchData(); // Refresh all lists
  }, [currentUser.id, fetchData, onSetTtsMessage]);
  
  const handleAddFriend = useCallback(async (targetUser: User) => {
    const result = await geminiService.addFriend(currentUser.id, targetUser.id);
     if (result.success) {
        onSetTtsMessage(TTS_PROMPTS.friend_request_sent(targetUser.name));
        fetchData(); // Refresh lists to show "Request Sent"
     } else {
         onSetTtsMessage(TTS_PROMPTS.friend_request_privacy_block(targetUser.name));
     }
  }, [currentUser.id, fetchData, onSetTtsMessage]);

  const handleCommand = useCallback(async (command: string) => {
    let contextUsers: User[] = [];
    if (activeTab === 'requests') contextUsers = requests;
    else if (activeTab === 'suggestions') contextUsers = suggestions;
    else if (activeTab === 'all_friends') contextUsers = allFriends;

    const intentResponse = await geminiService.processIntent(command, { userNames: contextUsers.map(u => u.name) });
    
    if (intentResponse.slots?.target_name) {
        const targetName = intentResponse.slots.target_name as string;
        // Find the user from our context list that Gemini picked
        const targetUser = contextUsers.find(r => r.name === targetName);

        if(targetUser) {
            if (intentResponse.intent === 'intent_accept_request') {
                handleAccept(targetUser);
            } else if (intentResponse.intent === 'intent_decline_request') {
                handleDecline(targetUser);
            } else if (intentResponse.intent === 'intent_add_friend') {
                handleAddFriend(targetUser);
            }
        }
    }
  }, [requests, suggestions, allFriends, activeTab, handleAccept, handleDecline, handleAddFriend]);

  useEffect(() => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);

  const renderContent = () => {
    if (isLoading) {
        return <div className="text-slate-400 text-center p-10">Loading...</div>;
    }
    
    let userList: User[] = [];
    if (activeTab === 'requests') userList = requests;
    if (activeTab === 'suggestions') userList = suggestions;
    if (activeTab === 'all_friends') userList = allFriends;

    if (userList.length === 0) {
        return <div className="text-slate-400 text-center p-10 bg-slate-800 rounded-b-lg">No users to show in this list.</div>
    }

    return (
        <div className="flex flex-col gap-4 p-4 bg-slate-800 rounded-b-lg">
            {userList.map(user => (
                <UserCard key={user.id} user={user} onProfileClick={onOpenProfile}>
                    {activeTab === 'requests' && (
                        <>
                           <button onClick={() => handleDecline(user)} className="px-3 py-2 text-sm rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors">Decline</button>
                           <button onClick={() => handleAccept(user)} className="px-3 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors">Accept</button>
                        </>
                    )}
                     {activeTab === 'suggestions' && (
                        <>
                            {user.friendshipStatus === FriendshipStatus.REQUEST_SENT ? (
                               <button disabled className="px-3 py-2 text-sm rounded-lg bg-slate-500 text-slate-300 font-semibold cursor-not-allowed">Sent</button>
                            ) : (
                               <button onClick={() => handleAddFriend(user)} className="px-3 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors flex items-center gap-2">
                                   <Icon name="add-friend" className="w-5 h-5" /> Add Friend
                               </button>
                            )}
                        </>
                    )}
                    {activeTab === 'all_friends' && (
                        <button onClick={() => onOpenProfile(user.name)} className="px-3 py-2 text-sm rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors">View Profile</button>
                    )}
                </UserCard>
            ))}
        </div>
    )
  }
  
  const TabButton: React.FC<{tabId: ActiveTab; label: string; count: number;}> = ({ tabId, label, count }) => (
    <button 
        onClick={() => setActiveTab(tabId)}
        className={`px-4 py-3 font-semibold text-lg border-b-4 transition-colors ${activeTab === tabId ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
    >
        {label} {count > 0 && <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${activeTab === tabId ? 'bg-rose-500 text-white' : 'bg-slate-600 text-slate-200'}`}>{count}</span>}
    </button>
  );

  return (
    <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-slate-100">Friends</h1>
        
        <div className="border-b border-slate-700 flex items-center">
            <TabButton tabId="requests" label="Friend Requests" count={requests.length} />
            <TabButton tabId="suggestions" label="Suggestions" count={suggestions.length} />
            <TabButton tabId="all_friends" label="All Friends" count={allFriends.length} />
        </div>
        
        {renderContent()}

      </div>
    </div>
  );
};

export default FriendsScreen;
