
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Campaign } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';
import { SPONSOR_CPM_BDT } from '../constants';
import PaymentModal from './PaymentModal';

interface SponsorCenterScreenProps {
  currentUser: User;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onCommandProcessed: () => void;
}

type MediaType = 'image' | 'video' | 'audio';

const StatCard: React.FC<{ title: string, value: string, iconName: React.ComponentProps<typeof Icon>['name'], color: string }> = ({ title, value, iconName, color }) => (
    <div className="bg-slate-800 p-4 rounded-lg flex items-center gap-4">
        <div className={`p-3 rounded-full ${color}`}>
            <Icon name={iconName} className="w-6 h-6 text-white"/>
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-xl font-bold text-slate-100">{value}</p>
        </div>
    </div>
);

const SponsorCenterScreen: React.FC<SponsorCenterScreenProps> = ({ currentUser, onSetTtsMessage, lastCommand, onCommandProcessed }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [sponsorName, setSponsorName] = useState('');
    const [caption, setCaption] = useState('');
    const [budget, setBudget] = useState<number | string>('');
    const [mediaType, setMediaType] = useState<MediaType>('image');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [allowDirectMessage, setAllowDirectMessage] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Payment flow state
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [pendingCampaignData, setPendingCampaignData] = useState<Omit<Campaign, 'id'|'views'|'clicks'|'status'|'transactionId'> | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const submitButtonRef = useRef<HTMLButtonElement>(null);


    const fetchCampaigns = useCallback(async () => {
        setIsLoading(true);
        const fetchedCampaigns = await geminiService.getCampaignsForSponsor(currentUser.id);
        setCampaigns(fetchedCampaigns);
        setIsLoading(false);
    }, [currentUser.id]);

    useEffect(() => {
        onSetTtsMessage("Welcome to the Sponsor Center. Say 'create a new campaign' or 'show my campaigns'.");
        fetchCampaigns();
    }, [onSetTtsMessage, fetchCampaigns]);
    
    const handleCommand = useCallback(async (command: string) => {
        try {
            const intentResponse = await geminiService.processIntent(command);
            const { intent, slots } = intentResponse;

            switch (intent) {
                case 'intent_create_campaign':
                    setActiveTab('create');
                    onSetTtsMessage("Okay, let's create a new campaign. You can say 'set sponsor name', 'set budget', 'set caption', or 'set media type'.");
                    break;
                case 'intent_view_campaign_dashboard':
                    setActiveTab('dashboard');
                    onSetTtsMessage("Viewing your campaign dashboard.");
                    break;
                case 'intent_set_sponsor_name':
                    if (slots?.sponsor_name && typeof slots.sponsor_name === 'string') {
                        setSponsorName(slots.sponsor_name);
                        onSetTtsMessage(`Sponsor name set to: ${slots.sponsor_name}`);
                    }
                    break;
                case 'intent_set_campaign_caption':
                    if (slots?.caption_text && typeof slots.caption_text === 'string') {
                        setCaption(slots.caption_text);
                        onSetTtsMessage(`Campaign caption has been set.`);
                    }
                    break;
                case 'intent_set_campaign_budget':
                     if (slots?.budget_amount) {
                        const newBudget = String(slots.budget_amount).replace(/[^0-9]/g, '');
                        setBudget(newBudget);
                        onSetTtsMessage(`Budget set to ${newBudget} Taka.`);
                    }
                    break;
                case 'intent_set_media_type':
                    const newType = slots?.media_type as MediaType;
                    if (newType && ['image', 'video', 'audio'].includes(newType)) {
                        setMediaType(newType);
                        onSetTtsMessage(`Media type set to ${newType}. Please click to upload the file manually.`);
                    }
                    break;
                case 'intent_launch_campaign':
                     onSetTtsMessage("Attempting to launch the campaign...");
                     submitButtonRef.current?.click();
                     break;
            }
        } catch (error) {
            console.error("Error processing command in SponsorCenterScreen:", error);
        } finally {
            onCommandProcessed();
        }
    }, [onSetTtsMessage, onCommandProcessed]);

    useEffect(() => {
        if(lastCommand) {
            handleCommand(lastCommand);
        }
    }, [lastCommand, handleCommand]);

    const resetForm = () => {
        setSponsorName('');
        setCaption('');
        setBudget('');
        setMediaType('image');
        setMediaFile(null);
        setMediaPreviewUrl(null);
        setWebsiteUrl('');
        setAllowDirectMessage(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaPreviewUrl(reader.result as string);
            }
            reader.readAsDataURL(file);
        }
    };

    const handleProceedToPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sponsorName || !caption || !mediaPreviewUrl || !budget) {
            onSetTtsMessage("Please fill out all fields and upload a media file before launching.");
            alert("Please fill out all fields and upload a media file.");
            return;
        }
        
        const campaignData: Omit<Campaign, 'id'|'views'|'clicks'|'status'|'transactionId'> = {
            sponsorId: currentUser.id,
            sponsorName,
            caption,
            budget: Number(budget),
            imageUrl: mediaType === 'image' ? mediaPreviewUrl : undefined,
            audioUrl: mediaType === 'audio' ? mediaPreviewUrl : undefined,
            videoUrl: mediaType === 'video' ? mediaPreviewUrl : undefined,
            websiteUrl: websiteUrl || undefined,
            allowDirectMessage,
        };
        
        setPendingCampaignData(campaignData);
        setIsPaymentModalOpen(true);
        onSetTtsMessage(`Proceeding to payment for ৳${budget}. Please complete the transaction.`);
    }

    const handlePaymentSubmit = async (transactionId: string) => {
        if (!pendingCampaignData) return;
        
        setIsPaymentModalOpen(false);
        setIsSubmitting(true);
        onSetTtsMessage("Submitting your campaign for verification...");
        
        await geminiService.submitCampaignForApproval(pendingCampaignData, transactionId);
        
        setIsSubmitting(false);
        setPendingCampaignData(null);
        resetForm();
        await fetchCampaigns();
        setActiveTab('dashboard');
        onSetTtsMessage("Your campaign has been submitted for approval. You will receive a notification shortly.");
    };

    const getStatusStyles = (status: Campaign['status']) => {
        switch (status) {
            case 'active':
                return 'bg-green-500/20 text-green-400';
            case 'pending':
                return 'bg-yellow-500/20 text-yellow-400';
            case 'finished':
                return 'bg-slate-500/20 text-slate-400';
            case 'rejected':
                return 'bg-red-500/20 text-red-400';
        }
    }

    const renderDashboard = () => {
        if (isLoading) return <p className="text-slate-400">Loading campaigns...</p>;
        if (campaigns.length === 0) {
            return (
                <div className="text-center py-12">
                    <Icon name="briefcase" className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-slate-300">No campaigns yet</h3>
                    <p className="text-slate-400 mt-2">Say or click 'Create New Campaign' to get started.</p>
                </div>
            )
        }
        return (
            <div className="space-y-6">
                {campaigns.map(campaign => {
                    const costSoFar = (campaign.views / 1000) * SPONSOR_CPM_BDT;
                    const budgetRemaining = campaign.budget - costSoFar;
                    const mediaUrl = campaign.videoUrl || campaign.imageUrl || campaign.audioUrl;

                    return (
                        <div key={campaign.id} className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
                            <div className="flex flex-col md:flex-row gap-4">
                                {mediaUrl && (
                                    <div className="w-full md:w-40 h-40 bg-slate-700 rounded-md flex-shrink-0">
                                        {campaign.videoUrl ? (
                                            <video src={mediaUrl} muted loop className="w-full h-full object-cover rounded-md"/>
                                        ) : campaign.imageUrl ? (
                                             <img src={mediaUrl} alt={campaign.sponsorName} className="w-full h-full object-cover rounded-md" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Icon name="speaker-wave" className="w-12 h-12 text-slate-500" />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-100">{campaign.sponsorName}</h3>
                                            <p className="text-slate-400 mt-1">{campaign.caption}</p>
                                        </div>
                                        <span className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${getStatusStyles(campaign.status)}`}>
                                            {campaign.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                                        <StatCard title="Impressions" value={campaign.views.toLocaleString()} iconName="users" color="bg-sky-500/80"/>
                                        <StatCard title="Clicks" value={campaign.clicks.toLocaleString()} iconName="logo" color="bg-rose-500/80"/>
                                        <StatCard title="Budget" value={`৳${campaign.budget.toLocaleString()}`} iconName="coin" color="bg-emerald-500/80"/>
                                        <StatCard title="Budget Left" value={`৳${Math.max(0, budgetRemaining).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} iconName="coin" color="bg-yellow-500/80"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    };

    const renderCreateForm = () => (
        <form onSubmit={handleProceedToPayment} className="space-y-6 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <div>
                <label htmlFor="sponsorName" className="block mb-2 text-sm font-medium text-slate-300">Sponsor/Brand Name</label>
                <input type="text" id="sponsorName" value={sponsorName} onChange={e => setSponsorName(e.target.value)} required className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition" />
            </div>
            <div>
                <label htmlFor="caption" className="block mb-2 text-sm font-medium text-slate-300">Ad Caption</label>
                <textarea id="caption" value={caption} onChange={e => setCaption(e.target.value)} required rows={3} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition"></textarea>
            </div>
             <div>
                <label className="block mb-2 text-sm font-medium text-slate-300">Media Type</label>
                <div className="flex gap-4">
                    {(['image', 'video', 'audio'] as MediaType[]).map(type => (
                        <label key={type} className="flex items-center gap-2 text-slate-200">
                            <input type="radio" name="mediaType" value={type} checked={mediaType === type} onChange={() => setMediaType(type)} className="w-4 h-4 text-rose-600 bg-gray-700 border-gray-600 focus:ring-rose-500" />
                            <span className="capitalize">{type}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div>
                <label htmlFor="mediaFile" className="block mb-2 text-sm font-medium text-slate-300">Upload Media (Manual Click Required)</label>
                <input ref={fileInputRef} type="file" id="mediaFile" onChange={handleFileChange} accept={`${mediaType}/*`} required className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"/>
            </div>

            {mediaPreviewUrl && (
                <div>
                    <label className="block mb-2 text-sm font-medium text-slate-300">Preview</label>
                    <div className="bg-slate-700 rounded-lg p-2 flex items-center justify-center h-48">
                        {mediaType === 'image' && <img src={mediaPreviewUrl} className="max-h-full max-w-full object-contain" alt="Preview"/>}
                        {mediaType === 'video' && <video src={mediaPreviewUrl} controls className="max-h-full max-w-full" />}
                        {mediaType === 'audio' && <audio src={mediaPreviewUrl} controls />}
                    </div>
                </div>
            )}

             <div>
                <label htmlFor="budget" className="block mb-2 text-sm font-medium text-slate-300">Total Budget (in BDT)</label>
                <input type="number" id="budget" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g., 5000" min="500" required className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition" />
                <p className="text-xs text-slate-400 mt-2">Based on a CPM of ৳{SPONSOR_CPM_BDT}, this budget will give you approximately {Number(budget) > 0 ? Math.floor((Number(budget) / SPONSOR_CPM_BDT) * 1000).toLocaleString() : 0} views.</p>
            </div>

            <div className="border-t border-slate-700 pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Ad Actions (Optional)</h3>
                <div>
                    <label htmlFor="websiteUrl" className="block mb-2 text-sm font-medium text-slate-300">Website URL</label>
                    <input type="url" id="websiteUrl" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://example.com" className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition" />
                    <p className="text-xs text-slate-400 mt-1">If provided, users clicking your ad will be sent to this site.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="checkbox" id="allowDirectMessage" checked={allowDirectMessage} onChange={e => setAllowDirectMessage(e.target.checked)} className="w-5 h-5 text-rose-600 bg-gray-700 border-gray-600 rounded focus:ring-rose-500"/>
                    <label htmlFor="allowDirectMessage" className="text-sm font-medium text-slate-300">Allow users to send you a direct message</label>
                </div>
            </div>

            <div className="flex justify-end">
                 <button ref={submitButtonRef} type="submit" disabled={isSubmitting || !budget} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
                    {isSubmitting ? 'Submitting...' : `Proceed to Payment (৳${Number(budget || 0).toLocaleString()})`}
                </button>
            </div>
        </form>
    );

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-4 text-slate-100">Sponsor Center</h1>
                <p className="text-slate-400 mb-8">Create and manage your ad campaigns on VoiceBook.</p>
                
                <div className="border-b border-slate-700 flex items-center mb-6">
                    <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-3 font-semibold text-lg border-b-4 transition-colors ${activeTab === 'dashboard' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                        Dashboard
                    </button>
                    <button onClick={() => setActiveTab('create')} className={`px-4 py-3 font-semibold text-lg border-b-4 transition-colors ${activeTab === 'create' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                        Create New Campaign
                    </button>
                </div>

                {activeTab === 'dashboard' ? renderDashboard() : renderCreateForm()}
            </div>
            
            {isPaymentModalOpen && pendingCampaignData && (
                <PaymentModal
                    amount={pendingCampaignData.budget}
                    onClose={() => {
                        setIsPaymentModalOpen(false);
                        setPendingCampaignData(null);
                        onSetTtsMessage("Payment cancelled.");
                    }}
                    onPaymentSubmit={handlePaymentSubmit}
                />
            )}
        </div>
    )
};

export default SponsorCenterScreen;
