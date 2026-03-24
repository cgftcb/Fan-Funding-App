export type UserRole = 'PATIENT' | 'CONTRIBUTOR' | 'SURGEON' | 'ADMIN';
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'FUNDED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
export type ContributionStatus = 'PENDING' | 'CONFIRMED' | 'REFUNDED';
export type EscrowStatus = 'HOLDING' | 'PAID_TO_SURGEON' | 'REFUNDED';
export type EscrowTransactionType = 'CONTRIBUTION' | 'ADMIN_FEE' | 'SURGEON_PAYMENT' | 'REFUND' | 'INSURANCE_FEE';
export type PhotoPhase = 'BEFORE' | 'AFTER';
export type AgreementStatus = 'PENDING' | 'PATIENT_SIGNED' | 'SURGEON_SIGNED' | 'FULLY_SIGNED';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  bio: string | null;
  location: string | null;
  socialLinks: string | null; // JSON string
  avatarUrl: string | null;
}

export interface SurgeonProfile {
  id: string;
  userId: string;
  licenseNumber: string | null;
  specialty: string | null;
  officeName: string | null;
  officeAddress: string | null;
  phone: string | null;
  website: string | null;
  bio: string | null;
  isSubscribed: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
  subscriptions?: SurgeonSubscription[];
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  features: string; // JSON string array
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SurgeonSubscription {
  id: string;
  surgeonId: string;
  tierId: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  amount: number;
  createdAt: string;
  updatedAt: string;
  tier?: SubscriptionTier;
}

export interface User {
  id: string;
  userId?: string; // alias used in JWT payload context
  email: string;
  role: UserRole;
  createdAt: string;
  profile: Profile | null;
  surgeonProfile?: SurgeonProfile | null;
}

export interface PhotoRequirement {
  id: string;
  surgeryTypeId: string;
  phase: PhotoPhase;
  count: number;
  description: string | null;
  daysAfterSurgery: number | null;
}

export interface SurgeryType {
  id: string;
  name: string;
  description: string | null;
  adminFeePercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  photoRequirements?: PhotoRequirement[];
}

export interface Picture {
  id: string;
  listingId: string;
  uploadedBy: string;
  phase: PhotoPhase;
  filename: string;
  originalName: string;
  mimeType: string;
  requirementId: string | null;
  uploadedAt: string;
  isReleased: boolean;
}

export interface Agreement {
  id: string;
  listingId: string;
  patientSignedAt: string | null;
  surgeonSignedAt: string | null;
  consultationDocUrl: string | null;
  terms: string | null;
  status: AgreementStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowTransaction {
  id: string;
  escrowId: string;
  amount: number;
  type: EscrowTransactionType;
  description: string | null;
  createdAt: string;
}

export interface Escrow {
  id: string;
  listingId: string;
  totalAmount: number;
  status: EscrowStatus;
  createdAt: string;
  updatedAt: string;
  transactions?: EscrowTransaction[];
}

export interface Contribution {
  id: string;
  listingId: string;
  contributorId: string;
  amount: number;
  status: ContributionStatus;
  qualifiesForPhotos: boolean;
  createdAt: string;
  updatedAt: string;
  contributor?: User;
  listing?: Listing;
}

export interface Listing {
  id: string;
  patientId: string;
  surgeryTypeId: string;
  title: string;
  description: string | null;
  goalAmount: number;
  adminFeePercent: number;
  adminFeeAmount: number;
  totalGoal: number;
  deadline: string;
  status: ListingStatus;
  surgeonName: string | null;
  surgeonOffice: string | null;
  surgeonContact: string | null;
  minContributionForPhotos: number;
  insuranceFeeAmount: number;
  insuranceFeePaid: boolean;
  createdAt: string;
  updatedAt: string;
  patient?: User;
  surgeryType?: SurgeryType;
  contributions?: Contribution[];
  pictures?: Picture[];
  escrow?: Escrow | null;
  agreement?: Agreement | null;
}

export interface InsuranceFeeConfig {
  id: string;
  surgeryTypeId: string | null;
  feeAmount: number | null;
  feePercent: number;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  surgeryType?: SurgeryType;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  totalContributed: number;
  totalEscrowHolding: number;
  pendingAgreements: number;
}

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
}
