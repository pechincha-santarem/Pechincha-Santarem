import { Promotion } from '../types';
import { supabase } from '../lib/supabaseClient';

const FAVORITES_KEY = 'pechincha_santarem_favorites';

function norm(v: any) {
  return String(v ?? '').trim().toLowerCase();
}

function normalizeStatus(raw: any) {
  const s = norm(raw);
  if (s === 'pending' || s === 'pendente') return 'pending';
  if (s === 'approved' || s === 'aprovado' || s === 'aprovada') return 'approved';
  if (s === 'rejected' || s === 'reprovado' || s === 'reprovada') return 'rejected';
  return 'pending';
}

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * ✅ Normaliza expiryDate do APP para DB:
 * - Se já vier "YYYY-MM-DD" -> retorna igual
 * - Se vier number (timestamp ms) -> converte para "YYYY-MM-DD"
 * - Se vier vazio -> null
 */
function normalizeExpiryDateToDb(v: any): string | null {
  const raw = String(v ?? '').trim();
  if (!raw) return null;

  // formato date do input <input type="date"> já vem assim
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // se veio timestamp em ms
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && asNum > 0) {
    const d = new Date(asNum);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }
  }

  // última tentativa: Date parse
  const d2 = new Date(raw);
  if (!isNaN(d2.getTime())) return d2.toISOString().slice(0, 10);

  return null;
}

/**
 * ✅ Normaliza expiry_date do DB para APP:
 * - DB pode vir "YYYY-MM-DD" (date) ou ISO
 * - No seu app, PromotionForm usa string no state e <input type="date">
 * - Então devolvemos sempre "YYYY-MM-DD" (string)
 */
function normalizeExpiryDateFromDb(v: any): string {
  if (v == null) return '';
  const raw = String(v).trim();
  if (!raw) return '';

  // já está em YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return '';
}

// ===============================
// FAVORITOS (localStorage)
// ===============================
function readFavs(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? (data as string[]) : [];
  } catch {
    return [];
  }
}

function writeFavs(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

// ===============================
// MAPEAMENTO Supabase <-> App
// (DB = snake_case, App = camelCase)
// ===============================
type PromotionRow = {
  id: string;
  partner_id: string;
  title: string;
  description: string;
  current_price: any;
  old_price: any;
  category: string;
  expiry_date: any; // ✅ date (string) no DB
  image_url: string | null;
  store_name: string;
  status: string;
  is_featured: boolean;
  is_flash: boolean;
  flash_until: string | null; // timestamptz
  destination_type: string | null;
  destination_url: string | null;
  created_at: string; // timestamptz
};

function fromRow(r: PromotionRow): Promotion {
  return {
    id: r.id,
    partnerId: r.partner_id,
    title: r.title,
    description: r.description,
    currentPrice: toNumber(r.current_price, 0),
    oldPrice: toNumber(r.old_price, 0),
    category: r.category as any,

    // ✅ AGORA: string "YYYY-MM-DD" para o input date
    expiryDate: normalizeExpiryDateFromDb(r.expiry_date) as any,

    imageUrl: r.image_url ?? '',
    storeName: r.store_name,
    status: normalizeStatus(r.status) as any,
    isFeatured: Boolean(r.is_featured),
    isFlash: Boolean(r.is_flash),
    flashUntil: r.flash_until ? new Date(r.flash_until).toISOString() : (undefined as any),
    destinationType: (r.destination_type ?? undefined) as any,
    destinationUrl: (r.destination_url ?? undefined) as any,

    // se seu type tiver createdAt
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  } as any;
}

function toRow(p: Promotion, partnerIdFallback?: string): Partial<PromotionRow> {
  const partnerId = String((p as any).partnerId || partnerIdFallback || '').trim();

  return {
    partner_id: partnerId,
    title: String((p as any).title ?? ''),
    description: String((p as any).description ?? ''),
    current_price: toNumber((p as any).currentPrice, 0),
    old_price: toNumber((p as any).oldPrice, 0),
    category: String((p as any).category ?? ''),

    // ✅ AGORA: salva como date string
    expiry_date: normalizeExpiryDateToDb((p as any).expiryDate),

    image_url: (p as any).imageUrl ? String((p as any).imageUrl) : null,
    store_name: String((p as any).storeName ?? ''),
    status: normalizeStatus((p as any).status),
    is_featured: Boolean((p as any).isFeatured),
    is_flash: Boolean((p as any).isFlash),
    flash_until: (p as any).flashUntil ? new Date((p as any).flashUntil).toISOString() : null,
    destination_type: (p as any).destinationType ? String((p as any).destinationType) : null,
    destination_url: (p as any).destinationUrl ? String((p as any).destinationUrl) : null,
  };
}

class PromotionService {
  initialize() {
    if (!localStorage.getItem(FAVORITES_KEY)) writeFavs([]);
  }

  // ===============================
  // PROMOS (Supabase)
  // ===============================
  async getAll(onlyApproved = false): Promise<Promotion[]> {
    let q = supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (onlyApproved) q = q.eq('status', 'approved');

    const { data, error } = await q;

    if (error) {
      console.error('[promotionService.getAll] error:', error);
      return [];
    }

    const rows = Array.isArray(data) ? (data as PromotionRow[]) : [];
    return rows.map(fromRow);
  }

  async getById(id: string): Promise<Promotion | undefined> {
    const sid = String(id).trim();
    if (!sid) return undefined;

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', sid)
      .maybeSingle();

    if (error) {
      console.error('[promotionService.getById] error:', error);
      return undefined;
    }

    if (!data) return undefined;
    return fromRow(data as PromotionRow);
  }

  async getByPartner(partnerId: string): Promise<Promotion[]> {
    const pid = String(partnerId || '').trim();
    if (!pid) return [];

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('partner_id', pid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[promotionService.getByPartner] error:', error);
      return [];
    }

    const rows = Array.isArray(data) ? (data as PromotionRow[]) : [];
    return rows.map(fromRow);
  }

  /**
   * Salva (cria/atualiza) no Supabase.
   * ✅ NÃO envia created_at (DB coloca sozinho)
   * ✅ expiry_date vai como "YYYY-MM-DD"
   */
  async save(promo: Promotion, id?: string): Promise<void> {
    const incomingId = String(id || (promo as any)?.id || '').trim();

    // tenta obter partner_id da promo; se não tiver, pega do auth
    let partnerId = String((promo as any)?.partnerId || '').trim();
    if (!partnerId) {
      const { data } = await supabase.auth.getUser();
      partnerId = String(data.user?.id || '').trim();
    }

    const payload: any = toRow(promo, partnerId);

    // Se vier id, garante o id no payload (upsert)
    if (incomingId) payload.id = incomingId;

    const { error } = await supabase
      .from('promotions')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('[promotionService.save] error:', error);
      throw error;
    }
  }

  async updateStatus(id: string, status: any): Promise<void> {
    const sid = String(id).trim();
    if (!sid) return;

    const { error } = await supabase
      .from('promotions')
      .update({ status: normalizeStatus(status) })
      .eq('id', sid);

    if (error) {
      console.error('[promotionService.updateStatus] error:', error);
      throw error;
    }
  }

  async deleteByAdmin(id: string): Promise<void> {
    const sid = String(id).trim();
    if (!sid) return;

    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', sid);

    if (error) {
      console.error('[promotionService.deleteByAdmin] error:', error);
      throw error;
    }

    const favs = readFavs().filter(fid => String(fid) !== sid);
    writeFavs(favs);
  }

  async deleteByPartner(id: string, partnerId: string, partnerName?: string): Promise<void> {
    const sid = String(id).trim();
    const pid = String(partnerId || '').trim();
    if (!sid || !pid) return;

    const target = await this.getById(sid);
    if (!target) return;

    const tPartnerId = norm((target as any).partnerId);
    const sPartnerId = norm(pid);

    const tStore = norm((target as any).storeName);
    const sName = norm(partnerName);

    const canDeleteById = tPartnerId && tPartnerId === sPartnerId;
    const canDeleteByName = sName && tStore && tStore === sName;

    if (!canDeleteById && !canDeleteByName) return;

    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', sid);

    if (error) {
      console.error('[promotionService.deleteByPartner] error:', error);
      throw error;
    }

    const favs = readFavs().filter(fid => String(fid) !== sid);
    writeFavs(favs);
  }

  // ===============================
  // FAVORITOS (localStorage)
  // ===============================
  isFavorite(id: string): boolean {
    const sid = String(id);
    return readFavs().some(x => String(x) === sid);
  }

  toggleFavorite(id: string) {
    const sid = String(id);
    const favs = readFavs().map(x => String(x));

    if (favs.includes(sid)) {
      writeFavs(favs.filter(x => x !== sid));
    } else {
      writeFavs([...favs, sid]);
    }
  }

  getFavorites(): string[] {
    return readFavs().map(x => String(x));
  }
}

export const promotionService = new PromotionService();
export { FAVORITES_KEY };
