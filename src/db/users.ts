import { db } from './index.ts';
import {
  users,
  userRoles,
  colleges,
  services,
  pricing,
  orders,
  orderFiles,
  payments,
  paymentWebhookEvents,
  supportRequests,
} from './schema.ts';
import { eq, desc } from 'drizzle-orm';

const OWNER_EMAIL = 'naveedalicodes1@gmail.com';

export async function getOrCreateUser(uid: string, email: string, defaultName = 'Student') {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const initialRole = normalizedEmail === OWNER_EMAIL ? 'admin' : 'student';

    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingByEmail.length > 0) {
      return existingByEmail[0];
    }

    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        fullName: defaultName,
        phone: 'Not Provided',
        collegeName: 'Pending Selection',
        collegeIdNumber: 'PENDING-ID',
        collegeIdStatus: 'Pending Review',
        role: initialRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile with database.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Failed to fetch user account.', { cause: error });
  }
}

export async function getUserByEmail(email: string) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByEmail:', error);
    throw new Error('Failed to look up user by email.', { cause: error });
  }
}

export async function createRegisteredUser(data: {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  collegeId?: number | null;
  collegeName: string;
  collegeIdNumber: string;
  passwordHash: string;
  role?: string;
}) {
  try {
    const normalizedEmail = data.email.trim().toLowerCase();
    const assignedRole =
      data.role || (normalizedEmail === OWNER_EMAIL ? 'admin' : 'student');

    const inserted = await db
      .insert(users)
      .values({
        uid: data.uid,
        fullName: data.fullName.trim(),
        email: normalizedEmail,
        phone: data.phone.trim(),
        collegeId: data.collegeId ?? null,
        collegeName: data.collegeName.trim(),
        collegeIdNumber: data.collegeIdNumber.trim().toUpperCase(),
        collegeIdStatus: 'Pending Review',
        passwordHash: data.passwordHash,
        role: assignedRole,
      })
      .returning();

    const user = inserted[0];
    await db.insert(userRoles).values({
      userId: user.id,
      role: assignedRole,
      assignedBy: 'system_registration',
    });

    return user;
  } catch (error) {
    console.error('Database query failed in createRegisteredUser:', error);
    throw new Error('Failed to register user in database.', { cause: error });
  }
}

export async function updateUserProfile(
  userId: number,
  updates: {
    fullName: string;
    phone: string;
    collegeName: string;
    collegeIdNumber: string;
  }
) {
  try {
    const current = await db.select().from(users).where(eq(users.id, userId));
    const existing = current[0];
    if (!existing) throw new Error('User not found');

    const idChanged =
      existing.collegeIdNumber !== updates.collegeIdNumber.trim().toUpperCase() ||
      existing.collegeName !== updates.collegeName.trim();

    const updated = await db
      .update(users)
      .set({
        fullName: updates.fullName.trim(),
        phone: updates.phone.trim(),
        collegeName: updates.collegeName.trim(),
        collegeIdNumber: updates.collegeIdNumber.trim().toUpperCase(),
        collegeIdStatus: idChanged ? 'Pending Review' : existing.collegeIdStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateUserProfile:', error);
    throw new Error('Failed to update user profile.', { cause: error });
  }
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  try {
    const updated = await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateUserPassword:', error);
    throw new Error('Failed to update password.', { cause: error });
  }
}

export async function setUserRole(userId: number, role: 'student' | 'admin', assignedBy: string) {
  try {
    const updated = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (updated[0]) {
      await db.insert(userRoles).values({
        userId: updated[0].id,
        role,
        assignedBy,
      });
    }
    return updated[0];
  } catch (error) {
    console.error('Database query failed in setUserRole:', error);
    throw new Error('Failed to update user role.', { cause: error });
  }
}

export async function getAllColleges() {
  try {
    return await db.select().from(colleges).orderBy(colleges.name);
  } catch (error) {
    console.error('Database query failed in getAllColleges:', error);
    throw new Error('Failed to load colleges.', { cause: error });
  }
}

export async function getServicesWithPricing() {
  try {
    const allServices = await db.select().from(services).orderBy(services.id);
    const allPricing = await db.select().from(pricing);
    const pricingMap = new Map(allPricing.map((p) => [p.serviceId, p]));

    return allServices.map((s) => ({
      ...s,
      pricing: pricingMap.get(s.id) || {
        id: 0,
        serviceId: s.id,
        unitType: 'per_page',
        unitLabel: 'per page',
        basePriceInr: 20,
        handwrittenSurchargeInr: 5,
        urgentMultiplierPercent: 25,
        physicalDeliveryFeeInr: 120,
        platformFeeInr: 15,
      },
    }));
  } catch (error) {
    console.error('Database query failed in getServicesWithPricing:', error);
    throw new Error('Failed to load services and pricing.', { cause: error });
  }
}

export async function updateServicePricing(
  serviceId: number,
  updates: {
    basePriceInr: number;
    handwrittenSurchargeInr: number;
    urgentMultiplierPercent: number;
    physicalDeliveryFeeInr: number;
    platformFeeInr: number;
    unitLabel?: string;
    turnaroundDays?: number;
  }
) {
  try {
    if (typeof updates.turnaroundDays === 'number' && updates.turnaroundDays > 0) {
      await db
        .update(services)
        .set({ turnaroundDays: updates.turnaroundDays })
        .where(eq(services.id, serviceId));
    }

    const updated = await db
      .update(pricing)
      .set({
        basePriceInr: updates.basePriceInr,
        handwrittenSurchargeInr: updates.handwrittenSurchargeInr,
        urgentMultiplierPercent: updates.urgentMultiplierPercent,
        physicalDeliveryFeeInr: updates.physicalDeliveryFeeInr,
        platformFeeInr: updates.platformFeeInr,
        ...(updates.unitLabel ? { unitLabel: updates.unitLabel } : {}),
        updatedAt: new Date(),
      })
      .where(eq(pricing.serviceId, serviceId))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateServicePricing:', error);
    throw new Error('Failed to update service pricing.', { cause: error });
  }
}

export async function createOrderRecord(
  orderData: typeof orders.$inferInsert,
  filesData: Array<{
    uploadedByUserId: number;
    fileCategory: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    fileContentBase64: string;
  }>
) {
  try {
    const insertedOrders = await db.insert(orders).values(orderData).returning();
    const createdOrder = insertedOrders[0];

    if (filesData.length > 0) {
      await db.insert(orderFiles).values(
        filesData.map((f) => ({
          orderId: createdOrder.id,
          uploadedByUserId: f.uploadedByUserId,
          fileCategory: f.fileCategory,
          fileName: f.fileName,
          mimeType: f.mimeType,
          fileSizeBytes: f.fileSizeBytes,
          fileContentBase64: f.fileContentBase64,
        }))
      );
    }

    return createdOrder;
  } catch (error) {
    console.error('Database query failed in createOrderRecord:', error);
    throw new Error('Failed to create order in database.', { cause: error });
  }
}

export async function getOrdersForUser(userId: number) {
  try {
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    const allServices = await db.select().from(services);
    const serviceMap = new Map(allServices.map((s) => [s.id, s]));

    const allFiles = await db
      .select({
        id: orderFiles.id,
        orderId: orderFiles.orderId,
        fileCategory: orderFiles.fileCategory,
        fileName: orderFiles.fileName,
        mimeType: orderFiles.mimeType,
        fileSizeBytes: orderFiles.fileSizeBytes,
        createdAt: orderFiles.createdAt,
      })
      .from(orderFiles);

    const allPayments = await db.select().from(payments);

    return userOrders.map((o) => ({
      ...o,
      serviceName: serviceMap.get(o.serviceId)?.name || 'Academic Service',
      files: allFiles.filter((f) => f.orderId === o.id),
      payments: allPayments.filter((p) => p.orderId === o.id),
    }));
  } catch (error) {
    console.error('Database query failed in getOrdersForUser:', error);
    throw new Error('Failed to fetch student orders.', { cause: error });
  }
}

export async function getAllOrdersAdmin() {
  try {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const allServices = await db.select().from(services);
    const allUsers = await db.select().from(users);
    const allPayments = await db.select().from(payments).orderBy(desc(payments.createdAt));
    const allFiles = await db
      .select({
        id: orderFiles.id,
        orderId: orderFiles.orderId,
        fileCategory: orderFiles.fileCategory,
        fileName: orderFiles.fileName,
        mimeType: orderFiles.mimeType,
        fileSizeBytes: orderFiles.fileSizeBytes,
        createdAt: orderFiles.createdAt,
      })
      .from(orderFiles);

    const serviceMap = new Map(allServices.map((s) => [s.id, s]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    return allOrders.map((o) => ({
      ...o,
      serviceName: serviceMap.get(o.serviceId)?.name || 'Academic Service',
      studentEmail: userMap.get(o.userId)?.email || '',
      studentPhone: userMap.get(o.userId)?.phone || '',
      collegeIdVerificationStatus: userMap.get(o.userId)?.collegeIdStatus || 'Pending Review',
      files: allFiles.filter((f) => f.orderId === o.id),
      payments: allPayments.filter((p) => p.orderId === o.id),
    }));
  } catch (error) {
    console.error('Database query failed in getAllOrdersAdmin:', error);
    throw new Error('Failed to fetch all orders for admin.', { cause: error });
  }
}

export async function getOrderById(orderId: number) {
  try {
    const rows = await db.select().from(orders).where(eq(orders.id, orderId));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getOrderById:', error);
    throw new Error('Failed to fetch order details.', { cause: error });
  }
}

export async function getOrderFileById(fileId: number) {
  try {
    const rows = await db.select().from(orderFiles).where(eq(orderFiles.id, fileId));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getOrderFileById:', error);
    throw new Error('Failed to fetch file.', { cause: error });
  }
}

export async function addOrderFile(fileData: typeof orderFiles.$inferInsert) {
  try {
    const inserted = await db.insert(orderFiles).values(fileData).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in addOrderFile:', error);
    throw new Error('Failed to upload file.', { cause: error });
  }
}

export async function updateOrderStatusAdmin(
  orderId: number,
  updates: {
    orderStatus?: string;
    paymentStatus?: string;
    adminNotes?: string;
    expectedCompletionDate?: string;
  }
) {
  try {
    const updated = await db
      .update(orders)
      .set({
        ...(updates.orderStatus ? { orderStatus: updates.orderStatus } : {}),
        ...(updates.paymentStatus ? { paymentStatus: updates.paymentStatus } : {}),
        ...(updates.adminNotes !== undefined ? { adminNotes: updates.adminNotes } : {}),
        ...(updates.expectedCompletionDate
          ? { expectedCompletionDate: updates.expectedCompletionDate }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateOrderStatusAdmin:', error);
    throw new Error('Failed to update order status.', { cause: error });
  }
}

export async function createPaymentRecord(data: typeof payments.$inferInsert) {
  try {
    const inserted = await db.insert(payments).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createPaymentRecord:', error);
    throw new Error('Failed to initialize payment order.', { cause: error });
  }
}

export async function getPaymentByRazorpayOrderId(razorpayOrderId: string) {
  try {
    const rows = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, razorpayOrderId));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getPaymentByRazorpayOrderId:', error);
    throw new Error('Failed to look up payment order.', { cause: error });
  }
}

export async function markPaymentVerified(
  paymentId: number,
  orderId: number,
  details: {
    razorpayPaymentId: string;
    razorpaySignature: string;
    upiVpa?: string;
    eventId: string;
    eventType: string;
    payloadJson: string;
  }
) {
  try {
    // Check idempotency in payment_webhook_events
    const existingEvent = await db
      .select()
      .from(paymentWebhookEvents)
      .where(eq(paymentWebhookEvents.eventId, details.eventId));

    if (existingEvent.length > 0) {
      const existingPayment = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId));
      return { alreadyProcessed: true, payment: existingPayment[0] };
    }

    const existingPaymentRows = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId));
    const currentPayment = existingPaymentRows[0];
    if (currentPayment && currentPayment.status === 'captured') {
      return { alreadyProcessed: true, payment: currentPayment };
    }

    // Record webhook/verification event
    await db.insert(paymentWebhookEvents).values({
      eventId: details.eventId,
      eventType: details.eventType,
      razorpayOrderId: currentPayment.razorpayOrderId,
      razorpayPaymentId: details.razorpayPaymentId,
      signatureVerified: true,
      payloadJson: details.payloadJson,
    });

    const updatedPayment = await db
      .update(payments)
      .set({
        razorpayPaymentId: details.razorpayPaymentId,
        razorpaySignature: details.razorpaySignature,
        upiVpa: details.upiVpa || 'student@okaxis',
        status: 'captured',
        verifiedByServer: true,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();

    await db
      .update(orders)
      .set({
        paymentStatus: 'Paid',
        orderStatus: 'Confirmed',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return { alreadyProcessed: false, payment: updatedPayment[0] };
  } catch (error) {
    console.error('Database query failed in markPaymentVerified:', error);
    throw new Error('Failed to verify and record payment.', { cause: error });
  }
}

export async function submitManualUpiVerification(
  paymentId: number,
  orderId: number,
  utrNumber: string,
  upiVpa: string
) {
  try {
    const updatedPayment = await db
      .update(payments)
      .set({
        manualUtrNumber: utrNumber.trim(),
        upiVpa: upiVpa.trim(),
        status: 'verification_pending',
        verifiedByServer: false,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();

    await db
      .update(orders)
      .set({
        paymentStatus: 'Verification Pending',
        orderStatus: 'Payment Verification',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return updatedPayment[0];
  } catch (error) {
    console.error('Database query failed in submitManualUpiVerification:', error);
    throw new Error('Failed to submit manual UPI reference for review.', { cause: error });
  }
}

export async function processPaymentRefundAdmin(
  paymentId: number,
  reason: string
) {
  try {
    const rows = await db.select().from(payments).where(eq(payments.id, paymentId));
    const payment = rows[0];
    if (!payment) throw new Error('Payment record not found.');

    const refundId = `rfnd_${Date.now().toString(36)}_${payment.id}`;
    const updatedPayment = await db
      .update(payments)
      .set({
        status: 'refunded',
        refundId,
        refundReason: reason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();

    await db
      .update(orders)
      .set({
        paymentStatus: 'Refunded',
        orderStatus: 'Refunded',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, payment.orderId));

    await db.insert(paymentWebhookEvents).values({
      eventId: `evt_refund_${refundId}`,
      eventType: 'refund.processed',
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      signatureVerified: true,
      payloadJson: JSON.stringify({ refundId, reason, amountInr: payment.amountInr }),
    });

    return updatedPayment[0];
  } catch (error) {
    console.error('Database query failed in processPaymentRefundAdmin:', error);
    throw new Error('Failed to process refund.', { cause: error });
  }
}

export async function getAllUsersAdmin() {
  try {
    return await db
      .select({
        id: users.id,
        uid: users.uid,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        collegeName: users.collegeName,
        collegeIdNumber: users.collegeIdNumber,
        collegeIdStatus: users.collegeIdStatus,
        collegeIdReviewNotes: users.collegeIdReviewNotes,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  } catch (error) {
    console.error('Database query failed in getAllUsersAdmin:', error);
    throw new Error('Failed to fetch users for admin review.', { cause: error });
  }
}

export async function reviewCollegeIdAdmin(
  userId: number,
  status: 'Verified' | 'Rejected' | 'Pending Review',
  reviewNotes: string
) {
  try {
    const updated = await db
      .update(users)
      .set({
        collegeIdStatus: status,
        collegeIdReviewNotes: reviewNotes.trim(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in reviewCollegeIdAdmin:', error);
    throw new Error('Failed to update college ID verification status.', { cause: error });
  }
}

export async function getAllPaymentsAdmin() {
  try {
    const allPayments = await db.select().from(payments).orderBy(desc(payments.createdAt));
    const allOrders = await db.select().from(orders);
    const allUsers = await db.select().from(users);
    const allWebhooks = await db
      .select()
      .from(paymentWebhookEvents)
      .orderBy(desc(paymentWebhookEvents.processedAt));

    const orderMap = new Map(allOrders.map((o) => [o.id, o]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    return {
      payments: allPayments.map((p) => ({
        ...p,
        orderNumber: orderMap.get(p.orderId)?.orderNumber || `ORD-${p.orderId}`,
        studentName: userMap.get(p.userId)?.fullName || 'Student',
        studentEmail: userMap.get(p.userId)?.email || '',
      })),
      webhookEvents: allWebhooks,
    };
  } catch (error) {
    console.error('Database query failed in getAllPaymentsAdmin:', error);
    throw new Error('Failed to fetch payment records.', { cause: error });
  }
}

export async function createSupportTicket(data: typeof supportRequests.$inferInsert) {
  try {
    const inserted = await db.insert(supportRequests).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createSupportTicket:', error);
    throw new Error('Failed to submit support ticket.', { cause: error });
  }
}

export async function getSupportTicketsForUser(userId: number) {
  try {
    return await db
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.userId, userId))
      .orderBy(desc(supportRequests.createdAt));
  } catch (error) {
    console.error('Database query failed in getSupportTicketsForUser:', error);
    throw new Error('Failed to load support tickets.', { cause: error });
  }
}

export async function getAllSupportTicketsAdmin() {
  try {
    const tickets = await db
      .select()
      .from(supportRequests)
      .orderBy(desc(supportRequests.createdAt));
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    return tickets.map((t) => ({
      ...t,
      studentName: userMap.get(t.userId)?.fullName || 'Student',
      studentEmail: userMap.get(t.userId)?.email || '',
      collegeName: userMap.get(t.userId)?.collegeName || '',
    }));
  } catch (error) {
    console.error('Database query failed in getAllSupportTicketsAdmin:', error);
    throw new Error('Failed to load support requests for admin.', { cause: error });
  }
}

export async function updateSupportTicketAdmin(
  ticketId: number,
  status: string,
  adminResponse: string
) {
  try {
    const updated = await db
      .update(supportRequests)
      .set({
        status,
        adminResponse: adminResponse.trim(),
        updatedAt: new Date(),
      })
      .where(eq(supportRequests.id, ticketId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateSupportTicketAdmin:', error);
    throw new Error('Failed to update support ticket.', { cause: error });
  }
}
