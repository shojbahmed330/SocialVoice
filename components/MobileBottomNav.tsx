import React from 'react';
import { AppView } from '../types';
import Icon from './Icon';

interface MobileBottomNavProps {
    onNavigate: (viewName: 'feed' | 'friends' | 'profile' | 'messages') => void;
    onCreatePost: () => void;
    friendRequestCount: number;
    activeView: AppView;
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


const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onNavigate, onCreatePost, friendRequestCount, activeView }) => {
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
                        onClick={onCreatePost}
                        className="-mt-8 w-16 h-16 bg-rose-600 hover:bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-900/50 transition-transform hover:scale-105"
                        aria-label="Create new post"
                    >
                        <Icon name="mic" className="w-8 h-8"/>
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
