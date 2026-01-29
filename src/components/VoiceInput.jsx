import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { motion } from 'framer-motion';

const VoiceInput = ({ onTranscript, fieldName = "this field" }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        // Check if Web Speech API is supported
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            setIsSupported(true);
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptPiece = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcriptPiece + ' ';
                    } else {
                        interimTranscript += transcriptPiece;
                    }
                }

                // Update local state for visual feedback
                setTranscript(finalTranscript || interimTranscript);

                // Send final transcript to parent
                if (finalTranscript) {
                    onTranscript(finalTranscript.trim());
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'no-speech') {
                    // Restart listening if no speech detected
                    setIsListening(false);
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onTranscript]);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            setTranscript('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    if (!isSupported) {
        return (
            <div className="text-xs text-slate-500 italic">
                Voice input not supported in this browser
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <motion.button
                type="button"
                onClick={toggleListening}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-lg transition-all ${isListening
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-slate-700 hover:bg-brand-orange text-slate-400 hover:text-white'
                    }`}
                title={isListening ? 'Stop recording' : `Record ${fieldName}`}
            >
                {isListening ? <Square size={20} /> : <Mic size={20} />}
            </motion.button>

            {isListening && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2"
                >
                    <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-1 bg-red-500 rounded-full"
                                animate={{
                                    height: [8, 16, 8],
                                }}
                                transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                }}
                            />
                        ))}
                    </div>
                    <span className="text-xs text-red-400 font-medium">Listening...</span>
                </motion.div>
            )}

            {transcript && !isListening && (
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-emerald-400 italic"
                >
                    Captured
                </motion.span>
            )}
        </div>
    );
};

export default VoiceInput;
