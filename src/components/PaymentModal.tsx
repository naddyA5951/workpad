import React, { useState, useEffect } from 'react';
import { OrderRecord, PaymentRecord } from '../types.ts';
import { CheckCircle2, AlertCircle, ShieldCheck, Printer, X, ArrowRight, Lock } from 'lucide-react';

interface PaymentModalProps {
  order: OrderRecord;
  authToken: string;
  onClose: () => void;
  onPaymentCompleted: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  order,
  authToken,
  onClose,
  onPaymentCompleted,
}) => {
  const [gatewayMode, setGatewayMode] = useState<'razorpay' | 'manual_upi'>('razorpay');
  const [loadingInit, setLoadingInit] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [paymentData, setPaymentData] = useState<{
    payment: PaymentRecord;
    razorpayConfig: {
      keyId: string;
      razorpayOrderId: string;
      amountPaise: number;
      amountInr: number;
      currency: string;
      orderNumber: string;
      studentName: string;
      studentEmail: string;
      studentPhone: string;
      testModeSimulation: {
        isTestMode: boolean;
        simulatedPaymentId: string;
        simulatedSignature: string;
      };
    };
  } | null>(null);

  const [upiVpa, setUpiVpa] = useState('student@okaxis');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');
  const [manualUtr, setManualUtr] = useState('');

  const [completedReceipt, setCompletedReceipt] = useState<{
    status: 'success' | 'manual_pending' | 'failed';
    payment?: PaymentRecord;
    message: string;
  } | null>(null);

  const initializePaymentOrder = async (mode: 'razorpay' | 'manual_upi') => {
    setLoadingInit(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ orderId: order.id, gateway: mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not initialize payment order on server.');
      }
      setPaymentData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize payment gateway.');
    } finally {
      setLoadingInit(false);
    }
  };

  useEffect(() => {
    initializePaymentOrder(gatewayMode);
  }, [gatewayMode]);

  // Verify Razorpay UPI payment using server-side HMAC-SHA256 verification
  const handleVerifyRazorpayUpi = async (tamperSignature = false) => {
    if (!paymentData) return;
    setProcessing(true);
    setErrorMsg(null);

    try {
      const { razorpayOrderId, testModeSimulation } = paymentData.razorpayConfig;
      const signatureToSend = tamperSignature
        ? 'tampered_invalid_signature_0000000000000000'
        : testModeSimulation.simulatedSignature;

      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: testModeSimulation.simulatedPaymentId,
          razorpay_signature: signatureToSend,
          upi_vpa: upiVpa.trim() || `${selectedUpiApp}.user@upi`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCompletedReceipt({
          status: 'failed',
          message:
            data.error ||
            'Payment signature verification failed on the backend. Order was NOT marked paid.',
        });
        return;
      }

      setCompletedReceipt({
        status: 'success',
        payment: data.payment,
        message:
          'Razorpay HMAC-SHA256 signature verified by backend. Your order is now Confirmed.',
      });
      onPaymentCompleted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment verification request failed.');
    } finally {
      setProcessing(false);
    }
  };

  // Submit Manual UPI 12-digit UTR for admin review
  const handleManualUpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData) return;
    setProcessing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/payments/manual-upi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          razorpayOrderId: paymentData.razorpayConfig.razorpayOrderId,
          utrNumber: manualUtr,
          upiVpa: upiVpa,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit manual UTR.');
      }

      setCompletedReceipt({
        status: 'manual_pending',
        payment: data.payment,
        message: data.message,
      });
      onPaymentCompleted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not submit manual UPI reference.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white border border-neutral-200 p-6 md:p-8">
        <div className="flex items-start justify-between border-b border-neutral-200 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <span>UPI Payment Gateway</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{order.orderNumber}</span>
              <span aria-hidden="true">·</span>
              <span>Test Mode</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-900">
              Complete Academic Order Payment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 transition-colors"
            aria-label="Close payment window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt / Outcome Screen */}
        {completedReceipt ? (
          <div className="space-y-6">
            {completedReceipt.status === 'success' && (
              <div className="border border-neutral-200 bg-neutral-50 p-5">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Payment Verified & Captured</span>
                </div>
                <p className="text-sm text-neutral-600 mb-4">{completedReceipt.message}</p>

                {completedReceipt.payment && (
                  <div className="border-t border-neutral-200 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Receipt Number</span>
                      <span className="font-mono font-semibold text-neutral-900">
                        {completedReceipt.payment.receiptNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Order Reference</span>
                      <span className="font-mono text-neutral-900">{order.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Razorpay Order ID</span>
                      <span className="font-mono text-neutral-900">
                        {completedReceipt.payment.razorpayOrderId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Razorpay Payment ID</span>
                      <span className="font-mono text-neutral-900">
                        {completedReceipt.payment.razorpayPaymentId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">UPI VPA</span>
                      <span className="font-mono text-neutral-900">
                        {completedReceipt.payment.upiVpa}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold">
                      <span className="text-neutral-900">Amount Paid</span>
                      <span className="font-mono tabular-nums text-neutral-900">
                        ₹{completedReceipt.payment.amountInr.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {completedReceipt.status === 'manual_pending' && (
              <div className="border border-neutral-200 bg-neutral-50 p-5">
                <div className="flex items-center gap-2 text-amber-700 font-semibold mb-2">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>Manual Payment Submitted for Verification</span>
                </div>
                <p className="text-sm text-neutral-600 mb-4">{completedReceipt.message}</p>
                {completedReceipt.payment && (
                  <div className="border-t border-neutral-200 pt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Provisional Receipt</span>
                      <span className="font-mono">{completedReceipt.payment.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Submitted UTR</span>
                      <span className="font-mono">{completedReceipt.payment.manualUtrNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Order Status</span>
                      <span className="font-medium text-amber-700">Payment Verification</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {completedReceipt.status === 'failed' && (
              <div className="border border-red-200 bg-red-50/40 p-5">
                <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>Payment Signature Verification Failed</span>
                </div>
                <p className="text-sm text-neutral-700">{completedReceipt.message}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              {completedReceipt.status === 'failed' ? (
                <button
                  onClick={() => setCompletedReceipt(null)}
                  className="px-4 py-2 text-sm font-medium border border-neutral-300 text-neutral-900 hover:bg-neutral-50"
                >
                  Try Payment Again
                </button>
              ) : (
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-neutral-300 text-neutral-900 hover:bg-neutral-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800"
              >
                Return to My Orders
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Server Authoritative Order Summary */}
            <div className="border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-neutral-600">{order.serviceName}</span>
                <span className="font-mono text-xs text-neutral-500">
                  {order.quantity} {order.unitType.replace(/_/g, ' ')} · {order.preferredFormat}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-neutral-200 pt-3">
                <span className="text-sm font-medium text-neutral-900">
                  Final Payable Amount (Server Verified)
                </span>
                <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
                  ₹{order.totalAmountInr.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 border border-neutral-200">
              <button
                type="button"
                onClick={() => setGatewayMode('razorpay')}
                className={`py-2 px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  gatewayMode === 'razorpay'
                    ? 'bg-white text-neutral-900 border border-neutral-200'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Razorpay UPI Gateway (Instant)
              </button>
              <button
                type="button"
                onClick={() => setGatewayMode('manual_upi')}
                className={`py-2 px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  gatewayMode === 'manual_upi'
                    ? 'bg-white text-neutral-900 border border-neutral-200'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Manual UPI Transfer (UTR Review)
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 border border-red-200 bg-red-50/50 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            {loadingInit || !paymentData ? (
              <div className="py-10 text-center text-sm text-neutral-500">
                Creating secure payment order on backend...
              </div>
            ) : gatewayMode === 'razorpay' ? (
              <div className="space-y-4">
                <div className="text-xs text-neutral-500 flex flex-wrap items-center gap-2">
                  <span>Key: {paymentData.razorpayConfig.keyId}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">
                    Order ID: {paymentData.razorpayConfig.razorpayOrderId}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-2">
                    Select Eligible UPI App (Test Mode)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'gpay', label: 'Google Pay' },
                      { id: 'phonepe', label: 'PhonePe' },
                      { id: 'paytm', label: 'Paytm UPI' },
                      { id: 'bhim', label: 'BHIM UPI' },
                    ].map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSelectedUpiApp(app.id as any)}
                        className={`py-2 px-3 text-xs font-medium border text-center transition-colors whitespace-nowrap ${
                          selectedUpiApp === app.id
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                        }`}
                      >
                        {app.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Your UPI ID / VPA
                  </label>
                  <input
                    type="text"
                    value={upiVpa}
                    onChange={(e) => setUpiVpa(e.target.value)}
                    placeholder="studentname@okaxis"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 focus:border-neutral-900 focus:outline-none font-mono"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    In Razorpay Test Mode, authorizing below sends the payment payload to{' '}
                    <code className="font-mono">/api/payments/verify</code> where the backend
                    validates the HMAC-SHA256 cryptographic signature before marking the order paid.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => handleVerifyRazorpayUpi(true)}
                    className="px-3 py-2.5 text-xs font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors whitespace-nowrap"
                  >
                    Test Invalid Signature (Reject)
                  </button>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => handleVerifyRazorpayUpi(false)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      {processing
                        ? 'Verifying Signature...'
                        : `Authorize UPI Payment (₹${order.totalAmountInr.toLocaleString('en-IN')})`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleManualUpiSubmit} className="space-y-4">
                <div className="p-3 border border-neutral-200 bg-neutral-50 text-xs text-neutral-700 space-y-1">
                  <div className="font-semibold text-neutral-900">
                    Manual UPI Transfer (Requires Admin Verification)
                  </div>
                  <p>
                    Transfer exactly{' '}
                    <strong className="font-mono">
                      ₹{order.totalAmountInr.toLocaleString('en-IN')}
                    </strong>{' '}
                    to merchant VPA <code className="font-mono font-semibold">notecraft@icici</code>{' '}
                    and enter your 12-digit UPI Reference / UTR number below. Your order will be
                    placed in <strong>Payment Verification</strong> status until confirmed by staff.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Sender UPI ID (VPA)
                  </label>
                  <input
                    type="text"
                    required
                    value={upiVpa}
                    onChange={(e) => setUpiVpa(e.target.value)}
                    placeholder="yourname@upi"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 focus:border-neutral-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    12-Digit UPI UTR / Transaction Reference Number *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={12}
                    maxLength={22}
                    value={manualUtr}
                    onChange={(e) => setManualUtr(e.target.value)}
                    placeholder="e.g. 429812349876"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 focus:border-neutral-900 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={processing}
                    className="px-5 py-2.5 text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                  >
                    {processing ? 'Submitting UTR...' : 'Submit UTR for Admin Verification'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
