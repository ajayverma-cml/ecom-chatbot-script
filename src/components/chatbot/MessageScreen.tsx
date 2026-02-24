import { useState, useRef, useEffect, useCallback } from "react";
import { ChatbotConfig } from "@/config/chatbot-config";
// import { ChatMessage, mockProducts } from "@/data/mock-data";
import { Dispatch, SetStateAction } from "react";
import ChatMessageComponent from "./ChatMessage";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Send,
  Smile,
  Mic,
  ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FEATURES from "./features";

interface Message {
  id: string;
  role: string;
  session: string;
  message: string;
  json_content: {} | null;
  created_at: string;
  isStreaming?: boolean;
}

interface MessageScreenProps {
  config: ChatbotConfig;
  onBack: () => void;
  onClose: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  session: {
    session_id: string;
    customer_id: string | null;
    customer_name: string | null;
    customer_email: string | null;
    messages: Message[];
  };
  setSession: Dispatch<SetStateAction<Session | null>>;
}

const EMOJI_LIST = ["😊", "👍", "❤️", "🎉", "😂", "🤔", "👋", "🙏", "💯", "🔥", "✨", "😍"];

// Simulated bot responses
const getBotResponse = (userMessage: string): { content: string; hasProducts: boolean } => {
  const lower = userMessage.toLowerCase();
  if (lower.includes("product") || lower.includes("trending") || lower.includes("recommend") || lower.includes("deal")) {
    return {
      content: "Here are some **top picks** for you! 🛍️ These are currently trending in our store:",
      hasProducts: true,
    };
  }
  if (lower.includes("order") || lower.includes("track")) {
    return {
      content: "I can help you track your order! 📦\n\nPlease provide your **order number** and I'll look it up for you right away.",
      hasProducts: false,
    };
  }
  if (lower.includes("return")) {
    return {
      content: "Our return policy is simple:\n\n- **30-day** return window\n- Items must be in **original condition**\n- Free returns on orders over **$50**\n\nWould you like to start a return?",
      hasProducts: false,
    };
  }
  return {
    content: "Thanks for your message! I'm here to help you find the perfect products, track orders, or answer any questions. What would you like to know? 😊",
    hasProducts: false,
  };
};

const formatDate = (date: Date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${month} ${day} ${year}, ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

const MessageScreen = ({ config, onBack, onClose, isExpanded, onToggleExpand, session, setSession }: MessageScreenProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      session: session.session_id,
      json_content: null,
      role: "assistant",
      message: config.welcomeMessage,
      created_at: formatDate(new Date()),
    },
    ...session?.messages
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
    setSession(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        messages: messages
      };
    });
  }, [messages, isTyping, scrollToBottom]);

  const sendMessage = async (preDefinedmessage=null) => {
    const text = input.trim();
    if (!text && !imagePreview && !preDefinedmessage) return;

    const messageToSend = text || preDefinedmessage

    const userMsg:Message = {
      id: Date.now().toString(),
      session: session.session_id,
      json_content: null,
      role: "user",
      message: messageToSend,
      created_at: formatDate(new Date()),
    }

    setMessages((prev) => [...prev, userMsg]);
    // const userMsg: ChatMessage = {
    //   id: Date.now().toString(),
    //   role: "user",
    //   message: text,
    //   created_at: formatDate(new Date()),
    //   image: imagePreview || undefined,
    // };

    setInput("");
    setImagePreview(null);
    setShowEmoji(false);
    setIsTyping(true);

    let assistantStarted = false;
    const assistantId = crypto.randomUUID();

    let fullResponse = "";

    const response = await FEATURES.shopify.sendMessage(
      userMsg.message,
      userMsg.session,
      (chunk) => {
        fullResponse += chunk;

        setMessages(prev => {
          // If first chunk → create assistant message
          if (!assistantStarted) {
            assistantStarted = true;

            return [
              ...prev,
              {
                id: assistantId,
                role: "assistant",
                session: session.session_id,
                message: chunk,
                json_content: null,
                created_at: formatDate(new Date()),
                isStreaming: true,
              }
            ];
          }

          // If already created → append
          return prev.map(msg =>
            msg.id === assistantId
              ? { ...msg, message: msg.message + chunk }
              : msg
          );
        });
      }
    );

    if (!response?.success){
      setMessages(prev => {
          return [
            ...prev,
            {
              id: assistantId,
              role: "assistant",
              session: session.session_id,
              message: "I'm having trouble responding right now. Let’s try again in a moment.",
              json_content: null,
              created_at: formatDate(new Date()),
              isStreaming: false,
            }
          ];
      });
      setIsTyping(false);
      return;
    }

    setMessages(prev =>
      prev.map(msg =>
        msg.id === assistantId
          ? { ...msg, isStreaming: false }
          : msg
      )
    );

    if (fullResponse){
      const assistantResponse = await FEATURES.saveMessage(session.session_id, fullResponse, "assistant");
      if (assistantResponse){
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantId
              ? assistantResponse
              : msg
          )
        );
      }
    };

    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleChip = (chip: string) => {
    setInput(chip);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "var(--chatbot-header-gradient)" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-[hsl(var(--chatbot-primary-foreground))]"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-sm font-semibold text-[hsl(var(--chatbot-primary-foreground))]">{config.botName}</h3>
            <span className="text-[10px] text-[hsl(var(--chatbot-primary-foreground))]/70">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-[hsl(var(--chatbot-primary-foreground))]"
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-[hsl(var(--chatbot-primary-foreground))]"
            aria-label="Toggle expand"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-[hsl(var(--chatbot-primary-foreground))]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto chatbot-scroll px-4 py-4 space-y-4 bg-[hsl(var(--chatbot-surface))]">
        {messages.map((msg) => (
          <ChatMessageComponent key={msg.id} message={msg} showAddToCartBtn={config.features.addToCartButton} sendMessage={sendMessage} />
        ))}

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="bg-[hsl(var(--chatbot-bot-bubble))] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--chatbot-text-muted))]"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Suggestion chips - show only when there's just the welcome message */}
        {messages.length === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-2">
            {config.features.showSuggestions && config.suggestionChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChip(chip)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-[hsl(var(--chatbot-primary)/0.3)] text-[hsl(var(--chatbot-primary))] bg-[hsl(var(--chatbot-bg))] hover:bg-[hsl(var(--chatbot-secondary))] transition-colors"
              >
                {chip}
              </button>
            ))}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[hsl(var(--chatbot-border))] bg-[hsl(var(--chatbot-bg))] overflow-hidden"
          >
            <div className="grid grid-cols-6 gap-1 p-3">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setInput((prev) => prev + emoji);
                    setShowEmoji(false);
                  }}
                  className="text-xl p-1.5 rounded-lg hover:bg-[hsl(var(--chatbot-surface))] transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview */}
      {imagePreview && (
        <div className="border-t border-[hsl(var(--chatbot-border))] bg-[hsl(var(--chatbot-bg))] px-4 py-2">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-16 rounded-lg border border-[hsl(var(--chatbot-border))]" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[hsl(var(--chatbot-border))] bg-[hsl(var(--chatbot-bg))] px-3 py-2.5">
        <div className="flex justify-between items-center gap-2">
          <div className="w-full">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="w-full resize-none rounded-xl px-3.5 py-2.5 text-sm text-[hsl(var(--chatbot-text))] placeholder:text-[hsl(var(--chatbot-text-muted))] focus:outline-none"
              />
            </div>
            <div className="flex gap-0.5">
              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className="p-2 rounded-lg text-[hsl(var(--chatbot-text-muted))] hover:text-[hsl(var(--chatbot-text))] hover:bg-[hsl(var(--chatbot-surface))] transition-colors"
                aria-label="Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                // onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg text-[hsl(var(--chatbot-text-muted))] hover:text-[hsl(var(--chatbot-text))] hover:bg-[hsl(var(--chatbot-surface))] transition-colors"
                aria-label="Attach image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <button
                className="p-2 rounded-lg text-[hsl(var(--chatbot-text-muted))] hover:text-[hsl(var(--chatbot-text))] hover:bg-[hsl(var(--chatbot-surface))] transition-colors"
                aria-label="Voice input"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() && !imagePreview}
            className="p-2.5 rounded-xl bg-[hsl(var(--chatbot-primary))] text-[hsl(var(--chatbot-primary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageScreen;
