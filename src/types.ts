export type PromotionStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'partner' | 'customer';
export type AccountStatus = 'active' | 'blocked';
export type LeadStatus = 'new' | 'contacted' | 'approved' | 'rejected';

export type PromotionDestination =
  | 'WhatsApp'
  | 'Site Externo'
  | 'Loja Online'
  | 'Catálogo Digital'
  | 'Página Interna';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: number;
}

export interface PartnerLead {
  id: string;
  companyName: string;
  segment: string;
  city: string;
  whatsapp: string;
  notes?: string;
  status: LeadStatus;
  createdAt: number;
}

export interface Partner extends UserAccount {
  role: 'partner';
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  currentPrice: number;
  oldPrice: number;
  category: string;
  expiryDate: string;
  imageUrl: string;
  partnerId: string;
  storeName: string;
  status: PromotionStatus;

  // ✅ Admin
  isFeatured: boolean; // destaque
  isFlash?: boolean;   // relâmpago
  flashUntil?: string; // ✅ NOVO: ISO string (ex: "2026-01-14T23:59:00.000Z")

  // ✅ Destino do clique
  destinationType: PromotionDestination;
  destinationUrl: string;

  createdAt: number;

  // ✅ Monetização (opcional)
  isSponsored?: boolean;
  sponsorLabel?: string; // ex: "Patrocinado" ou "Parceiro"
}

export type Category =
  | 'Supermercado'
  | 'Restaurante'
  | 'Farmácia'
  | 'Eletrônicos'
  | 'Moda'
  | 'Outros';

export const CATEGORIES: Category[] = [
  'Supermercado',
  'Restaurante',
  'Farmácia',
  'Eletrônicos',
  'Moda',
  'Outros',
];
