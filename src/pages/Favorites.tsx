
import React, { useState, useEffect } from 'react';
import { Promotion } from '../types';
import { promotionService } from '../services/promotionService';
import PromotionCard from '../components/PromotionCard';
import { Link } from 'react-router-dom';

const Favorites: React.FC = () => {
  const [favoritePromos, setFavoritePromos] = useState<Promotion[]>([]);

  const loadFavorites = () => {
    const favoritesIds = promotionService.getFavorites();
    const allPromos = promotionService.getAll(true);
    setFavoritePromos(allPromos.filter(p => favoritesIds.includes(p.id)));
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-800">MEUS FAVORITOS ❤️</h1>
          <p className="text-gray-500">Produtos que você salvou para não perder.</p>
        </div>
      </div>

      {favoritePromos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favoritePromos.map(promo => (
            <PromotionCard 
              key={promo.id} 
              promo={promo} 
              onFavoriteToggle={loadFavorites}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-heart text-red-200 text-3xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-800">Sua lista está vazia</h3>
          <p className="text-gray-500 mt-2">Clique no coração nos produtos para salvá-los aqui.</p>
          <Link 
            to="/" 
            className="mt-6 inline-block bg-yellow-400 text-black px-8 py-3 rounded-xl font-bold hover:bg-yellow-500 transition-all shadow-lg"
          >
            Explorar Ofertas
          </Link>
        </div>
      )}
    </div>
  );
};

export default Favorites;
