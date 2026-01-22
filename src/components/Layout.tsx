import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabaseClient';

type SessionShape = {
  role: string;
  userId?: string;
  userName?: string;
  email?: string;
} | null;

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionShape>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const s = await authService.getCurrentSession();
      if (mounted) setSession(s);
    }

    load();

    // Atualiza ao logar/deslogar (Supabase)
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isPartner = session?.role === 'partner';

  const handleLogout = async () => {
    await authService.logout();
    setSession(null);
    navigate('/');
  };

  const isAuthPage = [
    '/admin',
    '/parceiro/login',
    '/admin/dashboard',
    '/parceiro/dashboard'
  ].some(path => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      {!isAuthPage && (
        <header className="bg-yellow-400 shadow-md sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            
            {/* LOGO */}
            <Link to="/" className="flex items-center gap-2">
              <i className="fas fa-tags text-2xl text-black"></i>
              <span className="text-xl font-black text-black uppercase tracking-tighter">
                Pechincha <span className="text-white bg-black px-1">Santarém</span>
              </span>
            </Link>

            {/* MENU */}
            <nav className="flex items-center gap-4 md:gap-6">
              <Link
                to="/"
                className={`font-bold text-sm ${
                  location.pathname === '/' ? 'text-white' : 'text-black'
                }`}
              >
                Ofertas
              </Link>

              <Link
                to="/anuncie"
                className="bg-black text-yellow-400 px-4 py-2 rounded-full text-[10px] font-black hover:bg-gray-800 uppercase tracking-widest"
              >
                Anuncie aqui
              </Link>

              {/* Parceiros SEMPRE */}
              <Link
                to="/parceiro/login"
                className="text-black font-bold text-xs hover:underline"
              >
                Parceiros
              </Link>

              {/* Painel do Parceiro */}
              {isPartner && (
                <div className="flex items-center gap-3">
                  <Link
                    to="/parceiro/dashboard"
                    className="bg-black text-white px-4 py-2 rounded-full text-xs font-black"
                  >
                    Meu Painel
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="text-black font-bold text-xs"
                    title="Sair"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                  </button>
                </div>
              )}
            </nav>
          </div>
        </header>
      )}

      {/* CONTEÚDO */}
      <main className={`flex-grow ${isAuthPage ? '' : 'container mx-auto px-4 py-8'}`}>
        <Outlet />
      </main>

      {/* FOOTER */}
      {!isAuthPage && (
        <footer className="bg-white border-t border-gray-100 py-12 mt-20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-md mx-auto space-y-8">
              <div>
                <p className="text-gray-900 font-black text-lg uppercase tracking-tighter italic">
                  © 2026 Pechincha Santarém
                </p>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
                  Onde a economia acontece
                </p>
              </div>

              <div className="bg-gray-50 py-6 px-10 rounded-[2.5rem] border border-gray-100 inline-block shadow-sm">
                <p className="text-gray-600 text-sm font-bold mb-4 uppercase tracking-tighter">
                  📢 Quer anunciar suas ofertas?
                </p>

                <Link
                  to="/anuncie"
                  className="bg-black text-yellow-400 px-8 py-3 rounded-full font-black text-xs hover:bg-gray-800 uppercase tracking-widest inline-flex items-center gap-2 shadow-xl shadow-gray-100"
                >
                  ANUNCIE AQUI
                  <i className="fas fa-arrow-right text-[10px]"></i>
                </Link>
              </div>

              <div className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.25em] flex items-center justify-center gap-2 pt-4">
                <i className="fas fa-location-dot text-gray-300"></i>
                <span>Santarém – PA</span>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* ADMIN DISCRETO – FIXO NA TELA (NUNCA SOME) */}
      {!isAuthPage && (
        <Link
          to="/admin"
          className="fixed bottom-6 right-6 text-gray-400 hover:text-gray-600 transition-all duration-300 z-50"
          aria-label="Admin"
          title="Admin"
        >
          <i className="fas fa-cog text-sm"></i>
        </Link>
      )}
    </div>
  );
};

export default Layout;
