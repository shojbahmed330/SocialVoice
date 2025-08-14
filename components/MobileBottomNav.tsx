import React from 'react';
import { AppView, VoiceState } from '../types';
import Icon from './Icon';

interface MobileBottomNavProps {
    onNavigate: (viewName: 'feed' | 'friends' | 'profile' | 'messages') => void;
    friendRequestCount: number;
    activeView: AppView;
    voiceState: VoiceState;
    onMicClick: () => void;
}

const NavItem: React.FC<{
    iconName: React.ComponentProps<typeof Icon>['name'];
    label: string;
    isActive: boolean;
    badgeCount?: number;
    onClick: () => void;
}> = ({ iconName, label, isActive, badgeCount = 0, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
                isActive ? 'text-rose-400' : 'text-slate-400 hover:text-white'
            }`}
        >
            <div className="relative">
                <Icon name={iconName} className="w-7 h-7" />
                {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white border border-slate-900">{badgeCount}</span>
                )}
            </div>
            <span className="text-xs">{label}</span>
        </button>
    );
};


const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onNavigate, friendRequestCount, activeView, voiceState, onMicClick }) => {
    const getFabClass = () => {
        let base = "-mt-8 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-900/50 transition-all duration-300 ease-in-out";
        switch (voiceState) {
            case VoiceState.LISTENING:
                return `${base} bg-rose-500 ring-4 ring-rose-500/50 animate-pulse`;
            case VoiceState.PROCESSING:
                return `${base} bg-yellow-600 cursor-not-allowed`;
            default: // IDLE
                return `${base} bg-rose-600 hover:bg-rose-500 hover:scale-105`;
        }
    };

    const getFabIcon = () => {
        switch (voiceState) {
            case VoiceState.PROCESSING:
                return <Icon name="logo" className="w-8 h-8 animate-spin" />;
            case VoiceState.LISTENING:
            default:
                return <Icon name="mic" className="w-8 h-8" />;
        }
    };
    
    return (
        <div className="fixed bottom-0 left-0 right-0 h-24 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 z-40 md:hidden">
            <div className="flex justify-around items-center h-full">
                <NavItem
                    iconName="home"
                    label="Home"
                    isActive={activeView === AppView.FEED}
                    onClick={() => onNavigate('feed')}
                />
                 <NavItem
                    iconName="users"
                    label="Friends"
                    isActive={activeView === AppView.FRIENDS}
                    badgeCount={friendRequestCount}
                    onClick={() => onNavigate('friends')}
                />

                <div className="w-1/5 flex justify-center">
                    <button
                        onClick={onMicClick}
                        disabled={voiceState === VoiceState.PROCESSING}
                        className={getFabClass()}
                        aria-label="Activate voice command"
                    >
                        {getFabIcon()}
                    </button>
                </div>
                
                 <NavItem
                    iconName="message"
                    label="Messages"
                    isActive={activeView === AppView.MESSAGES || activeView === AppView.CONVERSATIONS}
                    onClick={() => onNavigate('messages')}
                />
                 <NavItem
                    iconName="edit"
                    label="Profile"
                    isActive={activeView === AppView.PROFILE}
                    onClick={() => onNavigate('profile')}
                />
            </div>
        </div>
    );
};

export default MobileBottomNav;