import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Promotion } from '../types';
import { promotionService } from '../services/promotionService';

interface PromotionCardProps {
  promo: Promotion;
  isAdmin?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onFavoriteToggle?: () => void;
}

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=900';

function normalizeUrl(url: string) {
  const u = (url || '').trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  // se for rota interna tipo "/alguma-coisa", mantém
  if (u.startsWith('/')) return u;
  return `https://${u}`;
}

function onlyDigits(v: string) {
  return (v || '').replace(/\D/g, '');
}

const PromotionCard: React.FC<PromotionCardProps> = ({
  promo,
  isAdmin,
  onApprove,
  onReject,
  onFavoriteToggle,
}) => {
  const navigate = useNavigate();
  const [isFav, setIsFav] = useState(promotionService.isFavorite(promo.id));
  const [imgSrc, setImgSrc] = useState(promo.imageUrl || FALLBACK_IMG);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    promotionService.toggleFavorite(promo.id);
    setIsFav(!isFav);
    onFavoriteToggle?.();
  };

  const handleAction = () => {
    const raw = (promo.destinationUrl || '').trim();
    if (!raw) return;

    // ✅ Página Interna: navega dentro do app
    if (promo.destinationType === 'Página Interna') {
      const route = normalizeUrl(raw);
      if (route.startsWith('/')) {
        navigate(route);
        return;
      }
      // se vier um link completo por engano, abre externo
      window.open(route, '_blank', 'noopener,noreferrer');
      return;
    }

    // ✅ WhatsApp: abre com mensagem automática (mostra que veio do app)
    if (promo.destinationType === 'WhatsApp') {
      const value = raw;

      const message = encodeURIComponent(
        `Olá! Vi esta oferta no app Pechincha Santarém e quero mais informações 👇\n\n` +
          `🛒 Produto: ${promo.title}\n` +
          `🏪 Loja: ${promo.storeName}\n` +
          `💰 Oferta: R$ ${promo.currentPrice.toFixed(2)}\n` +
          (promo.oldPrice > 0 ? `❌ De: R$ ${promo.oldPrice.toFixed(2)}\n` : '') +
          `\n📲 Enviado pelo app Pechincha Santarém ✅`
      );

      // já é link do WhatsApp
      if (
        value.includes('wa.me') ||
        value.includes('whatsapp.com') ||
        value.startsWith('http://') ||
        value.startsWith('https://')
      ) {
        const base = normalizeUrl(value);
        const sep = base.includes('?') ? '&' : '?';
        window.open(`${base}${sep}text=${message}`, '_blank', 'noopener,noreferrer');
        return;
      }

      // é número
      const phone = onlyDigits(value);
      if (!phone) return;

      window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
      return;
    }

    // ✅ Site Externo / Loja Online / Catálogo Digital: abre URL normalizada
    const url = normalizeUrl(raw);
    if (!url) return;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 group relative">
      {/* IMAGEM */}
      <div className="relative h-56 bg-gray-50 overflow-hidden">
        <img
          src={imgSrc}
          alt={promo.title}
          loading="lazy"
          decoding="async"
          onError={() => setImgSrc(FALLBACK_IMG)}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />

        {/* BADGES */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur-md text-black text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
            {promo.category}
          </div>

          {/* ⚡ RELÂMPAGO = isFlash */}
          {promo.isFlash && (
            <div className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1.5 animate-pulse">
              <i className="fas fa-bolt"></i>
              <span>PROMOÇÃO RELÂMPAGO</span>
            </div>
          )}

          {/* ⭐ DESTAQUE = isFeatured */}
          {promo.isFeatured && !promo.isFlash && (
            <div className="bg-yellow-400 text-black text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1.5">
              <i className="fas fa-star"></i>
              <span>DESTAQUE</span>
            </div>
          )}
        </div>

        {/* FAVORITO */}
        {!isAdmin && (
          <button
            onClick={handleToggleFavorite}
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center text-red-500 hover:scale-110 active:scale-90 transition-all z-10 shadow-lg"
            title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <i className={`${isFav ? 'fas' : 'far'} fa-heart`}></i>
          </button>
        )}
      </div>

      {/* CONTEÚDO */}
      <div className="p-6 space-y-4 bg-white">
        <div className="space-y-1">
          <h3 className="text-gray-900 text-lg leading-tight font-semibold line-clamp-1">
            {promo.title}
          </h3>

          <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5">
            <i className="fas fa-store text-yellow-500"></i> {promo.storeName}
          </p>
        </div>

        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 min-h-[2.5rem]">
          {promo.description}
        </p>

        {/* PREÇOS */}
        <div className="flex items-end justify-between py-3 border-y border-gray-50">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
              Oferta
            </span>

            <span className="text-2xl font-bold text-green-600 tracking-tight">
              R$ {promo.currentPrice.toFixed(2)}
            </span>
          </div>

          {promo.oldPrice > 0 && (
            <div className="flex flex-col items-end pb-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                De
              </span>
              <span className="text-xs line-through text-gray-400 font-medium">
                R$ {promo.oldPrice.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* AÇÕES */}
        {isAdmin ? (
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => onApprove?.(promo.id)}
              className="flex-1 bg-green-500 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-colors shadow-lg shadow-green-100"
            >
              Aprovar
            </button>
            <button
              onClick={() => onReject?.(promo.id)}
              className="flex-1 bg-red-500 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
            >
              Recusar
            </button>
          </div>
        ) : (
          <button
            onClick={handleAction}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-4 rounded-2xl transition-all shadow-xl shadow-yellow-100 uppercase tracking-wider text-xs font-bold active:scale-95"
          >
            VER PROMOÇÃO
          </button>
        )}
      </div>
    </div>
  );
};

export default PromotionCard;
