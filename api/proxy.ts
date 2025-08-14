// Vercel Serverless Function to securely proxy requests to the Gemini API.
// This function handles requests to /api/proxy.
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const NLU_SYSTEM_INSTRUCTION_BASE = `
You are a powerful NLU (Natural Language Understanding) engine for VoiceBook, a voice-controlled social media app. Your sole purpose is to analyze a user's raw text command and convert it into a structured JSON format.

Your response MUST be a single, valid JSON object and nothing else.

The JSON object must have:
1. An "intent" field: A string matching one of the intents from the list below.
2. An optional "slots" object: For intents that require extra information (like a name or number).

If the user's intent is unclear or not in the list, you MUST use the intent "unknown".

--- INTENT LIST ---
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


export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  const { action, payload } = req.body;

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API_KEY not configured on the server' });
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    switch(action) {
      case 'processIntent': {
        const { command, context } = payload;
        
        let dynamicSystemInstruction = NLU_SYSTEM_INSTRUCTION_BASE;
        if (context?.userNames && context.userNames.length > 0) {
            const uniqueNames = [...new Set(context.userNames)];
            dynamicSystemInstruction += `\n\n---\nCONTEXTUAL AWARENESS:\nAvailable names: [${uniqueNames.map(name => `"${name}"`).join(', ')}]`;
        }
        
        const nluResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: command,
            config: {
              systemInstruction: dynamicSystemInstruction,
              responseMimeType: "application/json",
            },
        });

        const text = nluResponse.text.trim();
        const jsonText = text.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(jsonText);
        
        return res.status(200).json(parsed);
      }

      case 'generateImage': {
        const { prompt } = payload;
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });
        
        if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
             const base64ImageBytes: string = imageResponse.generatedImages[0].image.imageBytes;
             const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
             return res.status(200).json({ imageUrl });
        } else {
             return res.status(500).json({ error: 'Image generation failed' });
        }
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error(`Error in proxy for action: ${action}`, error);
    // Vercel logs will show this server-side error
    return res.status(500).json({ error: 'An internal server error occurred', details: error.message });
  }
}
