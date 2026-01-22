import { Promotion } from '../types';

const STORAGE_KEY = 'pechincha_santarem_promotions';
const FAVORITES_KEY = 'pechincha_santarem_favorites';

function norm(v: any) {
  return String(v ?? '').trim().toLowerCase();
}

function genId() {
  // id simples e estável (string)
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

function normalizeStatus(raw: any) {
  const s = norm(raw);

  if (s === 'pending' || s === 'pendente') return 'pending';
  if (s === 'approved' || s === 'aprovado' || s === 'aprovada') return 'approved';
  if (s === 'rejected' || s === 'reprovado' || s === 'reprovada') return 'rejected';

  return 'pending';
}

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

function readAll(): Promotion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(data) ? data : [];

    // ✅ GARANTIA: toda promo precisa ter id (se não tiver, cria)
    const withId = arr.map((p: any) => {
      const id = String(p?.id ?? '').trim();
      const fixedId = id ? id : genId();
      return {
        ...p,
        id: fixedId,
        status: normalizeStatus(p?.status),
      };
    });

    // ✅ DEDUPE por id (mantém a última versão)
    const map = new Map<string, any>();
    for (const p of withId) map.set(String(p.id), p);
    const deduped = Array.from(map.values());

    // regrava consistente (evita sumir/duplicar depois)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));

    return deduped as Promotion[];
  } catch {
    return [];
  }
}

function writeAll(list: Promotion[]) {
  const normalized = (Array.isArray(list) ? list : []).map((p: any) => {
    const id = String(p?.id ?? '').trim();
    return {
      ...p,
      id: id ? id : genId(),
      status: normalizeStatus(p?.status),
    };
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

class PromotionService {
  private initialized = false;

  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    if (!localStorage.getItem(STORAGE_KEY)) writeAll([]);
    if (!localStorage.getItem(FAVORITES_KEY)) writeFavs([]);
  }

  // ===============================
  // PROMOS
  // ===============================
  getAll(onlyApproved = false): Promotion[] {
    const all = readAll();
    return onlyApproved ? all.filter((p: any) => p.status === 'approved') : all;
  }

  getById(id: string): Promotion | undefined {
    const sid = String(id);
    return readAll().find(p => String((p as any).id) === sid);
  }

  getByPartner(partnerId: string): Promotion[] {
    const pid = norm(partnerId);
    return readAll().filter(p => norm((p as any).partnerId) === pid);
  }

  save(promo: Promotion, id?: string) {
    const all = readAll();

    // ✅ garante id (se vier vazio, cria)
    const incomingId = id ? String(id) : String((promo as any)?.id ?? '').trim();
    const finalId = incomingId ? incomingId : genId();

    const next: any = {
      ...(promo as any),
      id: finalId,
      status: normalizeStatus((promo as any)?.status),
    };

    const idx = all.findIndex(p => String((p as any).id) === finalId);

    if (idx >= 0) {
      all[idx] = { ...(all[idx] as any), ...next } as any;
    } else {
      all.push(next);
    }

    writeAll(all);
  }

  updateStatus(id: string, status: any) {
    const all = readAll();
    const sid = String(id);

    const idx = all.findIndex(p => String((p as any).id) === sid);
    if (idx < 0) return;

    all[idx] = { ...(all[idx] as any), status: normalizeStatus(status) } as any;
    writeAll(all);
  }

  deleteByAdmin(id: string) {
    const sid = String(id);
    const all = readAll();
    writeAll(all.filter(p => String((p as any).id) !== sid));

    // limpa favoritos
    const favs = readFavs().filter(fid => String(fid) !== sid);
    writeFavs(favs);
  }

  /**
   * ✅ Parceiro só apaga do próprio:
   * - se partnerId bater => apaga
   * - senão, permite apenas se storeName bater com partnerName (compatibilidade)
   */
  deleteByPartner(id: string, partnerId: string, partnerName?: string) {
    const sid = String(id);
    const all = readAll();
    const target = all.find(p => String((p as any).id) === sid);
    if (!target) return;

    const tPartnerId = norm((target as any).partnerId);
    const sPartnerId = norm(partnerId);

    const tStore = norm((target as any).storeName);
    const sName = norm(partnerName);

    const canDeleteById = tPartnerId && tPartnerId === sPartnerId;
    const canDeleteByName = sName && tStore && tStore === sName;

    if (!canDeleteById && !canDeleteByName) return;

    writeAll(all.filter(p => String((p as any).id) !== sid));

    const favs = readFavs().filter(fid => String(fid) !== sid);
    writeFavs(favs);
  }

  // ===============================
  // FAVORITOS
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
export { STORAGE_KEY, FAVORITES_KEY };
