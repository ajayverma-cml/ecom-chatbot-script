import { ChatbotConfig } from "@/config/chatbot-config";
import { viewedProducts, recommendedProducts, mockCart, Product } from "@/data/mock-data";
import ProductCard from "./ProductCard";
import chatbotAvatar from "@/assets/chatbot-avatar.png";
import {
  MessageCircle,
  RotateCcw,
  Package,
  XCircle,
  Headphones,
  Shield,
  ExternalLink,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

const iconMap: Record<string, React.ReactNode> = {
  RotateCcw: <RotateCcw className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
  XCircle: <XCircle className="w-4 h-4" />,
  Headphones: <Headphones className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
};

interface HomeScreenProps {
  config: ChatbotConfig;
  onStartChat: () => void;
  onHelpAction: (action: string) => void;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--chatbot-text-muted))] mb-2.5 px-1">
    {children}
  </h3>
);

const HomeScreen = ({ config, onStartChat, onHelpAction }: HomeScreenProps) => {
  const cartTotal = mockCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = mockCart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-5 pt-6 pb-5 text-[hsl(var(--chatbot-primary-foreground))]"
        style={{ background: "var(--chatbot-header-gradient)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <img src={chatbotAvatar} alt="Bot" className="w-10 h-10 rounded-full border-2 border-white/30 bg-white" />
          <div>
            <h2 className="text-base font-bold">{config.botName}</h2>
            <span className="text-[11px] opacity-80">Always here to help</span>
          </div>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">{config.helpMessage}</p>
        <button
          onClick={onStartChat}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/20 backdrop-blur-sm text-sm font-semibold hover:bg-white/30 transition-colors"
        >
          <MessageCircle className="w-4 h-4" /> Start a Conversation
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto chatbot-scroll px-4 py-4 space-y-5">
        {/* Viewed Products */}
        {config.features.showViewedProducts && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <SectionTitle>Recently Viewed</SectionTitle>
            <div className="flex gap-3 overflow-x-auto product-scroll pb-1">
              {viewedProducts.map((p) => (
                <ProductCard key={p.id} product={p} compact />
              ))}
            </div>
          </motion.section>
        )}

        {/* Recommended Products */}
        {config.features.showRecommendedProducts && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <SectionTitle>Recommended For You</SectionTitle>
            <div className="flex gap-3 overflow-x-auto product-scroll pb-1">
              {recommendedProducts.map((p) => (
                <ProductCard key={p.id} product={p} compact />
              ))}
            </div>
          </motion.section>
        )}

        {/* Cart Summary */}
        {config.features.showCartSummary && mockCart.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <SectionTitle>Your Cart</SectionTitle>
            <div className="rounded-xl border border-[hsl(var(--chatbot-border))] bg-[hsl(var(--chatbot-bg))] p-3.5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[hsl(var(--chatbot-primary))]" />
                  <span className="text-sm font-medium text-[hsl(var(--chatbot-text))]">{cartCount} items</span>
                </div>
                <span className="text-sm font-bold text-[hsl(var(--chatbot-primary))]">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 text-xs font-semibold py-2 rounded-lg border border-[hsl(var(--chatbot-border))] text-[hsl(var(--chatbot-text))] hover:bg-[hsl(var(--chatbot-surface))] transition-colors">
                  View Cart
                </button>
                <button className="flex-1 text-xs font-semibold py-2 rounded-lg bg-[hsl(var(--chatbot-accent))] text-[hsl(var(--chatbot-primary-foreground))] hover:opacity-90 transition-opacity">
                  Checkout
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* Need Help */}
        {config.features.showNeedHelp && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <SectionTitle>Need Help?</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {config.helpActions.map((action) => (
                <button
                  key={action.action}
                  onClick={() => onHelpAction(action.action)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[hsl(var(--chatbot-border))] bg-[hsl(var(--chatbot-bg))] text-xs font-medium text-[hsl(var(--chatbot-text))] hover:bg-[hsl(var(--chatbot-surface))] hover:border-[hsl(var(--chatbot-primary)/0.3)] transition-all"
                >
                  <span className="text-[hsl(var(--chatbot-primary))]">{iconMap[action.icon]}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Quick Links */}
        {config.features.showQuickLinks && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <SectionTitle>Quick Links</SectionTitle>
            <div className="space-y-1">
              {config.quickLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-[hsl(var(--chatbot-text))] hover:bg-[hsl(var(--chatbot-surface))] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-[hsl(var(--chatbot-text-muted))]" />
                    {link.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--chatbot-text-muted))]" />
                </a>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default HomeScreen;
