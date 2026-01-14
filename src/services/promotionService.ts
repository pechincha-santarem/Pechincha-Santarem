import { Promotion, PromotionStatus } from '../types';
import { authService } from './authService';

const STORAGE_KEY = 'pechincha_santarem_promotions';
const FAVORITES_KEY = 'pechincha_santarem_favorites';

function onlyDigits(v: string) {
  return (v || '').replace(/\D/g, '');
}

// Normaliza WhatsApp de forma segura:
// - aceita número puro: "5593..." ou "93..." ou "559398..."
// - aceita link: "https://wa.me/..."
function normalizeWhatsAppUrl(input: string) {
  const raw = (input || '').trim();
  if (!raw) return '';

  // se já veio como link, tenta extrair número e reconstruir
  if (raw.includes('wa.me') || raw.includes('whatsapp.com')) {
    const digits = onlyDigits(raw);
    if (!digits) return raw;
    return `https://wa.me/${digits}`;
  }

  // número puro
  const digits = onlyDigits(raw);
  if (!digits) return '';

  // se já começa com 55, mantém; se não, mantém como está (você pode optar por forçar 55)
  const finalDigits = digits.startsWith('55') ? digits : digits;
  return `https://wa.me/${finalDigits}`;
}

export const promotionService = {
  initialize: () => {
    authService.initialize();
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data || JSON.parse(data).length === 0) {
      const seedPartnerId = 'seed-partner';

      const now = Date.now();
      const flash24h = new Date(now + 24 * 60 * 60 * 1000).toISOString();

      const initial: Promotion[] = [
        {
          id: '1',
          title: "Arroz Tio Jorge 5kg",
          description: "Arroz agulhinha tipo 1.",
          currentPrice: 24.90,
          oldPrice: 32.00,
          category: "Supermercado",
          expiryDate: "2026-12-31",
          imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400",
          storeName: "Supermercado CR",
          status: "approved",
          isFeatured: true,
          isFlash: false,
          flashUntil: undefined,
          partnerId: seedPartnerId,
          createdAt: now,
          destinationType: 'WhatsApp',
          destinationUrl: 'https://wa.me/5593999999999',
        },
        {
          id: '2',
          title: "Óleo de Soja Liza 900ml",
          description: "Promoção relâmpago (exemplo).",
          currentPrice: 5.49,
          oldPrice: 8.90,
          category: "Supermercado",
          expiryDate: "2026-12-25",
          imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400",
          storeName: "Mercadão Popular",
          status: "approved",
          isFeatured: false,
          isFlash: true,
          flashUntil: flash24h,
          partnerId: seedPartnerId,
          createdAt: now - 1000,
          destinationType: 'WhatsApp',
          destinationUrl: 'https://wa.me/5593988888888',
        }
      ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }
  },

  getAll: (onlyApproved = true): Promotion[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    const promotions: Promotion[] = data ? JSON.parse(data) : [];

    const list = onlyApproved
      ? promotions.filter(p => p.status === 'approved')
      : promotions;

    const now = Date.now();

    // ✅ Ordenação profissional:
    // 1) relâmpago válido primeiro
    // 2) depois destaque
    // 3) depois mais recente
    return list.sort((a, b) => {
      const aFlashValid =
        Boolean(a.isFlash && a.flashUntil && new Date(a.flashUntil).getTime() > now);
      const bFlashValid =
        Boolean(b.isFlash && b.flashUntil && new Date(b.flashUntil).getTime() > now);

      if (aFlashValid !== bFlashValid) return aFlashValid ? -1 : 1;

      const aFeat = Boolean(a.isFeatured);
      const bFeat = Boolean(b.isFeatured);
      if (aFeat !== bFeat) return aFeat ? -1 : 1;

      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  },

  getByPartner: (partnerId: string): Promotion[] => {
    const promotions = promotionService.getAll(false);
    return promotions.filter(p => p.partnerId === partnerId);
  },

  getById: (id: string): Promotion | undefined => {
    const promotions = promotionService.getAll(false);
    return promotions.find(p => p.id === id);
  },

  // ✅ Agora aceita PATCH parcial (admin pode enviar isFlash / flashUntil / isFeatured / status)
  save: (promotionData: Partial<Promotion>, id?: string): Promotion => {
    const promotions = promotionService.getAll(false);
    const session = authService.getCurrentSession();

    // destino padrão (mantém existente se não vier)
    const incomingType = promotionData.destinationType;
    const incomingUrl = promotionData.destinationUrl;

    // processa WhatsApp se vier tipo+url
    let processedData: any = { ...promotionData };

    if (incomingType && typeof incomingUrl === 'string') {
      if (incomingType === 'WhatsApp') {
        processedData.destinationUrl = normalizeWhatsAppUrl(incomingUrl);
      } else {
        processedData.destinationUrl = (incomingUrl || '').trim();
      }
    }

    if (id) {
      const index = promotions.findIndex(p => p.id === id);
      if (index === -1) throw new Error("Promoção não encontrada");

      const current = promotions[index];

      // ✅ Regra: se parceiro editar, volta pra pendente (mas NÃO apaga flags admin)
      const nextStatus =
        session?.role === 'admin'
          ? (processedData.status ?? current.status)
          : 'pending';

      const updated: Promotion = {
        ...current,
        ...processedData,
        status: nextStatus,
      };

      promotions[index] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(promotions));
      return updated;
    }

    // criação
    const partnerId = session?.userId || 'admin-created';
    const newPromo: Promotion = {
      // defaults mínimos
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      partnerId,
      status: 'pending',

      // defaults de admin
      isFeatured: false,
      isFlash: false,
      flashUntil: undefined,

      // aplica dados vindos
      ...(processedData as any),
    };

    // Se criar como admin e vier status, respeita
    if (session?.role === 'admin' && processedData.status) {
      newPromo.status = processedData.status;
    }

    promotions.push(newPromo);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(promotions));
    return newPromo;
  },

  updateStatus: (id: string, status: PromotionStatus): void => {
    const promotions = promotionService.getAll(false);
    const index = promotions.findIndex(p => p.id === id);
    if (index !== -1) {
      promotions[index].status = status;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(promotions));
    }
  },

  delete: (id: string): void => {
    const promotions = promotionService.getAll(false);
    const filtered = promotions.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  getFavorites: (): string[] => {
    const data = localStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  },

  toggleFavorite: (id: string): void => {
    const favorites = promotionService.getFavorites();
    const index = favorites.indexOf(id);
    if (index === -1) favorites.push(id);
    else favorites.splice(index, 1);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  },

  isFavorite: (id: string): boolean => {
    return promotionService.getFavorites().includes(id);
  }
};
