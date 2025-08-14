

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RecordingState, User, Post } from '../types';
import { TTS_PROMPTS, IMAGE_GENERATION_COST } from '../constants';
import Waveform from './Waveform';
import Icon from './Icon';
import { geminiService } from '../services/geminiService';

interface CreatePostScreenProps {
  user: User;
  onPostCreated: (newPost: Post) => void;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onDeductCoinsForImage: () => Promise<boolean>;
}

const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ user, onPostCreated, onSetTtsMessage, lastCommand, onDeductCoinsForImage }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [duration, setDuration] = useState(0);
  const [caption, setCaption] = useState('');
  
  // New state for image generation
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const [isPosting, setIsPosting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    onSetTtsMessage(TTS_PROMPTS.create_post_prompt(IMAGE_GENERATION_COST));
    return () => stopTimer();
  }, [onSetTtsMessage, stopTimer]);
  
  const handleStartRecording = useCallback(() => {
    if (recordingState === RecordingState.RECORDING) return;
    setRecordingState(RecordingState.RECORDING);
    onSetTtsMessage(TTS_PROMPTS.record_start);
    startTimer();
  }, [recordingState, onSetTtsMessage, startTimer]);

  const handleStopRecording = useCallback(() => {
    if (recordingState !== RecordingState.RECORDING) return;
    stopTimer();
    setRecordingState(RecordingState.PREVIEW);
    onSetTtsMessage(TTS_PROMPTS.record_stopped(duration));
  }, [recordingState, duration, onSetTtsMessage, stopTimer]);
  
  const handleGenerateImage = useCallback(async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;

    // This check is redundant if the button is disabled, but good for safety
    if ((user.voiceCoins || 0) < IMAGE_GENERATION_COST) {
        onSetTtsMessage(TTS_PROMPTS.image_generation_insufficient_coins(IMAGE_GENERATION_COST, user.voiceCoins || 0));
        return;
    }

    const paymentSuccess = await onDeductCoinsForImage();
    if (!paymentSuccess) {
        // App.tsx has already set the TTS message for failure (insufficient funds or other error)
        return;
    }
    
    // At this point, coin deduction was successful. App.tsx has set a success TTS.
    setIsGeneratingImage(true);
    const imageUrl = await geminiService.generateImageForPost(imagePrompt);
    setIsGeneratingImage(false);
    
    if(imageUrl) {
        setGeneratedImageUrl(imageUrl);
        onSetTtsMessage(`Image generated! You can now add a caption or voice note.`);
    } else {
        onSetTtsMessage(`Sorry, I couldn't generate an image for that prompt. Please try another one.`);
        // Note: A real app should have a mechanism to refund coins if image generation fails after payment.
    }
  }, [imagePrompt, isGeneratingImage, onSetTtsMessage, user.voiceCoins, onDeductCoinsForImage]);

  const handleClearImage = useCallback(() => {
    setGeneratedImageUrl(null);
    setImagePrompt('');
    onSetTtsMessage('Image cleared.');
  }, [onSetTtsMessage]);

  const handlePost = useCallback(async () => {
    if (isPosting || (!caption.trim() && duration === 0 && !generatedImageUrl)) {
        onSetTtsMessage("Please add a caption, record audio, or generate an image before posting.");
        return;
    };
    
    setIsPosting(true);
    setRecordingState(RecordingState.UPLOADING);
    const newPost = await geminiService.createPost(user, duration, caption, generatedImageUrl ?? undefined, imagePrompt);
    setRecordingState(RecordingState.POSTED);
    onSetTtsMessage(TTS_PROMPTS.post_success);
    setTimeout(() => onPostCreated(newPost), 1500);

  }, [isPosting, caption, duration, user, onSetTtsMessage, onPostCreated, generatedImageUrl, imagePrompt]);
  
  useEffect(() => {
    if (!lastCommand) return;
    
    const processCommand = async () => {
        const intentResponse = await geminiService.processIntent(lastCommand);
        
        switch(intentResponse.intent) {
            case 'intent_create_post': 
                handleStartRecording();
                break;
            case 'intent_stop_recording':
                if (recordingState === RecordingState.RECORDING) handleStopRecording();
                break;
            case 'intent_re_record':
                 if (recordingState === RecordingState.PREVIEW) {
                     setDuration(0);
                     handleStartRecording();
                 }
                 break;
            case 'intent_post_confirm':
                handlePost();
                break;
            case 'intent_generate_image':
                if (intentResponse.slots?.prompt) {
                    const promptText = intentResponse.slots.prompt as string;
                    setImagePrompt(promptText);
                    // This function will be called again due to state change, so we trigger generation here.
                    // Using a timeout to ensure state is set before calling.
                    setTimeout(() => handleGenerateImage(), 100);
                }
                break;
            case 'intent_clear_image':
                handleClearImage();
                break;
        }
    };
    
    processCommand();
  }, [lastCommand, recordingState, handleStartRecording, handleStopRecording, handlePost, handleGenerateImage, handleClearImage]);

  const canAffordImage = (user.voiceCoins || 0) >= IMAGE_GENERATION_COST;

  const renderRecordingControls = () => {
      switch (recordingState) {
          case RecordingState.IDLE:
              return (
                  <button onClick={handleStartRecording} className="w-full flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                      <Icon name="mic" className="w-6 h-6" />
                      <span>Record Voice</span>
                  </button>
              );
          case RecordingState.RECORDING:
              return (
                  <div className="w-full flex flex-col items-center gap-4">
                      <div className="w-full h-24 bg-slate-700/50 rounded-lg overflow-hidden">
                          <Waveform isPlaying={true} isRecording={true} />
                      </div>
                       <div className="text-2xl font-mono text-slate-300">
                          00:{duration.toString().padStart(2, '0')}
                      </div>
                      <button onClick={handleStopRecording} className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-colors">
                          <Icon name="pause" className="w-8 h-8" />
                          <span className="sr-only">Stop Recording</span>
                      </button>
                  </div>
              );
          case RecordingState.PREVIEW:
              return (
                 <div className="w-full flex flex-col items-center gap-4 p-4 bg-slate-700/50 rounded-lg">
                      <p className="font-semibold text-slate-200">Voice Recorded: {duration}s</p>
                      <div className="flex gap-4">
                        <button onClick={() => { setDuration(0); handleStartRecording();}} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors">Re-record</button>
                        <p className="text-slate-400 self-center">Ready to post?</p>
                      </div>
                  </div>
              )
          case RecordingState.UPLOADING:
          case RecordingState.POSTED:
             return <p className="text-lg text-rose-400">{recordingState === RecordingState.UPLOADING ? 'Publishing your post...' : 'Posted successfully!'}</p>
      }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-100 p-4 sm:p-8">
      <div className="w-full max-w-lg bg-slate-800 rounded-2xl p-6 flex flex-col gap-6">
        <h2 className="text-3xl font-bold">Create Post</h2>
        
        <div className="flex items-start gap-4">
             <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full mt-2" />
             <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder={`What's on your mind, ${user.name.split(' ')[0]}?`}
                className="flex-grow bg-transparent text-slate-100 text-lg rounded-lg focus:ring-0 focus:outline-none min-h-[100px] resize-none"
                rows={3}
             />
        </div>

        {/* Image Generation Section */}
        <div className="border-t border-slate-700 pt-6 space-y-4">
            <h3 className="text-xl font-semibold text-left text-rose-400">Add an AI Image (Optional)</h3>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={imagePrompt}
                    onChange={e => setImagePrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateImage(); }}
                    placeholder="Describe the image you want to create..."
                    className="flex-grow bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-2.5 focus:ring-rose-500 focus:border-rose-500 transition"
                    disabled={isGeneratingImage}
                />
                <button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !imagePrompt.trim() || !canAffordImage}
                    className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center min-w-[160px]"
                >
                    {isGeneratingImage 
                        ? <Icon name="logo" className="w-6 h-6 animate-spin"/> 
                        : `Generate (${IMAGE_GENERATION_COST} Coins)`
                    }
                </button>
            </div>
             {!canAffordImage && (
                <p className="text-xs text-yellow-500 text-left">You don't have enough coins. Watch an ad in the feed to earn more!</p>
             )}
            {isGeneratingImage && (
                <div className="aspect-square bg-slate-700/50 rounded-lg flex items-center justify-center flex-col gap-3 text-slate-300">
                    <Icon name="logo" className="w-12 h-12 text-rose-500 animate-spin"/>
                    <p>Generating your masterpiece...</p>
                </div>
            )}
            {generatedImageUrl && !isGeneratingImage && (
                <div className="relative group">
                    <img src={generatedImageUrl} alt={imagePrompt} className="aspect-square w-full rounded-lg object-cover" />
                    <button 
                        onClick={handleClearImage}
                        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white opacity-50 group-hover:opacity-100 transition-opacity"
                        aria-label="Clear image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
        </div>

        <div className="border-t border-slate-700 pt-6">
            <h3 className="text-xl font-semibold text-left text-rose-400 mb-4">Add Voice (Optional)</h3>
            {renderRecordingControls()}
        </div>
        
        <button 
          onClick={handlePost} 
          disabled={isPosting || (!caption.trim() && duration === 0 && !generatedImageUrl)}
          className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
        >
            {isPosting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
};

export default CreatePostScreen;