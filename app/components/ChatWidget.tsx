"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send } from "lucide-react";

const BRIDGE_URL = "https://browanchat.easyappz.com/chat";
const AGENT_NAME = "Browan Solicitors Assistant";
const GREETING =
    "Hello! Welcome to Browan Solicitors! 👋 I'm Babs, your AI assistant. How can I help you today?";

const BOT_AVATAR =
    "https://www.shutterstock.com/image-vector/happy-robot-3d-ai-character-600nw-2464455965.jpg";
const USER_AVATAR =
    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

interface Message {
    id: string;
    text: string;
    type: "bot" | "user";
    time: string;
}

function generateSessionId(): string {
    return (
        "sess_" +
        Math.random().toString(36).substr(2, 12) +
        "_" +
        Date.now()
    );
}

function getSessionId(): string {
    const existing = sessionStorage.getItem("browan_solicitors_session");
    if (existing) return existing;
    const id = generateSessionId();
    sessionStorage.setItem("browan_solicitors_session", id);
    return id;
}

function formatTime(): string {
    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function ChatMessage({ msg }: { msg: Message }) {
    const isBot = msg.type === "bot";

    return (
        <div
            className={`flex flex-col gap-1 max-w-[85%] animate-[msgIn_0.3s_ease_out] ${isBot ? "self-start" : "self-end"
                }`}
        >
            <div
                className={`flex items-end gap-2.5 ${isBot ? "flex-row" : "flex-row-reverse"
                    }`}
            >
                <img
                    src={isBot ? BOT_AVATAR : USER_AVATAR}
                    alt={isBot ? "Bot avatar" : "User avatar"}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-gold/30 shadow-sm"
                />
                <div
                    className={`px-4 py-2.5 rounded-2xl text-[14.5px] leading-relaxed shadow-sm ${isBot
                        ? "bg-white text-gray-800 border border-gold/20 rounded-bl-sm"
                        : "bg-navy text-white rounded-br-sm"
                        }`}
                >
                    {msg.text}
                </div>
            </div>
            <span
                className={`text-[11px] text-gray-400 px-1 font-medium tracking-wide ${isBot ? "ml-11" : "mr-11 text-right"
                    }`}
            >
                {msg.time}
            </span>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="self-start ml-11 flex items-center gap-1.5 px-4 py-3 bg-white border border-gold/20 rounded-2xl rounded-bl-sm shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[typing_1.2s_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[typing_1.2s_infinite_0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-[typing_1.2s_infinite_0.4s]" />
        </div>
    );
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [inputValue, setInputValue] = useState("");

    const greeted = useRef(false);
    const sessionId = useRef("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Initialise session ID on mount (client-side only)
    useEffect(() => {
        sessionId.current = getSessionId();
    }, []);

    // Auto-scroll to the latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // Focus the textarea when the chat opens
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => textareaRef.current?.focus(), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const addMessage = useCallback(
        (text: string, type: "bot" | "user") => {
            const msg: Message = {
                id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                text,
                type,
                time: formatTime(),
            };
            setMessages((prev) => [...prev, msg]);
        },
        [],
    );

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            addMessage(trimmed, "user");
            setInputValue("");
            setIsSending(true);
            setIsTyping(true);

            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }

            try {
                const res = await fetch(BRIDGE_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: trimmed, sessionId: sessionId.current }),
                });
                const data = await res.json();
                setIsTyping(false);
                addMessage(
                    data.reply ||
                    "I'm sorry, I couldn't process that. Please try again.",
                    "bot",
                );
            } catch {
                setIsTyping(false);
                addMessage(
                    "I'm having trouble connecting right now. Please contact us at info@browansolicitors.co.uk",
                    "bot",
                );
            }

            setIsSending(false);
            textareaRef.current?.focus();
        },
        [addMessage],
    );

    const handleToggle = useCallback(() => {
        setIsOpen((prev) => {
            const willOpen = !prev;
            if (willOpen && !greeted.current) {
                greeted.current = true;
                setTimeout(() => addMessage(GREETING, "bot"), 400);
            }
            return willOpen;
        });
    }, [addMessage]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(inputValue);
            }
        },
        [inputValue, sendMessage],
    );

    const handleInput = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setInputValue(e.target.value);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
        },
        [],
    );

    return (
        <>
            {/* ── Keyframe animations ── */}
            <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

            {/* ── Floating toggle button ── */}
            <button
                id="browan-solicitors-chat-btn"
                onClick={handleToggle}
                aria-label={isOpen ? "Close chat" : "Open chat"}
                className="fixed bottom-6 right-6 z-[99999] w-[64px] h-[64px] rounded-full bg-navy text-gold border border-gold/30 cursor-pointer shadow-2xl shadow-navy/20 flex items-center justify-center transition-all duration-300 hover:scale-105 hover:bg-[#071a52]"
            >
                {isOpen ? (
                    <X className="w-8 h-8" />
                ) : (
                    <MessageSquare className="w-8 h-8" />
                )}
            </button>

            {/* ── Chat window ── */}
            <div
                id="browan-solicitors-chat-window"
                role="dialog"
                aria-label="Chat with Browan Solocitors Assistant"
                className={`fixed bottom-[90px] right-6 z-[99998] w-[380px] h-[520px] rounded-2xl bg-white border border-gold/20 shadow-2xl shadow-navy/10 flex flex-col overflow-hidden origin-bottom-right transition-all duration-300 ease-out max-[420px]:w-[calc(100vw-20px)] max-[420px]:right-2.5 max-[420px]:bottom-[100px] max-[420px]:h-[75vh] ${isOpen
                    ? "scale-100 translate-y-0 opacity-100 pointer-events-auto"
                    : "scale-[0.85] translate-y-5 opacity-0 pointer-events-none"
                    }`}
            >
                {/* ── Header ── */}
                <div className="bg-navy px-5 py-4 flex items-center gap-4 shrink-0 border-b-2 border-gold relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/15 pointer-events-none" />
                    <div className="w-[42px] h-[42px] rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden border border-gold/40 relative z-10 shadow-sm">
                        <img
                            src={BOT_AVATAR}
                            alt="Browan Solocitors Assistant"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 relative z-10">
                        <div className="text-gold text-[16px] font-serif font-medium tracking-wide leading-tight mb-0.5">
                            {AGENT_NAME}
                        </div>
                        <div className="text-white/80 text-[11px] font-medium tracking-wider uppercase flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block shadow-[0_0_4px_#4ade80]" />
                            Online
                        </div>
                    </div>
                </div>

                {/* ── Messages ── */}
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-[#faf8f5] [scrollbar-width:thin]">
                    {messages.map((msg) => (
                        <ChatMessage key={msg.id} msg={msg} />
                    ))}
                    {isTyping && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                </div>

                {/* ── Input area ── */}
                <div className="px-4 py-3.5 bg-white border-t border-gold/10 flex gap-2.5 items-end shrink-0">
                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        rows={1}
                        className="flex-1 border border-gray-200 bg-[#faf8f5] rounded-xl px-3.5 py-3 text-[14px] resize-none outline-none max-h-[120px] min-h-[44px] leading-relaxed text-gray-800 transition-all duration-200 focus:border-gold focus:ring-1 focus:ring-gold/30 focus:bg-white placeholder:text-gray-400 shadow-inner"
                    />
                    <button
                        id="browan-solicitors-chat-send"
                        onClick={() => sendMessage(inputValue)}
                        disabled={isSending || !inputValue.trim()}
                        aria-label="Send message"
                        className="w-11 h-11 rounded-xl bg-gold text-white border-none cursor-pointer flex items-center justify-center shrink-0 transition-all duration-200 hover:bg-gold-hover hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    >
                        <Send className="w-[18px] h-[18px] ml-0.5" />
                    </button>
                </div>

                {/* ── Footer ── */}
                <div className="text-center py-2 bg-white text-[10px] uppercase tracking-wider text-gray-400 border-t border-gray-100">
                    Powered by{" "}
                    <a
                        href="https://trostechnologies.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold/80 font-medium no-underline hover:text-gold transition-colors"
                    >
                        Tros Technologies
                    </a>
                </div>
            </div>
        </>
    );
}