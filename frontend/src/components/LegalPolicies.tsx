import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  FileText, 
  ShieldCheck, 
  RotateCcw, 
  Truck, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  UserCheck, 
  ArrowLeft,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';
import { ShinyBadge } from './ui/ShinyText';

type PolicyTab = 'terms' | 'privacy' | 'refund' | 'shipping' | 'contact';

interface LegalPoliciesProps {
  initialTab?: PolicyTab;
}

export function LegalPolicies({ initialTab }: LegalPoliciesProps) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<PolicyTab>('terms');

  useEffect(() => {
    // Detect tab from URL path
    const path = location.pathname.toLowerCase();
    if (path.includes('privacy')) {
      setActiveTab('privacy');
    } else if (path.includes('refund')) {
      setActiveTab('refund');
    } else if (path.includes('shipping') || path.includes('delivery')) {
      setActiveTab('shipping');
    } else if (path.includes('contact')) {
      setActiveTab('contact');
    } else if (path.includes('terms')) {
      setActiveTab('terms');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, initialTab]);

  const tabs: { id: PolicyTab; label: string; icon: any }[] = [
    { id: 'terms', label: 'Terms & Conditions', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
    { id: 'refund', label: 'Refund & Cancellation', icon: RotateCcw },
    { id: 'shipping', label: 'Shipping & Delivery', icon: Truck },
    { id: 'contact', label: 'Contact Us', icon: Phone }
  ];

  return (
    <div className="flex-1 flex flex-col gap-10 max-w-5xl mx-auto w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-6">
        <div>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <ShinyBadge>
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>COMPLIANCE & LEGAL CENTER</span>
            </ShinyBadge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Legal & Customer Policies
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Official operational terms, customer rights, and legal entity details for <strong>CampusBites</strong>.
          </p>
        </div>

        {/* Legal Identity Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm text-left max-w-xs shrink-0">
          <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Merchant / Legal Entity</p>
          <p className="text-sm font-black text-slate-900 mt-0.5">MURTUZA ALI</p>
          <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
            <Mail className="w-3 h-3 text-indigo-600" />
            <a href="mailto:murtuzaali17th@gmail.com" className="hover:underline">murtuzaali17th@gmail.com</a>
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
            <Phone className="w-3 h-3 text-indigo-600" />
            <a href="tel:+918432123450" className="hover:underline">+91 8432123450</a>
          </p>
        </div>
      </div>

      {/* Policy Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]'
                  : 'bg-white text-slate-700 hover:bg-slate-100/80 border border-slate-200/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Policy Content Card */}
      <SpotlightCard className="p-6 sm:p-10 bg-white border border-slate-200/90 rounded-3xl shadow-lg shadow-slate-200/40 text-slate-800 leading-relaxed space-y-8">
        
        {/* ================= TERMS & CONDITIONS ================= */}
        {activeTab === 'terms' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <FileText className="w-6 h-6 text-indigo-600" />
                Terms and Conditions
              </h2>
              <p className="text-xs text-slate-500 mt-1">Last Updated: September 1, 2026</p>
            </div>

            <div className="space-y-5 text-xs sm:text-sm text-slate-600">
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">1. Platform & Ownership Overview</h3>
                <p>
                  This website and web platform (<strong>CampusBites</strong>) is operated and owned legally by <strong>MURTUZA ALI</strong> (referred to as "we", "our", "us", or "Proprietor"). 
                  By browsing, accessing, or placing an order on CampusBites (<code>campusbites-frontend-4jw1.onrender.com</code>), you agree to be bound by these Terms and Conditions.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">2. Service Description</h3>
                <p>
                  CampusBites provides an online menu browsing, pre-ordering, and token queue management platform for college canteens, university food courts, and standalone campus diners. 
                  Users can view live menu items, select quantities, generate order tokens, and complete payment transactions via supported payment methods.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">3. User Responsibilities & Verification</h3>
                <p>
                  Students and campus diners are responsible for providing accurate contact and identification details (e.g. Student Name, Roll Number / WhatsApp number) when placing an order. 
                  Digital verification tokens and signed QR codes are issued upon order placement and must be presented at the kitchen counter for collection.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">4. Pricing & Payments</h3>
                <p>
                  All menu item prices displayed on CampusBites are in Indian Rupees (INR / ₹) and are inclusive of applicable taxes unless stated otherwise. 
                  Online payment processing is securely conducted through authorized Reserve Bank of India (RBI) compliant payment aggregators (such as Cashfree Payments). 
                  We do not store or capture any sensitive credit card numbers or UPI PINs on our servers.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">5. Modifications to the Service</h3>
                <p>
                  We reserve the right to modify or discontinue any feature, menu item, or pricing at any time without prior notice. 
                  Your continued use of the platform constitutes acceptance of updated terms.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">6. Governing Law & Jurisdiction</h3>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising in connection with these terms shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra, India.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= PRIVACY POLICY ================= */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                Privacy Policy
              </h2>
              <p className="text-xs text-slate-500 mt-1">Last Updated: September 1, 2026</p>
            </div>

            <div className="space-y-5 text-xs sm:text-sm text-slate-600">
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">1. Information We Collect</h3>
                <p>
                  When you use CampusBites (operated by <strong>MURTUZA ALI</strong>), we collect minimal and necessary information required to facilitate food ordering and queue management:
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2 text-slate-700">
                  <li><strong>Personal Information:</strong> Name, phone number / WhatsApp number, university roll number, and email address (for partner registration).</li>
                  <li><strong>Order Information:</strong> Items ordered, order total, timestamp, token number, and canteen location.</li>
                  <li><strong>Technical Data:</strong> Browser type, device IP address, and session identifiers for security verification.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">2. Use of Information</h3>
                <p>
                  We use the information collected exclusively for:
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2 text-slate-700">
                  <li>Processing and dispatching your food orders at the canteen counter.</li>
                  <li>Generating secure order pickup tokens and cryptographic QR verification codes.</li>
                  <li>Sending order status notifications and payment confirmations.</li>
                  <li>Resolving customer grievances and handling refund/cancellation queries.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">3. Payment Security & Third-Party Processors</h3>
                <p>
                  Payment transactions are routed through certified, PCI-DSS compliant payment gateways (including Cashfree Payments). 
                  CampusBites does NOT store customer credit card numbers, CVVs, net banking credentials, or UPI MPINs.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">4. Data Sharing & Disclosure</h3>
                <p>
                  We do not sell, rent, or lease customer personal data to third parties. Information is shared only with canteen staff and authorized payment providers strictly to fulfill orders and settle payments.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">5. Data Retention & Contact</h3>
                <p>
                  Order records are retained only as long as necessary for operational settlement, accounting, and compliance. For queries regarding your data or to request data deletion, contact our Grievance Officer at <a href="mailto:murtuzaali17th@gmail.com" className="text-indigo-600 font-bold hover:underline">murtuzaali17th@gmail.com</a>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= REFUND & CANCELLATION ================= */}
        {activeTab === 'refund' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <RotateCcw className="w-6 h-6 text-amber-600" />
                Refund and Cancellation Policy
              </h2>
              <p className="text-xs text-slate-500 mt-1">Last Updated: September 1, 2026</p>
            </div>

            <div className="space-y-5 text-xs sm:text-sm text-slate-600">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs">
                <strong>Quick Summary:</strong> Fresh food orders can be cancelled before the kitchen begins preparation. In the case of item unavailability, double deduction, or server errors, 100% refund is initiated to your original payment method within 5–7 business days.
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">1. Order Cancellation by Customer</h3>
                <p>
                  Since campus canteens prepare meals freshly upon order:
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2 text-slate-700">
                  <li><strong>Before Preparation:</strong> You may cancel your order while the status is in <em>"PENDING"</em> state before the kitchen staff has accepted and begun preparation.</li>
                  <li><strong>After Preparation Starts:</strong> Once the canteen kitchen accepts and begins preparing your meal (status <em>"PREPARING"</em> or <em>"READY"</em>), cancellations cannot be accepted as the ingredients are already committed.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">2. Cancellation by Canteen / Merchant</h3>
                <p>
                  The canteen or platform operator (<strong>MURTUZA ALI</strong>) reserves the right to cancel an order due to unforeseen kitchen circumstances, including:
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2 text-slate-700">
                  <li>Specific menu ingredients being out of stock or kitchen capacity overload during peak breaks.</li>
                  <li>Canteen counter closure due to university holidays or emergencies.</li>
                </ul>
                <p className="mt-2">
                  In all merchant-initiated cancellations, a <strong>100% full refund</strong> will be initiated automatically.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">3. Failed & Duplicate Transactions</h3>
                <p>
                  If money was debited from your bank/UPI account but the order failed to generate on CampusBites due to a network glitch, the debited amount will be reversed automatically by the payment gateway or settled by us within 24–48 hours.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">4. Refund Processing Timelines</h3>
                <p>
                  Once approved, refunds are credited back to the customer’s original source account (UPI / Debit Card / Netbanking):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-bold text-slate-900 text-xs">UPI / Wallet Payments</p>
                    <p className="text-[12px] text-slate-600 mt-0.5">Processed within 24 to 48 hours</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-bold text-slate-900 text-xs">Debit Card / Credit Card / Netbanking</p>
                    <p className="text-[12px] text-slate-600 mt-0.5">5 to 7 business banking days</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">5. How to Request a Refund</h3>
                <p>
                  To request a refund or report an issue with an order, please email <a href="mailto:murtuzaali17th@gmail.com" className="text-indigo-600 font-bold hover:underline">murtuzaali17th@gmail.com</a> or call/WhatsApp <a href="tel:+918432123450" className="text-indigo-600 font-bold hover:underline">+91 8432123450</a> with your Order ID, token number, and payment transaction reference.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= SHIPPING & DELIVERY ================= */}
        {activeTab === 'shipping' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Truck className="w-6 h-6 text-indigo-600" />
                Shipping and Delivery Policy
              </h2>
              <p className="text-xs text-slate-500 mt-1">Last Updated: September 1, 2026</p>
            </div>

            <div className="space-y-5 text-xs sm:text-sm text-slate-600">
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">1. Campus Service Scope</h3>
                <p>
                  CampusBites operates as a digital food ordering ecosystem for educational institutions and university campus food outlets. 
                  All food products and beverages offered on the platform are prepared and fulfilled on-premises within the respective campus dining facilities.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">2. Fulfillment Method: On-Premises Express Counter Pickup</h3>
                <p>
                  Unless specifically indicated by a participating diner offering intra-campus desk delivery, all orders placed through CampusBites are fulfilled via <strong>Express Self-Pickup</strong> at the designated canteen pickup counter.
                </p>
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 text-xs space-y-1.5 mt-3">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>How Pickup Works:</span>
                  </div>
                  <p>1. Place your order on CampusBites and receive your unique 3-digit pickup token (e.g. <code>#042</code>) and secure QR code.</p>
                  <p>2. Watch the live queue display on your phone or counter board.</p>
                  <p>3. Once the status changes to <strong>"READY FOR PICKUP"</strong>, show your token/QR code at the kitchen dispatch counter to receive your hot meal.</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">3. Preparation & Dispatch Timeframes</h3>
                <p>
                  Estimated preparation times vary depending on the dish and peak break-time volume:
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2 text-slate-700">
                  <li><strong>Beverages, Snacks & Quick Bites:</strong> Typically ready within <strong>5 to 10 minutes</strong>.</li>
                  <li><strong>Cooked Meals, Thalis & Fresh Gourmet Orders:</strong> Typically ready within <strong>12 to 20 minutes</strong>.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">4. Delivery Charges</h3>
                <p>
                  Standard on-counter pickups carry <strong>zero delivery fees (₹0)</strong>. Any special intra-campus delivery fee (if offered by a participating outlet) will be transparently indicated on the checkout screen prior to payment.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">5. Uncollected Orders</h3>
                <p>
                  Students are requested to collect their prepared meals within 30 minutes of receiving the "READY" notification. Unclaimed perishable food items cannot be held indefinitely due to food safety and hygiene standards.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= CONTACT US ================= */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Phone className="w-6 h-6 text-indigo-600" />
                Contact Us & Grievance Support
              </h2>
              <p className="text-xs text-slate-500 mt-1">Official merchant contact, support channels, and legal representative details.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information Box */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Merchant & Entity Details</span>
                </h3>

                <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Legal Entity / Proprietor</p>
                    <p className="font-bold text-slate-900 text-base">MURTUZA ALI</p>
                    <p className="text-xs text-slate-500">Trading / Operating Name: <strong>CampusBites</strong></p>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Email</p>
                    <p className="font-medium text-indigo-600">
                      <a href="mailto:murtuzaali17th@gmail.com" className="hover:underline flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5" />
                        murtuzaali17th@gmail.com
                      </a>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone / WhatsApp Support</p>
                    <p className="font-medium text-slate-900">
                      <a href="tel:+918432123450" className="hover:underline flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        +91 8432123450
                      </a>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Operational Location / Address</p>
                    <p className="text-slate-700 flex items-start gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>Vile Parle West, Mumbai, Maharashtra 400056, India</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Support & Grievance Response Box */}
              <div className="p-6 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-4">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Support Hours & Response Time</span>
                </h3>

                <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Operating Hours</p>
                    <p className="font-semibold text-slate-900 mt-0.5">Monday to Saturday: 8:30 AM – 7:30 PM IST</p>
                    <p className="text-xs text-slate-500 mt-0.5">Sunday & University Holidays: Limited Online Support</p>
                  </div>

                  <div className="pt-2 border-t border-indigo-100/80">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Grievance Officer</p>
                    <p className="font-semibold text-slate-900 mt-0.5">Murtuza Ali</p>
                    <p className="text-xs text-slate-600">Designated Grievance & Compliance Officer</p>
                    <p className="text-xs text-indigo-600 mt-0.5">Email: murtuzaali17th@gmail.com</p>
                  </div>

                  <div className="pt-2 border-t border-indigo-100/80">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Standard Turnaround</p>
                    <p className="text-slate-700 mt-0.5">
                      All payment queries, cancellation inquiries, and technical issues are responded to within <strong>24 to 48 business hours</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </SpotlightCard>
    </div>
  );
}
