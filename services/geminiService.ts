
import { NLUResponse, User, Post, FriendshipStatus, Message, Comment, Notification, Conversation, ChatSettings, Campaign, AdminUser } from '../types';
import { MOCK_POSTS, MOCK_USERS, MOCK_MESSAGES, SPONSOR_CPM_BDT, MOCK_ADMINS } from '../constants';

// IMPORTANT: This service uses a mock implementation for demonstration.
// A real application would have robust API calls to a secure backend.

// Gemini API calls are now routed through a secure serverless proxy.

let MOCK_NOTIFICATIONS: Notification[] = [];
let MOCK_CAMPAIGNS: Campaign[] = [
    {
        id: 'camp_1',
        sponsorId: 'u_2', // Shojib Khan is sponsoring
        sponsorName: 'Audiophile Headphones',
        caption: 'Experience sound like never before. Our new noise-cancelling headphones are here. Get yours today!',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2070&auto=format&fit=crop',
        budget: 5000, // 5000 BDT
        views: 10500,
        clicks: 150,
        status: 'finished',
        websiteUrl: 'https://www.beatsbydre.com/',
    },
    {
        id: 'camp_2',
        sponsorId: 'u_1',
        sponsorName: 'Travel Bangladesh',
        caption: 'Explore the hidden gems of Bangladesh. Unforgettable tours await. Book your next adventure!',
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        budget: 8000,
        views: 15200,
        clicks: 340,
        status: 'active',
        allowDirectMessage: true,
    }
];

// --- String Similarity Helper (Fuzzy Search) ---
// Using Dice's Coefficient - good for finding similarity between two strings.
function stringSimilarity(str1: string, str2: string): number {
    str1 = str1.toLowerCase().replace(/\s+/g, '');
    str2 = str2.toLowerCase().replace(/\s+/g, '');

    if (str1 === str2) return 1;
    if (str1.length < 2 || str2.length < 2) return 0;

    const firstBigrams = new Map<string, number>();
    for (let i = 0; i < str1.length - 1; i++) {
        const bigram = str1.substring(i, i + 2);
        const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram)! + 1 : 1;
        firstBigrams.set(bigram, count);
    }

    let intersectionSize = 0;
    for (let i = 0; i < str2.length - 1; i++) {
        const bigram = str2.substring(i, i + 2);
        const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram)! : 0;
        if (count > 0) {
            firstBigrams.set(bigram, count - 1);
            intersectionSize++;
        }
    }
    return (2.0 * intersectionSize) / (str1.length + str2.length - 2);
}


export const geminiService = {
    async processIntent(command: string, context?: { userNames?: string[] }): Promise<NLUResponse> {
        const isOffline = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isOffline) {
            // Basic fallback for offline testing
            console.warn("Offline mode detected. Using basic intent matching.");
            const lower = command.toLowerCase();
            if (lower.includes('login')) return { intent: 'intent_login' };
            if (lower.includes('signup')) return { intent: 'intent_signup' };
            if (lower.includes('next')) return { intent: 'intent_next_post' };
            if (lower.includes('back')) return { intent: 'intent_go_back'};
            if (lower.includes('scroll up') || lower.includes('opore scroll')) return { intent: 'intent_scroll_up' };
            if (lower.includes('scroll off') || lower.includes('stop scroll')) return { intent: 'intent_stop_scroll' };
            if (lower.includes('scroll')) return { intent: 'intent_scroll_down' }; // Catches 'scroll' and 'scroll down'
            if (lower.includes('block')) return { intent: 'intent_block_user', slots: { target_name: lower.replace('block', '').trim() }};
            if (lower.includes('friends')) return { intent: 'intent_open_friends_page' };
            if (lower.includes('messages')) return { intent: 'intent_open_messages' };
            if (lower.includes('my profile')) return { intent: 'intent_open_profile' };
            if (lower.includes('reward') || lower.includes('coin')) return { intent: 'intent_claim_reward' };
            if (lower.includes('sponsor')) return { intent: 'intent_open_sponsor_center' };
            return { intent: 'unknown' };
        }

        // The new logic: call the serverless function
        try {
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'processIntent',
                    payload: { command, context },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error from proxy server:", errorData.details || errorData.error);
                return { intent: 'unknown' };
            }

            const data = await response.json();
            return data as NLUResponse;

        } catch (error) {
            console.error("Error calling proxy server for intent processing:", error);
            return { intent: 'unknown' };
        }
    },

    // Mock Backend Functions
    async login(name: string, pass: string): Promise<User | null> {
        console.log(`Attempting login for spoken name: "${name}"`);
        
        const matches = MOCK_USERS.map(user => ({
            user,
            score: stringSimilarity(user.name, name)
        })).sort((a, b) => b.score - a.score);

        const bestMatch = matches[0];
        
        // Use a threshold to avoid incorrect matches
        const SIMILARITY_THRESHOLD = 0.6; 
        if (bestMatch && bestMatch.score >= SIMILARITY_THRESHOLD) {
           console.log(`Best match found: "${bestMatch.user.name}" with score ${bestMatch.score}`);
           if (bestMatch.user.isBanned) {
               console.log(`Login failed for ${bestMatch.user.name}: User is banned.`);
               return new Promise(resolve => setTimeout(() => resolve(null), 500));
           }
           // In a real app, you would check the password here.
           return new Promise(resolve => setTimeout(() => resolve(bestMatch.user), 500));
        }
        
        console.log(`No user found with a similarity score above ${SIMILARITY_THRESHOLD} for "${name}".`);
        return new Promise(resolve => setTimeout(() => resolve(null), 500));
    },

    async signup(name: string, pass: string): Promise<User | null> {
        console.log(`Attempting signup for ${name} with password ${pass}`);
        const existing = MOCK_USERS.find(u => u.name.toLowerCase().trim() === name.toLowerCase().trim());
        if(existing) return null; // User already exists
        const newUser: User = {
            id: `u_${Date.now()}`,
            name: name,
            avatarUrl: `https://picsum.photos/seed/${name}/100/100`,
            coverPhotoUrl: `https://picsum.photos/seed/${name}_cover/800/300`,
            bio: 'Just joined VoiceBook!',
            friendshipStatus: FriendshipStatus.NOT_FRIENDS,
            privacySettings: {
                postVisibility: 'public',
                friendRequestPrivacy: 'everyone',
            },
            blockedUserIds: [],
            voiceCoins: 5, // Welcome gift
            role: 'user',
            isBanned: false,
        };
        MOCK_USERS.push(newUser);
        return new Promise(resolve => setTimeout(() => resolve(newUser), 500));
    },
    
    async updateProfile(userId: string, updates: Partial<User>): Promise<User | null> {
        const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            // This merges top-level fields and the nested privacySettings object
            const updatedUser = {
                ...MOCK_USERS[userIndex],
                ...updates,
                privacySettings: {
                    ...MOCK_USERS[userIndex].privacySettings,
                    ...updates.privacySettings,
                }
            };
            MOCK_USERS[userIndex] = updatedUser;
            return new Promise(resolve => setTimeout(() => resolve(MOCK_USERS[userIndex]), 300));
        }
        return null;
    },

    async getUserProfile(name: string): Promise<User | null> {
        const matches = MOCK_USERS.map(user => ({
            user,
            score: stringSimilarity(user.name, name)
        })).sort((a, b) => b.score - a.score);

        const bestMatch = matches[0];
        const SIMILARITY_THRESHOLD = 0.6;
        
        if (bestMatch && bestMatch.score >= SIMILARITY_THRESHOLD) {
            return new Promise(resolve => setTimeout(() => resolve(bestMatch.user), 300));
        }
        return new Promise(resolve => setTimeout(() => resolve(null), 300));
    },
    
    async getUserById(userId: string): Promise<User | null> {
        const foundUser = MOCK_USERS.find(u => u.id === userId);
        return new Promise(resolve => setTimeout(() => resolve(foundUser || null), 100));
    },

    async getPostsByUser(userId: string): Promise<Post[]> {
        const userPosts = MOCK_POSTS.filter(p => p.author.id === userId);
        return new Promise(resolve => setTimeout(() => resolve(userPosts), 500));
    },
    
    async getPostById(postId: string): Promise<Post | null> {
        const post = MOCK_POSTS.find(p => p.id === postId);
        if (post) return new Promise(resolve => setTimeout(() => resolve(post), 200));

        // It might be a sponsored post that's not in the main MOCK_POSTS list
        const campaign = MOCK_CAMPAIGNS.find(c => `camp_${c.id}` === postId);
        if (campaign) {
            const adPost = this.campaignToPost(campaign);
            return new Promise(resolve => setTimeout(() => resolve(adPost), 200));
        }

        return new Promise(resolve => setTimeout(() => resolve(null), 200));
    },
    
    async addFriend(currentUserId: string, targetUserId: string): Promise<{success: boolean, reason?: string}> {
        const targetUser = MOCK_USERS.find(u => u.id === targetUserId);
        const currentUser = MOCK_USERS.find(u => u.id === currentUserId);

        if(targetUser && currentUser) {
            // In a real app, you would check the target user's settings on the backend
            if (targetUser.privacySettings.friendRequestPrivacy === 'friends_of_friends') {
                 return new Promise(resolve => setTimeout(() => resolve({success: false, reason: 'friends_of_friends'}), 400));
            }
            // Mock sending request
            targetUser.friendshipStatus = FriendshipStatus.PENDING_APPROVAL;
            // The sender should see "Request Sent"
             const selfViewOfTarget = MOCK_USERS.find(u => u.id === targetUserId);
             if(selfViewOfTarget) selfViewOfTarget.friendshipStatus = FriendshipStatus.REQUEST_SENT;
            
            return new Promise(resolve => setTimeout(() => resolve({success: true}), 400));
        }
        return new Promise(resolve => setTimeout(() => resolve({success: false}), 400));
    },

    campaignToPost(campaign: Campaign): Post {
        return {
            id: `camp_${campaign.id}`,
            campaignId: campaign.id,
            author: MOCK_USERS.find(u => u.id === campaign.sponsorId) || MOCK_USERS[4], // Use sponsor as author, fallback
            isSponsored: true,
            sponsorName: campaign.sponsorName,
            sponsorId: campaign.sponsorId,
            audioUrl: campaign.audioUrl || '#',
            videoUrl: campaign.videoUrl,
            caption: campaign.caption,
            duration: campaign.audioUrl ? 30 : 0, // Mock duration for audio ads
            createdAt: new Date().toISOString(),
            likeCount: 0,
            commentCount: 0,
            comments: [],
            likedBy: [],
            imageUrl: campaign.imageUrl,
            websiteUrl: campaign.websiteUrl,
            allowDirectMessage: campaign.allowDirectMessage,
        };
    },

    async getFeed(currentUserId: string): Promise<Post[]> {
        const AD_INTERVAL = 8; // Show an ad after every 8 organic posts
        const currentUser = MOCK_USERS.find(u => u.id === currentUserId);
        if (!currentUser) return [];

        let organicFeed = MOCK_POSTS.filter(post => {
            if (currentUser.blockedUserIds.includes(post.author.id)) return false;
            const author = MOCK_USERS.find(u => u.id === post.author.id);
            if(author?.blockedUserIds.includes(currentUserId) || author?.isBanned) return false;
            if (post.author.privacySettings.postVisibility === 'friends') {
                return post.author.friendshipStatus === FriendshipStatus.FRIENDS || post.author.id === currentUserId;
            }
            return true; // Public post
        });
        
        const finalFeed: Post[] = [];
        
        // --- Ad Injection Logic ---
        const activeCampaigns = MOCK_CAMPAIGNS.filter(c => {
            if (c.status !== 'active') return false;
            const costSoFar = (c.views / 1000) * SPONSOR_CPM_BDT;
            return c.budget > costSoFar;
        });

        for (let i = 0; i < organicFeed.length; i++) {
            finalFeed.push(organicFeed[i]);
            // After pushing an organic post, check if it's time to insert an ad
            if ((i + 1) % AD_INTERVAL === 0 && activeCampaigns.length > 0) {
                // Pick a random active campaign
                const randomCampaign = activeCampaigns[Math.floor(Math.random() * activeCampaigns.length)];
                const adPost = this.campaignToPost(randomCampaign);
                finalFeed.push(adPost);
            }
        }
        // --- End Ad Injection ---

        return new Promise(resolve => setTimeout(() => resolve(finalFeed), 1200));
    },

    async createPost(user: User, duration: number, caption: string = '', imageUrl?: string, imagePrompt?: string): Promise<Post> {
        const newPost: Post = {
            id: `p_${Date.now()}`,
            author: user,
            audioUrl: '#',
            caption: caption || 'A new voice post.',
            duration: duration,
            createdAt: new Date().toISOString(),
            likeCount: 0,
            commentCount: 0,
            comments: [],
            likedBy: [],
            imageUrl,
            imagePrompt,
        };
        MOCK_POSTS.unshift(newPost);
        return new Promise(resolve => setTimeout(() => resolve(newPost), 1000));
    },

    async generateImageForPost(prompt: string): Promise<string | null> {
        const isOffline = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isOffline) {
            console.warn("Offline mode, returning placeholder image.");
            return `https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=2070&auto=format&fit=crop`;
        }
        
        try {
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'generateImage',
                    payload: { prompt },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error from proxy server for image generation:", errorData.details || errorData.error);
                return null;
            }

            const data = await response.json();
            return data.imageUrl || null;

        } catch (error) {
            console.error("Error calling proxy server for image generation:", error);
            return null;
        }
    },
    
    async createComment(user: User, postId: string, duration: number): Promise<Comment | null> {
        // Check for commenting suspension
        if (user.commentingSuspendedUntil && new Date(user.commentingSuspendedUntil) > new Date()) {
            console.log(`User ${user.name} is suspended from commenting.`);
            return Promise.resolve(null);
        }

        const post = MOCK_POSTS.find(p => p.id === postId);
        if (post) {
            const newComment: Comment = {
                id: `c_${Date.now()}`,
                postId: postId,
                author: user,
                audioUrl: '#',
                duration: duration,
                createdAt: new Date().toISOString(),
            };
            post.comments.unshift(newComment);
            post.commentCount++;
            return new Promise(resolve => setTimeout(() => resolve(newComment), 500));
        }
        return new Promise(resolve => setTimeout(() => resolve(null), 500));
    },

    async likePost(userId: string, postId: string): Promise<boolean> {
        const post = MOCK_POSTS.find(p => p.id === postId);
        const user = MOCK_USERS.find(u => u.id === userId);
        if (post && user) {
            if (!post.likedBy.some(u => u.id === userId)) {
                post.likeCount++;
                post.likedBy.push(user);
                return new Promise(resolve => setTimeout(() => resolve(true), 300));
            }
        }
        return new Promise(resolve => setTimeout(() => resolve(false), 300));
    },
    
    async getMessages(userId1: string, userId2: string): Promise<Message[]> {
        const messages = MOCK_MESSAGES.filter(m => 
            (m.senderId === userId1 && m.recipientId === userId2) ||
            (m.senderId === userId2 && m.recipientId === userId1)
        );
        return new Promise(resolve => setTimeout(() => resolve(messages), 400));
    },
    
    async sendMessage(senderId: string, recipientId: string, duration: number): Promise<Message> {
        const newMessage: Message = {
            id: `m_${Date.now()}`,
            senderId,
            recipientId,
            audioUrl: '#',
            duration,
            createdAt: new Date().toISOString(),
            read: false,
        };
        MOCK_MESSAGES.push(newMessage);
        return new Promise(resolve => setTimeout(() => resolve(newMessage), 600));
    },

    async searchUsers(query: string): Promise<User[]> {
        const results = MOCK_USERS
            .filter(u => !u.isBanned)
            .map(user => ({
                user,
                score: stringSimilarity(user.name, query)
            }))
            .filter(item => item.score > 0.2) // Filter out very low scores
            .sort((a, b) => b.score - a.score)
            .map(item => item.user);

        return new Promise(resolve => setTimeout(() => resolve(results), 500));
    },

    async getFriendRequests(userId: string): Promise<User[]> {
        const requests = MOCK_USERS.filter(u => u.friendshipStatus === FriendshipStatus.PENDING_APPROVAL);
        return new Promise(resolve => setTimeout(() => resolve(requests), 500));
    },
    
    async getFriendsList(userId: string): Promise<User[]> {
        const friends = MOCK_USERS.filter(u => u.id !== userId && u.friendshipStatus === FriendshipStatus.FRIENDS);
        return new Promise(resolve => setTimeout(() => resolve(friends), 500));
    },

    async getRecommendedFriends(userId: string): Promise<User[]> {
        const recommendations = MOCK_USERS.filter(u => u.id !== userId && u.friendshipStatus === FriendshipStatus.NOT_FRIENDS);
        return new Promise(resolve => setTimeout(() => resolve(recommendations), 700));
    },

    async acceptFriendRequest(currentUserId: string, requestingUserId: string): Promise<boolean> {
        const requestingUser = MOCK_USERS.find(u => u.id === requestingUserId);
        if (requestingUser) {
            requestingUser.friendshipStatus = FriendshipStatus.FRIENDS;
            return new Promise(resolve => setTimeout(() => resolve(true), 400));
        }
        return false;
    },

    async declineFriendRequest(currentUserId: string, requestingUserId: string): Promise<boolean> {
        const requestingUser = MOCK_USERS.find(u => u.id === requestingUserId);
        if (requestingUser) {
            requestingUser.friendshipStatus = FriendshipStatus.NOT_FRIENDS;
            return new Promise(resolve => setTimeout(() => resolve(true), 400));
        }
        return false;
    },

    async blockUser(currentUserId: string, targetUserId: string): Promise<boolean> {
        const currentUser = MOCK_USERS.find(u => u.id === currentUserId);
        if (currentUser && !currentUser.blockedUserIds.includes(targetUserId)) {
            currentUser.blockedUserIds.push(targetUserId);
            return new Promise(resolve => setTimeout(() => resolve(true), 300));
        }
        return false;
    },

    async unblockUser(currentUserId: string, targetUserId: string): Promise<boolean> {
        const currentUser = MOCK_USERS.find(u => u.id === currentUserId);
        if (currentUser) {
            const index = currentUser.blockedUserIds.indexOf(targetUserId);
            if (index > -1) {
                currentUser.blockedUserIds.splice(index, 1);
            }
            return new Promise(resolve => setTimeout(() => resolve(true), 300));
        }
        return false;
    },
    
    async getConversations(userId: string): Promise<Conversation[]> {
        const conversationsMap = new Map<string, Message[]>();

        for (const msg of MOCK_MESSAGES) {
            if (msg.senderId === userId || msg.recipientId === userId) {
                const peerId = msg.senderId === userId ? msg.recipientId : msg.senderId;
                const peer = MOCK_USERS.find(u => u.id === peerId);
                if (peer?.isBanned) continue; // Don't show conversations with banned users

                const peerMessages = conversationsMap.get(peerId) || [];
                peerMessages.push(msg);
                conversationsMap.set(peerId, peerMessages);
            }
        }

        const conversationPromises = Array.from(conversationsMap.entries()).map(async ([peerId, messages]) => {
            const peer = await this.getUserById(peerId);
            if (!peer) return null;

            const sortedMessages = [...messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const lastMessage = sortedMessages[0];
            
            const unreadCount = messages.filter(m => m.recipientId === userId && !m.read).length;

            return { peer, lastMessage, unreadCount };
        });

        const conversations = (await Promise.all(conversationPromises))
            .filter((c): c is Conversation => c !== null);

        conversations.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

        return new Promise(resolve => setTimeout(() => resolve(conversations), 500));
    },

    async markConversationAsRead(currentUserId: string, peerId: string): Promise<void> {
        MOCK_MESSAGES.forEach(msg => {
            if (msg.recipientId === currentUserId && msg.senderId === peerId) {
                msg.read = true;
            }
        });
        return Promise.resolve();
    },

    async deleteChatHistory(userId1: string, userId2: string): Promise<boolean> {
        const initialLength = MOCK_MESSAGES.length;
        const filteredMessages = MOCK_MESSAGES.filter(m => 
            !((m.senderId === userId1 && m.recipientId === userId2) ||
              (m.senderId === userId2 && m.recipientId === userId1))
        );
        MOCK_MESSAGES.length = 0;
        Array.prototype.push.apply(MOCK_MESSAGES, filteredMessages);
        
        return new Promise(resolve => setTimeout(() => resolve(MOCK_MESSAGES.length < initialLength), 300));
    },
  
    async getChatSettings(userId: string, peerId: string): Promise<Partial<ChatSettings>> {
        const user = MOCK_USERS.find(u => u.id === userId);
        const settings = user?.chatSettings?.[peerId] || {};
        return new Promise(resolve => setTimeout(() => resolve(settings), 100));
    },

    async updateChatSettings(userId: string, peerId: string, settings: Partial<ChatSettings>): Promise<boolean> {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) {
            if (!user.chatSettings) {
                user.chatSettings = {};
            }
            user.chatSettings[peerId] = { ...user.chatSettings[peerId], ...settings };
            return new Promise(resolve => setTimeout(() => resolve(true), 200));
        }
        return new Promise(resolve => setTimeout(() => resolve(false), 200));
    },

    async getNotifications(userId: string): Promise<Notification[]> {
        return Promise.resolve([...MOCK_NOTIFICATIONS].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    },

    async markNotificationsAsRead(): Promise<boolean> {
        MOCK_NOTIFICATIONS.forEach(n => n.read = true);
        return Promise.resolve(true);
    },

    // --- Monetization ---
    async getRandomActiveCampaign(): Promise<Campaign | null> {
        const activeCampaigns = MOCK_CAMPAIGNS.filter(c => {
            if (c.status !== 'active') return false;
            const costSoFar = (c.views / 1000) * SPONSOR_CPM_BDT;
            return c.budget > costSoFar;
        });
        if (activeCampaigns.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * activeCampaigns.length);
        return activeCampaigns[randomIndex];
    },

    async claimReward(userId: string): Promise<{ success: boolean; newCoinBalance?: number; claimedAmount: number }> {
        const user = MOCK_USERS.find(u => u.id === userId);
        const rewardAmount = 5;
        if (user) {
            user.voiceCoins = (user.voiceCoins || 0) + rewardAmount;
            return new Promise(resolve => setTimeout(() => resolve({ success: true, newCoinBalance: user.voiceCoins, claimedAmount: rewardAmount }), 500)); 
        }
        return new Promise(resolve => setTimeout(() => resolve({ success: false, claimedAmount: 0 }), 500));
    },

    async deductCoins(userId: string, amount: number): Promise<{ success: boolean; newCoinBalance?: number }> {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) {
            if ((user.voiceCoins || 0) >= amount) {
                user.voiceCoins = (user.voiceCoins || 0) - amount;
                return new Promise(resolve => setTimeout(() => resolve({ success: true, newCoinBalance: user.voiceCoins }), 200));
            } else {
                return new Promise(resolve => setTimeout(() => resolve({ success: false, newCoinBalance: user.voiceCoins }), 200));
            }
        }
        return new Promise(resolve => setTimeout(() => resolve({ success: false }), 200));
    },

    // --- Campaign Sponsorship ---
    async getCampaignsForSponsor(sponsorId: string): Promise<Campaign[]> {
        const campaigns = MOCK_CAMPAIGNS.filter(c => c.sponsorId === sponsorId);
        // Sort by status: active > pending > finished/rejected
        const statusOrder = { 'pending': 1, 'active': 2, 'rejected': 3, 'finished': 4 };
        campaigns.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        return new Promise(resolve => setTimeout(() => resolve(campaigns), 600));
    },
    
    async submitCampaignForApproval(
        campaignData: Omit<Campaign, 'id' | 'views' | 'clicks' | 'status'>, 
        transactionId: string
    ): Promise<Campaign> {
        const newCampaign: Campaign = {
            id: `camp_${Date.now()}`,
            ...campaignData,
            views: 0,
            clicks: 0,
            status: 'pending', 
            transactionId,
        };
        MOCK_CAMPAIGNS.push(newCampaign);
        return new Promise(resolve => setTimeout(() => resolve(newCampaign), 800));
    },
    
    async trackAdView(campaignId: string): Promise<void> {
        const campaign = MOCK_CAMPAIGNS.find(c => c.id === campaignId);
        if (campaign) {
            campaign.views++;
            const costSoFar = (campaign.views / 1000) * SPONSOR_CPM_BDT;
            if (costSoFar >= campaign.budget) {
                campaign.status = 'finished';
                console.log(`Campaign ${campaignId} has run out of budget and is now finished.`);
            }
        }
        return Promise.resolve();
    },

    async trackAdClick(campaignId: string): Promise<void> {
        const campaign = MOCK_CAMPAIGNS.find(c => c.id === campaignId);
        if (campaign) {
            campaign.clicks++;
        }
        return Promise.resolve();
    },

    // --- NEW ADMIN PORTAL FUNCTIONS ---

    async adminLogin(email: string, pass: string): Promise<AdminUser | null> {
        console.log(`Attempting admin login for ${email}`);
        const foundAdmin = MOCK_ADMINS.find(a => a.email.toLowerCase() === email.toLowerCase());
        // In a real app, you'd check a hashed password
        return new Promise(resolve => setTimeout(() => resolve(foundAdmin || null), 500));
    },

    async adminRegister(email: string, pass: string): Promise<AdminUser | null> {
        const existing = MOCK_ADMINS.find(a => a.email.toLowerCase() === email.toLowerCase());
        if (existing) return null;
        const newAdmin: AdminUser = { id: `admin_${Date.now()}`, email };
        MOCK_ADMINS.push(newAdmin);
        return new Promise(resolve => setTimeout(() => resolve(newAdmin), 500));
    },

    async getAllUsersForAdmin(): Promise<User[]> {
        return new Promise(resolve => setTimeout(() => resolve([...MOCK_USERS]), 400));
    },

    async getAllPostsForAdmin(): Promise<Post[]> {
        return new Promise(resolve => setTimeout(() => resolve([...MOCK_POSTS]), 400));
    },
    
    async getPendingCampaigns(): Promise<Campaign[]> {
        const campaigns = MOCK_CAMPAIGNS.filter(c => c.status === 'pending');
        return new Promise(resolve => setTimeout(() => resolve(campaigns), 500));
    },

    async approveCampaign(campaignId: string): Promise<boolean> {
        const campaign = MOCK_CAMPAIGNS.find(c => c.id === campaignId);
        if (!campaign || campaign.status !== 'pending') return false;

        campaign.status = 'active';
        
        const sponsor = await this.getUserById(campaign.sponsorId);
        if (sponsor) {
            const approvalNotif: Notification = {
                id: `notif_camp_approve_${Date.now()}`,
                type: 'campaign_approved',
                user: sponsor, // Notification is for the sponsor
                createdAt: new Date().toISOString(),
                read: false,
                campaignName: campaign.sponsorName,
            };
            MOCK_NOTIFICATIONS.push(approvalNotif);
        }
        return new Promise(resolve => setTimeout(() => resolve(true), 500));
    },

    async rejectCampaign(campaignId: string, reason: string): Promise<boolean> {
        const campaign = MOCK_CAMPAIGNS.find(c => c.id === campaignId);
        if (!campaign || campaign.status !== 'pending') return false;

        campaign.status = 'rejected';
        
        const sponsor = await this.getUserById(campaign.sponsorId);
        if (sponsor) {
            const rejectionNotif: Notification = {
                id: `notif_camp_reject_${Date.now()}`,
                type: 'campaign_rejected',
                user: sponsor,
                createdAt: new Date().toISOString(),
                read: false,
                campaignName: campaign.sponsorName,
                rejectionReason: reason,
            };
            MOCK_NOTIFICATIONS.push(rejectionNotif);
        }
        return new Promise(resolve => setTimeout(() => resolve(true), 500));
    },

    async banUser(userId: string): Promise<boolean> {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) {
            user.isBanned = true;
            return new Promise(resolve => setTimeout(() => resolve(true), 300));
        }
        return Promise.resolve(false);
    },

    async unbanUser(userId: string): Promise<boolean> {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) {
            user.isBanned = false;
            return new Promise(resolve => setTimeout(() => resolve(true), 300));
        }
        return Promise.resolve(false);
    },

    async suspendUserCommenting(userId: string, durationInDays: number): Promise<boolean> {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) {
            const suspensionEndDate = new Date();
            suspensionEndDate.setDate(suspensionEndDate.getDate() + durationInDays);
            user.commentingSuspendedUntil = suspensionEndDate.toISOString();
            return new Promise(resolve => setTimeout(() => resolve(true), 300));
        }
        return Promise.resolve(false);
    },

    async liftUserCommentingSuspension(userId: string): Promise<boolean> {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) {
            user.commentingSuspendedUntil = undefined;
            return new Promise(resolve => setTimeout(() => resolve(true), 300));
        }
        return Promise.resolve(false);
    },

    async deletePostAsAdmin(postId: string): Promise<boolean> {
        const postIndex = MOCK_POSTS.findIndex(p => p.id === postId);
        if (postIndex > -1) {
            MOCK_POSTS.splice(postIndex, 1);
            return new Promise(resolve => setTimeout(() => resolve(true), 300));
        }
        return Promise.resolve(false);
    },

    async deleteCommentAsAdmin(commentId: string, postId: string): Promise<boolean> {
        const post = MOCK_POSTS.find(p => p.id === postId);
        if (post) {
            const commentIndex = post.comments.findIndex(c => c.id === commentId);
            if (commentIndex > -1) {
                post.comments.splice(commentIndex, 1);
                post.commentCount--;
                return new Promise(resolve => setTimeout(() => resolve(true), 300));
            }
        }
        return Promise.resolve(false);
    },

    async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<boolean> {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) {
            user.role = role;
            return new Promise(resolve => setTimeout(() => resolve(true), 300));
        }
        return Promise.resolve(false);
    },
};
