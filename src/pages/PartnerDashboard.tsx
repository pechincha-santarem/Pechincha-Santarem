import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Promotion } from '../types';
import { promotionService } from '../services/promotionService';
import { authService } from '../services/authService';

const ADMIN_WHATSAPP = '5593981340104'; // ✅ número que você passou

function openAdminWhatsApp(message: string) {
  const text = encodeURIComponent(message);
  window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${text}`, '_blank', 'noopener,noreferrer');
}

const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const session = authService.getCurrentSession();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (!session || session.role !== 'partner') {
      navigate('/parceiro/login');
      return;
    }
    promotionService.initialize?.();
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () => {
    if (!session?.userId) return;
    const list = promotionService.getByPartner(session.userId);
    setPromotions(list);
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return promotions;
    return promotions.filter(p => p.status === filter);
  }, [promotions, filter]);

  const requestBoost = (promo: Promotion, kind: 'destaque' | 'relampago') => {
    const title =
      kind === 'destaque'
        ? '⭐ PEDIDO DE DESTAQUE'
        : '⚡ PEDIDO DE PROMOÇÃO RELÂMPAGO (24h)';

    const message =
      `${title}\n\n` +
      `🏪 Loja: ${promo.storeName}\n` +
      `🛒 Produto: ${promo.title}\n` +
      `💰 Preço: R$ ${promo.currentPrice.toFixed(2)}\n` +
      (promo.oldPrice > 0 ? `❌ De: R$ ${promo.oldPrice.toFixed(2)}\n` : '') +
      `📌 Categoria: ${promo.category}\n` +
      `🆔 ID da promoção: ${promo.id}\n` +
      `📍 Origem: App Pechincha Santarém\n\n` +
      `Quero ${kind === 'destaque' ? 'DESTAQUE' : 'RELÂMPAGO 24h'} nessa promoção.`;

    openAdminWhatsApp(message);
  };

  const statusBadge = (p: Promotion) => {
    const base = "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest";
    if (p.status === 'approved') return <span className={`${base} bg-green-100 text-green-700`}>Aprovada</span>;
    if (p.status === 'rejected') return <span className={`${base} bg-red-100 text-red-700`}>Reprovada</span>;
    return <span className={`${base} bg-yellow-100 text-yellow-800`}>Pendente</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 uppercase italic">Painel do Parceiro</h1>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
            Gerencie suas promoções
          </p>
        </div>

        <button
          onClick={() => navigate('/nova-promocao')}
          className="bg-yellow-400 px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-100 hover:bg-yellow-500 active:scale-95 transition-all"
        >
          + Nova Promoção
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              filter === s
                ? 'bg-black text-white shadow-lg'
                : 'bg-white text-gray-400 border border-gray-100 hover:border-yellow-400'
            }`}
          >
            {s === 'all' ? 'Todas' : s === 'pending' ? 'Pendentes' : s === 'approved' ? 'Aprovadas' : 'Reprovadas'}
          </button>
        ))}
      </div>

      {/* LISTA */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Promoção</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pedidos</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 font-bold">
              {filtered.map(promo => (
                <tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5 flex items-center gap-4">
                    <img
                      src={promo.imageUrl}
                      className="w-12 h-12 rounded-xl object-cover shadow-sm"
                      alt=""
                      onError={(e) => ((e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200')}
                    />
                    <div>
                      <div className="text-gray-800 text-sm">{promo.title}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-tighter">
                        {promo.storeName} • R$ {promo.currentPrice.toFixed(2)}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    {statusBadge(promo)}
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {promo.isFeatured && (
                        <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-800">
                          ⭐ Destaque
                        </span>
                      )}
                      {promo.isFlash && (
                        <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-700">
                          ⚡ Relâmpago
                        </span>
                      )}
                    </div>
                  </td>

                  {/* ✅ PEDIDOS (WhatsApp do admin) */}
                  <td className="px-6 py-5">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => requestBoost(promo, 'destaque')}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-100 active:scale-95 transition-all"
                        title="Pedir destaque ao admin"
                      >
                        Pedir ⭐ Destaque
                      </button>

                      <button
                        onClick={() => requestBoost(promo, 'relampago')}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 active:scale-95 transition-all"
                        title="Pedir relâmpago 24h ao admin"
                      >
                        Pedir ⚡ Relâmpago
                      </button>
                    </div>

                    <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Vai direto pro WhatsApp do Admin
                    </div>
                  </td>

                  <td className="px-6 py-5 text-right space-x-3">
                    <button
                      onClick={() => navigate(`/editar-promocao/${promo.id}`)}
                      className="text-gray-400 hover:text-black transition-colors"
                      title="Editar"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
                    Nenhuma promoção encontrada.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;
