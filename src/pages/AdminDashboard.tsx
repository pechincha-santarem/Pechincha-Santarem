import React, { useState, useEffect } from 'react';
import {
  Promotion,
  UserAccount,
  UserRole,
  PromotionStatus,
  AccountStatus,
  PartnerLead,
  LeadStatus
} from '../types';
import { promotionService } from '../services/promotionService';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type ProfileRow = {
  id: string;
  name: string | null;
  role: string;
  status?: 'active' | 'blocked' | 'pending' | string;
  created_at?: string;
};

// (mantido, mesmo não sendo usado diretamente no JSX)
type LeadRow = {
  id: string;
  name: string;
  phone: string;
  city?: string | null;
  status: string;
  active?: boolean | null;
  created_at: string;
};

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ads' | 'users' | 'leads'>('ads');
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | 'all'>('pending');

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [leads, setLeads] = useState<PartnerLead[]>([]);

  // ✅ necessário porque você usa setPartners no loadData
  const [partners, setPartners] = useState<any[]>([]);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const navigate = useNavigate();

  // ✅ Mantém seu runtime como está (sem mexer em supabase-js genéricos do projeto)
  const sb: any = supabase;

  useEffect(() => {
    (async () => {
      const session = await authService.getCurrentSession();
      if (session?.role !== 'admin') {
        navigate('/admin');
        return;
      }
      await loadData();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const loadData = async () => {
    setPromotions(promotionService.getAll(false));

    // ✅ PERFIS (parceiros) — buscar campos que EXISTEM + role
    const { data: profs, error: pErr } = await sb
      .from('profiles')
      .select('id, name, role, status, created_at')
      .order('created_at', { ascending: false });

    if (pErr) {
      console.error('[AdminDashboard] profiles error:', pErr);
      setUsers([]);
    } else {
      const rows = (Array.isArray(profs) ? (profs as ProfileRow[]) : []) as any[];

      const partnerUsers: UserAccount[] = rows
        .filter(p => String(p.role || '').trim().toLowerCase() === 'partner')
        .map(p => ({
          id: p.id,
          name: p.name ?? 'Parceiro',
          email: '',
          password: '',
          role: 'partner' as UserRole,
          status: (p.status === 'blocked' ? 'blocked' : 'active') as AccountStatus,
          createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
        }));

      setUsers(partnerUsers);
    }

    // ✅ ABA "PARCEIROS" (tabela do admin) — vem do profiles também
    const { data: rows, error } = await sb
      .from('profiles')
      .select('id, name, role, status, created_at')
      .eq('role', 'partner')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AdminDashboard] partners error:', error);
      setPartners([]);
    } else {
      const mapped = (rows ?? []).map((p: any) => ({
        id: p.id,
        name: p.name ?? 'Parceiro',
        city: 'Santarém', // fallback (não existe no profiles)
        status: p.status ?? 'active',
        active: p.status !== 'blocked',
        createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
      }));

      setPartners(mapped);
    }

    // ✅ ABA "INTERESSADOS" — vem da tabela partners
    const { data: lds, error: lErr } = await sb
      .from('partners')
      .select('id, name, phone, city, status, active, created_at')
      .order('created_at', { ascending: false });

    if (lErr) {
      console.error('[AdminDashboard] leads error:', lErr);
      setLeads([]);
    } else {
      const rows = Array.isArray(lds) ? (lds as LeadRow[]) : [];

      const mappedLeads: PartnerLead[] = rows.map((l: any) => ({
        id: l.id,
        companyName: l.name,
        segment: undefined,
        whatsapp: l.phone,
        city: (l.city ?? 'Santarém') as any,
        status: l.status as LeadStatus, // mantém 'new' porque sua UI usa 'new'
        createdAt: new Date(l.created_at).getTime(),
      }));

      setLeads(mappedLeads);
    }
  };

  const handleAdAction = (id: string, status: PromotionStatus) => {
    promotionService.updateStatus(id, status);
    loadData();
  };

  const updatePromotionPatch = (id: string, patch: Partial<Promotion>) => {
    const existing = promotionService.getById?.(id);
    if (!existing) return;

    promotionService.save(
      {
        title: existing.title,
        description: existing.description,
        currentPrice: existing.currentPrice,
        oldPrice: existing.oldPrice,
        category: existing.category,
        expiryDate: existing.expiryDate,
        imageUrl: existing.imageUrl,
        storeName: existing.storeName,
        status: existing.status,
        isFeatured: existing.isFeatured,
        isFlash: existing.isFlash,
        flashUntil: (existing as any).flashUntil,
        destinationType: existing.destinationType,
        destinationUrl: existing.destinationUrl,
        ...patch,
      } as any,
      id
    );

    loadData();
  };

  const toggleFeatured = (promo: Promotion) => {
    updatePromotionPatch(promo.id, { isFeatured: !promo.isFeatured });
  };

  const toggleFlash24h = (promo: Promotion) => {
    const isOn = Boolean(promo.isFlash);

    if (isOn) {
      updatePromotionPatch(promo.id, { isFlash: false, flashUntil: undefined as any });
      return;
    }

    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    updatePromotionPatch(promo.id, { isFlash: true, flashUntil: until as any });
  };

  // ✅ Criar/Editar parceiro
  const handleUserSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const name = (formData.get('name') as string)?.trim() || '';
    const email = ((formData.get('email') as string) || '').trim().toLowerCase();
    const password = (formData.get('password') as string)?.trim() || '';
    const status = ((formData.get('status') as AccountStatus) || 'active') as AccountStatus;

    if (!name || !email || !password) {
      alert('Preencha todos os campos.');
      return;
    }

    // EDITAR: só profiles
    if (editingUser?.id) {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ name, status })
        .eq('id', editingUser.id);

      if (error) {
        console.error('[AdminDashboard] update partner error:', error);
        alert('Erro ao salvar parceiro.');
        return;
      }

      setIsUserModalOpen(false);
      setEditingUser(null);
      await loadData();
      return;
    }

    // CRIAR: Edge Function
    try {
      // 1) garante sessão/token atualizados
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr) {
        console.error('refreshSession error:', refreshErr);
      }

      // 2) pega token da sessão (pós-refresh)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        alert('Sem token. Faça logout e login novamente.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-create-partner', {
        body: { name, email, password, status },
        headers: {
          authorization: `Bearer ${token}`, // minúsculo
        },
      });

      console.log('invoke data:', data);
      console.log('invoke error:', error);

      // ✅ valida sucesso de forma resiliente (não depende só de data.success)
      const ok =
        !error &&
        (data?.success === true ||
          String((data as any)?.message || '').toLowerCase().includes('sucesso') ||
          String((data as any)?.message || '').toLowerCase().includes('criado') ||
          String((data as any)?.message || '').toLowerCase().includes('created'));

      if (!ok) {
        alert((data as any)?.message || error?.message || 'Erro ao criar parceiro.');
        return;
      }

      alert((data as any)?.message || 'Parceiro criado com sucesso!');
      setIsUserModalOpen(false);
      setEditingUser(null);

      // ✅ IMPORTANTE: não deixar loadData derrubar o sucesso e cair no catch
      try {
        await loadData();
      } catch (e) {
        console.error('[AdminDashboard] loadData after create failed:', e);
        // não alerta "erro de conexão" aqui porque o parceiro já foi criado
      }
    } catch (err) {
      console.error('handleUserSave error:', err);
      alert('Erro de conexão com a Edge Function.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    const choiceRaw = window.prompt(
      'O que você quer fazer?\n\n' +
        '1 = BLOQUEAR (recomendado)\n' +
        '2 = EXCLUIR (remove do Auth)\n\n' +
        'Digite 1 ou 2:'
    );

    if (choiceRaw == null) return;

    const choice = choiceRaw.trim();

    // =========================
    // 1) BLOQUEAR (profiles)
    // =========================
    if (choice === '1') {
      const ok = window.confirm('Confirmar BLOQUEIO desse parceiro?');
      if (!ok) return;

      const { error } = await sb.from('profiles').update({ status: 'blocked' }).eq('id', id);

      if (error) {
        console.error('[AdminDashboard] block partner error:', error);
        alert('Erro ao bloquear parceiro.');
        return;
      }

      alert('Parceiro bloqueado com sucesso.');
      await loadData();
      return;
    }

    // =========================
    // 2) EXCLUIR (Auth + profiles) via Edge Function
    // =========================
    if (choice === '2') {
      const ok = window.confirm(
        'CONFIRMA EXCLUSÃO DEFINITIVA?\n\n' +
          'Isso remove o usuário do Supabase Auth.\n' +
          'Essa ação NÃO tem volta.'
      );
      if (!ok) return;

      try {
        const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) {
          console.error('[AdminDashboard] getSession error:', sessErr);
          alert('Erro ao ler sessão. Faça login novamente.');
          return;
        }

        const token = sessionData.session?.access_token;
        if (!token) {
          alert('Sem token. Faça logout e login novamente.');
          return;
        }

        const { data, error } = await supabase.functions.invoke('admin-delete-partner', {
          body: { partnerId: id, action: 'delete' },
          headers: { authorization: `Bearer ${token}` },
        });

        const okResp =
          !error &&
          (data?.success === true ||
            String((data as any)?.message || '').toLowerCase().includes('sucesso') ||
            String((data as any)?.message || '').toLowerCase().includes('removido') ||
            String((data as any)?.message || '').toLowerCase().includes('exclu'));

        if (!okResp) {
          alert((data as any)?.message || error?.message || 'Erro ao excluir parceiro.');
          return;
        }

        alert((data as any)?.message || 'Parceiro excluído com sucesso!');
        await loadData();
        return;
      } catch (err) {
        console.error('[AdminDashboard] delete partner unexpected:', err);
        alert('Erro de conexão ao excluir parceiro.');
        return;
      }
    }

    alert('Opção inválida. Digite 1 (bloquear) ou 2 (excluir).');
  };

  const handleLeadStatus = async (id: string, status: LeadStatus) => {
    const { error } = await sb.from('partners').update({ status }).eq('id', id);

    if (error) {
      console.error('[AdminDashboard] update lead error:', error);
      alert('Erro ao atualizar status do interessado.');
      return;
    }

    await loadData();
  };

  const handleCreatePartnerFromLead = (lead: PartnerLead) => {
    setEditingUser(null);
    setIsUserModalOpen(true);

    localStorage.setItem(
      'ps_lead_prefill',
      JSON.stringify({
        name: lead.companyName,
        email: '',
        status: 'active'
      })
    );
  };

  const filteredAds = promotions.filter(p => statusFilter === 'all' || p.status === statusFilter);
  const filteredUsers = users.filter(u => u.role === 'partner');

  const leadPrefillRaw = localStorage.getItem('ps_lead_prefill');
  const leadPrefill = leadPrefillRaw ? JSON.parse(leadPrefillRaw) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 uppercase italic">Gestão Total 🛡️</h1>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Painel de Controle Administrativo</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ads')}
          className={`px-8 py-4 font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === 'ads' ? 'border-b-4 border-yellow-400 text-black' : 'text-gray-400'
          }`}
        >
          ANÚNCIOS
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-8 py-4 font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === 'users' ? 'border-b-4 border-yellow-400 text-black' : 'text-gray-400'
          }`}
        >
          PARCEIROS
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-8 py-4 font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === 'leads' ? 'border-b-4 border-yellow-400 text-black' : 'text-gray-400'
          }`}
        >
          INTERESSADOS
          {leads.filter(l => l.status === 'new').length > 0 && (
            <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[8px] animate-pulse">
              {leads.filter(l => l.status === 'new').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'ads' ? (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  statusFilter === s
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-white text-gray-400 border border-gray-100 hover:border-yellow-400'
                }`}
              >
                {s === 'all'
                  ? 'Ver Todos'
                  : s === 'pending'
                  ? 'Pendentes'
                  : s === 'approved'
                  ? 'Aprovados'
                  : 'Reprovados'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Anúncio</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Destino</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Controle</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 font-bold">
                  {filteredAds.map(promo => {
                    const flashUntil = (promo as any).flashUntil as string | undefined;
                    const flashActive = Boolean(
                      promo.isFlash && flashUntil && new Date(flashUntil).getTime() > Date.now()
                    );

                    return (
                      <tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-5 flex items-center gap-4">
                          {promo.imageUrl ? (
                            <img
                              src={promo.imageUrl}
                              className="w-12 h-12 rounded-xl object-cover shadow-sm"
                              alt=""
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gray-200 shadow-sm" />
                          )}

                          <div>
                            <div className="text-gray-800 text-sm">{promo.title}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{promo.storeName}</div>

                            <div className="mt-1">
                              <span
                                className={`text-[9px] font-black uppercase ${
                                  promo.status === 'approved'
                                    ? 'text-green-600'
                                    : promo.status === 'rejected'
                                    ? 'text-red-600'
                                    : 'text-yellow-700'
                                }`}
                              >
                                {promo.status}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="text-[10px] font-black text-gray-800 uppercase bg-gray-100 px-2 py-1 rounded inline-block mb-1">
                            {promo.destinationType}
                          </div>
                          <a
                            href={promo.destinationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-500 truncate max-w-[180px] block hover:underline italic"
                          >
                            {promo.destinationUrl}
                          </a>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => toggleFeatured(promo)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                  promo.isFeatured ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title="Ativar/Desativar destaque"
                              >
                                {promo.isFeatured ? '⭐ Destaque ON' : 'Destaque'}
                              </button>

                              <button
                                onClick={() => toggleFlash24h(promo)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                  promo.isFlash ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title="Ativar/Desativar relâmpago (24h)"
                              >
                                {promo.isFlash ? '⚡ Relâmpago ON' : 'Relâmpago 24h'}
                              </button>
                            </div>

                            {promo.isFlash && flashUntil && (
                              <div className={`text-[10px] font-black ${flashActive ? 'text-red-600' : 'text-gray-400'}`}>
                                Expira: {new Date(flashUntil).toLocaleString()}
                                {!flashActive && <span className="ml-2 text-gray-400">(expirado)</span>}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-right space-x-3">
                          <button
                            onClick={() => navigate(`/editar-promocao/${promo.id}`)}
                            className="text-gray-400 hover:text-black transition-colors"
                            title="Editar anúncio"
                          >
                            <i className="fas fa-edit"></i>
                          </button>

                          {/* ✅ EXCLUIR (ADMIN) — adicionada sem mudar estrutura */}
                          <button
                            onClick={() => {
                              const ok = window.confirm('Excluir esta promoção? Essa ação não pode ser desfeita.');
                              if (!ok) return;

                              promotionService.deleteByAdmin(promo.id);
                              loadData();
                            }}
                            className="text-red-500 hover:text-red-600 transition-colors"
                            title="Excluir"
                          >
                            <i className="fas fa-trash"></i>
                          </button>

                          {promo.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAdAction(promo.id, 'approved')}
                                className="text-green-500 text-[10px] font-black uppercase hover:underline"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleAdAction(promo.id, 'rejected')}
                                className="text-red-500 text-[10px] font-black uppercase hover:underline"
                              >
                                Reprovar
                              </button>
                            </>
                          )}

                          {promo.status === 'approved' && (
                            <button
                              onClick={() => handleAdAction(promo.id, 'rejected')}
                              className="text-red-500 text-[10px] font-black uppercase hover:underline"
                              title="Reprovar (libera edição para o parceiro)"
                            >
                              Reprovar
                            </button>
                          )}

                          {promo.status === 'rejected' && (
                            <button
                              onClick={() => handleAdAction(promo.id, 'approved')}
                              className="text-green-500 text-[10px] font-black uppercase hover:underline"
                              title="Aprovar novamente"
                            >
                              Aprovar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-black uppercase italic">Base de Parceiros</h2>
            <button
              onClick={() => {
                setEditingUser(null);
                setIsUserModalOpen(true);
                localStorage.removeItem('ps_lead_prefill');
              }}
              className="bg-yellow-400 px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-100 hover:bg-yellow-500 active:scale-95 transition-all"
            >
              + NOVO PARCEIRO
            </button>
          </div>

          <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome / E-mail</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-bold">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="text-gray-800">{u.name}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{u.email || '—'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right space-x-5">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setIsUserModalOpen(true);
                          localStorage.removeItem('ps_lead_prefill');
                        }}
                        className="text-blue-500 font-black text-[10px] uppercase tracking-widest hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-red-500 font-black text-[10px] uppercase tracking-widest hover:underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-black uppercase italic">Leads de Novos Parceiros</h2>
          </div>

          <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data / Empresa</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Segmento</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-bold">
                {leads.sort((a, b) => b.createdAt - a.createdAt).map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="text-[10px] text-gray-400">{new Date(l.createdAt).toLocaleDateString()}</div>
                      <div className="text-gray-800 text-sm">{l.companyName}</div>
                      <div className="text-[10px] text-gray-400">{l.city}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] uppercase bg-gray-100 px-2 py-1 rounded">{l.segment}</span>
                    </td>
                    <td className="px-6 py-5">
                      <a
                        href={`https://wa.me/55${l.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-green-600 hover:underline"
                      >
                        <i className="fab fa-whatsapp mr-1"></i> {l.whatsapp}
                      </a>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter 
                        ${
                          l.status === 'new'
                            ? 'bg-blue-100 text-blue-700'
                            : l.status === 'contacted'
                            ? 'bg-orange-100 text-orange-700'
                            : l.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {l.status === 'new'
                          ? 'Novo'
                          : l.status === 'contacted'
                          ? 'Contatado'
                          : l.status === 'approved'
                          ? 'Aprovado'
                          : 'Recusado'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right space-x-2">
                      <select
                        value={l.status}
                        onChange={e => handleLeadStatus(l.id, e.target.value as LeadStatus)}
                        className="text-[10px] border border-gray-200 rounded px-2 py-1 bg-white"
                      >
                        <option value="new">Novo</option>
                        <option value="contacted">Contatado</option>
                        <option value="approved">Aprovado</option>
                        <option value="rejected">Recusado</option>
                      </select>
                      {l.status === 'approved' && (
                        <button
                          onClick={() => handleCreatePartnerFromLead(l)}
                          className="bg-black text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-gray-800"
                        >
                          Criar Parceiro
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leads.length === 0 && (
              <div className="p-16 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
                Nenhum interessado por enquanto.
              </div>
            )}
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={async e => {
              await handleUserSave(e);
              localStorage.removeItem('ps_lead_prefill');
            }}
            className="bg-white p-10 rounded-[2.5rem] max-w-md w-full shadow-2xl space-y-6"
          >
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">{editingUser ? 'Editar' : 'Novo'} Parceiro</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Identificação / Loja</label>
                <input
                  name="name"
                  defaultValue={editingUser?.name ?? leadPrefill?.name ?? ''}
                  placeholder="Nome da Loja"
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-yellow-400 font-bold"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">E-mail de Acesso</label>
                <input
                  name="email"
                  defaultValue={editingUser?.email ?? leadPrefill?.email ?? ''}
                  type="email"
                  placeholder="E-mail"
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-yellow-400 font-bold"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Senha de Login</label>
                <input
                  name="password"
                  defaultValue={editingUser?.password ?? ''}
                  type="text"
                  placeholder="Senha"
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-yellow-400 font-bold"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Status da Conta</label>
                <select
                  name="status"
                  defaultValue={editingUser?.status || leadPrefill?.status || 'active'}
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200 outline-none bg-white focus:ring-2 focus:ring-yellow-400 font-bold"
                >
                  <option value="active">Ativo</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsUserModalOpen(false);
                  localStorage.removeItem('ps_lead_prefill');
                }}
                className="flex-1 font-black text-xs text-gray-400 uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-yellow-400 font-black py-4 rounded-2xl shadow-xl shadow-yellow-100 hover:bg-yellow-500 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
              >
                SALVAR
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
