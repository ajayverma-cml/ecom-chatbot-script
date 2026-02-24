import { useEffect, useState } from "react";
import { defaultChatbotConfig } from "@/config/chatbot-config";
import HomeScreen from "./HomeScreen";
import MessageScreen from "./MessageScreen";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FEATURES from "./features";

type Screen = "home" | "messages";

interface Message {
  id: string;
  role: string;
  session: string;
  message: string;
  json_content: {} | null;
  created_at: string;
  isStreaming?: boolean;
}

interface Session {
  session_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  messages: Message[];
}

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [isExpanded, setIsExpanded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const config = defaultChatbotConfig;

  useEffect(()=>{
    const loadSession = async ()=>{
      const session_id = localStorage.getItem("session_id");
  
      let sessionData: Session | null = null;

      if (session_id) {
        sessionData = await FEATURES.loadSession(session_id);
      }

      if (!sessionData) {
        sessionData = await FEATURES.createSession();
      }

      if (sessionData?.session_id) {
        setSession(sessionData);
        localStorage.setItem("session_id", sessionData.session_id);
      }
    }

    loadSession()
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setIsExpanded(false);
  };

  const handleHelpAction = (action: string) => {
    setScreen("messages");
    // The message screen will handle the action
  };

  return (
    <>
      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={`fixed z-50 bg-[hsl(var(--chatbot-bg))] rounded-2xl overflow-hidden border border-[hsl(var(--chatbot-border))] flex flex-col ${
              isExpanded
                ? "bottom-4 right-4 left-4 top-4 sm:left-auto sm:top-4 sm:w-[480px]"
                : "bottom-24 right-4 w-[380px] sm:w-[400px]"
            }`}
            style={{
              height: isExpanded ? undefined : "min(600px, calc(100vh - 120px))",
              boxShadow: "var(--chatbot-shadow)",
            }}
          >
            {screen === "home" ? (
              <HomeScreen config={config} onStartChat={() => setScreen("messages")} onHelpAction={handleHelpAction} />
            ) : (
              <MessageScreen
                config={config}
                onBack={() => setScreen("home")}
                onClose={handleClose}
                isExpanded={isExpanded}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                session={session}
                setSession={setSession}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setScreen("home");
        }}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[hsl(var(--chatbot-primary))] text-[hsl(var(--chatbot-primary-foreground))] flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
};

export default ChatbotWidget;
