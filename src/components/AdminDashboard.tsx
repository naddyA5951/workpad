import React, { useState, useEffect } from 'react';
import {
  OrderRecord,
  ServiceWithPricing,
  UserProfile,
  PaymentRecord,
  SupportTicket,
} from '../types.ts';
import {
  Search,
  Upload,
  Check,
  X,
  RefreshCw,
  FileText,
  Download,
} from 'lucide-react';

interface AdminDashboardProps {
  authToken: string;
  services: ServiceWithPricing[];
  onRefreshPublicData: () => void;
  onDownloadFile: (fileId: number) => void;
}

const ORDER_STATUSES = [
  'Pending Payment',
  'Payment Verification',
  'Confirmed',
  'In Progress',
  'Ready for Delivery',
  'Completed',
  'Cancelled',
  'Refund Pending',
  'Refunded',
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  authToken,
  services,
  onRefreshPublicData,
  onDownloadFile,
}) => {
  const [activeTab, setActiveTab] = useState<
    'orders' | 'college-ids' | 'pricing' | 'payments' | 'support'
  >('orders');

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [usersList, setUsersList] = useState<
    Array<UserProfile & { collegeIdReviewNotes?: string; createdAt?: string }>
  >([]);
  const [paymentsData, setPaymentsData] = useState<{
    payments: PaymentRecord[];
    webhookEvents: Array<{
      id: number;
      eventId: string;
      eventType: string;
      razorpayOrderId: string;
      razorpayPaymentId?: string;
      signatureVerified: boolean;
      processedAt: string;
    }>;
  }>({ payments: [], webhookEvents: [] });
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters for Orders
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Pricing Edit Local State
  const [pricingDrafts, setPricingDrafts] = useState<
    Record<
      number,
      {
        basePriceInr: number;
        handwrittenSurchargeInr: number;
        urgentMultiplierPercent: number;
        physicalDeliveryFeeInr: number;
        platformFeeInr: number;
        turnaroundDays: number;
      }
    >
  >({});

  // Refund Modal/Inline State
  const [refundingPaymentId, setRefundingPaymentId] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // Support Response Drafts
  const [supportDrafts, setSupportDrafts] = useState<
    Record<number, { status: string; adminResponse: string }>
  >({});

  const fetchAdminData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const [ordRes, usrRes, payRes, supRes] = await Promise.all([
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/payments', { headers }),
        fetch('/api/admin/support', { headers }),
      ]);

      if (!ordRes.ok) {
        const err = await ordRes.json();
        throw new Error(err.error || 'Failed to load admin console data.');
      }

      const [ordJson, usrJson, payJson, supJson] = await Promise.all([
        ordRes.json(),
        usrRes.json(),
        payRes.json(),
        supRes.json(),
      ]);

      setOrders(ordJson);
      setUsersList(usrJson);
      setPaymentsData(payJson);
      setSupportTickets(supJson);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [authToken]);

  useEffect(() => {
    const initialDrafts: typeof pricingDrafts = {};
    for (const s of services) {
      initialDrafts[s.id] = {
        basePriceInr: s.pricing.basePriceInr,
        handwrittenSurchargeInr: s.pricing.handwrittenSurchargeInr,
        urgentMultiplierPercent: s.pricing.urgentMultiplierPercent,
        physicalDeliveryFeeInr: s.pricing.physicalDeliveryFeeInr,
        platformFeeInr: s.pricing.platformFeeInr,
        turnaroundDays: s.turnaroundDays,
      };
    }
    setPricingDrafts(initialDrafts);
  }, [services]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleUpdateOrder = async (
    orderId: number,
    updates: { orderStatus?: string; adminNotes?: string }
  ) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update order.');
      showToast(`Order #${orderId} updated.`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUploadDeliverable = async (
    orderId: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const resultStr = String(reader.result || '');
      const base64Content = resultStr.includes(',')
        ? resultStr.split(',')[1]
        : btoa(resultStr);

      try {
        const res = await fetch(`/api/admin/orders/${orderId}/deliverable`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || 'application/pdf',
            fileSizeBytes: file.size,
            fileContentBase64: base64Content,
          }),
        });
        if (!res.ok) throw new Error('Failed to upload completed deliverable.');
        showToast(`Deliverable "${file.name}" uploaded & order marked Completed.`);
        fetchAdminData();
      } catch (err: any) {
        setErrorMsg(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateSampleDeliverable = async (order: OrderRecord) => {
    const sampleText = [
      `NOTECRAFT ACADEMIC — COMPLETED STUDY DELIVERABLE`,
      `=================================================`,
      `Order Number : ${order.orderNumber}`,
      `Student Name : ${order.studentName} (${order.collegeName})`,
      `Service      : ${order.serviceName} (${order.preferredFormat})`,
      `Subject      : ${order.subject} (${order.courseDegree} - ${order.semesterYear})`,
      `Topic        : ${order.chapterTopic}`,
      `Completed On : ${new Date().toISOString().split('T')[0]}`,
      ``,
      `1. EXECUTIVE SUMMARY & CORE CONCEPTS`,
      `-------------------------------------------------`,
      `This structured study guide covers ${order.chapterTopic} in ${order.subject}.`,
      `Prepared strictly in accordance with your instructions: "${order.detailedInstructions}"`,
      ``,
      `2. KEY DEFINITIONS & EXAM REVISION CHECKLIST`,
      `-------------------------------------------------`,
      `- Core theoretical foundations and step-by-step derivations.`,
      `- Worked examples and standard terminology aligned with university syllabus.`,
      `- Summary table of formulas and key reference takeaways.`,
    ].join('\n');

    const base64Content = btoa(unescape(encodeURIComponent(sampleText)));

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/deliverable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fileName: `${order.orderNumber}_${order.subject.replace(/[^a-zA-Z0-9]/g, '_')}_Notes.txt`,
          mimeType: 'text/plain',
          fileSizeBytes: sampleText.length,
          fileContentBase64: base64Content,
        }),
      });
      if (!res.ok) throw new Error('Failed to attach sample deliverable.');
      showToast(`Completed study notes attached to ${order.orderNumber}.`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleReviewCollegeId = async (
    userId: number,
    status: 'Verified' | 'Rejected',
    notes: string
  ) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status, reviewNotes: notes }),
      });
      if (!res.ok) throw new Error('Failed to update College ID status.');
      showToast(`Student College ID marked as ${status}.`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSavePricing = async (serviceId: number) => {
    const draft = pricingDrafts[serviceId];
    if (!draft) return;

    try {
      const res = await fetch(`/api/admin/pricing/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error('Failed to update service pricing.');
      showToast('Service pricing updated in PostgreSQL.');
      onRefreshPublicData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleVerifyManualPayment = async (payment: PaymentRecord) => {
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/verify-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orderId: payment.orderId,
          utrNumber: payment.manualUtrNumber,
        }),
      });
      if (!res.ok) throw new Error('Failed to verify manual UTR payment.');
      showToast(`Manual payment ${payment.receiptNumber} verified and Order marked Confirmed.`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleProcessRefund = async (paymentId: number) => {
    if (!refundReason.trim()) return;
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ reason: refundReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed.');
      showToast(`Refund processed for payment #${paymentId}.`);
      setRefundingPaymentId(null);
      setRefundReason('');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateTicket = async (ticketId: number) => {
    const draft = supportDrafts[ticketId];
    if (!draft) return;
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error('Failed to update support ticket.');
      showToast(`Support ticket #${ticketId} updated.`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'All' || o.orderStatus === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesStatus;
    return (
      matchesStatus &&
      (o.orderNumber.toLowerCase().includes(q) ||
        o.studentName.toLowerCase().includes(q) ||
        o.collegeName.toLowerCase().includes(q) ||
        o.subject.toLowerCase().includes(q) ||
        o.chapterTopic.toLowerCase().includes(q))
    );
  });

  // Sales & Order Metrics
  const totalRevenueInr = orders
    .filter((o) => o.paymentStatus === 'Paid')
    .reduce((acc, o) => acc + o.totalAmountInr, 0);
  const completedOrdersCount = orders.filter((o) => o.orderStatus === 'Completed').length;
  const pendingIdReviewsCount = usersList.filter(
    (u) => u.collegeIdStatus === 'Pending Review'
  ).length;
  const openTicketsCount = supportTickets.filter((t) => t.status === 'Open').length;

  return (
    <div className="space-y-8">
      {/* Header & KPI Summary Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <div className="text-xs text-neutral-500 mb-1">
            Server-Enforced RBAC · Administrator Console
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Operations, Pricing & Verification Console
          </h1>
        </div>
        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-50 self-start md:self-auto whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-neutral-200 p-4 bg-white">
          <div className="text-xs text-neutral-500">Verified Revenue (Paid)</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-1">
            ₹{totalRevenueInr.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Across {orders.filter((o) => o.paymentStatus === 'Paid').length} paid orders
          </div>
        </div>

        <div className="border border-neutral-200 p-4 bg-white">
          <div className="text-xs text-neutral-500">Total Academic Orders</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-1">
            {orders.length}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {completedOrdersCount} completed · {orders.length - completedOrdersCount} active
          </div>
        </div>

        <div className="border border-neutral-200 p-4 bg-white">
          <div className="text-xs text-neutral-500">College ID Reviews Pending</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-1">
            {pendingIdReviewsCount}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {usersList.length} total registered accounts
          </div>
        </div>

        <div className="border border-neutral-200 p-4 bg-white">
          <div className="text-xs text-neutral-500">Open Support Tickets</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-1">
            {openTicketsCount}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {supportTickets.length} total inquiries logged
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 border border-neutral-900 bg-neutral-50 text-xs font-medium text-neutral-900">
          {feedbackMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 border border-red-300 bg-red-50/50 text-xs font-medium text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Segmented Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-100 border border-neutral-200">
        {[
          { id: 'orders', label: `All Orders (${orders.length})` },
          { id: 'college-ids', label: `College ID Verification (${usersList.length})` },
          { id: 'pricing', label: `Manage Services & Pricing (${services.length})` },
          { id: 'payments', label: `Payments & Webhooks (${paymentsData.payments.length})` },
          { id: 'support', label: `Support Requests (${supportTickets.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-neutral-900 border border-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ALL ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID, student name, college, or subject..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 focus:border-neutral-900 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-neutral-300 bg-white focus:border-neutral-900 focus:outline-none"
            >
              <option value="All">All Order Statuses</option>
              {ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="border border-neutral-200 p-8 text-center text-sm text-neutral-500">
              No matching academic orders found.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border border-neutral-200 bg-white p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                        <span className="font-mono font-semibold text-neutral-900">
                          {order.orderNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                        <span aria-hidden="true">·</span>
                        <span>Payment: {order.paymentStatus}</span>
                        <span aria-hidden="true">·</span>
                        <span>College ID: {order.collegeIdVerificationStatus}</span>
                      </div>
                      <h3 className="text-base font-bold text-neutral-900 mt-1">
                        {order.serviceName} — {order.subject} ({order.chapterTopic})
                      </h3>
                      <div className="text-xs text-neutral-600 mt-0.5">
                        Student: <strong>{order.studentName}</strong> ({order.collegeName} · ID:{' '}
                        <span className="font-mono">{order.collegeIdNumber}</span>)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold font-mono tabular-nums text-neutral-900">
                        ₹{order.totalAmountInr.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-neutral-500">
                        Deadline: <span className="font-mono">{order.deadline}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-700">
                    <div>
                      <span className="text-neutral-500 block">Academic Specification</span>
                      <span>
                        {order.courseDegree} · {order.semesterYear} · {order.preferredFormat} (
                        {order.quantity} {order.unitType.replace(/_/g, ' ')}) ·{' '}
                        {order.languagePreference}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Delivery Method</span>
                      <span>
                        {order.deliveryMethod}
                        {order.deliveryAddress ? ` — ${order.deliveryAddress}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Student Instructions</span>
                      <span>{order.detailedInstructions}</span>
                    </div>
                  </div>

                  {/* Admin Controls: Update Order Status & Upload Deliverables */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="text-xs font-semibold text-neutral-700">
                        Order Status:
                      </label>
                      <select
                        value={order.orderStatus}
                        onChange={(e) =>
                          handleUpdateOrder(order.id, { orderStatus: e.target.value })
                        }
                        className="px-3 py-1.5 text-xs font-medium border border-neutral-300 bg-white focus:border-neutral-900 focus:outline-none"
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        defaultValue={order.adminNotes || ''}
                        placeholder="Add status update note for student..."
                        onBlur={(e) => {
                          if (e.target.value !== (order.adminNotes || '')) {
                            handleUpdateOrder(order.id, { adminNotes: e.target.value });
                          }
                        }}
                        className="px-3 py-1.5 text-xs border border-neutral-300 w-64 focus:border-neutral-900 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateSampleDeliverable(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-50 whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Generate & Attach Study Notes</span>
                      </button>

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Deliverable File</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt,.png,.jpg"
                          onChange={(e) => handleUploadDeliverable(order.id, e)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Attached Files */}
                  {order.files && order.files.length > 0 && (
                    <div className="border-t border-neutral-200 pt-3 flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-neutral-500 font-medium">Order Files:</span>
                      {order.files.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onDownloadFile(f.id)}
                          className="inline-flex items-center gap-1 text-neutral-900 underline hover:text-neutral-600"
                        >
                          <Download className="w-3 h-3" />
                          <span>
                            [{f.fileCategory.toUpperCase()}] {f.fileName}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COLLEGE ID VERIFICATION */}
      {activeTab === 'college-ids' && (
        <div className="border border-neutral-200 bg-white overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                <th className="py-3 px-4">Student Name & Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">College / University</th>
                <th className="py-3 px-4">College ID Number</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4 text-right">Admin Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50/70">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-neutral-900">{u.fullName}</div>
                    <div className="text-xs text-neutral-500">{u.email}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-neutral-700">{u.phone}</td>
                  <td className="py-3 px-4 text-xs text-neutral-800">{u.collegeName}</td>
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-neutral-900">
                    {u.collegeIdNumber}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span
                      className={`font-semibold ${
                        u.collegeIdStatus === 'Verified'
                          ? 'text-emerald-700'
                          : u.collegeIdStatus === 'Rejected'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {u.collegeIdStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        handleReviewCollegeId(
                          u.id,
                          'Verified',
                          'College ID verified by academic staff.'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-neutral-300 text-neutral-900 hover:bg-neutral-100"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Approve ID</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleReviewCollegeId(
                          u.id,
                          'Rejected',
                          'College ID number format could not be verified. Please update in Profile.'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-neutral-300 text-red-700 hover:bg-red-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: MANAGE SERVICES & PRICING */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Update base rates, handwritten surcharges, urgent deadline multipliers, and delivery
            fees below. Changes save directly to PostgreSQL and immediately update the Pricing Page
            and Live Order Calculator.
          </p>
          <div className="grid grid-cols-1 gap-4">
            {services.map((service) => {
              const draft = pricingDrafts[service.id] || {
                basePriceInr: service.pricing.basePriceInr,
                handwrittenSurchargeInr: service.pricing.handwrittenSurchargeInr,
                urgentMultiplierPercent: service.pricing.urgentMultiplierPercent,
                physicalDeliveryFeeInr: service.pricing.physicalDeliveryFeeInr,
                platformFeeInr: service.pricing.platformFeeInr,
                turnaroundDays: service.turnaroundDays,
              };

              return (
                <div
                  key={service.id}
                  className="border border-neutral-200 bg-white p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="max-w-md">
                    <div className="text-xs text-neutral-500">
                      {service.category} · Billing Unit: {service.pricing.unitLabel}
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 mt-0.5">
                      {service.name}
                    </h3>
                    <p className="text-xs text-neutral-600 mt-1">{service.description}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">
                        Base Price (₹)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={draft.basePriceInr}
                        onChange={(e) =>
                          setPricingDrafts({
                            ...pricingDrafts,
                            [service.id]: {
                              ...draft,
                              basePriceInr: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-sm font-mono border border-neutral-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">
                        Handwritten (+₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={draft.handwrittenSurchargeInr}
                        onChange={(e) =>
                          setPricingDrafts({
                            ...pricingDrafts,
                            [service.id]: {
                              ...draft,
                              handwrittenSurchargeInr: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-sm font-mono border border-neutral-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">
                        Urgent &lt;48h (+%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={draft.urgentMultiplierPercent}
                        onChange={(e) =>
                          setPricingDrafts({
                            ...pricingDrafts,
                            [service.id]: {
                              ...draft,
                              urgentMultiplierPercent: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-sm font-mono border border-neutral-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">
                        Courier Fee (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={draft.physicalDeliveryFeeInr}
                        onChange={(e) =>
                          setPricingDrafts({
                            ...pricingDrafts,
                            [service.id]: {
                              ...draft,
                              physicalDeliveryFeeInr: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-sm font-mono border border-neutral-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">
                        Turnaround (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={draft.turnaroundDays}
                        onChange={(e) =>
                          setPricingDrafts({
                            ...pricingDrafts,
                            [service.id]: {
                              ...draft,
                              turnaroundDays: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-sm font-mono border border-neutral-300"
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => handleSavePricing(service.id)}
                        className="w-full px-3 py-1.5 text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 whitespace-nowrap"
                      >
                        Save Price
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENTS, WEBHOOKS & REFUNDS */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="border border-neutral-200 bg-white overflow-x-auto">
            <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-800">
              Payment Ledger & Refund Management
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                  <th className="py-2.5 px-4">Receipt & Order</th>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Gateway & Reference</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {paymentsData.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-semibold text-neutral-900">{p.receiptNumber}</div>
                      <div className="text-neutral-500">{p.orderNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-900">{p.studentName}</div>
                      <div className="text-neutral-500">{p.studentEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div>{p.razorpayOrderId}</div>
                      {p.razorpayPaymentId && (
                        <div className="text-neutral-500">Pay ID: {p.razorpayPaymentId}</div>
                      )}
                      {p.manualUtrNumber && (
                        <div className="text-amber-700">Manual UTR: {p.manualUtrNumber}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-neutral-900">
                      ₹{p.amountInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-neutral-900">{p.status}</span>
                      {p.refundId && (
                        <div className="font-mono text-neutral-500">Refund: {p.refundId}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      {p.status === 'verification_pending' && (
                        <button
                          type="button"
                          onClick={() => handleVerifyManualPayment(p)}
                          className="px-2.5 py-1 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800"
                        >
                          Approve UTR
                        </button>
                      )}
                      {p.status === 'captured' && (
                        <button
                          type="button"
                          onClick={() => setRefundingPaymentId(p.id)}
                          className="px-2.5 py-1 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                        >
                          Issue Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {refundingPaymentId !== null && (
            <div className="border border-neutral-900 bg-neutral-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-medium text-neutral-900">
                Issue Razorpay Refund for Payment #{refundingPaymentId}:
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter reason for refund..."
                  className="px-3 py-1.5 text-xs border border-neutral-300 bg-white flex-1 sm:w-64"
                />
                <button
                  type="button"
                  onClick={() => handleProcessRefund(refundingPaymentId)}
                  className="px-3 py-1.5 text-xs font-semibold bg-neutral-900 text-white"
                >
                  Confirm Refund
                </button>
                <button
                  type="button"
                  onClick={() => setRefundingPaymentId(null)}
                  className="px-2.5 py-1.5 text-xs border border-neutral-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Idempotent Webhook Events Table */}
          <div className="border border-neutral-200 bg-white overflow-x-auto">
            <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-800">
              Verified Payment Webhook & Signature Events Log (Idempotency Table)
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                  <th className="py-2 px-4">Event ID</th>
                  <th className="py-2 px-4">Event Type</th>
                  <th className="py-2 px-4">Razorpay Order ID</th>
                  <th className="py-2 px-4">Signature Verified</th>
                  <th className="py-2 px-4">Processed Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs font-mono">
                {paymentsData.webhookEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-2.5 px-4">{ev.eventId}</td>
                    <td className="py-2.5 px-4">{ev.eventType}</td>
                    <td className="py-2.5 px-4">{ev.razorpayOrderId}</td>
                    <td className="py-2.5 px-4 text-emerald-700">
                      {ev.signatureVerified ? 'HMAC-SHA256 Verified' : 'No'}
                    </td>
                    <td className="py-2.5 px-4 text-neutral-500">
                      {new Date(ev.processedAt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CUSTOMER SUPPORT REQUESTS */}
      {activeTab === 'support' && (
        <div className="space-y-4">
          {supportTickets.length === 0 ? (
            <div className="border border-neutral-200 p-8 text-center text-sm text-neutral-500">
              No student support requests submitted yet.
            </div>
          ) : (
            supportTickets.map((t) => {
              const draft = supportDrafts[t.id] || {
                status: t.status,
                adminResponse: t.adminResponse || '',
              };
              return (
                <div key={t.id} className="border border-neutral-200 bg-white p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
                    <div className="text-xs text-neutral-500">
                      <span className="font-mono font-semibold text-neutral-900">
                        {t.ticketNumber}
                      </span>{' '}
                      · {t.category} · Student: {t.studentName} ({t.studentEmail})
                    </div>
                    <span className="text-xs font-semibold text-neutral-900">
                      Status: {t.status}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">{t.subject}</h4>
                    <p className="text-xs text-neutral-700 mt-1">{t.message}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                    <select
                      value={draft.status}
                      onChange={(e) =>
                        setSupportDrafts({
                          ...supportDrafts,
                          [t.id]: { ...draft, status: e.target.value },
                        })
                      }
                      className="px-3 py-1.5 text-xs border border-neutral-300 bg-white"
                    >
                      <option value="Open">Open</option>
                      <option value="In Review">In Review</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <input
                      type="text"
                      value={draft.adminResponse}
                      onChange={(e) =>
                        setSupportDrafts({
                          ...supportDrafts,
                          [t.id]: { ...draft, adminResponse: e.target.value },
                        })
                      }
                      placeholder="Write official response to student..."
                      className="flex-1 px-3 py-1.5 text-xs border border-neutral-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateTicket(t.id)}
                      className="px-4 py-1.5 text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 whitespace-nowrap"
                    >
                      Save Reply
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
