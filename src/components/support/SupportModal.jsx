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

  const currentAmount = customAmount ? parseFloat(customAmount) || 1 : selectedTier?.amount || 3;

  const handleCopy = (fieldKey, value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
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
              label: 'paypal'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden max-h-[92vh]">
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
              <p className="text-[11px] text-slate-400 m-0">Help keep free live translation accessible to everyone</p>
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
        <div className="p-6 space-y-4 overflow-y-auto text-sm">
          {/* Friendly Note */}
          <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
            <p className="m-0">
              LinguaFlow is completely free. Tipping helps cover server capacity so everyone enjoys fast, unlimited live speech translation!
            </p>
          </div>

          {/* Amount Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">Select Tip Amount</label>
            <div className="grid grid-cols-3 gap-2.5">
              {PAYMENT_CONFIG.tiers.map((tier) => {
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
                      {PAYMENT_CONFIG.currencySymbol}
                      {tier.amount}
                    </span>
                    <span className="text-[10px] text-slate-400">{tier.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount */}
            <div className="pt-1 flex items-center space-x-2">
              <span className="text-xs text-slate-400">Or custom:</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">
                  {PAYMENT_CONFIG.currencySymbol}
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

          {/* 3 Payment Methods Selector */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActivePaymentMethod('stripe')}
                className={`flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activePaymentMethod === 'stripe'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Stripe</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePaymentMethod('paypal')}
                className={`flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activePaymentMethod === 'paypal'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🅿️ PayPal</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePaymentMethod('bank')}
                className={`flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activePaymentMethod === 'bank'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Pay by Bank</span>
              </button>
            </div>

            {/* Tab 1: Stripe (Visa, Mastercard, Apple Pay, Google Pay) */}
            {activePaymentMethod === 'stripe' && (
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <span className="text-xs font-bold text-slate-200">
                    Visa, Mastercard, Apple Pay, Google Pay
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>

                <p className="text-xs text-slate-300 m-0">
                  Contribute{' '}
                  <strong>
                    {PAYMENT_CONFIG.currencySymbol}
                    {currentAmount}
                  </strong>{' '}
                  securely with credit/debit card, Apple Pay, or Google Pay via Stripe:
                </p>

                {stripeError && (
                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>{stripeError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleStripeCheckout}
                  disabled={isProcessingStripe}
                  className="flex items-center justify-center space-x-2 w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isProcessingStripe ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting to Stripe...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        Proceed to Stripe Checkout ({PAYMENT_CONFIG.currencySymbol}
                        {currentAmount})
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tab 2: PayPal */}
            {activePaymentMethod === 'paypal' && (
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3 animate-fadeIn">
                <p className="text-xs text-slate-300 m-0 text-center">
                  Tip{' '}
                  <strong>
                    {PAYMENT_CONFIG.currencySymbol}
                    {currentAmount}
                  </strong>{' '}
                  directly via PayPal:
                </p>

                <div ref={paypalContainerRef} className="min-h-[100px] flex items-center justify-center">
                  {!paypalLoaded && (
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Loading PayPal buttons...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Pay by Bank (Direct Transfer Details) */}
            {activePaymentMethod === 'bank' && (
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <span className="text-xs font-bold text-slate-200">
                    Direct Bank Transfer (Wise UK & International)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    0% fees
                  </span>
                </div>

                <p className="text-xs text-slate-300 m-0">
                  Send your contribution directly from your UK banking app or via international transfer using the account details below:
                </p>

                <div className="space-y-2 pt-1 font-mono text-xs">
                  {/* Account Name */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">
                        Account Holder
                      </span>
                      <span className="font-semibold text-slate-200">{bank.accountHolder}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('accountHolder', bank.accountHolder)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy Account Holder"
                    >
                      {copiedField === 'accountHolder' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Sort Code & Account Number (UK) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">
                          Sort Code (UK)
                        </span>
                        <span className="font-semibold text-white">{bank.sortCode}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('sortCode', bank.sortCode)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Copy Sort Code"
                      >
                        {copiedField === 'sortCode' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">
                          Account Number
                        </span>
                        <span className="font-semibold text-white">{bank.accountNumber}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('accountNumber', bank.accountNumber)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Copy Account Number"
                      >
                        {copiedField === 'accountNumber' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* IBAN (International) */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="truncate pr-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">
                        IBAN (International)
                      </span>
                      <span className="font-semibold text-white select-all text-[11px]">{bank.iban}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('iban', bank.iban)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
                      title="Copy IBAN"
                    >
                      {copiedField === 'iban' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Bank & BIC */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">
                        Bank & SWIFT / BIC
                      </span>
                      <span className="font-semibold text-slate-200">
                        {bank.bankName} • {bank.swiftBic}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('swiftBic', bank.swiftBic)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy BIC"
                    >
                      {copiedField === 'swiftBic' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Reference */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">
                        Payment Reference
                      </span>
                      <span className="font-semibold text-indigo-300">{bank.reference}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('reference', bank.reference)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy Reference"
                    >
                      {copiedField === 'reference' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Thank you for making LinguaFlow lively! 💖</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
