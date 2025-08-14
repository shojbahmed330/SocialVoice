

import React, { useState, useEffect, useCallback } from 'react';
import { AuthMode, NLUResponse, User } from '../types';
import { TTS_PROMPTS } from '../constants';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
  ttsMessage: string;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, ttsMessage, onSetTtsMessage, lastCommand }) => {
  const [mode, setMode] = useState<AuthMode>(AuthMode.LOGIN);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    onSetTtsMessage(TTS_PROMPTS.welcome);
    setMode(AuthMode.LOGIN); // Default to login prompt
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTextInput = useCallback(async (text: string) => {
      setIsLoading(true);
      switch(mode) {
          case AuthMode.LOGIN:
              // This is the login flow.
              // Check if we already have a name. If not, this input is the name.
              if (!name) {
                  setName(text);
                  onSetTtsMessage(TTS_PROMPTS.login_password);
              } else {
                  // If we already have a name, this input must be the password.
                  setPassword(text);
                  // Use the fuzzy login service
                  const user = await geminiService.login(name, text);
                  if (user) {
                      onAuthSuccess(user);
                  } else {
                      // Check if a user with a similar name exists but is banned.
                      // The login service now returns null for banned users.
                      // We can re-check to provide a more specific message.
                      const potentialUser = await geminiService.getUserProfile(name);
                      if (potentialUser?.isBanned) {
                        onSetTtsMessage(TTS_PROMPTS.login_banned);
                      } else {
                        onSetTtsMessage(TTS_PROMPTS.login_fail);
                      }
                      // Reset for re-login attempt
                      setName('');
                      setPassword('');
                  }
              }
              break;
          case AuthMode.SIGNUP_NAME:
              setName(text);
              setMode(AuthMode.SIGNUP_PASSWORD);
              onSetTtsMessage(TTS_PROMPTS.signup_password);
              break;
          case AuthMode.SIGNUP_PASSWORD:
              setPassword(text);
              setMode(AuthMode.SIGNUP_CONFIRM_PASSWORD);
              onSetTtsMessage(TTS_PROMPTS.signup_confirm_password);
              break;
          case AuthMode.SIGNUP_CONFIRM_PASSWORD:
              setConfirmPassword(text);
              if (password === text) {
                  const user = await geminiService.signup(name, password);
                  if(user) {
                      onSetTtsMessage(TTS_PROMPTS.signup_success);
                      onAuthSuccess(user);
                  } else {
                      onSetTtsMessage("A user with that name already exists.");
                      setName('');
                      setPassword('');
                      setConfirmPassword('');
                      setMode(AuthMode.SIGNUP_NAME);
                  }
              } else {
                  onSetTtsMessage(TTS_PROMPTS.signup_password_mismatch);
                  setPassword('');
                  setConfirmPassword('');
                  setMode(AuthMode.SIGNUP_PASSWORD);
              }
              break;
      }
      setIsLoading(false);
  }, [mode, name, password, onSetTtsMessage, onAuthSuccess]);


  useEffect(() => {
    if (!lastCommand) return;
    
    const processAuthCommand = async () => {
        const intentResponse = await geminiService.processIntent(lastCommand);
        if (intentResponse.intent === 'intent_login') {
            setMode(AuthMode.LOGIN);
            onSetTtsMessage(TTS_PROMPTS.login_name);
        } else if (intentResponse.intent === 'intent_signup') {
            setMode(AuthMode.SIGNUP_NAME);
            onSetTtsMessage(TTS_PROMPTS.signup_name);
        } else {
             handleTextInput(lastCommand);
        }
    };
    
    processAuthCommand();
  }, [lastCommand, handleTextInput, onSetTtsMessage]);
  

  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-100 p-8">
      <Icon name="logo" className="w-24 h-24 text-rose-500 mb-6" />
      <h1 className="text-4xl font-bold mb-2">VoiceBook</h1>
      <p className="text-slate-300 text-lg mb-8">Your voice, your world.</p>
      
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-sm">
        <p className="text-rose-400 font-medium text-lg min-h-[3em]">
          {isLoading ? 'Processing...' : ttsMessage}
        </p>
        <div className="mt-4 text-left">
           { (mode === AuthMode.LOGIN && name) && <p className="text-slate-400">Name: <span className="text-slate-200">{name}</span></p> }
           { (mode > AuthMode.SIGNUP_NAME) && <p className="text-slate-400">Name: <span className="text-slate-200">{name}</span></p> }
           { (mode > AuthMode.SIGNUP_PASSWORD) && <p className="text-slate-400">Password: <span className="text-slate-200">********</span></p> }
        </div>
      </div>
      <p className="text-slate-500 mt-6 text-sm">
          This is a simulation. Type a command like "log in" or "sign up" below and press Enter.
      </p>
    </div>
  );
};

export default AuthScreen;
