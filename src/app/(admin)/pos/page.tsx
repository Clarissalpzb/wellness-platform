"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingBag, Plus, Minus, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  sku?: string;
  stockQuantity: number;
  isActive: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const json = await res.json();
        setProducts(json);
      } else {
        setProducts([]);
      }
    } catch (e) {
      console.error(e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handlePayment = (method: string) => {
    alert(`Pago con ${method} por $${total.toLocaleString()} MXN. Integración con Stripe POS próximamente.`);
  };

  const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      price: Number(formData.get("price")),
      category: formData.get("category") as string || undefined,
      sku: formData.get("sku") as string || undefined,
      stock: Number(formData.get("stock")) || 0,
    };
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowCreate(false);
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      setFormError(err.error || "Error al guardar");
    }
  };

  const closeDialog = () => {
    setShowCreate(false);
    setFormError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Products */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Punto de Venta</h1>
            <p className="text-sm text-neutral-500">Vende productos y servicios</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {products.length === 0 && !loading && (
          <div className="text-center py-12 text-neutral-500">
            <p>No hay productos aún</p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="text-left p-4 border border-neutral-200 rounded-xl bg-white hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-3">
                <ShoppingBag className="h-5 w-5 text-neutral-500" />
              </div>
              <p className="font-medium text-sm">{product.name}</p>
              <p className="text-xs text-neutral-500">{product.category}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold">${product.price}</span>
                <Badge variant="outline" className="text-xs">
                  Stock: {product.stockQuantity}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      <Card className="w-80 shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Carrito</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
              Agrega productos al carrito
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-neutral-500">${item.product.price} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 mt-4 border-t border-neutral-200 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="font-medium">${total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${total.toLocaleString()} MXN</span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full" onClick={() => handlePayment("efectivo")}>
                    <Banknote className="mr-2 h-4 w-4" />
                    Efectivo
                  </Button>
                  <Button className="w-full" onClick={() => handlePayment("tarjeta")}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Tarjeta
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Product Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Producto</DialogTitle>
            <DialogDescription>Agrega un nuevo producto al inventario</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateProduct}>
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" placeholder="Ej: Mat de Yoga" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (MXN)</Label>
                <Input id="price" name="price" type="number" step="0.01" placeholder="0" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input id="category" name="category" placeholder="Ej: Accesorios" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" placeholder="Ej: MAT-001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input id="stock" name="stock" type="number" placeholder="0" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit">Crear Producto</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
