import { ChatMessage as ChatMessageType, mockProducts } from "@/data/mock-data";
import ProductCard from "./ProductCard";
import ReactMarkdown from "react-markdown";
import chatbotAvatar from "@/assets/chatbot-avatar.png";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: string;
  session: string;
  message: string;
  json_content: {} | null;
  created_at: string;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: Message;
  showAddToCartBtn: boolean;
  sendMessage: ()=> void;
}

const TypeText = ({ text, isStream, shownLength }) => {
    if (isStream){
      console.log("Typing effect:", { text, isStream, shownLength });
    }
    const [display, setDisplay] = useState(
      text.slice(0, shownLength)   // resume typing from saved progress
    );

    useEffect(() => {
        if (!isStream) return;

        let i = shownLength; // continue from saved progress

        function step() {
            if (i <= text.length) {
                const next = text.slice(0, i);
                setDisplay(next);
                i += 5;
                requestAnimationFrame(step);
            }
        }
        step();
    }, [text]);

    return (
        <ReactMarkdown
            children={isStream ? display.replaceAll("\\n", "\n") : text.replaceAll("\\n", "\n")}
            components={{
                a: ({ node, ...props }) => (
                    <a
                        {...props}
                        className="text-blue-600 underline break-words"
                        target="_blank"
                        rel="noopener noreferrer"
                    />
                ),
                p: ({ node, ...props }) => (
                    <p {...props} className="mb-1" />
                ),
            }}
        />
    );
};

const ChatMessageComponent = ({ message, showAddToCartBtn, sendMessage }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isUser && (
        <img src={chatbotAvatar} alt="Bot" className="w-7 h-7 rounded-full flex-shrink-0 mt-1 bg-[hsl(var(--chatbot-surface))]" />
      )}

      <div className={`max-w-[80%] space-y-2`}>
        {/* Text bubble */}
        <div
          className={`px-3.5 py-2.5 text-[13px] leading-relaxed ${
            isUser
              ? "bg-[hsl(var(--chatbot-user-bubble))] text-[hsl(var(--chatbot-primary-foreground))] rounded-2xl rounded-br-md"
              : "bg-[hsl(var(--chatbot-bot-bubble))] text-[hsl(var(--chatbot-text))] rounded-2xl rounded-bl-md"
          }`}
        >
          {isUser ? (
            <p>{message.message}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
              <TypeText text={message.message} isStream={message.isStreaming} shownLength={message.shownLength || 0} />
              {message.isStreaming && <span className="animate-pulse">▌</span>}
            </div>
          )}
        </div>

        {/* Image attachment */}
        {/* {message.image && (
          <div className={`rounded-xl overflow-hidden border border-[hsl(var(--chatbot-border))] ${isUser ? "ml-auto" : ""}`}>
            <img src={message.image} alt="Attachment" className="max-w-[200px] max-h-[200px] object-cover" />
          </div>
        )} */}

        {/* Product cards */}
        {message.json_content && message.json_content?.products?.length > 0 && (
          <div className="flex gap-2.5 overflow-x-auto product-scroll pb-1 pt-1">
            {message.json_content?.products.map((p) => (
              <ProductCard key={p.id} product={p} showAddToCartBtn={showAddToCartBtn} sendMessage={sendMessage} compact />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className={`text-[10px] text-[hsl(var(--chatbot-text-muted))] ${isUser ? "text-right" : ""}`}>
          {message.created_at}
        </p>
      </div>
    </motion.div>
  );
};

export default ChatMessageComponent;
