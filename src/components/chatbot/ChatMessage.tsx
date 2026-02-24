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

export const useTypingEffect = (text: string, speed = 15) => {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (indexRef.current < textRef.current.length) {
        setDisplayed(prev => prev + textRef.current[indexRef.current]);
        indexRef.current++;
      }
    }, speed);

    return () => clearInterval(interval);
  }, []);

  return displayed;
};

const ChatMessageComponent = ({ message, showAddToCartBtn, sendMessage }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const animatedText = useTypingEffect(
    message.isStreaming ? message.message : "",
    10
  );

  const finalText = message.isStreaming ? animatedText : message.message.replace(/\\n/g, "\n");

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
              <ReactMarkdown>{finalText}</ReactMarkdown>
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
