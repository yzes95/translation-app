import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Heart,
  CreditCard,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Landmark,
  Copy,
  Check
} from 'lucide-react';
import { PAYMENT_CONFIG } from '../../config/paymentConfig';
import { DONATION_CONFIG } from '../../config/donationConfig';
import { apiService } from '../../services/apiService';

export const SupportModal = ({ isOpen, onClose }) => {
  const [selectedTier, setSelectedTier] = useState(PAYMENT_CONFIG.tiers[1] || PAYMENT_CONFIG.tiers[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [activePaymentMethod, setActivePaymentMethod] = useState('stripe'); // 'stripe' | 'paypal' | 'bank'
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const [stripeError, setStripeError] = useState(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const paypalContainerRef = useRef(null);

  const currentAmount = customAmount ? parseFloat(customAmount) || 0.5 : selectedTier?.amount || 3;

  const handleCopy = (fieldKey, value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2200);
  };

  // Load PayPal SDK dynamically
  useEffect(() => {
    if (!isOpen) return;

    if (!window.paypal && PAYMENT_CONFIG.paypalClientId) {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYMENT_CONFIG.paypalClientId}&currency=GBP&components=buttons`;
      script.async = true;
      script.onload = () => setPaypalLoaded(true);
      document.body.appendChild(script);
    } else if (window.paypal) {
      setPaypalLoaded(true);
    }
  }, [isOpen]);

  // Render PayPal Buttons when tab is paypal
  useEffect(() => {
    if (activePaymentMethod === 'paypal' && paypalLoaded && window.paypal && paypalContainerRef.current) {
      paypalContainerRef.current.innerHTML = '';
      try {
        window.paypal
          .Buttons({
            style: {
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'paypal',
              height: 48
            },
            createOrder: (data, actions) => {
              return actions.order.create({
                purchase_units: [
                  {
                    description: 'Support LinguaFlow Development',
                    amount: {
                      currency_code: 'GBP',
                      value: String(currentAmount)
                    }
                  }
                ]
              });
            },
            onApprove: async (data, actions) => {
              const details = await actions.order.capture();
              alert(`Thank you for supporting LinguaFlow, ${details.payer.name.given_name || 'friend'}! 💖`);
              onClose();
            },
            onError: (err) => {
              console.warn('PayPal transaction notice:', err);
            }
          })
          .render(paypalContainerRef.current);
      } catch (e) {
        console.warn('PayPal render error:', e);
      }
    }
  }, [activePaymentMethod, paypalLoaded, currentAmount, isOpen]);

  if (!isOpen) return null;

  const handleStripeCheckout = async () => {
    setIsProcessingStripe(true);
    setStripeError(null);

    try {
      const data = await apiService.createTipSession(currentAmount);
      if (data && data.url) {
        window.location.href = data.url;
      } else if (data && data.clientSecret) {
        window.location.href = `https://checkout.stripe.com/c/pay/${data.clientSecret}`;
      } else {
        throw new Error('No checkout URL returned by server.');
      }
    } catch (err) {
      console.warn('Stripe checkout error:', err);
      setStripeError(
        'The server is waking up or updating live keys. You can also tip instantly via PayPal or Pay by Bank below!'
      );
    } finally {
      setIsProcessingStripe(false);
    }
  };

  const bank = DONATION_CONFIG.bankDetails || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[94vh]">
        {/* Header (Large, Clear & Prominent) */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-950/60 via-slate-950 to-indigo-950/60">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shadow-lg shadow-rose-500/10 shrink-0">
              <Heart className="w-6 h-6 sm:w-7 sm:h-7 fill-rose-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white m-0 flex items-center space-x-2">
                <span>Support LinguaFlow</span>
                <Sparkles className="w-5 h-5 text-amber-400" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium m-0 mt-0.5">
                Help keep free live translation fast and accessible to everyone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 sm:p-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto text-slate-200">
          {/* Friendly Note Banner */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-sm sm:text-base text-slate-300 leading-relaxed shadow-inner">
            <p className="m-0">
              LinguaFlow is completely free to use. Your support directly funds server capacity and AI processing for everyone!
            </p>
          </div>

          {/* Amount Selector */}
          <div className="space-y-3">
            <label className="text-sm sm:text-base font-bold text-white block">
              1. Choose Contribution Amount
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_CONFIG.tiers.map((tier) => {
                const isSelected = !customAmount && selectedTier.id === tier.id;
                return (
                  <button
                    key={tier.id}
                    onClick={() => {
                      setSelectedTier(tier);
                      setCustomAmount('');
                    }}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/20 scale-102 ring-2 ring-rose-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl">{tier.emoji}</span>
                    <span className="text-lg sm:text-xl font-black">
                      {PAYMENT_CONFIG.currencySymbol}
                      {tier.amount}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-slate-400">{tier.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Field */}
            <div className="pt-2">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-slate-300 shrink-0">Or custom amount:</span>
                <div className="relative flex-1">
                  <span className="absolute left-4 top-3 text-base sm:text-lg font-black text-slate-400">
                    {PAYMENT_CONFIG.currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0.30"
                    step="0.10"
                    placeholder="Enter amount (e.g. 0.50, 2.50, 10)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-9 pr-4 py-2.5 text-base sm:text-lg font-bold text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1 pl-1">
                * Minimum £0.30 for Stripe / card payments (Stripe limit), or any amount via Bank Transfer.
              </p>
            </div>
          </div>

          {/* 3 Payment Methods Selector */}
          <div className="space-y-4 pt-2">
            <label className="text-sm sm:text-base font-bold text-white block">
              2. Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActivePaymentMethod('stripe')}
                className={`flex items-center justify-center space-x-2 py-3 px-3 text-sm sm:text-base font-bold rounded-xl transition-all cursor-pointer ${
                  activePaymentMethod === 'stripe'
                    ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CreditCard className="w-5 h-5 shrink-0" />
                <span>Stripe</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePaymentMethod('paypal')}
                className={`flex items-center justify-center space-x-2 py-3 px-3 text-sm sm:text-base font-bold rounded-xl transition-all cursor-pointer ${
                  activePaymentMethod === 'paypal'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span className="text-lg">🅿️</span>
                <span>PayPal</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePaymentMethod('bank')}
                className={`flex items-center justify-center space-x-2 py-3 px-3 text-sm sm:text-base font-bold rounded-xl transition-all cursor-pointer ${
                  activePaymentMethod === 'bank'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Landmark className="w-5 h-5 shrink-0" />
                <span>Pay by Bank</span>
              </button>
            </div>

            {/* TAB 1: Stripe (Cards, Apple Pay, Google Pay) */}
            {activePaymentMethod === 'stripe' && (
              <div className="p-5 sm:p-6 bg-slate-950/80 rounded-3xl border border-slate-800 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white m-0">
                      Card / Apple Pay / Google Pay
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 m-0 mt-0.5">
                      Visa, Mastercard, American Express, Apple Pay, Google Pay
                    </p>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                </div>

                <p className="text-sm sm:text-base text-slate-300 m-0 leading-relaxed">
                  Click below to contribute{' '}
                  <strong className="text-white text-base sm:text-lg">
                    {PAYMENT_CONFIG.currencySymbol}
                    {currentAmount.toFixed(2)}
                  </strong>{' '}
                  securely through Stripe's certified payment checkout:
                </p>

                {stripeError && (
                  <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-sm flex items-start space-x-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                    <span>{stripeError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleStripeCheckout}
                  disabled={isProcessingStripe}
                  className="flex items-center justify-center space-x-3 w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-60 active:scale-98"
                >
                  {isProcessingStripe ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Opening Stripe Checkout...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        Proceed to Stripe Checkout ({PAYMENT_CONFIG.currencySymbol}
                        {currentAmount.toFixed(2)})
                      </span>
                      <ExternalLink className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2: PayPal */}
            {activePaymentMethod === 'paypal' && (
              <div className="p-5 sm:p-6 bg-slate-950/80 rounded-3xl border border-slate-800 space-y-4 animate-fadeIn">
                <p className="text-base sm:text-lg font-bold text-white m-0 text-center">
                  Tip{' '}
                  <strong className="text-rose-400">
                    {PAYMENT_CONFIG.currencySymbol}
                    {currentAmount.toFixed(2)}
                  </strong>{' '}
                  directly via PayPal:
                </p>

                <div ref={paypalContainerRef} className="min-h-[140px] flex items-center justify-center p-2">
                  {!paypalLoaded && (
                    <div className="flex items-center space-x-3 text-sm sm:text-base text-slate-300">
                      <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                      <span>Loading PayPal buttons...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Pay by Bank (Direct Transfer Details) */}
            {activePaymentMethod === 'bank' && (
              <div className="p-5 sm:p-6 bg-slate-950/80 rounded-3xl border border-slate-800 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white m-0">
                      Direct Bank Transfer (Wise UK & International)
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 m-0 mt-0.5">
                      Fast bank transfer with zero third-party processing deductions
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full shrink-0">
                    0% fees
                  </span>
                </div>

                <p className="text-sm sm:text-base text-slate-300 m-0 leading-relaxed">
                  Send your contribution directly from your UK banking app or via international IBAN transfer:
                </p>

                <div className="space-y-2.5 pt-1">
                  {/* Account Name */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">
                        Account Holder
                      </span>
                      <span className="text-base sm:text-lg font-bold text-white font-mono">
                        {bank.accountHolder}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('accountHolder', bank.accountHolder)}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      title="Copy Account Holder"
                    >
                      {copiedField === 'accountHolder' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sort Code & Account Number (UK) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">
                          Sort Code (UK)
                        </span>
                        <span className="text-base sm:text-lg font-bold text-white font-mono tracking-wider">
                          {bank.sortCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('sortCode', bank.sortCode)}
                        className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                        title="Copy Sort Code"
                      >
                        {copiedField === 'sortCode' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">
                          Account Number (UK)
                        </span>
                        <span className="text-base sm:text-lg font-bold text-white font-mono tracking-wider">
                          {bank.accountNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('accountNumber', bank.accountNumber)}
                        className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                        title="Copy Account Number"
                      >
                        {copiedField === 'accountNumber' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* IBAN (International) */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="truncate pr-3">
                      <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">
                        IBAN (International)
                      </span>
                      <span className="text-sm sm:text-base font-bold text-white font-mono tracking-wider select-all">
                        {bank.iban}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('iban', bank.iban)}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer shrink-0"
                      title="Copy IBAN"
                    >
                      {copiedField === 'iban' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bank Name & BIC */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">
                        Bank Name & SWIFT / BIC
                      </span>
                      <span className="text-base sm:text-lg font-bold text-white font-mono">
                        {bank.bankName} • {bank.swiftBic}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('swiftBic', bank.swiftBic)}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      title="Copy SWIFT/BIC"
                    >
                      {copiedField === 'swiftBic' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Reference */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">
                        Suggested Reference
                      </span>
                      <span className="text-base sm:text-lg font-bold text-indigo-300 font-mono">
                        {bank.reference}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('reference', bank.reference)}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      title="Copy Reference"
                    >
                      {copiedField === 'reference' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs sm:text-sm text-slate-400 font-medium">Thank you for making LinguaFlow lively! 💖</span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
