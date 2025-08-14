

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RecordingState, User, Comment } from '../types';
import { TTS_PROMPTS } from '../constants';
import Waveform from './Waveform';
import { geminiService } from '../services/geminiService';

interface CreateCommentScreenProps {
  user: User;
  postId: string;
  onCommentPosted: (newComment: Comment | null, postId: string) => void;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
}

const CreateCommentScreen: React.FC<CreateCommentScreenProps> = ({ user, postId, onCommentPosted, onSetTtsMessage, lastCommand }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = () => {
    stopTimer();
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  };
  
  const startRecording = useCallback(() => {
    setRecordingState(RecordingState.RECORDING);
    onSetTtsMessage(TTS_PROMPTS.comment_record_start);
    startTimer();
  }, [onSetTtsMessage, startTimer]);

  const stopRecording = useCallback(() => {
    stopTimer();
    setRecordingState(RecordingState.PREVIEW);
    onSetTtsMessage(TTS_PROMPTS.comment_stopped(duration));
  }, [duration, onSetTtsMessage, stopTimer]);

  const postComment = useCallback(async () => {
    setRecordingState(RecordingState.UPLOADING);
    const newComment = await geminiService.createComment(user, postId, duration);
    if (newComment) {
        setRecordingState(RecordingState.POSTED);
        onSetTtsMessage(TTS_PROMPTS.comment_post_success);
        setTimeout(() => onCommentPosted(newComment, postId), 1000);
    } else {
        // This case handles suspensions
        onCommentPosted(null, postId);
    }
  }, [user, postId, duration, onSetTtsMessage, onCommentPosted]);


  useEffect(() => {
    startRecording();
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCommand = useCallback(async (command: string) => {
    const intentResponse = await geminiService.processIntent(command);
    const lowerCommand = command.toLowerCase();

    if (recordingState === RecordingState.RECORDING && (intentResponse.intent === 'intent_stop_recording' || lowerCommand === 'stop')) {
        stopRecording();
    } else if (recordingState === RecordingState.PREVIEW) {
        if (intentResponse.intent === 'intent_post_comment' || lowerCommand === 'post') {
            postComment();
        } else if (intentResponse.intent === 'intent_re_record') {
            startRecording();
        }
    }
  }, [recordingState, stopRecording, postComment, startRecording]);

  useEffect(() => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);


  const getStatusText = () => {
    switch (recordingState) {
      case RecordingState.RECORDING:
        return 'Recording Comment...';
      case RecordingState.PREVIEW:
        return 'Preview Comment';
      case RecordingState.UPLOADING:
        return 'Posting...';
      case RecordingState.POSTED:
        return 'Posted!';
      default:
        return 'Getting Ready...';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-100 p-8">
      <h2 className="text-3xl font-bold mb-4">{getStatusText()}</h2>
      
      <div className="w-full max-w-lg h-48 bg-slate-800 rounded-2xl flex items-center justify-center p-4 mb-8">
        <Waveform isPlaying={false} isRecording={recordingState === RecordingState.RECORDING} />
      </div>

      <div className="text-4xl font-mono mb-8">
        00:{duration.toString().padStart(2, '0')}
      </div>
      
      {recordingState === RecordingState.RECORDING && (
          <p className="text-slate-400">Say "stop" to finish recording.</p>
      )}

      {recordingState === RecordingState.PREVIEW && (
          <p className="text-slate-400">Say "post comment" or "re-record".</p>
      )}
    </div>
  );
};

export default CreateCommentScreen;