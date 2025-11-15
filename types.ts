export interface BusinessInfo {
  name: string;
  description?: string; // Descripción del negocio que aparece en InfoPage
  banner: {
    imageUrl: string;
    title: string;
    subtitle: string;
  };
  hours: string[];
  contact: {
    phone: string;
    address: string;
    transferAlias?: string; // Alias para transferencias bancarias
    social: {
      instagram: string;
      facebook: string;
    };
  };
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Products {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  hasImage: boolean;
  categoryId: string;
  displayOrder: number;
}

export interface ComboItem {
  productId: number;
  productName: string;
  qty: number;
}

export interface Combo {
  id: number;
  name: string;
  priceCents: number;
  isActive: boolean;
  items: ComboItem[];
}

export interface ProductModifier {
  id: number;
  name: string;
  priceCents: number;
  type?: "size" | "complemento" | "aderezo" | "extra" | "bebida";
}

export interface CartItem {
  id: string;
  type?: "product" | "combo"; // Tipo de item
  product?: Products; // Para productos
  combo?: Combo; // Para combos
  quantity: number;
  size?: "simple" | "doble";
  modifiers: {
    complementos?: ProductModifier[]; // Agregados a tus papas
    aderezos?: ProductModifier[]; // dips
    extras?: ProductModifier[]; // Extras burger
    bebidas?: ProductModifier; // Bebida
  };
  notes?: string;
  subtotal: number;
}

export type OrderType = "delivery" | "pickup";

export interface ScheduledDelivery {
  date: Date;
  time: string;
}

export interface PaymentMethod {
  type: "cash" | "transfer";
  transferAlias?: string;
}

export interface CheckoutData {
  orderType: OrderType;
  scheduled?: ScheduledDelivery;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: string;
  paymentMethod: PaymentMethod;
  tip: number;
  promoCode?: string;
}

export interface OrderItemRequest {
  productId?: number;
  nameSnapshot: string;
  qty: number;
  unitPriceCents: number;
  modifiersTotalCents: number;
  lineTotalCents: number;
  modifiersSnapshot?: string; // JSON string con detalles de modificadores
}

export interface OrderRequest {
  branchId?: number;
  customerName: string;
  phone: string;
  channel: string;
  takeMode: string;
  address?: string;
  reference?: string;
  scheduledAt?: string;
  note?: string;
  subtotalCents: number;
  discountCents: number;
  tipCents: number;
  totalCents: number;
  items: OrderItemRequest[];
}

export interface OrderResponse {
  id: number;
  branchId?: number;
  customerName: string;
  phone: string;
  channel: string;
  takeMode: string;
  address?: string;
  reference?: string;
  scheduledAt?: string;
  note?: string;
  subtotalCents: number;
  discountCents: number;
  tipCents: number;
  totalCents: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemRequest[];
}
