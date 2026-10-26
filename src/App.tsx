import React, { useState, useEffect, useMemo } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import {
  UserProfile,
  College,
  ServiceWithPricing,
  OrderRecord,
  SupportTicket,
  BusinessDetails,
} from './types.ts';
import { PaymentModal } from './components/PaymentModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { PoliciesAndGuide } from './components/PoliciesAndGuide.tsx';
import {
  HeroStudyDeskArtwork,
  ServiceCategoryBanner,
} from './components/AcademicIllustrations.tsx';
import {
  BookOpen,
  FileText,
  Calculator,
  Package,
  User,
  HelpCircle,
  LogOut,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';

type ActivePage =
  | 'dashboard'
  | 'pricing'
  | 'create-order'
  | 'my-orders'
  | 'profile'
  | 'help'
  | 'policies'
  | 'admin';

export default function App() {
  // Authentication state (token kept strictly in memory per security guidelines)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Auth form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCollegeName, setRegCollegeName] = useState(
    'Indian Institute of Technology Delhi (IIT Delhi)'
  );
  const [regCustomCollege, setRegCustomCollege] = useState('');
  const [regCollegeIdNumber, setRegCollegeIdNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regIntegrityAccepted, setRegIntegrityAccepted] = useState(true);

  const [resetEmail, setResetEmail] = useState('');
  const [resetCollegeId, setResetCollegeId] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Navigation & Shared Data
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [colleges, setColleges] = useState<College[]>([]);
  const [services, setServices] = useState<ServiceWithPricing[]>([]);
  const [myOrders, setMyOrders] = useState<OrderRecord[]>([]);
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Payment Checkout Modal State
  const [activePaymentOrder, setActivePaymentOrder] = useState<OrderRecord | null>(null);

  // Editable Business Details State
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>({
    companyName: 'NoteCraft Academic Services Pvt. Ltd.',
    supportEmail: 'support@notecraft.academic.in',
    supportPhone: '+91 98110 45200',
    registeredAddress: '2nd Floor, Jia Sarai Academic Hub, Hauz Khas, New Delhi - 110016',
    gstNumber: '07AABCN2026B1Z5',
    upiMerchantVpa: 'notecraft@icici',
    collegeIdRetentionDays: 90,
  });

  // Pricing Page Calculator State
  const [calcServiceId, setCalcServiceId] = useState<number>(1);
  const [calcQuantity, setCalcQuantity] = useState<number>(15);
  const [calcFormat, setCalcFormat] = useState<'Handwritten' | 'Digital'>('Handwritten');
  const [calcDelivery, setCalcDelivery] = useState<
    'Digital Download' | 'Campus Courier Delivery' | 'Standard Post'
  >('Digital Download');
  const [calcUrgent, setCalcUrgent] = useState<boolean>(false);

  // Create Order Form State
  const [orderServiceId, setOrderServiceId] = useState<number>(1);
  const [orderStudentName, setOrderStudentName] = useState('');
  const [orderCollegeName, setOrderCollegeName] = useState('');
  const [orderCollegeIdNumber, setOrderCollegeIdNumber] = useState('');
  const [orderSubject, setOrderSubject] = useState('');
  const [orderCourseDegree, setOrderCourseDegree] = useState('');
  const [orderSemesterYear, setOrderSemesterYear] = useState('');
  const [orderChapterTopic, setOrderChapterTopic] = useState('');
  const [orderQuantity, setOrderQuantity] = useState<number>(10);
  const [orderFormat, setOrderFormat] = useState<'Handwritten' | 'Digital'>('Handwritten');
  const [orderLanguage, setOrderLanguage] = useState('English');
  const [orderDeadline, setOrderDeadline] = useState(() => {
    const d = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [orderDeliveryMethod, setOrderDeliveryMethod] = useState<
    'Digital Download' | 'Campus Courier Delivery' | 'Standard Post'
  >('Digital Download');
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState('');
  const [orderInstructions, setOrderInstructions] = useState('');
  const [orderIntegrityAccepted, setOrderIntegrityAccepted] = useState(true);
  const [orderFiles, setOrderFiles] = useState<
    Array<{
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
      fileContentBase64: string;
    }>
  >([]);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderFormError, setOrderFormError] = useState<string | null>(null);

  // Profile Edit State
  const [profFullName, setProfFullName] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profCollegeName, setProfCollegeName] = useState('');
  const [profCollegeIdNumber, setProfCollegeIdNumber] = useState('');
  const [profMessage, setProfMessage] = useState<string | null>(null);

  // Support Form State
  const [supOrderId, setSupOrderId] = useState<string>('');
  const [supCategory, setSupCategory] = useState('Order Inquiry');
  const [supSubject, setSupSubject] = useState('');
  const [supMessage, setSupMessage] = useState('');
  const [supFeedback, setSupFeedback] = useState<string | null>(null);

  // Load public reference data (colleges & services)
  const fetchPublicData = async () => {
    try {
      const [colRes, srvRes] = await Promise.all([
        fetch('/api/colleges'),
        fetch('/api/services'),
      ]);
      if (colRes.ok) {
        const colData = await colRes.json();
        setColleges(colData);
      }
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        setServices(srvData);
        if (srvData.length > 0) {
          setCalcServiceId((prev) => prev || srvData[0].id);
          setOrderServiceId((prev) => prev || srvData[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load reference data:', err);
    }
  };

  useEffect(() => {
    fetchPublicData();
  }, []);

  // Load authenticated user's orders and support tickets
  const fetchUserPortalData = async (token: string) => {
    setLoadingData(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [ordRes, supRes] = await Promise.all([
        fetch('/api/orders/my', { headers }),
        fetch('/api/support/my', { headers }),
      ]);
      if (ordRes.ok) {
        setMyOrders(await ordRes.json());
      }
      if (supRes.ok) {
        setMyTickets(await supRes.json());
      }
    } catch (err) {
      console.error('Error loading user portal data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Sync user profile fields into forms whenever currentUser updates
  useEffect(() => {
    if (currentUser) {
      setOrderStudentName(currentUser.fullName);
      setOrderCollegeName(currentUser.collegeName);
      setOrderCollegeIdNumber(currentUser.collegeIdNumber);

      setProfFullName(currentUser.fullName);
      setProfPhone(currentUser.phone);
      setProfCollegeName(currentUser.collegeName);
      setProfCollegeIdNumber(currentUser.collegeIdNumber);
    }
  }, [currentUser]);

  // Adjust allowed format when selected service changes
  const selectedOrderService = useMemo(
    () => services.find((s) => s.id === Number(orderServiceId)) || services[0],
    [services, orderServiceId]
  );

  useEffect(() => {
    if (selectedOrderService) {
      if (!selectedOrderService.allowedFormats.includes(orderFormat)) {
        const firstAllowed = selectedOrderService.allowedFormats.includes('Handwritten')
          ? 'Handwritten'
          : 'Digital';
        setOrderFormat(firstAllowed);
      }
    }
  }, [selectedOrderService]);

  // Live Price Breakdown for Order Form
  const liveOrderPrice = useMemo(() => {
    if (!selectedOrderService) {
      return {
        baseUnitCost: 0,
        quantity: 1,
        isUrgent: false,
        urgentFeeInr: 0,
        subtotalInr: 0,
        deliveryFeeInr: 0,
        platformFeeInr: 0,
        totalAmountInr: 0,
      };
    }
    const p = selectedOrderService.pricing;
    const safeQty =
      p.unitType === 'fixed_project' ? 1 : Math.max(1, Math.floor(Number(orderQuantity) || 1));
    const formatAddon = orderFormat === 'Handwritten' ? p.handwrittenSurchargeInr : 0;
    const baseUnitCost = p.basePriceInr + formatAddon;
    let subtotalInr = baseUnitCost * safeQty;

    const deadlineMs = new Date(orderDeadline).getTime();
    const hoursLeft = (deadlineMs - Date.now()) / (1000 * 60 * 60);
    const isUrgent = !Number.isNaN(hoursLeft) && hoursLeft <= 48;
    const urgentFeeInr = isUrgent
      ? Math.round((subtotalInr * p.urgentMultiplierPercent) / 100)
      : 0;
    subtotalInr += urgentFeeInr;

    const deliveryFeeInr =
      orderDeliveryMethod === 'Digital Download' ? 0 : p.physicalDeliveryFeeInr;
    const platformFeeInr = p.platformFeeInr;
    const totalAmountInr = subtotalInr + deliveryFeeInr + platformFeeInr;

    return {
      baseUnitCost,
      quantity: safeQty,
      isUrgent,
      urgentFeeInr,
      subtotalInr,
      deliveryFeeInr,
      platformFeeInr,
      totalAmountInr,
    };
  }, [selectedOrderService, orderQuantity, orderFormat, orderDeadline, orderDeliveryMethod]);

  // Live Price Breakdown for Pricing Page Calculator
  const selectedCalcService = useMemo(
    () => services.find((s) => s.id === Number(calcServiceId)) || services[0],
    [services, calcServiceId]
  );

  const liveCalcPrice = useMemo(() => {
    if (!selectedCalcService)
      return { subtotalInr: 0, deliveryFeeInr: 0, platformFeeInr: 0, totalAmountInr: 0 };
    const p = selectedCalcService.pricing;
    const qty = p.unitType === 'fixed_project' ? 1 : Math.max(1, Number(calcQuantity) || 1);
    const formatAddon = calcFormat === 'Handwritten' ? p.handwrittenSurchargeInr : 0;
    let subtotalInr = (p.basePriceInr + formatAddon) * qty;
    if (calcUrgent) {
      subtotalInr += Math.round((subtotalInr * p.urgentMultiplierPercent) / 100);
    }
    const deliveryFeeInr = calcDelivery === 'Digital Download' ? 0 : p.physicalDeliveryFeeInr;
    const platformFeeInr = p.platformFeeInr;
    return {
      subtotalInr,
      deliveryFeeInr,
      platformFeeInr,
      totalAmountInr: subtotalInr + deliveryFeeInr + platformFeeInr,
    };
  }, [selectedCalcService, calcQuantity, calcFormat, calcUrgent, calcDelivery]);

  // ============================================================================
  // AUTHENTICATION HANDLERS
  // ============================================================================

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');

      setAuthToken(data.token);
      setCurrentUser(data.user);
      setActivePage('dashboard');
      fetchUserPortalData(data.token);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regIntegrityAccepted) {
      setAuthError('Please accept the Academic Integrity policy to register.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    const finalCollege =
      regCollegeName === 'OTHER' ? regCustomCollege.trim() : regCollegeName;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName,
          email: regEmail,
          phone: regPhone,
          collegeName: finalCollege,
          collegeIdNumber: regCollegeIdNumber,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

      setAuthToken(data.token);
      setCurrentUser(data.user);
      setActivePage('dashboard');
      fetchUserPortalData(data.token);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          collegeIdNumber: resetCollegeId,
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed.');
      setAuthSuccessMsg(data.message);
      setAuthMode('login');
      setLoginEmail(resetEmail);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync Google account.');
      setAuthToken(idToken);
      setCurrentUser(data.user);
      setActivePage('dashboard');
      fetchUserPortalData(idToken);
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Instant 1-Click Demo Account Provisioner for testing Student or Admin journey
  const handleQuickDemoAccess = async (targetRole: 'student' | 'admin') => {
    setAuthLoading(true);
    setAuthError(null);
    const demoEmail =
      targetRole === 'admin'
        ? 'admin.demo@notecraft.academic.in'
        : 'aarav.sharma@iitd.ac.in';
    const demoPassword = 'DemoPassword2026!';

    try {
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: demoPassword }),
      });

      if (!res.ok) {
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: targetRole === 'admin' ? 'Dr. Vikram Mehta (Admin)' : 'Aarav Sharma',
            email: demoEmail,
            phone: '+91 98765 43210',
            collegeName: 'Indian Institute of Technology Delhi (IIT Delhi)',
            collegeIdNumber: targetRole === 'admin' ? 'ADMIN-IITD-01' : '2024CS10482',
            password: demoPassword,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed.');

      let finalUser = data.user;
      if (finalUser.role !== targetRole) {
        const roleRes = await fetch('/api/me/role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.token}`,
          },
          body: JSON.stringify({ role: targetRole }),
        });
        if (roleRes.ok) {
          const roleJson = await roleRes.json();
          finalUser = roleJson.user;
        }
      }

      setAuthToken(data.token);
      setCurrentUser(finalUser);
      setActivePage(targetRole === 'admin' ? 'admin' : 'dashboard');
      fetchUserPortalData(data.token);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore if not signed in via Firebase client
    }
    setAuthToken(null);
    setCurrentUser(null);
    setMyOrders([]);
    setActivePage('dashboard');
  };

  const handleSwitchRole = async (newRole: 'student' | 'admin') => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/me/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        if (newRole === 'admin') {
          setActivePage('admin');
        } else if (activePage === 'admin') {
          setActivePage('dashboard');
        }
      }
    } catch (err) {
      console.error('Failed to switch role:', err);
    }
  };

  // ============================================================================
  // ORDER & FILE HANDLERS
  // ============================================================================

  const handleReferenceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    files.slice(0, 3).forEach((file: File) => {
      if (file.size > 4 * 1024 * 1024) {
        setOrderFormError(`File "${file.name}" exceeds the 4MB upload limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const resStr = String(reader.result || '');
        const base64 = resStr.includes(',') ? resStr.split(',')[1] : btoa(resStr);
        setOrderFiles((prev) => [
          ...prev.slice(0, 2),
          {
            fileName: file.name,
            mimeType: file.type || 'application/pdf',
            fileSizeBytes: file.size,
            fileContentBase64: base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setOrderSubmitting(true);
    setOrderFormError(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          serviceId: orderServiceId,
          studentName: orderStudentName,
          collegeName: orderCollegeName,
          collegeIdNumber: orderCollegeIdNumber,
          subject: orderSubject,
          courseDegree: orderCourseDegree,
          semesterYear: orderSemesterYear,
          chapterTopic: orderChapterTopic,
          quantity: orderQuantity,
          preferredFormat: orderFormat,
          languagePreference: orderLanguage,
          deadline: orderDeadline,
          detailedInstructions: orderInstructions,
          deliveryMethod: orderDeliveryMethod,
          deliveryAddress: orderDeliveryAddress,
          academicIntegrityAccepted: orderIntegrityAccepted,
          referenceFiles: orderFiles,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit academic order.');

      await fetchUserPortalData(authToken);
      const createdOrderWithService: OrderRecord = {
        ...data.order,
        serviceName: selectedOrderService?.name || 'Academic Service',
        files: [],
        payments: [],
      };
      setOrderFiles([]);
      setOrderSubject('');
      setOrderChapterTopic('');
      setOrderInstructions('');
      setActivePage('my-orders');
      setActivePaymentOrder(createdOrderWithService);
    } catch (err: any) {
      setOrderFormError(err.message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleDownloadPrivateFile = async (fileId: number) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not download file.');

      const byteCharacters = atob(data.fileContentBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
    }
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setProfMessage(null);
    try {
      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fullName: profFullName,
          phone: profPhone,
          collegeName: profCollegeName,
          collegeIdNumber: profCollegeIdNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');
      setCurrentUser(data.user);
      setProfMessage('Profile saved. If your College ID changed, it is queued for Admin Verification.');
    } catch (err: any) {
      setProfMessage(err.message);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setSupFeedback(null);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orderId: supOrderId ? Number(supOrderId) : null,
          category: supCategory,
          subject: supSubject,
          message: supMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit support request.');
      setSupSubject('');
      setSupMessage('');
      setSupFeedback(`Support Ticket ${data.ticketNumber} created.`);
      fetchUserPortalData(authToken);
    } catch (err: any) {
      setSupFeedback(err.message);
    }
  };

  // ============================================================================
  // VIEW 1: PROTECTED AUTHENTICATION GATE (IF NOT LOGGED IN)
  // ============================================================================
  if (!authToken || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
        {/* Clean 3-Zone Top Bar */}
        <header className="bg-white border-b border-slate-200">
          <div className="flex items-center justify-between gap-8 px-6 py-4 max-w-7xl w-full mx-auto">
            <div className="text-lg font-bold tracking-tight text-indigo-950 whitespace-nowrap shrink-0">
              NoteCraft Academic
            </div>
            <div className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
              <span>Handwritten Study Notes</span>
              <span aria-hidden="true">·</span>
              <span>Chapter Summaries</span>
              <span aria-hidden="true">·</span>
              <span>Practical Record Formatting</span>
              <span aria-hidden="true">·</span>
              <span>Razorpay UPI Checkout</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleQuickDemoAccess('student')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                Instant Student Demo
              </button>
            </div>
          </div>
        </header>

        {/* Split Auth Layout with Custom Illustrated Study Artwork */}
        <main className="max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Visual Hero Illustration & Service Showcase */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-indigo-600">
                College Study Support &amp; Academic Writing Startup
              </div>
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Neatly handwritten notes, chapter summaries, and lab records crafted for your syllabus.
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                Sign in with your verified college credentials to explore transparent per-page and
                per-topic rates, upload syllabus PDFs, calculate instant order estimates, and pay
                securely via Razorpay UPI.
              </p>
            </div>

            {/* Custom High-Craft Illustrated Study Desk Banner */}
            <HeroStudyDeskArtwork />

            {/* Instant Testing Controls for Beginner Evaluation */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-5 space-y-2.5">
              <div className="text-xs font-bold text-indigo-950">
                One-Click Demo Access (Test Student Portal &amp; Admin RBAC Console)
              </div>
              <p className="text-xs text-slate-600">
                Want to explore the full dashboard immediately? Use the buttons below to sign in
                as a verified IIT Delhi student or open the Administrator Operations Console:
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => handleQuickDemoAccess('student')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shadow-xs"
                >
                  Login as Demo Student (Aarav Sharma)
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => handleQuickDemoAccess('admin')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-indigo-300 bg-white text-indigo-950 hover:bg-indigo-100/60 transition-colors whitespace-nowrap"
                >
                  Login as Administrator (RBAC Console)
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  authMode === 'login'
                    ? 'bg-white text-indigo-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Student Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  authMode === 'signup'
                    ? 'bg-white text-indigo-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                New Registration
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('forgot');
                  setAuthError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  authMode === 'forgot'
                    ? 'bg-white text-indigo-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reset Password
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
                {authError}
              </div>
            )}
            {authSuccessMsg && (
              <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-800">
                {authSuccessMsg}
              </div>
            )}

            {authMode === 'login' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College or Personal Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="student@college.edu.in"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  {authLoading ? 'Signing in...' : 'Sign In to Student Portal'}
                </button>

                <div className="relative py-2 flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-xs text-slate-400">OR</span>
                  <div className="border-t border-slate-200 w-full" />
                </div>

                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  Continue with Google Account (Firebase Auth)
                </button>
              </form>
            )}

            {authMode === 'signup' && (
              <form onSubmit={handleEmailSignup} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@college.ac.in"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College or University Name *
                  </label>
                  <select
                    value={regCollegeName}
                    onChange={(e) => setRegCollegeName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:border-indigo-600 focus:outline-none"
                  >
                    {colleges.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                    <option value="OTHER">Other College / University (Enter Below)</option>
                  </select>
                </div>

                {regCollegeName === 'OTHER' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Enter Your College / University Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={regCustomCollege}
                      onChange={(e) => setRegCustomCollege(e.target.value)}
                      placeholder="Full name of your institution"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      College ID / Roll Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={regCollegeIdNumber}
                      onChange={(e) => setRegCollegeIdNumber(e.target.value)}
                      placeholder="e.g. 2024CS10482"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password (Min 8 chars) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
                  Your College ID is placed in <strong>Pending Review</strong> status for staff
                  verification rather than being automatically marked verified.
                </div>

                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regIntegrityAccepted}
                    onChange={(e) => setRegIntegrityAccepted(e.target.checked)}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <span>
                    I confirm I am registering for permitted study notes, summaries, and formatting
                    support in compliance with my institution&apos;s academic integrity rules.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  {authLoading ? 'Creating Account...' : 'Create Student Account'}
                </button>
              </form>
            )}

            {authMode === 'forgot' && (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <p className="text-xs text-slate-600">
                  Enter your registered email address and your College ID number to verify your
                  identity and set a new password.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="student@college.edu.in"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered College ID Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={resetCollegeId}
                    onChange={(e) => setResetCollegeId(e.target.value)}
                    placeholder="e.g. 2024CS10482"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password (Min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  {authLoading ? 'Updating Password...' : 'Verify & Reset Password'}
                </button>
              </form>
            )}
          </div>
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 px-6 text-xs text-slate-500">
          <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              © {new Date().getFullYear()} {businessDetails.companyName} · Strictly for Permitted
              Study Notes &amp; Academic Learning Support.
            </div>
            <div>
              Support: <span className="font-mono text-indigo-700">{businessDetails.supportEmail}</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: AUTHENTICATED APPLICATION SHELL
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center justify-between gap-8 px-6 py-4 max-w-7xl w-full mx-auto">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="text-lg font-bold tracking-tight text-indigo-950 whitespace-nowrap shrink-0 text-left"
          >
            NoteCraft Academic
          </button>

          {/* Zone 2: 5 Single-line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActivePage('dashboard')}
              className={`hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'dashboard'
                  ? 'text-indigo-600 font-semibold underline underline-offset-4'
                  : ''
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActivePage('pricing')}
              className={`hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'pricing'
                  ? 'text-indigo-600 font-semibold underline underline-offset-4'
                  : ''
              }`}
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => setActivePage('my-orders')}
              className={`hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'my-orders'
                  ? 'text-indigo-600 font-semibold underline underline-offset-4'
                  : ''
              }`}
            >
              My Orders ({myOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActivePage('profile')}
              className={`hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'profile'
                  ? 'text-indigo-600 font-semibold underline underline-offset-4'
                  : ''
              }`}
            >
              My Profile
            </button>
            {currentUser.role === 'admin' ? (
              <button
                type="button"
                onClick={() => setActivePage('admin')}
                className={`hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0 font-semibold ${
                  activePage === 'admin'
                    ? 'text-indigo-600 underline underline-offset-4'
                    : 'text-amber-700'
                }`}
              >
                Admin Console
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActivePage('help')}
                className={`hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0 ${
                  activePage === 'help'
                    ? 'text-indigo-600 font-semibold underline underline-offset-4'
                    : ''
                }`}
              >
                Help &amp; Contact
              </button>
            )}
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActivePage('create-order')}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              Create an Order
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Secondary Navigation Strip */}
      <div className="md:hidden flex items-center gap-2 overflow-x-auto px-6 py-2.5 border-b border-slate-200 bg-white text-xs font-medium">
        <button
          onClick={() => setActivePage('dashboard')}
          className="px-2.5 py-1 whitespace-nowrap"
        >
          Dashboard
        </button>
        <button
          onClick={() => setActivePage('pricing')}
          className="px-2.5 py-1 whitespace-nowrap"
        >
          Pricing
        </button>
        <button
          onClick={() => setActivePage('create-order')}
          className="px-2.5 py-1 whitespace-nowrap text-indigo-600 font-semibold"
        >
          Create Order
        </button>
        <button
          onClick={() => setActivePage('my-orders')}
          className="px-2.5 py-1 whitespace-nowrap"
        >
          My Orders ({myOrders.length})
        </button>
        <button
          onClick={() => setActivePage('profile')}
          className="px-2.5 py-1 whitespace-nowrap"
        >
          Profile
        </button>
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setActivePage('admin')}
            className="px-2.5 py-1 font-bold text-amber-700 whitespace-nowrap"
          >
            Admin Console
          </button>
        )}
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* =====================================================================
            PAGE 1: HOMEPAGE / STUDENT DASHBOARD
           ===================================================================== */}
        {activePage === 'dashboard' && (
          <div className="space-y-10">
            {/* Vibrant Indigo & Deep Slate Hero Welcome Banner */}
            <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 text-white p-6 sm:p-8 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-200">
                    <GraduationCap className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>{currentUser.collegeName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">College ID: {currentUser.collegeIdNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300 font-semibold">
                      ID Status: {currentUser.collegeIdStatus}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Welcome back, {currentUser.fullName}
                  </h1>
                  <p className="text-sm text-indigo-100/90 max-w-xl leading-relaxed">
                    Order neatly handwritten lecture notes, LaTeX digital study guides, chapter
                    summaries, and practical record formatting with transparent student pricing.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActivePage('create-order')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors whitespace-nowrap"
                    >
                      <span>Place New Study Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSwitchRole(currentUser.role === 'admin' ? 'student' : 'admin')
                      }
                      className="px-3.5 py-2.5 text-xs font-medium rounded-lg border border-white/25 bg-white/10 text-white hover:bg-white/20 transition-colors whitespace-nowrap"
                    >
                      {currentUser.role === 'admin'
                        ? 'Switch to Student View'
                        : 'Switch to Admin Console (Demo RBAC)'}
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-lg border border-white/20 text-indigo-100 hover:bg-white/10 transition-colors whitespace-nowrap"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <HeroStudyDeskArtwork />
                </div>
              </div>
            </div>

            {/* Quick Navigation Cards (Required Section 3 Dashboard Actions) */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900">
                Student Workspace Quick Actions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('services-catalog');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="rounded-xl border border-slate-200 p-4 text-left hover:border-indigo-500 transition-colors bg-white shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">Browse Services</div>
                  <div className="text-xs text-slate-500 mt-0.5">7 study categories</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePage('pricing')}
                  className="rounded-xl border border-slate-200 p-4 text-left hover:border-emerald-500 transition-colors bg-white shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">View Pricing</div>
                  <div className="text-xs text-slate-500 mt-0.5">Live cost estimator</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePage('create-order')}
                  className="rounded-xl border border-slate-200 p-4 text-left hover:border-amber-500 transition-colors bg-white shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">Create an Order</div>
                  <div className="text-xs text-slate-500 mt-0.5">Upload syllabus PDF</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePage('my-orders')}
                  className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-500 transition-colors bg-white shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">My Orders</div>
                  <div className="text-xs text-slate-500 mt-0.5">{myOrders.length} active orders</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePage('profile')}
                  className="rounded-xl border border-slate-200 p-4 text-left hover:border-violet-500 transition-colors bg-white shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-2.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">My Profile</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    ID: {currentUser.collegeIdStatus}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePage('help')}
                  className="rounded-xl border border-slate-200 p-4 text-left hover:border-rose-500 transition-colors bg-white shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-2.5">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">Help &amp; Contact</div>
                  <div className="text-xs text-slate-500 mt-0.5">Support &amp; policies</div>
                </button>
              </div>
            </section>

            {/* Main Service Categories with Custom Illustrated SVG Visual Banners */}
            <section id="services-catalog" className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Academic Writing &amp; Study Note Categories
                  </h2>
                  <p className="text-xs text-slate-500">
                    Each service includes syllabus alignment, clean diagrams, and digital or campus
                    courier delivery.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('pricing')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline whitespace-nowrap self-start sm:self-auto"
                >
                  Compare Full Rate Card &amp; Estimator →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service, idx) => (
                  <div
                    key={service.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 shadow-2xs hover:border-indigo-300 transition-colors"
                  >
                    <div className="space-y-3.5">
                      {/* Bespoke Color-Themed SVG Artwork Banner */}
                      <ServiceCategoryBanner
                        slug={service.slug}
                        category={`0${idx + 1}. ${service.category}`}
                      />

                      <div className="space-y-1.5">
                        <div className="text-xs text-slate-500">
                          Formats: {service.allowedFormats} · {service.turnaroundDays}-day turnaround
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{service.name}</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {service.description}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs text-slate-500">Student Rate</div>
                        <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                          ₹{service.pricing.basePriceInr}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            {service.pricing.unitLabel}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOrderServiceId(service.id);
                          setActivePage('create-order');
                        }}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap"
                      >
                        Order This Service
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* =====================================================================
            PAGE 2: DEDICATED PRICING PAGE WITH LIVE CALCULATOR
           ===================================================================== */}
        {activePage === 'pricing' && (
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <div className="text-xs font-semibold text-indigo-600 mb-1">
                  Transparent Student Rate Card · Sample Placeholder Rates
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Academic Service Pricing &amp; Fee Schedule
                </h1>
              </div>
              {currentUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setActivePage('admin')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-50 whitespace-nowrap self-start"
                >
                  Edit Prices in Admin Console
                </button>
              )}
            </div>

            {/* Pricing Matrix Table */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-4">Service Category</th>
                    <th className="py-3.5 px-4">Supported Formats</th>
                    <th className="py-3.5 px-4">Billing Basis</th>
                    <th className="py-3.5 px-4 text-right">Base Rate (INR)</th>
                    <th className="py-3.5 px-4 text-right">Handwritten Add-on</th>
                    <th className="py-3.5 px-4 text-right">Urgent (&lt;48h)</th>
                    <th className="py-3.5 px-4 text-right">Std. Turnaround</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-indigo-50/30">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500">{s.category}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {s.allowedFormats}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {s.pricing.unitLabel}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-indigo-950">
                        ₹{s.pricing.basePriceInr}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                        {s.pricing.handwrittenSurchargeInr > 0
                          ? `+₹${s.pricing.handwrittenSurchargeInr}/${s.pricing.unitLabel.replace('per ', '')}`
                          : 'Included / N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-amber-700 font-medium">
                        +{s.pricing.urgentMultiplierPercent}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                        {s.turnaroundDays} days
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setOrderServiceId(s.id);
                            setActivePage('create-order');
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Interactive Price Estimator & Fee Disclosure */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs">
                <h2 className="text-base font-bold text-slate-900">
                  Interactive Pre-Order Cost Estimator
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Service Category
                    </label>
                    <select
                      value={calcServiceId}
                      onChange={(e) => setCalcServiceId(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (₹{s.pricing.basePriceInr} {s.pricing.unitLabel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantity ({selectedCalcService?.pricing.unitLabel || 'units'})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      disabled={selectedCalcService?.pricing.unitType === 'fixed_project'}
                      value={
                        selectedCalcService?.pricing.unitType === 'fixed_project'
                          ? 1
                          : calcQuantity
                      }
                      onChange={(e) => setCalcQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preferred Format
                    </label>
                    <select
                      value={calcFormat}
                      onChange={(e) => setCalcFormat(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Digital">Digital PDF / Typeset</option>
                      <option value="Handwritten">Neat Handwritten Sheets</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Delivery Method
                    </label>
                    <select
                      value={calcDelivery}
                      onChange={(e) => setCalcDelivery(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Digital Download">Digital Download (₹0 Delivery)</option>
                      <option value="Campus Courier Delivery">
                        Campus Courier Delivery (+₹
                        {selectedCalcService?.pricing.physicalDeliveryFeeInr || 120})
                      </option>
                      <option value="Standard Post">
                        India Speed Post (+₹
                        {selectedCalcService?.pricing.physicalDeliveryFeeInr || 120})
                      </option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calcUrgent}
                    onChange={(e) => setCalcUrgent(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span>
                    Express / Urgent Deadline within 48 hours (+
                    {selectedCalcService?.pricing.urgentMultiplierPercent || 25}% priority surcharge)
                  </span>
                </label>
              </div>

              <div className="lg:col-span-5 rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white p-6 space-y-4 shadow-2xs">
                <div className="text-xs font-semibold text-indigo-600">
                  Estimated Price Breakdown
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedCalcService?.name}
                </h3>
                <div className="space-y-2 text-sm border-t border-indigo-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Academic Preparation Subtotal</span>
                    <span className="font-mono tabular-nums">
                      ₹{liveCalcPrice.subtotalInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Physical Courier / Delivery Charges</span>
                    <span className="font-mono tabular-nums">
                      ₹{liveCalcPrice.deliveryFeeInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Platform &amp; Document Archival Fee</span>
                    <span className="font-mono tabular-nums">
                      ₹{liveCalcPrice.platformFeeInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-indigo-200 pt-3 text-base font-bold text-indigo-950">
                    <span>Estimated Total Payable</span>
                    <span className="font-mono tabular-nums text-xl">
                      ₹{liveCalcPrice.totalAmountInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>Fee Disclosure:</strong> Digital PDF downloads carry ₹0 shipping fee.
                  Physical courier delivery of original A4 handwritten bundles incurs a flat ₹120–₹140
                  campus courier charge plus a ₹15 platform processing fee.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedCalcService) setOrderServiceId(selectedCalcService.id);
                    setOrderQuantity(calcQuantity);
                    setOrderFormat(calcFormat);
                    setOrderDeliveryMethod(calcDelivery);
                    setActivePage('create-order');
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                >
                  Proceed to Order Form with This Estimate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            PAGE 3: ORDER PLACEMENT SYSTEM WITH DYNAMIC CALCULATOR & SUMMARY
           ===================================================================== */}
        {activePage === 'create-order' && (
          <div className="space-y-8">
            <div className="border-b border-slate-200 pb-5">
              <div className="text-xs font-semibold text-indigo-600 mb-1">
                Step-by-Step Academic Order Specification
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                Create a Study Notes or Academic Writing Order
              </h1>
            </div>

            {orderFormError && (
              <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-xs font-medium text-red-700">
                {orderFormError}
              </div>
            )}

            <form
              onSubmit={handleCreateOrderSubmit}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left 7 Columns: Order Form Fields */}
              <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-6 shadow-2xs">
                {/* Student Profile Prefilled Section */}
                <div>
                  <h2 className="text-sm font-bold text-indigo-950 border-b border-slate-200 pb-2 mb-4">
                    01. Student &amp; Institution Details (Prefilled from Profile)
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Student Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={orderStudentName}
                        onChange={(e) => setOrderStudentName(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        College / University *
                      </label>
                      <input
                        type="text"
                        required
                        value={orderCollegeName}
                        onChange={(e) => setOrderCollegeName(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        College ID Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={orderCollegeIdNumber}
                        onChange={(e) => setOrderCollegeIdNumber(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Course & Subject Details */}
                <div>
                  <h2 className="text-sm font-bold text-indigo-950 border-b border-slate-200 pb-2 mb-4">
                    02. Subject, Syllabus &amp; Service Selection
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Type of Notes or Service Required *
                      </label>
                      <select
                        value={orderServiceId}
                        onChange={(e) => setOrderServiceId(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                      >
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (₹{s.pricing.basePriceInr} {s.pricing.unitLabel})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Course or Degree *
                      </label>
                      <input
                        type="text"
                        required
                        value={orderCourseDegree}
                        onChange={(e) => setOrderCourseDegree(e.target.value)}
                        placeholder="e.g. B.Tech Computer Science / B.Sc Physics"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Semester and Year *
                      </label>
                      <input
                        type="text"
                        required
                        value={orderSemesterYear}
                        onChange={(e) => setOrderSemesterYear(e.target.value)}
                        placeholder="e.g. Semester 4 · 2nd Year"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subject Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={orderSubject}
                        onChange={(e) => setOrderSubject(e.target.value)}
                        placeholder="e.g. Operating Systems / Organic Chemistry"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Chapter or Topic Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={orderChapterTopic}
                        onChange={(e) => setOrderChapterTopic(e.target.value)}
                        placeholder="e.g. Process Synchronization, Deadlocks & Paging"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Format, Quantity, Language & Delivery */}
                <div>
                  <h2 className="text-sm font-bold text-indigo-950 border-b border-slate-200 pb-2 mb-4">
                    03. Quantity, Format, Deadline &amp; Delivery
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Quantity ({selectedOrderService?.pricing.unitLabel || 'pages'}) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={1000}
                        disabled={selectedOrderService?.pricing.unitType === 'fixed_project'}
                        value={
                          selectedOrderService?.pricing.unitType === 'fixed_project'
                            ? 1
                            : orderQuantity
                        }
                        onChange={(e) => setOrderQuantity(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Preferred Format *
                      </label>
                      <select
                        value={orderFormat}
                        onChange={(e) => setOrderFormat(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                      >
                        {selectedOrderService?.allowedFormats.includes('Handwritten') && (
                          <option value="Handwritten">Handwritten Notes</option>
                        )}
                        {selectedOrderService?.allowedFormats.includes('Digital') && (
                          <option value="Digital">Digital PDF</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Language Preference *
                      </label>
                      <select
                        value={orderLanguage}
                        onChange={(e) => setOrderLanguage(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Bilingual (English + Hindi)">
                          Bilingual (English + Hindi)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Required Deadline *
                      </label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={orderDeadline}
                        onChange={(e) => setOrderDeadline(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Delivery Method *
                      </label>
                      <select
                        value={orderDeliveryMethod}
                        onChange={(e) => setOrderDeliveryMethod(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Digital Download">
                          Digital PDF Download in Portal (₹0 Delivery)
                        </option>
                        <option value="Campus Courier Delivery">
                          Physical Campus / Hostel Courier (+₹
                          {selectedOrderService?.pricing.physicalDeliveryFeeInr || 120})
                        </option>
                        <option value="Standard Post">
                          India Speed Post Physical Parcel (+₹
                          {selectedOrderService?.pricing.physicalDeliveryFeeInr || 120})
                        </option>
                      </select>
                    </div>

                    {orderDeliveryMethod !== 'Digital Download' && (
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Hostel / Campus Physical Delivery Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={orderDeliveryAddress}
                          onChange={(e) => setOrderDeliveryAddress(e.target.value)}
                          placeholder="Room No, Hostel Name, Campus Gate, City & PIN Code"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions & Reference Upload */}
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-indigo-950 border-b border-slate-200 pb-2">
                    04. Detailed Instructions &amp; Syllabus Reference Upload
                  </h2>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Detailed Instructions (Formatting, Diagrams, Heading Style, etc.) *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={orderInstructions}
                      onChange={(e) => setOrderInstructions(e.target.value)}
                      placeholder="Specify key subtopics, textbook references, whether you prefer ruled or unruled A4 sheets, diagram labels, or formatting guidelines..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reference Files Upload (Optional — Syllabus PDF, Lecture Slides, Rough Drafts)
                    </label>
                    <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-indigo-300 p-4 text-xs text-indigo-900 hover:border-indigo-600 cursor-pointer bg-indigo-50/40">
                      <Upload className="w-4 h-4 text-indigo-600" />
                      <span>
                        Click to attach reference files (PDF, PNG, JPG, TXT, DOCX · Max 4MB)
                      </span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
                        onChange={handleReferenceFileSelect}
                        className="hidden"
                      />
                    </label>

                    {orderFiles.length > 0 && (
                      <div className="mt-2 space-y-1 text-xs">
                        {orderFiles.map((f, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200"
                          >
                            <span className="font-mono truncate">{f.fileName}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setOrderFiles(orderFiles.filter((_, idx) => idx !== i))
                              }
                              className="text-red-700 hover:underline ml-2"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Pre-Checkout Order Summary & Price Calculator */}
              <div className="lg:col-span-5 rounded-xl border border-indigo-200 bg-white p-6 space-y-5 sticky top-20 shadow-xs">
                {selectedOrderService && (
                  <ServiceCategoryBanner
                    slug={selectedOrderService.slug}
                    category={selectedOrderService.category}
                  />
                )}

                <div className="border-b border-slate-200 pb-3">
                  <div className="text-xs font-semibold text-indigo-600">
                    Dynamic Price Calculator &amp; Pre-Checkout Summary
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                    Order Summary
                  </h2>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Service</span>
                    <span className="font-semibold text-slate-900">
                      {selectedOrderService?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subject &amp; Topic</span>
                    <span className="font-medium text-slate-900 text-right max-w-[220px] truncate">
                      {orderSubject || 'Not specified'} — {orderChapterTopic || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Format &amp; Volume</span>
                    <span className="font-mono text-slate-900">
                      {orderFormat} · {liveOrderPrice.quantity}{' '}
                      {selectedOrderService?.pricing.unitLabel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated Delivery Date</span>
                    <span className="font-mono font-semibold text-indigo-700">
                      {orderDeadline}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery Method</span>
                    <span className="text-slate-900">{orderDeliveryMethod}</span>
                  </div>
                  {orderInstructions && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500 block mb-1">Instructions Preview:</span>
                      <p className="text-slate-700 line-clamp-2 italic">
                        &ldquo;{orderInstructions}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">
                      Base + Format Rate (₹{liveOrderPrice.baseUnitCost} × {liveOrderPrice.quantity})
                    </span>
                    <span className="font-mono tabular-nums">
                      ₹
                      {(liveOrderPrice.baseUnitCost * liveOrderPrice.quantity).toLocaleString(
                        'en-IN'
                      )}
                    </span>
                  </div>

                  {liveOrderPrice.isUrgent && (
                    <div className="flex justify-between text-xs text-amber-800 font-medium">
                      <span>Urgent &lt;48h Priority Surcharge</span>
                      <span className="font-mono tabular-nums">
                        +₹{liveOrderPrice.urgentFeeInr.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Delivery / Courier Charge</span>
                    <span className="font-mono tabular-nums">
                      ₹{liveOrderPrice.deliveryFeeInr.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Platform Handling Fee</span>
                    <span className="font-mono tabular-nums">
                      ₹{liveOrderPrice.platformFeeInr.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-slate-200 pt-3">
                    <span className="font-bold text-slate-900">Total Payable Amount</span>
                    <span className="text-2xl font-bold font-mono tabular-nums text-indigo-950">
                      ₹{liveOrderPrice.totalAmountInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <label className="flex items-start gap-2 text-xs text-slate-700 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={orderIntegrityAccepted}
                    onChange={(e) => setOrderIntegrityAccepted(e.target.checked)}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <span>
                    I confirm this order is for study notes, revision summaries, or permitted
                    formatting and does not violate my institution&apos;s academic integrity policy.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={orderSubmitting}
                  className="w-full py-3 px-4 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>
                    {orderSubmitting
                      ? 'Confirming Order...'
                      : `Confirm Order & Proceed to UPI Payment (₹${liveOrderPrice.totalAmountInr.toLocaleString('en-IN')})`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =====================================================================
            PAGE 4: MY ORDERS PAGE (TRACKING, RECEIPTS & DELIVERABLE DOWNLOADS)
           ===================================================================== */}
        {activePage === 'my-orders' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="text-xs font-semibold text-indigo-600 mb-1">
                  Order Tracking, Receipts &amp; Digital Deliverables
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  My Academic Orders ({myOrders.length})
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('create-order')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 self-start whitespace-nowrap shadow-xs"
              >
                + Place New Order
              </button>
            </div>

            {loadingData ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Loading your orders from PostgreSQL...
              </div>
            ) : myOrders.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3">
                <div className="text-base font-bold text-slate-900">
                  You have not placed any study note orders yet.
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Select a service category from our catalog to calculate an instant estimate and
                  place your first academic order.
                </p>
                <button
                  type="button"
                  onClick={() => setActivePage('create-order')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Create Your First Order
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {myOrders.map((order) => {
                  const deliverables = (order.files || []).filter(
                    (f) => f.fileCategory === 'deliverable'
                  );
                  const references = (order.files || []).filter(
                    (f) => f.fileCategory === 'reference'
                  );
                  const capturedPayment = (order.payments || []).find(
                    (p) => p.status === 'captured' || p.verifiedByServer
                  );

                  return (
                    <div
                      key={order.id}
                      className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono font-bold text-indigo-700">
                              {order.orderNumber}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Ordered on {new Date(order.createdAt).toLocaleDateString('en-IN')}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Expected Completion:{' '}
                              <strong className="font-mono text-slate-900">
                                {order.expectedCompletionDate}
                              </strong>
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-slate-900 mt-1">
                            {order.serviceName} — {order.subject}
                          </h2>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Topic: <strong>{order.chapterTopic}</strong> ({order.courseDegree} ·{' '}
                            {order.semesterYear})
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                            ₹{order.totalAmountInr.toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs text-slate-600">
                            Payment:{' '}
                            <strong
                              className={
                                order.paymentStatus === 'Paid'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }
                            >
                              {order.paymentStatus}
                            </strong>{' '}
                            · Order Status:{' '}
                            <strong className="text-indigo-950">{order.orderStatus}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
                        <div>
                          <span className="text-slate-500 block">Format &amp; Quantity</span>
                          <span>
                            {order.preferredFormat} · {order.quantity}{' '}
                            {order.unitType.replace(/_/g, ' ')} · {order.languagePreference}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Delivery Method</span>
                          <span>{order.deliveryMethod}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Staff Updates / Notes</span>
                          <span>
                            {order.adminNotes ||
                              'Order logged in queue. Updates will appear here as our academic team progresses.'}
                          </span>
                        </div>
                      </div>

                      {/* Deliverables & Reference Files */}
                      <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {deliverables.length > 0 ? (
                            deliverables.map((file) => (
                              <button
                                key={file.id}
                                type="button"
                                onClick={() => handleDownloadPrivateFile(file.id)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Completed Work: {file.fileName}</span>
                              </button>
                            ))
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-500">
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                              <span>
                                Completed digital work download link will appear here once marked
                                Completed.
                              </span>
                            </span>
                          )}

                          {references.map((ref) => (
                            <button
                              key={ref.id}
                              type="button"
                              onClick={() => handleDownloadPrivateFile(ref.id)}
                              className="inline-flex items-center gap-1 text-indigo-700 underline hover:text-indigo-900"
                            >
                              <Download className="w-3 h-3" />
                              <span>Ref: {ref.fileName}</span>
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          {capturedPayment && (
                            <div className="text-xs font-mono text-emerald-700 font-medium flex items-center gap-1.5 mr-2">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Receipt: {capturedPayment.receiptNumber}</span>
                            </div>
                          )}

                          {order.paymentStatus === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => setActivePaymentOrder(order)}
                              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
                            >
                              Pay Now via UPI (₹{order.totalAmountInr.toLocaleString('en-IN')})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            PAGE 5: USER PROFILE & COLLEGE ID VERIFICATION STATUS
           ===================================================================== */}
        {activePage === 'profile' && (
          <div className="max-w-3xl space-y-8">
            <div className="border-b border-slate-200 pb-5">
              <div className="text-xs font-semibold text-indigo-600 mb-1">
                Account Credentials &amp; College ID Verification
              </div>
              <h1 className="text-2xl font-bold text-slate-900">My Student Profile</h1>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-indigo-700">
                  College ID Verification Status
                </div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {currentUser.collegeIdStatus} —{' '}
                  <span className="font-mono text-indigo-950">{currentUser.collegeIdNumber}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Submitted College IDs are reviewed by our administrative team to prevent
                  unauthorized institutional impersonation.
                </p>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleSwitchRole(currentUser.role === 'admin' ? 'student' : 'admin')
                  }
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-indigo-300 bg-white text-indigo-950 hover:bg-indigo-100/60 whitespace-nowrap"
                >
                  Current Role: {currentUser.role.toUpperCase()} (Click to Toggle)
                </button>
              </div>
            </div>

            {profMessage && (
              <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-medium text-emerald-900">
                {profMessage}
              </div>
            )}

            <form
              onSubmit={handleUpdateProfileSubmit}
              className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profFullName}
                    onChange={(e) => setProfFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Email (Read-only)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-100 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={profPhone}
                    onChange={(e) => setProfPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College ID / Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={profCollegeIdNumber}
                    onChange={(e) => setProfCollegeIdNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College or University Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profCollegeName}
                    onChange={(e) => setProfCollegeName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-red-700 hover:bg-red-50"
                >
                  Log Out of Account
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =====================================================================
            PAGE 6: HELP, CUSTOMER SUPPORT & POLICIES
           ===================================================================== */}
        {activePage === 'help' && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs">
                <h2 className="text-lg font-bold text-slate-900">
                  Submit a Student Support Request
                </h2>
                <p className="text-xs text-slate-600">
                  Need help with an order deadline, formatting specification, or UPI payment
                  receipt? Open a support ticket below.
                </p>

                {supFeedback && (
                  <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-medium text-emerald-900">
                    {supFeedback}
                  </div>
                )}

                <form onSubmit={handleSupportSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category
                      </label>
                      <select
                        value={supCategory}
                        onChange={(e) => setSupCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Order Inquiry">Order Inquiry</option>
                        <option value="Payment / UPI Issue">Payment / UPI Issue</option>
                        <option value="College ID Verification">College ID Verification</option>
                        <option value="Formatting Revision">Formatting Revision</option>
                        <option value="Refund Request">Refund Request</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Related Order (Optional)
                      </label>
                      <select
                        value={supOrderId}
                        onChange={(e) => setSupOrderId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="">None / General Inquiry</option>
                        {myOrders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber} — {o.subject}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      required
                      value={supSubject}
                      onChange={(e) => setSupSubject(e.target.value)}
                      placeholder="Brief summary of your question"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Message *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={supMessage}
                      onChange={(e) => setSupMessage(e.target.value)}
                      placeholder="Describe how our team can help..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Submit Support Request
                  </button>
                </form>
              </div>

              <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs">
                <h2 className="text-lg font-bold text-slate-900">
                  My Support Tickets ({myTickets.length})
                </h2>
                {myTickets.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6">
                    You have no support requests on file.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myTickets.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-lg border border-slate-200 p-4 space-y-1.5 text-xs"
                      >
                        <div className="flex justify-between text-slate-500">
                          <span className="font-mono font-semibold text-indigo-700">
                            {t.ticketNumber} · {t.category}
                          </span>
                          <span className="font-semibold text-slate-900">{t.status}</span>
                        </div>
                        <div className="font-bold text-slate-900">{t.subject}</div>
                        <p className="text-slate-600">{t.message}</p>
                        {t.adminResponse && (
                          <div className="mt-2 pt-2 border-t border-slate-200 text-emerald-900">
                            <strong>Admin Response:</strong> {t.adminResponse}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <PoliciesAndGuide
              businessDetails={businessDetails}
              isAdmin={currentUser.role === 'admin'}
              onUpdateBusinessDetails={setBusinessDetails}
            />
          </div>
        )}

        {/* =====================================================================
            PAGE 7: POLICIES & BEGINNER DEVELOPER GUIDE
           ===================================================================== */}
        {activePage === 'policies' && (
          <PoliciesAndGuide
            businessDetails={businessDetails}
            isAdmin={currentUser.role === 'admin'}
            onUpdateBusinessDetails={setBusinessDetails}
            initialSection="guide"
          />
        )}

        {/* =====================================================================
            PAGE 8: ADMINISTRATOR RBAC DASHBOARD
           ===================================================================== */}
        {activePage === 'admin' && (
          <AdminDashboard
            authToken={authToken}
            services={services}
            onRefreshPublicData={fetchPublicData}
            onDownloadFile={handleDownloadPrivateFile}
          />
        )}
      </main>

      {/* Payment Modal */}
      {activePaymentOrder && (
        <PaymentModal
          order={activePaymentOrder}
          authToken={authToken}
          onClose={() => setActivePaymentOrder(null)}
          onPaymentCompleted={() => {
            fetchUserPortalData(authToken);
          }}
        />
      )}

      {/* Clean Minimalist Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} {businessDetails.companyName} · Permitted Academic Study
            Notes &amp; Writing Support
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setActivePage('help')}
              className="hover:text-indigo-600 underline"
            >
              Privacy, Refund &amp; Academic Integrity Policies
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActivePage('policies')}
              className="hover:text-indigo-600 underline"
            >
              Beginner Setup &amp; Deployment Guide
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
