

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
  friendshipStatus?: FriendshipStatus;
  
  // New profile fields
  coverPhotoUrl: string;
  work?: string;

  education?: string;
  hometown?: string;
  currentCity?: string;
  relationshipStatus?: 'Single' | 'In a relationship' | 'Engaged' | 'Married' | "It's complicated" | 'Prefer not to say';

  // New privacy settings
  privacySettings: {
    postVisibility: 'public' | 'friends';
    friendRequestPrivacy: 'everyone' | 'friends_of_friends';
  };
  blockedUserIds: string[];
  chatSettings?: {
    [peerId: string]: Partial<ChatSettings>;
  };

  // Monetization
  voiceCoins?: number;

  // App roles
  role?: 'user' | 'admin';

  // Admin moderation fields
  isBanned?: boolean;
  commentingSuspendedUntil?: string; // ISO 8601 string
}

export interface AdminUser {
    id: string;
    email: string;
}

export interface Post {
  id: string;
  author: User;
  audioUrl: string;
  caption: string;
  duration: number; // in seconds
  createdAt: string; // ISO 8601 string
  likeCount: number;
  commentCount: number;
  comments: Comment[];
  likedBy: User[];
  imageUrl?: string;
  imagePrompt?: string;
  videoUrl?: string;
  // Monetization
  isSponsored?: boolean;
  sponsorName?: string;
  campaignId?: string;
  websiteUrl?: string;
  allowDirectMessage?: boolean;
  sponsorId?: string;
}

export interface Comment {
    id: string;
    postId: string;
    author: User;
    audioUrl: string;
    duration: number;
    createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  peer: User;
  lastMessage: Message;
  unreadCount: number;
}

export type NotificationType = 'like' | 'comment' | 'friend_request' | 'campaign_approved' | 'campaign_rejected';

export interface Notification {
  id: string;
  type: NotificationType;
  user: User; // User who initiated the notification
  post?: Post; // Relevant post for likes/comments
  createdAt: string; // ISO 8601 string
  read: boolean;
  campaignName?: string;
  rejectionReason?: string;
}

export type ChatTheme = 'default' | 'sunset' | 'ocean' | 'forest' | 'classic';

export interface ChatSettings {
  theme: ChatTheme;
  // Future settings
  // sound?: string;
  // notifications?: 'on' | 'off';
}

export interface Campaign {
  id:string;
  sponsorId: string;
  sponsorName: string;
  caption: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  budget: number; // in BDT
  views: number;
  clicks: number;
  websiteUrl?: string;
  allowDirectMessage?: boolean;
  status: 'pending' | 'active' | 'finished' | 'rejected';
  transactionId?: string;
}


export enum AppView {
  AUTH,
  FEED,
  PROFILE,
  SETTINGS,
  CREATE_POST,
  CREATE_COMMENT,
  MESSAGES,
  SEARCH_RESULTS,
  FRIEND_REQUESTS, // This can be deprecated in favor of the new friends screen, but keeping for now.
  POST_DETAILS,
  FRIENDS,
  CONVERSATIONS,
  SPONSOR_CENTER,
}

export enum RecordingState {
    IDLE,
    RECORDING,
    PREVIEW,
    UPLOADING,
    POSTED,
}

export enum AuthMode {
    LOGIN,
    SIGNUP_NAME,
    SIGNUP_PASSWORD,
    SIGNUP_CONFIRM_PASSWORD,
}

export enum VoiceState {
    IDLE,
    LISTENING,
    PROCESSING
}

export enum FriendshipStatus {
    NOT_FRIENDS,
    FRIENDS,
    REQUEST_SENT,
    PENDING_APPROVAL,
}

// NLU Intent Types from Gemini
export type Intent = 
  | 'intent_signup' | 'intent_login' | 'intent_play_post' | 'intent_pause_post'
  | 'intent_next_post' | 'intent_previous_post' | 'intent_create_post' | 'intent_stop_recording'
  | 'intent_post_confirm' | 'intent_re_record' | 'intent_comment' | 'intent_post_comment'
  | 'intent_search_user' | 'intent_select_result' | 'intent_like' | 'intent_share'
  | 'intent_open_profile' | 'intent_change_avatar' | 'intent_help' | 'unknown' | 'intent_go_back'
  | 'intent_open_settings' | 'intent_add_friend' | 'intent_send_message'
  | 'intent_save_settings'
  | 'intent_update_profile' // extracts 'field' ('name', 'bio', 'work' etc) and 'value'.
  | 'intent_update_privacy' // extracts 'setting' ('postVisibility' etc) and 'value' ('friends' etc).
  | 'intent_block_user' // extracts 'target_name'
  | 'intent_unblock_user' // extracts 'target_name'
  | 'intent_edit_profile'
  | 'intent_record_message' | 'intent_send_chat_message' | 'intent_view_comments'
  | 'intent_open_friend_requests' | 'intent_accept_request' | 'intent_decline_request'
  | 'intent_scroll_up' | 'intent_scroll_down'
  | 'intent_stop_scroll'
  | 'intent_open_messages'
  | 'intent_open_friends_page'
  | 'intent_open_chat' // extracts 'target_name'
  | 'intent_change_chat_theme' // extracts 'theme_name'
  | 'intent_delete_chat'
  | 'intent_play_comment_by_author' // extracts 'target_name'
  | 'intent_view_comments_by_author' // extracts 'target_name'
  | 'intent_generate_image' // extracts 'prompt'
  | 'intent_clear_image'
  | 'intent_claim_reward' // For rewarded ads
  // Sponsor Center Intents
  | 'intent_open_sponsor_center'
  | 'intent_create_campaign'
  | 'intent_view_campaign_dashboard'
  | 'intent_set_sponsor_name' // extracts 'sponsor_name'
  | 'intent_set_campaign_caption' // extracts 'caption_text'
  | 'intent_set_campaign_budget' // extracts 'budget_amount'
  | 'intent_set_media_type' // extracts 'media_type' ('image', 'video', 'audio')
  | 'intent_launch_campaign';


export interface NLUResponse {
  intent: Intent;
  slots?: {
    [key:string]: string | number;
  };
}

export type ScrollState = 'up' | 'down' | 'none';