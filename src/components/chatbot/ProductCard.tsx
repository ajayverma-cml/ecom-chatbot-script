import { Product } from "@/data/mock-data";
import { ShoppingCart, Eye, Star } from "lucide-react";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: Product;
  showAddToCartBtn: boolean;
  sendMessage: (preDefinedmessage: string)=> void;
  compact?: boolean;
}

const ProductCard = ({ product, showAddToCartBtn, sendMessage, compact = false }: ProductCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`flex-shrink-0 rounded-[var(--chatbot-radius)] border border-[hsl(var(--chatbot-border))] bg-[hsl(var(--chatbot-bg))] overflow-hidden ${
        compact ? "w-36" : "w-44"
      }`}
    >
      <div className={`relative overflow-hidden bg-[hsl(var(--chatbot-surface))] ${compact ? "h-28" : "h-32"}`}>
        <a href={product.product_url} target="_blank">
          <img
            src={product?.image}
            alt={product?.name}
            className="w-full h-full object-fill"
            loading="lazy"
          />
        </a>
      </div>
      <div className="p-2.5">
        <h4 className="text-xs font-semibold text-[hsl(var(--chatbot-text))] truncate">
          {product?.name}
        </h4>
        {product?.rating && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <Star className="w-3 h-3 fill-[hsl(var(--chatbot-accent))] text-[hsl(var(--chatbot-accent))]" />
            <span className="text-[10px] text-[hsl(var(--chatbot-text-muted))]">{product?.rating}</span>
          </div>
        )}
        <p className="text-sm font-bold text-[hsl(var(--chatbot-primary))] mt-1">
          {product?.price}
        </p>
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={() => sendMessage(`more detail of "${product.name}"`)}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium py-1.5 rounded-md border border-[hsl(var(--chatbot-border))] text-[hsl(var(--chatbot-text))] hover:bg-[hsl(var(--chatbot-surface))] transition-colors"
          >
            <Eye className="w-3 h-3" /> Detail
          </button>
          {showAddToCartBtn && <button
            onClick={() => sendMessage(`add "${product.name} in cart"`)}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium py-1.5 rounded-md bg-[hsl(var(--chatbot-primary))] text-[hsl(var(--chatbot-primary-foreground))] hover:opacity-90 transition-opacity"
          >
            <ShoppingCart className="w-3 h-3" /> Add
          </button>}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
