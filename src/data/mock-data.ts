import headphonesImg from "@/assets/products/headphones.png";
import smartwatchImg from "@/assets/products/smartwatch.png";
import speakerImg from "@/assets/products/speaker.png";
import backpackImg from "@/assets/products/backpack.png";
import shoesImg from "@/assets/products/shoes.png";
import earbudsImg from "@/assets/products/earbuds.png";

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  rating?: number;
  category: string;
}

export const mockProducts: Product[] = [
  { id: "1", name: "Wireless Headphones", price: 89.99, image: headphonesImg, rating: 4.5, category: "Audio" },
  { id: "2", name: "Smart Watch Pro", price: 249.99, image: smartwatchImg, rating: 4.8, category: "Wearables" },
  { id: "3", name: "Bluetooth Speaker", price: 59.99, image: speakerImg, rating: 4.2, category: "Audio" },
  { id: "4", name: "Laptop Backpack", price: 79.99, image: backpackImg, rating: 4.6, category: "Accessories" },
  { id: "5", name: "Running Shoes X1", price: 129.99, image: shoesImg, rating: 4.7, category: "Footwear" },
  { id: "6", name: "Wireless Earbuds", price: 49.99, image: earbudsImg, rating: 4.3, category: "Audio" },
];

export const viewedProducts = mockProducts.slice(0, 3);
export const recommendedProducts = mockProducts.slice(3);

export interface CartItem {
  product: Product;
  quantity: number;
}

export const mockCart: CartItem[] = [
  { product: mockProducts[0], quantity: 1 },
  { product: mockProducts[4], quantity: 2 },
];

export interface ChatMessage {
  id: string;
  role: string;
  session: string;
  message: string;
  json_content: {} | null;
  created_at: string;
}
