

import { GoogleGenAI } from "@google/genai";
import { NLUResponse, User, Post, FriendshipStatus, Message, Comment, Notification, Conversation, ChatSettings, Campaign, AdminUser } from '../types';
import { MOCK_POSTS, MOCK_USERS, MOCK_MESSAGES, SPONSOR_CPM_BDT, MOCK_ADMINS } from '../constants';

// IMPORTANT: This service uses a mock implementation for demonstration.
// A real application would have robust API calls to a secure backend.

// Ensure the API key is available, but do not handle its input in the UI.
if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Gemini API calls will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

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


const NLU_SYSTEM_INSTRUCTION_BASE = `
You are an NLU engine for VoiceBook, a voice-controlled social media app. Your task is to analyze the user's command and respond with a single, valid JSON object.

The JSON object MUST have an "intent" field and an optional "slots" object.
The user might speak in English or Bengali.

If the user's intent cannot be determined from the list below, the "intent" field in your JSON response must be "unknown".

---
EXAMPLE 1 (with context provided in system instructions)
---
CONTEXT:
Available names: ["Sumi Ahmed", "Shojib Khan", "Sharmin Chowdhury"]

USER COMMAND:
"go to shojib's profile"

YOUR JSON RESPONSE:
{
  "intent": "intent_open_profile",
  "slots": {
    "target_name": "Shojib Khan"
  }
}

---
EXAMPLE 2 (no context)
---
USER COMMAND:
"scroll down"

YOUR JSON RESPONSE:
{
  "intent": "intent_scroll_down"
}
---

Here is the complete list of available intents:
- intent_signup, intent_login
- intent_play_post, intent_pause_post, intent_next_post, intent_previous_post
- intent_create_post, intent_stop_recording, intent_post_confirm, intent_re_record
- intent_comment (extracts optional 'target_name'), intent_post_comment, intent_view_comments (extracts optional 'target_name')
- intent_view_comments_by_author (extracts 'target_name')
- intent_play_comment_by_author (extracts 'target_name')
- intent_search_user (extracts 'target_name')
- intent_select_result (extracts 'index')
- intent_like (extracts optional 'target_name'), intent_share
- intent_open_profile (extracts optional 'target_name'. If no name, it's the current user.)
- intent_go_back, intent_open_settings, intent_edit_profile
- intent_add_friend, intent_send_message
- intent_save_settings
- intent_update_profile (extracts 'field' like 'name', 'bio', 'work', 'education', 'hometown', 'currentCity', 'relationshipStatus' and 'value')
- intent_update_privacy (extracts 'setting' like 'postVisibility' or 'friendRequestPrivacy', and 'value' like 'public', 'friends', 'everyone', 'friends_of_friends')
- intent_block_user (extracts 'target_name')
- intent_unblock_user (extracts 'target_name')
- intent_record_message, intent_send_chat_message
- intent_open_friend_requests, intent_accept_request, intent_decline_request
- intent_open_friends_page
- intent_open_messages
- intent_open_chat (extracts 'target_name')
- intent_change_chat_theme (extracts 'theme_name')
- intent_delete_chat
- intent_generate_image (extracts 'prompt')
- intent_clear_image
- intent_scroll_up, intent_scroll_down, intent_stop_scroll
- intent_claim_reward
- intent_help, unknown
- intent_open_sponsor_center
- intent_create_campaign
- intent_view_campaign_dashboard
- intent_set_sponsor_name (extracts 'sponsor_name')
- intent_set_campaign_caption (extracts 'caption_text')
- intent_set_campaign_budget (extracts 'budget_amount')
- intent_set_media_type (extracts 'media_type' which can be 'image', 'video', or 'audio')
- intent_launch_campaign
`;

const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

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
        if (!process.env.API_KEY) {
            // Basic fallback for offline testing
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

        let retries = 0;
        let backoff = INITIAL_BACKOFF_MS;
        
        // Dynamically build the system instruction with context
        let dynamicSystemInstruction = NLU_SYSTEM_INSTRUCTION_BASE;
        if (context?.userNames && context.userNames.length > 0) {
            const uniqueNames = [...new Set(context.userNames)]; // Ensure no duplicates
            dynamicSystemInstruction += `\n\n---
CONTEXTUAL AWARENESS:
A list of available user names is provided below. When extracting a 'target_name' slot, you MUST use one of these exact names from the list. Do not guess or create new names.
Available names: [${uniqueNames.map(name => `"${name}"`).join(', ')}]`;
        }


        while(retries < MAX_RETRIES) {
            try {
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: `USER COMMAND:\n"${command}"`, // FIX: Wrap the command to match the example format in the prompt
                    config: {
                      systemInstruction: dynamicSystemInstruction,
                      responseMimeType: "application/json",
                    },
                });
                
                const text = response.text.trim();
                // The response should be clean JSON due to responseMimeType, but we keep the cleanup just in case.
                const jsonText = text.replace(/^```(json)?/, '').replace(/```$/, '').trim();
                const parsed = JSON.parse(jsonText);
                return parsed as NLUResponse;

            } catch (error: any) {
                const isRateLimitError = error.toString().includes('429') || error.toString().includes('RESOURCE_EXHAUSTED');

                if (isRateLimitError && retries < MAX_RETRIES - 1) {
                    console.warn(`Rate limit hit. Retrying in ${backoff}ms... (${retries + 1}/${MAX_RETRIES -1})`);
                    await new Promise(resolve => setTimeout(resolve, backoff));
                    retries++;
                    backoff *= 2;
                } else {
                    console.error("Error processing intent with Gemini:", error);
                    // After retries, or for a non-retriable error, return unknown
                    return { intent: 'unknown' };
                }
            }
        }
        
        console.error("Failed to get response from Gemini after multiple retries.");
        return { intent: 'unknown' };
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
        if (!process.env.API_KEY) {
            console.warn("API_KEY not set, returning placeholder image.");
            return `https://images.unsplash.com/photo-1518791841217-8f162f1e1131?q=80&w=2070&auto=format&fit=crop`;
        }
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: prompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/jpeg',
                  aspectRatio: '1:1',
                },
            });
            
            if (response.generatedImages && response.generatedImages.length > 0) {
                 const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                 return `data:image/jpeg;base64,${base64ImageBytes}`;
            }
            return null;
        } catch (error) {
            console.error("Error generating image with Gemini:", error);
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