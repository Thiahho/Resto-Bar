import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, CheckoutData, Combo } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  addComboToCart: (combo: Combo, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateCartItem: (itemId: string, updatedItem: CartItem) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemsCount: number;
  isCheckoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  checkoutData: CheckoutData | null;
  setCheckoutData: (data: CheckoutData) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += item.quantity;
        updated[existingIndex].subtotal += item.subtotal;
        return updated;
      }
      return [...prev, item];
    });
  };

  const addComboToCart = (combo: Combo, quantity: number = 1) => {
    const comboCartItem: CartItem = {
      id: `combo-${combo.id}-${Date.now()}`,
      type: "combo",
      combo: combo,
      quantity: quantity,
      modifiers: {},
      subtotal: (combo.priceCents / 100) * quantity,
    };
    setCart((prev) => [...prev, comboCartItem]);
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity, subtotal: (item.subtotal / item.quantity) * quantity }
          : item
      )
    );
  };

  const updateCartItem = (itemId: string, updatedItem: CartItem) => {
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? updatedItem : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setCheckoutData(null);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const openCheckout = () => setIsCheckoutOpen(true);
  const closeCheckout = () => setIsCheckoutOpen(false);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        addComboToCart,
        removeFromCart,
        updateQuantity,
        updateCartItem,
        clearCart,
        cartTotal,
        cartItemsCount,
        isCheckoutOpen,
        openCheckout,
        closeCheckout,
        checkoutData,
        setCheckoutData,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
