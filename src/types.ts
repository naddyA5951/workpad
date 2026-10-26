export interface UserProfile {
  id: number;
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  collegeName: string;
  collegeIdNumber: string;
  collegeIdStatus: 'Pending Review' | 'Verified' | 'Rejected' | string;
  role: 'student' | 'admin' | string;
}

export interface College {
  id: number;
  name: string;
  city: string;
  state: string;
  verificationRequired: boolean;
}

export interface PricingRule {
  id: number;
  serviceId: number;
  unitType: 'per_page' | 'per_500_words' | 'per_topic' | 'fixed_project' | string;
  unitLabel: string;
  basePriceInr: number;
  handwrittenSurchargeInr: number;
  urgentMultiplierPercent: number;
  physicalDeliveryFeeInr: number;
  platformFeeInr: number;
}

export interface ServiceWithPricing {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  allowedFormats: string;
  turnaroundDays: number;
  isActive: boolean;
  pricing: PricingRule;
}

export interface OrderFileMeta {
  id: number;
  orderId: number;
  fileCategory: 'reference' | 'deliverable' | string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface PaymentRecord {
  id: number;
  orderId: number;
  userId: number;
  gateway: 'razorpay' | 'manual_upi' | string;
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  upiVpa?: string | null;
  manualUtrNumber?: string | null;
  amountInr: number;
  currency: string;
  status: string;
  receiptNumber: string;
  refundId?: string | null;
  refundReason?: string | null;
  verifiedByServer: boolean;
  createdAt: string;
  orderNumber?: string;
  studentName?: string;
  studentEmail?: string;
}

export interface OrderRecord {
  id: number;
  orderNumber: string;
  userId: number;
  serviceId: number;
  serviceName: string;
  studentName: string;
  collegeName: string;
  collegeIdNumber: string;
  subject: string;
  courseDegree: string;
  semesterYear: string;
  chapterTopic: string;
  quantity: number;
  unitType: string;
  preferredFormat: string;
  languagePreference: string;
  deadline: string;
  detailedInstructions: string;
  deliveryMethod: string;
  deliveryAddress?: string | null;
  subtotalInr: number;
  deliveryFeeInr: number;
  platformFeeInr: number;
  totalAmountInr: number;
  paymentStatus: string;
  orderStatus: string;
  expectedCompletionDate: string;
  adminNotes?: string | null;
  createdAt: string;
  studentEmail?: string;
  studentPhone?: string;
  collegeIdVerificationStatus?: string;
  files: OrderFileMeta[];
  payments: PaymentRecord[];
}

export interface SupportTicket {
  id: number;
  ticketNumber: string;
  userId: number;
  orderId?: number | null;
  subject: string;
  category: string;
  message: string;
  status: string;
  adminResponse?: string | null;
  createdAt: string;
  studentName?: string;
  studentEmail?: string;
  collegeName?: string;
}

export interface BusinessDetails {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  registeredAddress: string;
  gstNumber: string;
  upiMerchantVpa: string;
  collegeIdRetentionDays: number;
}
