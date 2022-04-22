import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });
  useEffect(() => {
    prevCartRef.current = cart;
  });
  const prevCartRef = useRef<Product[]>();
  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if(cart !== cartPreviousValue){
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, )

  const addProduct = async (productId: number) => {
    try {
      const cartUpdated = [...cart];
      const productExists = cartUpdated.find(
        (product) => product.id === productId
      );
      const amount = productExists ? productExists.amount : 0;
      const amountIncremented = amount + 1;
      const stock: Stock = await api
        .get(`/stock/${productId}`)
        .then((response) => {
          return response.data;
        })
        .catch(() => {
          throw new Error("Erro na adição do produto");
        });
      if (amountIncremented > stock.amount) {
        throw new Error("Quantidade solicitada fora de estoque");
      }
      if (productExists) {
        productExists.amount = amountIncremented;
      } else {
        const product: Product = await api
          .get(`/products/${productId}`)
          .then((response) => {
            return response.data;
          })
          .catch((error) => {
            throw new Error("Erro na adição do produto");
          });
        product.amount = amountIncremented;
        cartUpdated.push(product);
      }
      setCart(cartUpdated);
    } catch (_error) {
      const error = _error as Error;
      toast.error(error.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let cartUpdatedWithoutProduct = [...cart];
      let productIndex = cartUpdatedWithoutProduct.findIndex(
        (product) => product.id === productId
      );
      if (productIndex !== -1) {
        cartUpdatedWithoutProduct.splice(productIndex, 1);
        return setCart(cartUpdatedWithoutProduct);
      }
      throw new Error("Erro na remoção do produto");
    } catch (_error) {
      const error = _error as Error;
      toast.error(error.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const stockItem: Stock = await api
        .get(`/stock/${productId}`)
        .then((response) => response.data)
        .catch(() => {
          throw new Error("Erro na alteração de quantidade do produto");
        });
      if (amount > stockItem.amount) {
        throw new Error("Quantidade solicitada fora de estoque");
      }
      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );
      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
        return;
      }
      throw new Error("Erro na alteração de quantidade do produto");
    } catch (_error) {
      const error = _error as Error;
      toast.error(error.message);
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
