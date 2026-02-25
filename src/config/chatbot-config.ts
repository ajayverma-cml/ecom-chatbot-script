export type SupportedPlatform = "shopify" | "magento" | "woocommerce";

export interface ChatbotTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headerBackground: string;
  buttonRadius: string;
  fontFamily: string;
}

export interface ChatbotFeatures {
  showViewedProducts: boolean;
  showRecommendedProducts: boolean;
  showCartSummary: boolean;
  showNeedHelp: boolean;
  showQuickLinks: boolean;
  showSuggestions: boolean;
  addToCartButton: boolean;
  platformName?: SupportedPlatform;
}

export interface ChatbotConfig {
  botName: string;
  welcomeMessage: string;
  helpMessage: string;
  theme: ChatbotTheme;
  features: ChatbotFeatures;
  quickLinks: { label: string; url: string }[];
  helpActions: { label: string; icon: string; action: string }[];
  suggestionChips: string[];
}

export const defaultChatbotConfig: ChatbotConfig = {
  botName: "ShopBot",
  welcomeMessage: "Hey there! 👋 How can I help you today?",
  helpMessage: "I can help you find products, track orders, and answer questions about our store.",
  theme: {
    primaryColor: "168 80% 32%",
    secondaryColor: "168 25% 95%",
    accentColor: "25 95% 60%",
    backgroundColor: "0 0% 100%",
    textColor: "220 20% 15%",
    headerBackground: "168 80% 32%",
    buttonRadius: "0.75rem",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  features: {
    showViewedProducts: true,
    showRecommendedProducts: true,
    showCartSummary: true,
    showNeedHelp: true,
    showQuickLinks: true,
    showSuggestions: true,
    addToCartButton: true,
    platformName: "shopify",
  },
  quickLinks: [
    { label: "Return Policy", url: "#" },
    { label: "Privacy Policy", url: "#" },
    { label: "Contact Us", url: "#" },
    { label: "Shipping Policy", url: "#" },
  ],
  helpActions: [
    { label: "Return Policy", icon: "RotateCcw", action: "return_policy" },
    { label: "Track Order", icon: "Package", action: "track_order" },
    { label: "Cancel Order", icon: "XCircle", action: "cancel_order" },
    { label: "Contact Support", icon: "Headphones", action: "contact_support" },
    { label: "Privacy Policy", icon: "Shield", action: "privacy_policy" },
  ],
  suggestionChips: [
    "Show me trending products",
    "Where is my order?",
    "I need help with a return",
    "Best deals today",
  ],
};
