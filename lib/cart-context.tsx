"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

type CartContextValue = {
  count: number;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue>({
  count: 0,
  refresh: async () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setCount(0);
      return;
    }

    const { data } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("user_id", session.user.id);

    const total = (data ?? []).reduce((sum, row) => sum + row.quantity, 0);
    setCount(total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CartContext.Provider value={{ count, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
