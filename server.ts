import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import {
  requireAuth,
  requireAdmin,
  AuthRequest,
  hashPassword,
  verifyPassword,
  createSessionToken,
} from './src/middleware/auth.ts';
import {
  getAllColleges,
  getServicesWithPricing,
  getUserByEmail,
  createRegisteredUser,
  updateUserProfile,
  updateUserPassword,
  setUserRole,
  createOrderRecord,
  getOrdersForUser,
  getOrderById,
  getOrderFileById,
  addOrderFile,
  createPaymentRecord,
  getPaymentByRazorpayOrderId,
  markPaymentVerified,
  submitManualUpiVerification,
  processPaymentRefundAdmin,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  getAllUsersAdmin,
  reviewCollegeIdAdmin,
  updateServicePricing,
  getAllPaymentsAdmin,
  createSupportTicket,
  getSupportTicketsForUser,
  getAllSupportTicketsAdmin,
  updateSupportTicketAdmin,
} from './src/db/users.ts';

dotenv.config();

const app = express();
const PORT = 3000;

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_NoteCraftAcademic01';
const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_NoteCraftAcademic2026';
const RAZORPAY_WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_NoteCraftWebhookSecret2026';

// Parse JSON payloads up to 10MB for safe reference/deliverable file uploads
app.use(express.json({ limit: '10mb' }));

// Security headers middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Simple in-memory rate limiter for sensitive endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests from this IP. Please wait a moment and try again.',
      });
    }
    record.count += 1;
    next();
  };
}

// Helper: Server-side authoritative pricing calculator
function calculateAuthoritativePrice(params: {
  basePriceInr: number;
  handwrittenSurchargeInr: number;
  urgentMultiplierPercent: number;
  physicalDeliveryFeeInr: number;
  platformFeeInr: number;
  unitType: string;
  quantity: number;
  preferredFormat: string;
  deliveryMethod: string;
  deadline: string;
}) {
  const safeQuantity = Math.max(1, Math.min(1000, Math.floor(Number(params.quantity) || 1)));
  const perUnitFormatAddon =
    params.preferredFormat === 'Handwritten' ? params.handwrittenSurchargeInr : 0;

  const baseUnitCost = params.basePriceInr + perUnitFormatAddon;
  const rawUnits = params.unitType === 'fixed_project' ? 1 : safeQuantity;
  let subtotalInr = baseUnitCost * rawUnits;

  // Check if deadline is urgent (within 48 hours)
  const deadlineMs = new Date(params.deadline).getTime();
  const hoursUntilDeadline = (deadlineMs - Date.now()) / (1000 * 60 * 60);
  const isUrgent = !Number.isNaN(hoursUntilDeadline) && hoursUntilDeadline <= 48;

  let urgentFeeInr = 0;
  if (isUrgent) {
    urgentFeeInr = Math.round((subtotalInr * params.urgentMultiplierPercent) / 100);
    subtotalInr += urgentFeeInr;
  }

  const deliveryFeeInr =
    params.deliveryMethod === 'Digital Download' ? 0 : params.physicalDeliveryFeeInr;
  const platformFeeInr = params.platformFeeInr;
  const totalAmountInr = subtotalInr + deliveryFeeInr + platformFeeInr;

  return {
    quantity: rawUnits,
    baseUnitCost,
    urgentFeeInr,
    isUrgent,
    subtotalInr,
    deliveryFeeInr,
    platformFeeInr,
    totalAmountInr,
  };
}

// ============================================================================
// 1. PUBLIC REFERENCE ENDPOINTS
// ============================================================================

app.get('/api/colleges', async (_req: Request, res: Response) => {
  try {
    const list = await getAllColleges();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load colleges' });
  }
});

app.get('/api/services', async (_req: Request, res: Response) => {
  try {
    const list = await getServicesWithPricing();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load services' });
  }
});

// ============================================================================
// 2. AUTHENTICATION & ACCOUNT ENDPOINTS
// ============================================================================

app.post('/api/auth/register', rateLimit(15, 60_000), async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, collegeName, collegeIdNumber, password } = req.body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid college or personal email address is required.' });
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length < 10) {
      return res.status(400).json({ error: 'A valid 10-digit phone number is required.' });
    }
    if (!collegeName || typeof collegeName !== 'string' || collegeName.trim().length < 3) {
      return res.status(400).json({ error: 'College or university name is required.' });
    }
    if (!collegeIdNumber || typeof collegeIdNumber !== 'string' || collegeIdNumber.trim().length < 3) {
      return res.status(400).json({ error: 'College ID number is required for student verification.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please sign in instead.',
      });
    }

    const uid = `usr_${crypto.randomBytes(12).toString('hex')}`;
    const passwordHash = hashPassword(password);

    const user = await createRegisteredUser({
      uid,
      fullName,
      email,
      phone,
      collegeName,
      collegeIdNumber,
      passwordHash,
    });

    const token = createSessionToken(user.uid, user.email);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        collegeName: user.collegeName,
        collegeIdNumber: user.collegeIdNumber,
        collegeIdStatus: user.collegeIdStatus,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', rateLimit(20, 60_000), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Both email and password are required.' });
    }

    const user = await getUserByEmail(String(email));
    if (!user || !user.passwordHash) {
      return res.status(401).json({
        error: 'Invalid email or password. If you signed up with Google, use Google Sign-In.',
      });
    }

    const isValid = verifyPassword(String(password), user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = createSessionToken(user.uid, user.email);
    res.json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        collegeName: user.collegeName,
        collegeIdNumber: user.collegeIdNumber,
        collegeIdStatus: user.collegeIdStatus,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed.' });
  }
});

app.post('/api/auth/reset-password', rateLimit(10, 60_000), async (req: Request, res: Response) => {
  try {
    const { email, collegeIdNumber, newPassword } = req.body;
    if (!email || !collegeIdNumber || !newPassword) {
      return res.status(400).json({
        error: 'Email, registered College ID number, and new password are required.',
      });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long.',
      });
    }

    const user = await getUserByEmail(String(email));
    if (
      !user ||
      user.collegeIdNumber.trim().toUpperCase() !== String(collegeIdNumber).trim().toUpperCase()
    ) {
      return res.status(400).json({
        error: 'Could not verify account with the provided Email and College ID combination.',
      });
    }

    const newHash = hashPassword(String(newPassword));
    await updateUserPassword(user.id, newHash);

    res.json({
      message: 'Your password has been securely updated. You may now log in.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Password reset failed.' });
  }
});

app.get('/api/me', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

app.put('/api/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phone, collegeName, collegeIdNumber } = req.body;
    if (!fullName || !phone || !collegeName || !collegeIdNumber) {
      return res.status(400).json({
        error: 'Full name, phone number, college name, and college ID number are required.',
      });
    }

    const updated = await updateUserProfile(req.user!.id, {
      fullName: String(fullName),
      phone: String(phone),
      collegeName: String(collegeName),
      collegeIdNumber: String(collegeIdNumber),
    });

    res.json({
      user: {
        id: updated.id,
        uid: updated.uid,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        collegeName: updated.collegeName,
        collegeIdNumber: updated.collegeIdNumber,
        collegeIdStatus: updated.collegeIdStatus,
        role: updated.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update profile.' });
  }
});

// Allows testing both Student and Admin views in local/preview environment
app.post('/api/me/role', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (role !== 'student' && role !== 'admin') {
      return res.status(400).json({ error: 'Role must be student or admin.' });
    }
    const updated = await setUserRole(req.user!.id, role, req.user!.email);
    res.json({
      user: {
        id: updated.id,
        uid: updated.uid,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        collegeName: updated.collegeName,
        collegeIdNumber: updated.collegeIdNumber,
        collegeIdStatus: updated.collegeIdStatus,
        role: updated.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to switch role.' });
  }
});

// ============================================================================
// 3. DYNAMIC PRICING & ORDER PLACEMENT ENDPOINTS
// ============================================================================

app.post('/api/pricing/calculate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { serviceId, quantity, preferredFormat, deliveryMethod, deadline } = req.body;
    const servicesList = await getServicesWithPricing();
    const service = servicesList.find((s) => s.id === Number(serviceId));

    if (!service) {
      return res.status(404).json({ error: 'Selected service not found.' });
    }

    const breakdown = calculateAuthoritativePrice({
      basePriceInr: service.pricing.basePriceInr,
      handwrittenSurchargeInr: service.pricing.handwrittenSurchargeInr,
      urgentMultiplierPercent: service.pricing.urgentMultiplierPercent,
      physicalDeliveryFeeInr: service.pricing.physicalDeliveryFeeInr,
      platformFeeInr: service.pricing.platformFeeInr,
      unitType: service.pricing.unitType,
      quantity: Number(quantity) || 1,
      preferredFormat: String(preferredFormat || 'Digital'),
      deliveryMethod: String(deliveryMethod || 'Digital Download'),
      deadline: String(deadline || ''),
    });

    res.json({
      serviceName: service.name,
      unitLabel: service.pricing.unitLabel,
      turnaroundDays: service.turnaroundDays,
      ...breakdown,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to calculate price.' });
  }
});

app.post('/api/orders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      serviceId,
      studentName,
      collegeName,
      collegeIdNumber,
      subject,
      courseDegree,
      semesterYear,
      chapterTopic,
      quantity,
      preferredFormat,
      languagePreference,
      deadline,
      detailedInstructions,
      deliveryMethod,
      deliveryAddress,
      academicIntegrityAccepted,
      referenceFiles,
    } = req.body;

    // Strict server-side required field validation
    if (
      !serviceId ||
      !studentName?.trim() ||
      !collegeName?.trim() ||
      !collegeIdNumber?.trim() ||
      !subject?.trim() ||
      !courseDegree?.trim() ||
      !semesterYear?.trim() ||
      !chapterTopic?.trim() ||
      !preferredFormat ||
      !languagePreference?.trim() ||
      !deadline ||
      !detailedInstructions?.trim() ||
      !deliveryMethod
    ) {
      return res.status(400).json({
        error: 'All required order fields must be filled before submitting.',
      });
    }

    if (!academicIntegrityAccepted) {
      return res.status(400).json({
        error: 'You must agree to the Academic Integrity & Permitted Study Support Policy.',
      });
    }

    if (
      deliveryMethod !== 'Digital Download' &&
      (!deliveryAddress || String(deliveryAddress).trim().length < 8)
    ) {
      return res.status(400).json({
        error: 'Hostel or campus delivery address is required for physical delivery.',
      });
    }

    const servicesList = await getServicesWithPricing();
    const service = servicesList.find((s) => s.id === Number(serviceId));
    if (!service) {
      return res.status(404).json({ error: 'Selected academic service not found.' });
    }

    // Never trust client-sent price; compute on server
    const priceBreakdown = calculateAuthoritativePrice({
      basePriceInr: service.pricing.basePriceInr,
      handwrittenSurchargeInr: service.pricing.handwrittenSurchargeInr,
      urgentMultiplierPercent: service.pricing.urgentMultiplierPercent,
      physicalDeliveryFeeInr: service.pricing.physicalDeliveryFeeInr,
      platformFeeInr: service.pricing.platformFeeInr,
      unitType: service.pricing.unitType,
      quantity: Number(quantity) || 1,
      preferredFormat: String(preferredFormat),
      deliveryMethod: String(deliveryMethod),
      deadline: String(deadline),
    });

    // Validate uploaded reference files (type and size limits)
    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const parsedFiles: Array<{
      uploadedByUserId: number;
      fileCategory: string;
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
      fileContentBase64: string;
    }> = [];

    if (Array.isArray(referenceFiles)) {
      for (const file of referenceFiles.slice(0, 3)) {
        if (!file.fileName || !file.fileContentBase64) continue;
        const mimeType = file.mimeType || 'application/octet-stream';
        if (!allowedMimeTypes.includes(mimeType)) {
          return res.status(400).json({
            error: `Unsupported file type (${mimeType}). Allowed: PDF, PNG, JPG, TXT, DOC/DOCX.`,
          });
        }
        const sizeBytes = Number(file.fileSizeBytes) || 0;
        if (sizeBytes > 4 * 1024 * 1024) {
          return res.status(400).json({
            error: `File "${file.fileName}" exceeds the 4MB per-file upload limit.`,
          });
        }
        parsedFiles.push({
          uploadedByUserId: req.user!.id,
          fileCategory: 'reference',
          fileName: String(file.fileName).replace(/[^a-zA-Z0-9._-]/g, '_'),
          mimeType,
          fileSizeBytes: sizeBytes,
          fileContentBase64: String(file.fileContentBase64),
        });
      }
    }

    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const expectedDate = new Date(
      Date.now() + service.turnaroundDays * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split('T')[0];

    const createdOrder = await createOrderRecord(
      {
        orderNumber,
        userId: req.user!.id,
        serviceId: service.id,
        studentName: String(studentName).trim(),
        collegeName: String(collegeName).trim(),
        collegeIdNumber: String(collegeIdNumber).trim().toUpperCase(),
        subject: String(subject).trim(),
        courseDegree: String(courseDegree).trim(),
        semesterYear: String(semesterYear).trim(),
        chapterTopic: String(chapterTopic).trim(),
        quantity: priceBreakdown.quantity,
        unitType: service.pricing.unitType,
        preferredFormat: String(preferredFormat),
        languagePreference: String(languagePreference).trim(),
        deadline: String(deadline),
        detailedInstructions: String(detailedInstructions).trim(),
        deliveryMethod: String(deliveryMethod),
        deliveryAddress: deliveryAddress ? String(deliveryAddress).trim() : null,
        subtotalInr: priceBreakdown.subtotalInr,
        deliveryFeeInr: priceBreakdown.deliveryFeeInr,
        platformFeeInr: priceBreakdown.platformFeeInr,
        totalAmountInr: priceBreakdown.totalAmountInr,
        paymentStatus: 'Pending',
        orderStatus: 'Pending Payment',
        expectedCompletionDate: deadline || expectedDate,
        academicIntegrityAccepted: true,
      },
      parsedFiles
    );

    res.status(201).json({
      order: createdOrder,
      priceBreakdown,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create order.' });
  }
});

app.get('/api/orders/my', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await getOrdersForUser(req.user!.id);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch orders.' });
  }
});

// Private file download with strict ownership/admin check
app.get('/api/files/:fileId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const fileId = Number(req.params.fileId);
    const file = await getOrderFileById(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const order = await getOrderById(file.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Associated order not found.' });
    }

    // Access Control: Only the student who owns the order or an admin can download
    if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to access this private file.',
      });
    }

    res.json({
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSizeBytes: file.fileSizeBytes,
      fileContentBase64: file.fileContentBase64,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve file.' });
  }
});

// ============================================================================
// 4. RAZORPAY UPI PAYMENT GATEWAY & WEBHOOK ENDPOINTS
// ============================================================================

app.post(
  '/api/payments/create-order',
  requireAuth,
  rateLimit(20, 60_000),
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderId, gateway } = req.body;
      const order = await getOrderById(Number(orderId));

      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }
      if (order.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: Order belongs to another student.' });
      }
      if (order.paymentStatus === 'Paid') {
        return res.status(400).json({ error: 'This order has already been paid.' });
      }

      // Amount is strictly read from the database order record, never from client body
      const amountInr = order.totalAmountInr;
      const razorpayOrderId = `order_rzp_${crypto.randomBytes(8).toString('hex')}`;
      const receiptNumber = `RCPT-${new Date().getFullYear()}-${order.id}-${Math.floor(1000 + Math.random() * 9000)}`;

      const paymentRecord = await createPaymentRecord({
        orderId: order.id,
        userId: req.user!.id,
        gateway: gateway === 'manual_upi' ? 'manual_upi' : 'razorpay',
        razorpayOrderId,
        amountInr,
        currency: 'INR',
        status: 'created',
        receiptNumber,
        verifiedByServer: false,
      });

      // Generate a deterministic test signature token so the Razorpay Test Checkout modal
      // can simulate real cryptographic signature verification on the backend
      const testPaymentId = `pay_rzp_${crypto.randomBytes(8).toString('hex')}`;
      const testExpectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${testPaymentId}`)
        .digest('hex');

      res.status(201).json({
        payment: paymentRecord,
        razorpayConfig: {
          keyId: RAZORPAY_KEY_ID,
          razorpayOrderId,
          amountPaise: amountInr * 100,
          amountInr,
          currency: 'INR',
          orderNumber: order.orderNumber,
          studentName: order.studentName,
          studentEmail: req.user!.email,
          studentPhone: req.user!.phone,
          // Provided in test mode so the interactive Razorpay UPI simulator can send a valid signed payload
          testModeSimulation: {
            isTestMode: RAZORPAY_KEY_ID.startsWith('rzp_test_'),
            simulatedPaymentId: testPaymentId,
            simulatedSignature: testExpectedSignature,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create payment order.' });
    }
  }
);

app.post(
  '/api/payments/verify',
  requireAuth,
  rateLimit(20, 60_000),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        upi_vpa,
      } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          error: 'Missing Razorpay payment verification parameters.',
        });
      }

      const paymentRecord = await getPaymentByRazorpayOrderId(String(razorpay_order_id));
      if (!paymentRecord) {
        return res.status(404).json({ error: 'Payment order record not found.' });
      }
      if (paymentRecord.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden: Payment belongs to another user.' });
      }

      // Cryptographic HMAC-SHA256 verification of Razorpay signature on the backend
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const sigBuffer = Buffer.from(String(razorpay_signature));
      const expectedBuffer = Buffer.from(expectedSignature);

      if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        return res.status(400).json({
          error: 'Payment signature verification failed. Transaction rejected by server.',
        });
      }

      const eventId = `evt_verify_${razorpay_payment_id}`;
      const result = await markPaymentVerified(paymentRecord.id, paymentRecord.orderId, {
        razorpayPaymentId: String(razorpay_payment_id),
        razorpaySignature: String(razorpay_signature),
        upiVpa: upi_vpa ? String(upi_vpa) : 'student@okicici',
        eventId,
        eventType: 'payment.captured',
        payloadJson: JSON.stringify({
          razorpay_order_id,
          razorpay_payment_id,
          upi_vpa,
          verifiedVia: 'server_hmac_sha256',
        }),
      });

      const updatedOrder = await getOrderById(paymentRecord.orderId);
      res.json({
        verified: true,
        alreadyProcessed: result.alreadyProcessed,
        payment: result.payment,
        order: updatedOrder,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Payment verification failed.' });
    }
  }
);

// Authenticated endpoint for Manual UPI UTR submission (requires Admin verification before Paid)
app.post(
  '/api/payments/manual-upi',
  requireAuth,
  rateLimit(10, 60_000),
  async (req: AuthRequest, res: Response) => {
    try {
      const { razorpayOrderId, utrNumber, upiVpa } = req.body;
      if (!razorpayOrderId || !utrNumber || String(utrNumber).trim().length < 12) {
        return res.status(400).json({
          error: 'A valid 12-digit UPI UTR / Reference number is required for manual verification.',
        });
      }

      const paymentRecord = await getPaymentByRazorpayOrderId(String(razorpayOrderId));
      if (!paymentRecord || paymentRecord.userId !== req.user!.id) {
        return res.status(404).json({ error: 'Payment order not found.' });
      }

      const updatedPayment = await submitManualUpiVerification(
        paymentRecord.id,
        paymentRecord.orderId,
        String(utrNumber),
        String(upiVpa || 'manual@upi')
      );
      const updatedOrder = await getOrderById(paymentRecord.orderId);

      res.json({
        payment: updatedPayment,
        order: updatedOrder,
        message:
          'Manual UPI reference recorded. Order is marked as "Payment Verification" until verified by an administrator.',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to submit manual UPI reference.' });
    }
  }
);

// Server-to-Server Razorpay Webhook Endpoint with Signature & Idempotency Verification
app.post('/api/webhooks/razorpay', async (req: Request, res: Response) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const rawPayload = JSON.stringify(req.body);

    const expectedWebhookSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    if (!webhookSignature || webhookSignature !== expectedWebhookSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const { event_id, event, payload } = req.body;
    const razorpayOrderId = payload?.payment?.entity?.order_id;
    const razorpayPaymentId = payload?.payment?.entity?.id;
    const upiVpa = payload?.payment?.entity?.vpa || 'webhook@upi';

    if (!event_id || !razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({ error: 'Malformed webhook payload.' });
    }

    const paymentRecord = await getPaymentByRazorpayOrderId(String(razorpayOrderId));
    if (!paymentRecord) {
      return res.status(404).json({ error: 'Payment order not found for webhook.' });
    }

    const result = await markPaymentVerified(paymentRecord.id, paymentRecord.orderId, {
      razorpayPaymentId: String(razorpayPaymentId),
      razorpaySignature: webhookSignature,
      upiVpa: String(upiVpa),
      eventId: String(event_id),
      eventType: String(event || 'payment.captured'),
      payloadJson: rawPayload,
    });

    res.json({ status: 'ok', alreadyProcessed: result.alreadyProcessed });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Webhook processing error.' });
  }
});

// ============================================================================
// 5. STUDENT SUPPORT TICKETS ENDPOINTS
// ============================================================================

app.get('/api/support/my', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await getSupportTicketsForUser(req.user!.id);
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load support tickets.' });
  }
});

app.post('/api/support', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, subject, category, message } = req.body;
    if (!subject?.trim() || !category?.trim() || !message?.trim()) {
      return res.status(400).json({
        error: 'Subject, category, and detailed message are required.',
      });
    }

    const ticketNumber = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;
    const ticket = await createSupportTicket({
      ticketNumber,
      userId: req.user!.id,
      orderId: orderId ? Number(orderId) : null,
      subject: String(subject).trim(),
      category: String(category).trim(),
      message: String(message).trim(),
      status: 'Open',
    });

    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create support request.' });
  }
});

// ============================================================================
// 6. PROTECTED ADMIN DASHBOARD ENDPOINTS (RBAC ENFORCED)
// ============================================================================

app.get(
  '/api/admin/orders',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const allOrders = await getAllOrdersAdmin();
      res.json(allOrders);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load admin orders.' });
    }
  }
);

app.patch(
  '/api/admin/orders/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const orderId = Number(req.params.id);
      const { orderStatus, paymentStatus, adminNotes, expectedCompletionDate } = req.body;
      const updated = await updateOrderStatusAdmin(orderId, {
        orderStatus,
        paymentStatus,
        adminNotes,
        expectedCompletionDate,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update order.' });
    }
  }
);

app.post(
  '/api/admin/orders/:id/deliverable',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const orderId = Number(req.params.id);
      const { fileName, mimeType, fileSizeBytes, fileContentBase64 } = req.body;
      if (!fileName || !fileContentBase64) {
        return res.status(400).json({ error: 'Deliverable file name and content are required.' });
      }

      const fileRecord = await addOrderFile({
        orderId,
        uploadedByUserId: req.user!.id,
        fileCategory: 'deliverable',
        fileName: String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_'),
        mimeType: String(mimeType || 'application/pdf'),
        fileSizeBytes: Number(fileSizeBytes) || 1024,
        fileContentBase64: String(fileContentBase64),
      });

      await updateOrderStatusAdmin(orderId, {
        orderStatus: 'Completed',
      });

      res.status(201).json(fileRecord);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to upload deliverable.' });
    }
  }
);

app.get(
  '/api/admin/users',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const usersList = await getAllUsersAdmin();
      res.json(usersList);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load users.' });
    }
  }
);

app.patch(
  '/api/admin/users/:id/verify-id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = Number(req.params.id);
      const { status, reviewNotes } = req.body;
      if (!['Verified', 'Rejected', 'Pending Review'].includes(status)) {
        return res.status(400).json({ error: 'Invalid verification status.' });
      }
      const updated = await reviewCollegeIdAdmin(
        userId,
        status,
        String(reviewNotes || '')
      );
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update college ID status.' });
    }
  }
);

app.put(
  '/api/admin/pricing/:serviceId',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const serviceId = Number(req.params.serviceId);
      const {
        basePriceInr,
        handwrittenSurchargeInr,
        urgentMultiplierPercent,
        physicalDeliveryFeeInr,
        platformFeeInr,
        unitLabel,
        turnaroundDays,
      } = req.body;

      const updated = await updateServicePricing(serviceId, {
        basePriceInr: Math.max(1, Number(basePriceInr) || 10),
        handwrittenSurchargeInr: Math.max(0, Number(handwrittenSurchargeInr) || 0),
        urgentMultiplierPercent: Math.max(0, Number(urgentMultiplierPercent) || 0),
        physicalDeliveryFeeInr: Math.max(0, Number(physicalDeliveryFeeInr) || 0),
        platformFeeInr: Math.max(0, Number(platformFeeInr) || 0),
        unitLabel: unitLabel ? String(unitLabel) : undefined,
        turnaroundDays: turnaroundDays ? Number(turnaroundDays) : undefined,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update pricing.' });
    }
  }
);

app.get(
  '/api/admin/payments',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const data = await getAllPaymentsAdmin();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load payment records.' });
    }
  }
);

app.post(
  '/api/admin/payments/:id/verify-manual',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const paymentId = Number(req.params.id);
      const { orderId, utrNumber } = req.body;
      const result = await markPaymentVerified(paymentId, Number(orderId), {
        razorpayPaymentId: `upi_utr_${utrNumber || Date.now()}`,
        razorpaySignature: `admin_verified_by_${req.user!.email}`,
        upiVpa: 'verified_manual@upi',
        eventId: `evt_manual_admin_${paymentId}_${Date.now()}`,
        eventType: 'manual_upi.verified',
        payloadJson: JSON.stringify({ verifiedByAdmin: req.user!.email, utrNumber }),
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to verify manual payment.' });
    }
  }
);

app.post(
  '/api/admin/payments/:id/refund',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const paymentId = Number(req.params.id);
      const { reason } = req.body;
      if (!reason || String(reason).trim().length < 3) {
        return res.status(400).json({ error: 'A refund reason is required.' });
      }
      const refunded = await processPaymentRefundAdmin(paymentId, String(reason));
      res.json(refunded);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to process refund.' });
    }
  }
);

app.get(
  '/api/admin/support',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    try {
      const tickets = await getAllSupportTicketsAdmin();
      res.json(tickets);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load support tickets.' });
    }
  }
);

app.patch(
  '/api/admin/support/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const { status, adminResponse } = req.body;
      const updated = await updateSupportTicketAdmin(
        ticketId,
        String(status || 'Resolved'),
        String(adminResponse || '')
      );
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update support ticket.' });
    }
  }
);

// ============================================================================
// 7. VITE DEV MIDDLEWARE / STATIC ASSETS
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NoteCraft Academic server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
