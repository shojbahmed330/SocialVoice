
import React from 'react';
import { Campaign } from '../types';
import Icon from './Icon';

interface RewardedAdWidgetProps {
    campaign: Campaign | null;
    onAdClick: (campaign: Campaign) => void;
}

const RewardedAdWidget: React.FC<RewardedAdWidgetProps> = ({ campaign, onAdClick }) => {
    
    if (!campaign) {
        return (
            <div className="bg-gradient-to-br from-emerald-800 to-teal-800 rounded-2xl p-4 w-full max-w-lg mx-auto border border-emerald-600/50 animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 p-3 bg-yellow-400/20 rounded-full">
                        <div className="h-10 w-10 bg-yellow-400/30 rounded-full"></div>
                    </div>
                    <div className="flex-grow space-y-2">
                        <div className="h-4 bg-emerald-700 rounded w-3/4"></div>
                        <div className="h-3 bg-emerald-700 rounded w-1/2"></div>
                    </div>
                    <div className="flex-shrink-0 bg-yellow-500/50 h-12 w-32 rounded-lg"></div>
                </div>
            </div>
        );
    }

    const handleClaim = () => {
        onAdClick(campaign);
    };

    const getButtonText = () => {
        if (campaign.websiteUrl) return "Visit Site & Earn";
        if (campaign.allowDirectMessage) return "Message & Earn";
        return "Watch Ad & Earn";
    };

    const mediaUrl = campaign.videoUrl || campaign.imageUrl || campaign.audioUrl;

    return (
        <div className="bg-gradient-to-br from-emerald-800 to-teal-800 rounded-2xl p-4 w-full max-w-lg mx-auto border border-emerald-600/50">
            <div className="flex items-start gap-4">
                 <div className="flex-shrink-0 bg-slate-700 rounded-lg w-16 h-16 flex items-center justify-center">
                    {mediaUrl ? (
                         campaign.imageUrl ? <img src={mediaUrl} alt={campaign.sponsorName} className="w-full h-full object-cover rounded-lg" /> : <Icon name="speaker-wave" className="w-8 h-8 text-emerald-300" />
                    ) : <Icon name="briefcase" className="w-8 h-8 text-emerald-300" />}
                </div>
                <div className="flex-grow">
                    <p className="text-xs text-yellow-300 font-bold uppercase tracking-wider">Ad · Get Free Coins</p>
                    <h3 className="font-bold text-lg text-white">{campaign.sponsorName}</h3>
                    <p className="text-sm text-emerald-200 mt-1">{campaign.caption}</p>
                </div>
            </div>
             <div className="mt-4 flex justify-end">
                <button
                    onClick={handleClaim}
                    className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold px-5 py-3 rounded-lg transition-colors text-center"
                >
                    {getButtonText()}
                </button>
            </div>
        </div>
    );
};

export default RewardedAdWidget;
