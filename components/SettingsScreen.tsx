
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';
import { User, ScrollState } from '../types';
import { geminiService } from '../services/geminiService';
import { TTS_PROMPTS } from '../constants';

interface SettingsScreenProps {
  currentUser: User;
  onUpdateSettings: (settings: Partial<User>) => Promise<void>;
  onUnblockUser: (user: User) => void;
  lastCommand: string | null;
  onSetTtsMessage: (message: string) => void;
  scrollState: ScrollState;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentUser, onUpdateSettings, onUnblockUser, lastCommand, onSetTtsMessage, scrollState }) => {
  // Profile info state
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [work, setWork] = useState(currentUser.work || '');
  const [education, setEducation] = useState(currentUser.education || '');
  const [currentCity, setCurrentCity] = useState(currentUser.currentCity || '');
  const [hometown, setHometown] = useState(currentUser.hometown || '');
  const [relationshipStatus, setRelationshipStatus] = useState(currentUser.relationshipStatus || 'Prefer not to say');

  // Privacy settings state
  const [postVisibility, setPostVisibility] = useState(currentUser.privacySettings.postVisibility);
  const [friendRequestPrivacy, setFriendRequestPrivacy] = useState(currentUser.privacySettings.friendRequestPrivacy);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    onSetTtsMessage(TTS_PROMPTS.settings_opened);
    
    // Fetch full user objects for blocked IDs
    const fetchBlockedUsers = async () => {
        const users = await Promise.all(
            currentUser.blockedUserIds.map(id => geminiService.getUserById(id))
        );
        setBlockedUsers(users.filter((u): u is User => u !== null));
    };
    fetchBlockedUsers();
  }, [currentUser.blockedUserIds, onSetTtsMessage]);

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

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    const updatedSettings: Partial<User> = {
      name,
      bio,
      work,
      education,
      currentCity,
      hometown,
      relationshipStatus,
      privacySettings: {
        postVisibility,
        friendRequestPrivacy,
      }
    };
    await onUpdateSettings(updatedSettings);
    setIsLoading(false);
  }, [name, bio, work, education, currentCity, hometown, relationshipStatus, postVisibility, friendRequestPrivacy, onUpdateSettings]);

  const handleCommand = useCallback(async (command: string) => {
    const intentResponse = await geminiService.processIntent(command);

    switch(intentResponse.intent) {
        case 'intent_save_settings':
            handleSave();
            break;
        case 'intent_update_profile':
            if (intentResponse.slots?.field && intentResponse.slots?.value) {
                const { field, value } = intentResponse.slots;
                if (typeof value !== 'string') return;
                
                const fieldSetterMap: Record<string, (val: string) => void> = {
                    name: setName,
                    bio: setBio,
                    work: setWork,
                    education: setEducation,
                    hometown: setHometown,
                    currentCity: setCurrentCity,
                    relationshipStatus: setRelationshipStatus as (val:string) => void,
                };

                const setter = fieldSetterMap[field as string];
                if(setter) {
                    setter(value);
                    onSetTtsMessage(`${field} updated. Say "save settings" to confirm.`);
                }
            }
            break;
        case 'intent_update_privacy':
             if (intentResponse.slots?.setting && intentResponse.slots?.value) {
                const { setting, value } = intentResponse.slots;
                if (setting === 'postVisibility' && (value === 'public' || value === 'friends')) {
                    setPostVisibility(value);
                    onSetTtsMessage(TTS_PROMPTS.privacy_setting_updated('Post visibility', value));
                } else if (setting === 'friendRequestPrivacy' && (value === 'everyone' || value === 'friends_of_friends')) {
                    setFriendRequestPrivacy(value);
                    onSetTtsMessage(TTS_PROMPTS.privacy_setting_updated('Friend request privacy', value));
                }
            }
            break;
        case 'intent_unblock_user':
            if (intentResponse.slots?.target_name) {
                const targetName = intentResponse.slots.target_name as string;
                const userToUnblock = blockedUsers.find(u => u.name.toLowerCase() === targetName.toLowerCase());
                if (userToUnblock) {
                    onUnblockUser(userToUnblock);
                }
            }
            break;
    }
  }, [handleSave, onSetTtsMessage, blockedUsers, onUnblockUser]);

  useEffect(() => {
    if(lastCommand) {
        handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);


  const SettingRow: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-3">
      <div className="flex items-center gap-4 w-full sm:w-1/3 flex-shrink-0">
          <div className="text-rose-400">{icon}</div>
          <h3 className="font-semibold text-slate-100">{title}</h3>
      </div>
      <div className="w-full sm:w-2/3">
        {children}
      </div>
    </div>
  );

  return (
    <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto p-4 sm:p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-100">Settings</h1>

        <section className="mb-10 bg-slate-800/50 rounded-xl">
          <h2 className="text-xl font-semibold text-rose-400 border-b border-slate-700 p-4 mb-2">Profile Information</h2>
          <div className="flex flex-col gap-2 p-4 divide-y divide-slate-700/50">
            <SettingRow icon={<Icon name="mic" className="w-6 h-6" />} title="Full Name">
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition" />
            </SettingRow>
            <SettingRow icon={<Icon name="logo" className="w-6 h-6" />} title="Bio">
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition" />
            </SettingRow>
            <SettingRow icon={<Icon name="briefcase" className="w-6 h-6" />} title="Work">
              <input type="text" value={work} onChange={e => setWork(e.target.value)} placeholder="Where do you work?" className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition" />
            </SettingRow>
             <SettingRow icon={<Icon name="academic-cap" className="w-6 h-6" />} title="Education">
              <input type="text" value={education} onChange={e => setEducation(e.target.value)} placeholder="Where did you study?" className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition" />
            </SettingRow>
             <SettingRow icon={<Icon name="map-pin" className="w-6 h-6" />} title="Current City">
              <input type="text" value={currentCity} onChange={e => setCurrentCity(e.target.value)} placeholder="Where do you live?" className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition" />
            </SettingRow>
             <SettingRow icon={<Icon name="home" className="w-6 h-6" />} title="Hometown">
              <input type="text" value={hometown} onChange={e => setHometown(e.target.value)} placeholder="Where are you from?" className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition" />
            </SettingRow>
            <SettingRow icon={<Icon name="like" className="w-6 h-6" />} title="Relationship">
                <select value={relationshipStatus} onChange={e => setRelationshipStatus(e.target.value as any)} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition">
                    <option>Prefer not to say</option>
                    <option>Single</option>
                    <option>In a relationship</option>
                    <option>Engaged</option>
                    <option>Married</option>
                    <option>It's complicated</option>
                </select>
            </SettingRow>
          </div>
        </section>

        <section className="mb-10 bg-slate-800/50 rounded-xl">
          <h2 className="text-xl font-semibold text-rose-400 border-b border-slate-700 p-4 mb-2">Privacy</h2>
           <div className="flex flex-col gap-2 p-4 divide-y divide-slate-700/50">
                <SettingRow icon={<Icon name="globe" className="w-6 h-6" />} title="Who can see your future posts?">
                    <select value={postVisibility} onChange={e => setPostVisibility(e.target.value as any)} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition">
                        <option value="public">Public</option>
                        <option value="friends">Friends</option>
                    </select>
                </SettingRow>
                 <SettingRow icon={<Icon name="users" className="w-6 h-6" />} title="Who can send you friend requests?">
                    <select value={friendRequestPrivacy} onChange={e => setFriendRequestPrivacy(e.target.value as any)} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition">
                        <option value="everyone">Everyone</option>
                        <option value="friends_of_friends">Friends of Friends</option>
                    </select>
                </SettingRow>
           </div>
        </section>

        <section className="mb-10 bg-slate-800/50 rounded-xl">
            <h2 className="text-xl font-semibold text-rose-400 border-b border-slate-700 p-4 mb-2">Blocking</h2>
            <div className="p-4">
                <p className="text-slate-400 mb-4">Once you block someone, that person can no longer see things you post on your timeline, tag you, invite you to events or groups, start a conversation with you, or add you as a friend. Say "block [name]" on their profile.</p>
                {blockedUsers.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {blockedUsers.map(u => (
                            <div key={u.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <img src={u.avatarUrl} alt={u.name} className="w-10 h-10 rounded-full" />
                                    <span className="font-semibold text-slate-200">{u.name}</span>
                                </div>
                                <button onClick={() => onUnblockUser(u)} className="px-4 py-1.5 rounded-md bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors">Unblock</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-400">You haven't blocked anyone.</p>
                )}
            </div>
        </section>
        
        <div className="flex justify-end mt-4">
            <button onClick={handleSave} disabled={isLoading} className="bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
                {isLoading ? 'Saving...' : 'Save All Settings'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
