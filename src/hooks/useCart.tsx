import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = localStorage.getItem("@RocketShoes:cart");

    if (storageCart) {
      return JSON.parse(storageCart);
    }

    return [];
  });

  const getStockByProductId = async (productId: number) => {
    const response = await api.get<Stock>(`/stock/${productId}`);

    return response.data.amount;
  };

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find((product) => product.id === productId);

      if (product) {
        await updateProductAmount({ productId, amount: product.amount + 1 });
      } else {
        const stock = await getStockByProductId(productId);

        if (stock === 0) {
          toast.error("Quantidade solicitada fora de estoque");

          return;
        }

        const response = await api.get(`/products/${productId}`);

        const cartAux = [...cart, { ...response.data, amount: 1 }];

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartAux));

        setCart(cartAux);

        return;
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIsInCart = cart.some((product) => product.id === productId);

      if (productIsInCart) {
        const auxCart = cart.filter((product) => product.id !== productId);

        setCart(auxCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(auxCart));
      } else {
        toast.error("Erro na remoção do produto");
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stock = await getStockByProductId(productId);

      if (stock >= amount && amount > 0) {
        const newCart = cart.reduce((acc, curr) => {
          if (curr.id === productId) {
            return [...acc, { ...curr, amount }];
          }

          return [...acc, curr];
        }, [] as Product[]);

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        setCart(newCart);

        return;
      }

      toast.error("Quantidade solicitada fora de estoque");
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
