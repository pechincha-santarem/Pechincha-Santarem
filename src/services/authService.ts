
import { UserAccount, UserRole, AccountStatus, PartnerLead, LeadStatus } from '../types';

const SESSION_KEY = 'ps_user_session';
const USERS_KEY = 'ps_users_registry';
const LEADS_KEY = 'ps_partner_leads';

export interface Session {
  role: UserRole;
  userId?: string;
  userName?: string;
  email?: string;
}

export const authService = {
  initialize: () => {
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(LEADS_KEY)) {
      localStorage.setItem(LEADS_KEY, JSON.stringify([]));
    }
  },

  getUsers: (): UserAccount[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  getUsersByRole: (role: UserRole): UserAccount[] => {
    return authService.getUsers().filter(u => u.role === role);
  },

  saveUser: (userData: Omit<UserAccount, 'id' | 'createdAt'>, id?: string): void => {
    const users = authService.getUsers();
    if (id) {
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...userData };
      }
    } else {
      users.push({
        ...userData,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now()
      });
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  deleteUser: (id: string): void => {
    const users = authService.getUsers().filter(u => u.id !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  // Lead Management
  saveLead: (leadData: Omit<PartnerLead, 'id' | 'createdAt' | 'status'>): void => {
    const leads = authService.getLeads();
    leads.push({
      ...leadData,
      id: Math.random().toString(36).substr(2, 9),
      status: 'new',
      createdAt: Date.now()
    });
    localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  },

  getLeads: (): PartnerLead[] => {
    const data = localStorage.getItem(LEADS_KEY);
    return data ? JSON.parse(data) : [];
  },

  updateLeadStatus: (id: string, status: LeadStatus): void => {
    const leads = authService.getLeads();
    const idx = leads.findIndex(l => l.id === id);
    if (idx !== -1) {
      leads[idx].status = status;
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
    }
  },

  loginAdmin: (password: string): boolean => {
    if (password === '1234') {
      const session: Session = { role: 'admin', userName: 'Administrador' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return true;
    }
    return false;
  },

  loginPartner: (email: string, pass: string): { success: boolean, message?: string } => {
    const users = authService.getUsersByRole('partner');
    const user = users.find(u => u.email === email && u.password === pass);
    
    if (user) {
      if (user.status === 'blocked') return { success: false, message: 'Conta de parceiro bloqueada.' };
      const session: Session = { role: 'partner', userId: user.id, userName: user.name, email: user.email };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { success: true };
    }
    return { success: false, message: 'E-mail ou senha de parceiro incorretos.' };
  },

  loginClient: (email: string, pass: string): { success: boolean, message?: string } => {
    const users = authService.getUsers();
    const user = users.find(u => u.email === email && u.password === pass);
    
    if (user) {
      if (user.status === 'blocked') return { success: false, message: 'Sua conta está bloqueada.' };
      const session: Session = { role: user.role, userId: user.id, userName: user.name, email: user.email };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { success: true };
    }
    return { success: false, message: 'E-mail ou senha incorretos.' };
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentSession: (): Session | null => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }
};
