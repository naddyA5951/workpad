import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Colleges Table
export const colleges = pgTable('colleges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  verificationRequired: boolean('verification_required').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or Server Session UID
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  collegeId: integer('college_id').references(() => colleges.id),
  collegeName: text('college_name').notNull(),
  collegeIdNumber: text('college_id_number').notNull(),
  collegeIdStatus: text('college_id_status').default('Pending Review').notNull(), // 'Pending Review' | 'Verified' | 'Rejected'
  collegeIdReviewNotes: text('college_id_review_notes'),
  passwordHash: text('password_hash'), // Hashed via scrypt (never raw password)
  role: text('role').default('student').notNull(), // 'student' | 'admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. User Roles / Admin Accounts Audit Table
export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  role: text('role').notNull(), // 'student' | 'admin' | 'staff'
  assignedBy: text('assigned_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Services Table
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  allowedFormats: text('allowed_formats').notNull(), // 'Handwritten, Digital' | 'Digital' | 'Handwritten'
  turnaroundDays: integer('turnaround_days').default(3).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Pricing Table
export const pricing = pgTable('pricing', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id')
    .references(() => services.id)
    .notNull()
    .unique(),
  unitType: text('unit_type').notNull(), // 'per_page' | 'per_500_words' | 'per_topic' | 'fixed_project'
  unitLabel: text('unit_label').notNull(), // 'per page' | 'per 500 words' | 'per topic' | 'fixed project'
  basePriceInr: integer('base_price_inr').notNull(),
  handwrittenSurchargeInr: integer('handwritten_surcharge_inr').default(0).notNull(),
  urgentMultiplierPercent: integer('urgent_multiplier_percent').default(25).notNull(),
  physicalDeliveryFeeInr: integer('physical_delivery_fee_inr').default(120).notNull(),
  platformFeeInr: integer('platform_fee_inr').default(15).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. Orders Table
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  serviceId: integer('service_id')
    .references(() => services.id)
    .notNull(),
  studentName: text('student_name').notNull(),
  collegeName: text('college_name').notNull(),
  collegeIdNumber: text('college_id_number').notNull(),
  subject: text('subject').notNull(),
  courseDegree: text('course_degree').notNull(),
  semesterYear: text('semester_year').notNull(),
  chapterTopic: text('chapter_topic').notNull(),
  quantity: integer('quantity').notNull(),
  unitType: text('unit_type').notNull(),
  preferredFormat: text('preferred_format').notNull(), // 'Handwritten' | 'Digital'
  languagePreference: text('language_preference').notNull(),
  deadline: text('deadline').notNull(),
  detailedInstructions: text('detailed_instructions').notNull(),
  deliveryMethod: text('delivery_method').notNull(), // 'Digital Download' | 'Campus Courier Delivery' | 'Standard Post'
  deliveryAddress: text('delivery_address'),
  subtotalInr: integer('subtotal_inr').notNull(),
  deliveryFeeInr: integer('delivery_fee_inr').notNull(),
  platformFeeInr: integer('platform_fee_inr').notNull(),
  totalAmountInr: integer('total_amount_inr').notNull(),
  paymentStatus: text('payment_status').default('Pending').notNull(), // 'Pending' | 'Verification Pending' | 'Paid' | 'Failed' | 'Refund Pending' | 'Refunded'
  orderStatus: text('order_status').default('Pending Payment').notNull(), // 'Pending Payment' | 'Payment Verification' | 'Confirmed' | 'In Progress' | 'Ready for Delivery' | 'Completed' | 'Cancelled' | 'Refund Pending' | 'Refunded'
  expectedCompletionDate: text('expected_completion_date').notNull(),
  adminNotes: text('admin_notes'),
  academicIntegrityAccepted: boolean('academic_integrity_accepted').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 7. Order Files Table (Private Cloud/Database Storage for References & Deliverables)
export const orderFiles = pgTable('order_files', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id)
    .notNull(),
  uploadedByUserId: integer('uploaded_by_user_id')
    .references(() => users.id)
    .notNull(),
  fileCategory: text('file_category').notNull(), // 'reference' | 'deliverable'
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  fileContentBase64: text('file_content_base64').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Payments Table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id)
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  gateway: text('gateway').default('razorpay').notNull(), // 'razorpay' | 'manual_upi'
  razorpayOrderId: text('razorpay_order_id').notNull().unique(),
  razorpayPaymentId: text('razorpay_payment_id').unique(),
  razorpaySignature: text('razorpay_signature'),
  upiVpa: text('upi_vpa'),
  manualUtrNumber: text('manual_utr_number'),
  amountInr: integer('amount_inr').notNull(),
  currency: text('currency').default('INR').notNull(),
  status: text('status').default('created').notNull(), // 'created' | 'authorized' | 'captured' | 'verification_pending' | 'failed' | 'refund_pending' | 'refunded'
  receiptNumber: text('receipt_number').notNull().unique(),
  refundId: text('refund_id'),
  refundReason: text('refund_reason'),
  verifiedByServer: boolean('verified_by_server').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 9. Payment Webhook Events Table (Idempotency & Audit Log)
export const paymentWebhookEvents = pgTable('payment_webhook_events', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  razorpayOrderId: text('razorpay_order_id').notNull(),
  razorpayPaymentId: text('razorpay_payment_id'),
  signatureVerified: boolean('signature_verified').default(false).notNull(),
  payloadJson: text('payload_json').notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});

// 10. Support Requests Table
export const supportRequests = pgTable('support_requests', {
  id: serial('id').primaryKey(),
  ticketNumber: text('ticket_number').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  orderId: integer('order_id').references(() => orders.id),
  subject: text('subject').notNull(),
  category: text('category').notNull(),
  message: text('message').notNull(),
  status: text('status').default('Open').notNull(), // 'Open' | 'In Review' | 'Resolved' | 'Closed'
  adminResponse: text('admin_response'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  college: one(colleges, {
    fields: [users.collegeId],
    references: [colleges.id],
  }),
  orders: many(orders),
  payments: many(payments),
  supportRequests: many(supportRequests),
  roles: many(userRoles),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  pricingRule: one(pricing, {
    fields: [services.id],
    references: [pricing.serviceId],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  student: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [orders.serviceId],
    references: [services.id],
  }),
  files: many(orderFiles),
  payments: many(payments),
}));
