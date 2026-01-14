import React, { useEffect, useMemo, useState } from 'react';
import { Promotion, CATEGORIES, Category } from '../types';
import { promotionService } from '../services/promotionService';
import PromotionCard from '../components/PromotionCard';

const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm animate-pulse">
    <div className="h-56 bg-gray-100" />
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
      </div>
      <div className="flex justify-between items-end py-3 border-y border-gray-50">
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded w-16" />
          <div className="h-7 bg-gray-100 rounded w-32" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-3 bg-gray-100 rounded w-10 ml-auto" />
          <div className="h-4 bg-gray-100 rounded w-20 ml-auto" />
        </div>
      </div>
      <div className="h-12 bg-gray-100 rounded-2xl" />
    </div>
  </div>
);

const Home: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Todos'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await promotionService.initialize();
      setPromotions(promotionService.getAll(true)); // só aprovadas
      setLoading(false);
    };
    load();
  }, []);

  const now = Date.now();

  // ✅ RELÂMPAGO válido: isFlash=true e (flashUntil) ainda não expirou
  const flashPromotions = useMemo(() => {
    return promotions
      .filter(p => {
        if (!p.isFlash) return false;
        if (!p.flashUntil) return false;
        return new Date(p.flashUntil).getTime() > now;
      })
      // ordena por expiração (mais urgente primeiro)
      .sort((a, b) => new Date(a.flashUntil!).getTime() - new Date(b.flashUntil!).getTime());
  }, [promotions, now]);

  // ✅ DESTAQUES: isFeatured (sem confundir com relâmpago)
  const featuredPromotions = useMemo(() => {
    return promotions.filter(p => p.isFeatured);
  }, [promotions]);

  const filteredPromotions = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return promotions.filter(p => {
      const matchesCategory =
        selectedCategory === 'Todos' || p.category === selectedCategory;

      const matchesSearch =
        (p.title ?? '').toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term) ||
        (p.storeName ?? '').toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [promotions, selectedCategory, searchTerm]);

  return (
    <div className="space-y-12">
      {/* HERO */}
      <section className="bg-yellow-400 rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
        <h1 className="text-3xl md:text-5xl font-extrabold text-black leading-tight mb-4">
          <span className="block font-semibold">A ECONOMIA QUE VOCÊ</span>
          <span className="block font-bold">PROCURA EM SANTARÉM</span>
        </h1>

        <p className="text-black/80 text-lg mb-10 max-w-2xl mx-auto">
          Os melhores preços de supermercados, lojas e farmácias da pérola do Tapajós.
        </p>

        <div className="max-w-xl mx-auto">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Pesquise por produto ou loja..."
              className="w-full pl-12 pr-4 py-4 rounded-full border-none focus:ring-2 focus:ring-black outline-none shadow-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <i className="fas fa-shopping-basket absolute -bottom-10 -right-10 text-9xl text-black/5 rotate-12"></i>
      </section>

      {/* PROMOÇÕES RELÂMPAGO (CORRETO) */}
      {!searchTerm && selectedCategory === 'Todos' && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="text-2xl font-black text-gray-800 uppercase italic">
              🔥 Promoções Relâmpago
            </h2>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {loading
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="min-w-[280px] md:min-w-[320px]">
                    <SkeletonCard />
                  </div>
                ))
              : flashPromotions.map(promo => (
                  <div key={promo.id} className="min-w-[280px] md:min-w-[320px]">
                    <PromotionCard promo={promo} />
                  </div>
                ))}

            {!loading && flashPromotions.length === 0 && (
              <div className="min-w-[280px] md:min-w-[320px] bg-white rounded-3xl border border-dashed border-gray-200 p-6 text-gray-500 font-bold flex items-center justify-center">
                Sem relâmpagos no momento
              </div>
            )}
          </div>
        </section>
      )}

      {/* CATEGORIAS */}
      <section className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('Todos')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
            selectedCategory === 'Todos'
              ? 'bg-black text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-yellow-400'
          }`}
        >
          Todos
        </button>

        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
              selectedCategory === cat
                ? 'bg-black text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-yellow-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* DESTAQUES (opcional – aparece só quando não está filtrando/buscando) */}
      {!searchTerm && selectedCategory === 'Todos' && featuredPromotions.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-black text-gray-800">⭐ Destaques</h2>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredPromotions.map(promo => (
                <PromotionCard key={promo.id} promo={promo} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* IMPERDÍVEIS */}
      <section>
        <h2 className="text-2xl font-black text-gray-800 mb-6">
          {searchTerm || selectedCategory !== 'Todos'
            ? 'Resultados'
            : '💰 Imperdíveis do Dia'}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        ) : filteredPromotions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPromotions.map(promo => (
              <PromotionCard key={promo.id} promo={promo} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <i className="fas fa-search text-gray-300 text-4xl mb-4"></i>
            <h3 className="text-xl font-bold text-gray-800">
              Nenhuma oferta encontrada
            </h3>
            <p className="text-gray-500 mt-2">
              Tente buscar por outro produto ou categoria.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
