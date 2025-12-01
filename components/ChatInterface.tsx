import React, { useRef, useEffect, useState } from 'react';
import { Send, User, Bot, Sparkles, Loader2, Edit3 } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => Promise<void>;
    isTyping: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isTyping }) => {
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0d1117]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 text-center p-6">
                        <Sparkles size={48} className="text-purple-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-300">Code Assistant</h3>
                        <p className="text-sm text-gray-500">Ask me anything about your project structure, specific code logic, or security.</p>
                        <div className="mt-4 bg-gray-800 p-3 rounded-lg text-xs text-gray-400 border border-gray-700">
                            <strong>Tip:</strong> Type <span className="text-blue-400 font-mono">@edit change background color</span> to instantly patch your code.
                        </div>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : (msg.isAction ? 'bg-orange-600' : 'bg-purple-600')}`}>
                            {msg.role === 'user' ? <User size={16} text-white /> : (msg.isAction ? <Edit3 size={16} text-white /> : <Bot size={16} text-white />)}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === 'user' 
                                ? 'bg-blue-900/30 text-blue-100 rounded-tr-sm border border-blue-800' 
                                : (msg.isAction ? 'bg-orange-900/20 text-orange-200 border border-orange-700/50 rounded-tl-sm' : 'bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700')
                        }`}>
                            {msg.text.split('\n').map((line, i) => (
                                <p key={i} className="mb-1 last:mb-0">{line}</p>
                            ))}
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex gap-3">
                         <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                            <Loader2 size={16} className="animate-spin text-white" />
                        </div>
                        <div className="bg-gray-800 rounded-2xl px-4 py-3 border border-gray-700">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms'}} />
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms'}} />
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms'}} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#161b22]">
                <div className="flex gap-2 relative">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type @edit to change code, or ask a question..."
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-12 scrollbar-hide font-mono"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};