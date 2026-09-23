import { Registration, ActivityItem, DashboardStats } from '../types';

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  totalRegistrations: 0,
  pendingApproval: 0,
  approved: 0,
  rejected: 0,
  ticketsGenerated: 0,
  checkedIn: 0,
};

export const INITIAL_DASHBOARD_STATS: DashboardStats = { ...EMPTY_DASHBOARD_STATS };
export const INITIAL_REGISTRATIONS: Registration[] = [];
export const INITIAL_ACTIVITIES: ActivityItem[] = [];

// Names pool for realistic simulation of new registrations when clicked by admin
export const MOCK_CANDIDATE_NAMES = [
  { name: 'Rashid Al-Kuwari', email: 'rashid.k@qatarholding.qa', phone: '+974 5511 7842', tier: 'VIP Pavilion' as const },
  { name: 'Nathalie Dupont', email: 'n.dupont@chateaulux.com', phone: '+974 6632 1098', tier: 'Clubhouse Lounge' as const },
  { name: 'Abdullah Al-Dosari', email: 'a.dosari@qapco.com.qa', phone: '+974 5589 4433', tier: 'Grandstand' as const },
  { name: 'Hannah Campbell', email: 'hannah.c@polomagazine.co.uk', phone: '+974 7721 9801', tier: 'Garden Terrace' as const },
  { name: 'Saad Al-Muhannadi', email: 'saad.m@alkass.qa', phone: '+974 5576 3311', tier: 'Grandstand' as const },
  { name: 'Camilla Valenti', email: 'camilla@valentijewels.it', phone: '+974 3312 8765', tier: 'VIP Pavilion' as const },
  { name: 'Ibrahim Al-Baker', email: 'i.baker@bakerinvest.com', phone: '+974 6655 2200', tier: 'Clubhouse Lounge' as const },
  { name: 'Maya Al-Attar', email: 'maya.attar@dohadesign.qa', phone: '+974 5543 2190', tier: 'Garden Terrace' as const },
  { name: 'Sebastian Meyer', email: 'sebastian@munichpolo.de', phone: '+974 7799 1144', tier: 'Grandstand' as const },
  { name: 'Hessa Al-Thani', email: 'hessa.t@qfoundation.org', phone: '+974 5500 8877', tier: 'VIP Pavilion' as const },
  { name: 'Tariq Mansour', email: 't.mansour@gulfhorizons.ae', phone: '+974 6644 3311', tier: 'Clubhouse Lounge' as const },
];
