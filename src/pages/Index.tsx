import ChatbotWidget from "@/components/chatbot/ChatbotWidget";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Demo eCommerce page background */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">TechStore</h1>
          <nav className="hidden sm:flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Products</a>
            <a href="#" className="hover:text-foreground transition-colors">Deals</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">Welcome to TechStore</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Discover the latest in tech accessories. Click the chat button to interact with our AI shopping assistant.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Chat assistant is online
          </div>
        </div>
      </main>

      <ChatbotWidget />
    </div>
  );
};

export default Index;
