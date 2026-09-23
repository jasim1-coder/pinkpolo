export type RegistrationStatus = 'Pending' | 'Approved' | 'Rejected';
export type TicketStatus = 'Valid' | 'Void' | 'Used' | 'Checked In' | 'Pending';
export type AttendeeTier = 'VIP Pavilion' | 'Grandstand' | 'Garden Terrace' | 'Clubhouse Lounge';

export interface Registration {
  id: string; // e.g. REG-2026-0842
  name: string;
  email: string;
  whatsapp: string;
  registrationDate: string; // formatted e.g. "2026-09-20 14:32"
  status: RegistrationStatus;
  ticketId?: string; // e.g. PINK-2026-001245
  qrValue?: string;
  ticketGeneratedAt?: string;
  ticketStatus?: TicketStatus;
  checkedIn: boolean;
  checkedInAt?: string;
  checkInStatus?: 'Checked In' | 'Not Checked In';
  scannedGate?: string;
  scannedBy?: string;
  tier: AttendeeTier;
  notes?: string;
  rejectionReason?: string;
  avatarSeed?: string;
}

export interface ActivityItem {
  id: string;
  type: 'registration' | 'approval' | 'rejection' | 'checkin' | 'ticket';
  title: string;
  description: string;
  timestamp: string; // e.g. "Just now", "2 mins ago"
  timeAgo: string;
  createdAt: number; // unix timestamp for relative calculation
  attendeeName: string;
  ticketId?: string;
}

export interface DashboardStats {
  totalRegistrations: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  ticketsGenerated: number;
  checkedIn: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: number;
}
