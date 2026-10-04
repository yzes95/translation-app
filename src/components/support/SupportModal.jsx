import React, { useState } from 'react';
import {
  X,
  Heart,
  Copy,
  Check,
  CreditCard,
  Building2,
  ExternalLink,
  Coffee,
  Sparkles,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import { DONATION_CONFIG } from '../../config/donationConfig';

export const SupportModal = ({ isOpen, onClose }) => {
  const [selectedTier, setSelectedTier] = useState(DONATION_CONFIG.tiers[2] || DONATION_CONFIG.tiers[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [activeTab, setActiveTab] = useState('bank'); // 'bank' | 'card'
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen) return null;

  const currentAmount = customAmount ? parseFloat(customAmount) || 0 : selectedTier?.amount || 5;

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getOnlinePaymentUrl = () => {
    const { paymentLinks } = DONATION_CONFIG;
    if (currentAmount === 1 && paymentLinks.stripe1Gbp) return paymentLinks.stripe1Gbp;
    if (currentAmount === 3 && paymentLinks.stripe3Gbp) return paymentLinks.stripe3Gbp;
    if (currentAmount === 5 && paymentLinks.stripe5Gbp) return paymentLinks.stripe5Gbp;
    if (paymentLinks.stripeCustom) return paymentLinks.stripeCustom;
    if (paymentLinks.paypalMe) return `${paymentLinks.paypalMe}/${currentAmount}GBP`;
    if (paymentLinks.buyMeACoffee) return paymentLinks.buyMeACoffee;
    return null;
  };

  const onlineUrl = getOnlinePaymentUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-950/40 via-slate-950 to-indigo-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Heart className="w-4 h-4 fill-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0 flex items-center space-x-1.5">
                <span>Support LinguaFlow</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h2>
              <p className="text-[11px] text-slate-400 m-0">Support ongoing development & new features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-sm">
          {/* Friendly Note */}
          <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
            <p className="m-0">
              LinguaFlow is a 100% free, community-focused live meeting translator. If it saves you time or helps your multilingual syncs, you can support with a quick coffee or tip!
            </p>
          </div>

          {/* Amount Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">Choose Contribution Amount</label>
            <div className="grid grid-cols-3 gap-2.5">
              {DONATION_CONFIG.tiers.map((tier) => {
                const isSelected = !customAmount && selectedTier.id === tier.id;
                return (
                  <button
                    key={tier.id}
                    onClick={() => {
                      setSelectedTier(tier);
                      setCustomAmount('');
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-1 ${
                      isSelected
                        ? 'bg-rose-500/15 border-rose-500/60 text-white shadow-lg shadow-rose-500/10'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-xl">{tier.emoji}</span>
                    <span className="text-sm font-bold">
                      {DONATION_CONFIG.currencySymbol}
                      {tier.amount}
                    </span>
                    <span className="text-[10px] text-slate-400">{tier.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Input */}
            <div className="pt-1 flex items-center space-x-2">
              <span className="text-xs text-slate-400">Or custom amount:</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">
                  {DONATION_CONFIG.currencySymbol}
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter amount (e.g. 10)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div className="space-y-3 pt-1">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('bank')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'bank'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Direct Bank Transfer (0% Fee)</span>
              </button>
              <button
                onClick={() => setActiveTab('card')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'card'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Online Card / Stripe / PayPal</span>
              </button>
            </div>

            {/* Tab 1: Bank Transfer Details */}
            {activeTab === 'bank' && (
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Instant Bank Transfer</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Zero Platform Fees
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Account Name */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/60">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block font-semibold">Account Holder</span>
                      <span className="text-xs font-medium text-slate-100">{DONATION_CONFIG.bankDetails.accountHolder}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(DONATION_CONFIG.bankDetails.accountHolder, 'holder')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy Name"
                    >
                      {copiedField === 'holder' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Bank Name */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/60">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block font-semibold">Bank</span>
                      <span className="text-xs font-medium text-slate-100">{DONATION_CONFIG.bankDetails.bankName}</span>
                    </div>
                  </div>

                  {/* UK Sort Code & Account Number */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/60">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-semibold">Sort Code</span>
                        <span className="text-xs font-mono font-bold text-indigo-300">{DONATION_CONFIG.bankDetails.sortCode}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(DONATION_CONFIG.bankDetails.sortCode, 'sortCode')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Copy Sort Code"
                      >
                        {copiedField === 'sortCode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/60">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-semibold">Account Number</span>
                        <span className="text-xs font-mono font-bold text-indigo-300">{DONATION_CONFIG.bankDetails.accountNumber}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(DONATION_CONFIG.bankDetails.accountNumber, 'accountNumber')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Copy Account Number"
                      >
                        {copiedField === 'accountNumber' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* IBAN for International */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/60">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block font-semibold">IBAN (International)</span>
                      <span className="text-xs font-mono text-slate-200">{DONATION_CONFIG.bankDetails.iban}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(DONATION_CONFIG.bankDetails.iban, 'iban')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy IBAN"
                    >
                      {copiedField === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Reference */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/60">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block font-semibold">Payment Reference</span>
                      <span className="text-xs font-medium text-amber-300">{DONATION_CONFIG.bankDetails.reference}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(DONATION_CONFIG.bankDetails.reference, 'ref')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy Reference"
                    >
                      {copiedField === 'ref' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-tight m-0 pt-1">
                  💡 Open your mobile banking app (Revolut, Monzo, Barclays, etc.), paste the details above, and transfer {DONATION_CONFIG.currencySymbol}{currentAmount}.
                </p>
              </div>
            )}

            {/* Tab 2: Online Payment / Card */}
            {activeTab === 'card' && (
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3 animate-fadeIn">
                {onlineUrl ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300 m-0">
                      Click below to contribute <strong>{DONATION_CONFIG.currencySymbol}{currentAmount}</strong> securely via Card, Apple Pay, Google Pay, or PayPal:
                    </p>
                    <a
                      href={onlineUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center space-x-2 w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                    >
                      <span>Proceed with {DONATION_CONFIG.currencySymbol}{currentAmount}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2.5 text-center py-3">
                    <Coffee className="w-8 h-8 text-amber-400 mx-auto opacity-80" />
                    <h4 className="text-xs font-bold text-slate-200 m-0">Direct Bank Transfer Recommended</h4>
                    <p className="text-xs text-slate-400 m-0 max-w-sm mx-auto">
                      Direct Bank Transfer has <strong>zero processing fees</strong> so 100% of your support goes to the developer.
                    </p>
                    <button
                      onClick={() => setActiveTab('bank')}
                      className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>View Bank Details</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Thank you for supporting LinguaFlow!</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
