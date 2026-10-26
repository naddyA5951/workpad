import React, { useState } from 'react';
import { BusinessDetails } from '../types.ts';

interface PoliciesAndGuideProps {
  businessDetails: BusinessDetails;
  isAdmin: boolean;
  onUpdateBusinessDetails: (updated: BusinessDetails) => void;
  initialSection?: 'policies' | 'guide';
}

export const PoliciesAndGuide: React.FC<PoliciesAndGuideProps> = ({
  businessDetails,
  isAdmin,
  onUpdateBusinessDetails,
  initialSection = 'policies',
}) => {
  const [section, setSection] = useState<'policies' | 'guide'>(initialSection);
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [draft, setDraft] = useState<BusinessDetails>(businessDetails);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusinessDetails(draft);
    setEditingBusiness(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <div className="text-xs text-neutral-500 mb-1">
            Compliance, Academic Integrity & Architecture Guide
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Platform Policies & Beginner Full-Stack Setup Guide
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-100 border border-neutral-200 self-start">
          <button
            type="button"
            onClick={() => setSection('policies')}
            className={`px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              section === 'policies'
                ? 'bg-white text-neutral-900 border border-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Legal, Privacy & Academic Policies
          </button>
          <button
            type="button"
            onClick={() => setSection('guide')}
            className={`px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              section === 'guide'
                ? 'bg-white text-neutral-900 border border-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Beginner Code, GitHub & Deployment Guide
          </button>
        </div>
      </div>

      {section === 'policies' ? (
        <div className="space-y-6">
          {/* Editable Business Details Card */}
          <div className="border border-neutral-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Official Startup & Contact Information
                </h2>
                <p className="text-xs text-neutral-500">
                  Displayed across receipts, terms of service, and student support channels.
                </p>
              </div>
              {isAdmin && !editingBusiness && (
                <button
                  type="button"
                  onClick={() => setEditingBusiness(true)}
                  className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-900 hover:bg-neutral-50"
                >
                  Edit Business Details
                </button>
              )}
            </div>

            {editingBusiness ? (
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Business / Startup Name
                  </label>
                  <input
                    type="text"
                    value={draft.companyName}
                    onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={draft.supportEmail}
                    onChange={(e) => setDraft({ ...draft, supportEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Support Phone / WhatsApp Desk
                  </label>
                  <input
                    type="text"
                    value={draft.supportPhone}
                    onChange={(e) => setDraft({ ...draft, supportPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Registered Office Address
                  </label>
                  <input
                    type="text"
                    value={draft.registeredAddress}
                    onChange={(e) => setDraft({ ...draft, registeredAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingBusiness(false)}
                    className="px-3 py-1.5 border border-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-neutral-900 text-white font-semibold"
                  >
                    Save Business Details
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-neutral-500 block">Entity Name</span>
                  <span className="font-semibold text-neutral-900">
                    {businessDetails.companyName}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Support Email</span>
                  <span className="font-mono text-neutral-900">{businessDetails.supportEmail}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Student Helpline</span>
                  <span className="font-mono text-neutral-900">{businessDetails.supportPhone}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Registered Office</span>
                  <span className="text-neutral-900">{businessDetails.registeredAddress}</span>
                </div>
              </div>
            )}
          </div>

          {/* Policy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-neutral-200 bg-white p-6 space-y-2">
              <h3 className="text-base font-bold text-neutral-900">
                01. Academic Integrity & Permitted Services Policy
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {businessDetails.companyName} provides structured handwritten study notes, digital
                revision guides, chapter summaries, document formatting/typesetting, and permitted
                laboratory observation transcription strictly as supplementary learning and revision
                aids. We strictly prohibit academic impersonation, live exam assistance,
                plagiarism, or completing graded assessments in violation of your university&apos;s
                academic honor code.
              </p>
            </div>

            <div className="border border-neutral-200 bg-white p-6 space-y-2">
              <h3 className="text-base font-bold text-neutral-900">
                02. Privacy & College ID Data Retention Policy
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Student College ID numbers are collected solely to verify active student eligibility
                for student pricing and campus courier delivery. Newly submitted College IDs are
                placed in <strong>Pending Review</strong> status and are only accessible to
                authorized verification administrators. Passwords are salted and hashed via
                cryptographic <code className="font-mono">scrypt</code>; raw passwords and UPI PINs
                are never stored. College ID records are purged within{' '}
                {businessDetails.collegeIdRetentionDays} days of account closure request.
              </p>
            </div>

            <div className="border border-neutral-200 bg-white p-6 space-y-2">
              <h3 className="text-base font-bold text-neutral-900">
                03. Terms of Service & Delivery Timelines
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Estimated completion dates are calculated based on the selected service category and
                page/topic volume once payment is verified by our backend. Digital deliverables are
                accessible exclusively via authenticated private download links in the student&apos;s
                My Orders dashboard. Physical handwritten note parcels are dispatched via tracked
                campus courier or speed post.
              </p>
            </div>

            <div className="border border-neutral-200 bg-white p-6 space-y-2">
              <h3 className="text-base font-bold text-neutral-900">
                04. Cancellation & Refund Policy
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Orders in <strong>Pending Payment</strong> or <strong>Confirmed</strong> status
                prior to writer allocation may be cancelled for a 100% refund. Once an order enters{' '}
                <strong>In Progress</strong>, partial or full refunds are evaluated if the delivered
                notes deviate from the uploaded syllabus or reference instructions. Approved refunds
                are processed through the original Razorpay UPI payment reference and reflected in
                5–7 business days.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 text-sm text-neutral-700">
          <div className="border border-neutral-200 bg-white p-6 space-y-3">
            <h2 className="text-base font-bold text-neutral-900">
              1. Project Folder Structure (Open Root Folder in VS Code)
            </h2>
            <pre className="p-4 bg-neutral-50 border border-neutral-200 text-xs font-mono overflow-x-auto leading-relaxed">
{`notecraft-academic/
├── .env.example                 # Environment variables template (Razorpay & PostgreSQL)
├── firebase-applet-config.json  # Firebase OAuth client configuration
├── index.html                   # HTML entry point & typography imports
├── package.json                 # Dependencies & scripts (dev, build, start, lint)
├── server.ts                    # Express.js backend server, auth, pricing & Razorpay APIs
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite frontend bundler configuration
└── src/
    ├── main.tsx                 # React DOM root mount
    ├── index.css                # Tailwind CSS v4 & typography setup
    ├── types.ts                 # Shared TypeScript interfaces
    ├── App.tsx                  # Auth Gate, Student Dashboard, Pricing, Order Form, My Orders
    ├── components/
    │   ├── PaymentModal.tsx     # Razorpay UPI Test Checkout & Printable Receipt
    │   ├── AdminDashboard.tsx   # Admin RBAC Console (Orders, College IDs, Pricing, Refunds)
    │   └── PoliciesAndGuide.tsx # Editable Legal Policies & Beginner Deployment Guide
    ├── db/
    │   ├── schema.ts            # Drizzle ORM PostgreSQL 10-table schema
    │   ├── drizzle.config.ts    # Drizzle Kit migration config
    │   ├── index.ts             # PostgreSQL connection pool (Object Method)
    │   └── users.ts             # Sanitized database query helpers
    ├── lib/
    │   ├── firebase.ts          # Client Firebase Auth initialization
    │   └── firebase-admin.ts    # Backend Firebase Admin token verifier
    └── middleware/
        └── auth.ts              # scrypt password hashing, HMAC session tokens & requireAdmin`}
            </pre>
          </div>

          <div className="border border-neutral-200 bg-white p-6 space-y-3">
            <h2 className="text-base font-bold text-neutral-900">
              2. Local Terminal Commands & Switching Razorpay from Test Mode to Live Mode
            </h2>
            <pre className="p-4 bg-neutral-50 border border-neutral-200 text-xs font-mono overflow-x-auto leading-relaxed">
{`# Step 1: Install all dependencies
npm install

# Step 2: Push the 10-table PostgreSQL schema using Drizzle Kit
npx drizzle-kit push --config=src/db/drizzle.config.ts

# Step 3: Start the full-stack Express + React server on http://localhost:3000
npm run dev

# Step 4: Switching Razorpay from Test Mode to Live Mode
# 1. Log into https://dashboard.razorpay.com and complete KYC verification.
# 2. Switch the top banner toggle from "Test Mode" to "Live Mode".
# 3. Go to Account & Settings -> API Keys -> Generate Live Key.
# 4. Copy your Live Key ID (rzp_live_...) and Key Secret into your .env / Render environment:
#    RAZORPAY_KEY_ID="rzp_live_YourLiveKeyId"
#    RAZORPAY_KEY_SECRET="YourLiveKeySecret"
#    RAZORPAY_WEBHOOK_SECRET="YourWebhookSecretFromRazorpaySettings"`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
