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
  { name: 'Rashid Al-Mazrouei', email: 'rashid.m@adholding.ae', phone: '+971 50 511 7842', tier: 'VIP Pavilion' as const },
  { name: 'Nathalie Dupont', email: 'n.dupont@chateaulux.com', phone: '+971 52 632 1098', tier: 'Clubhouse Lounge' as const },
  { name: 'Abdullah Al-Zaabi', email: 'a.zaabi@adnoc.ae', phone: '+971 50 589 4433', tier: 'Grandstand' as const },
  { name: 'Hannah Campbell', email: 'hannah.c@polomagazine.co.uk', phone: '+971 54 721 9801', tier: 'Garden Terrace' as const },
  { name: 'Sultan Al-Dhaheri', email: 'sultan.d@admedia.ae', phone: '+971 55 576 3311', tier: 'Grandstand' as const },
  { name: 'Camilla Valenti', email: 'camilla@valentijewels.it', phone: '+971 58 312 8765', tier: 'VIP Pavilion' as const },
  { name: 'Ibrahim Al-Suwaidi', email: 'i.suwaidi@suwaidiinvest.ae', phone: '+971 50 655 2200', tier: 'Clubhouse Lounge' as const },
  { name: 'Mariam Al-Mansoori', email: 'mariam.m@abudhabidesign.ae', phone: '+971 56 543 2190', tier: 'Garden Terrace' as const },
  { name: 'Sebastian Meyer', email: 'sebastian@munichpolo.de', phone: '+971 52 799 1144', tier: 'Grandstand' as const },
  { name: 'Fatima Al-Nuaimi', email: 'fatima.n@adfoundation.ae', phone: '+971 50 500 8877', tier: 'VIP Pavilion' as const },
  { name: 'Tariq Mansour', email: 't.mansour@gulfhorizons.ae', phone: '+971 50 644 3311', tier: 'Clubhouse Lounge' as const },
];
