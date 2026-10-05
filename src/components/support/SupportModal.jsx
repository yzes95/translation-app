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
  AlertCircle
} from 'lucide-react';
import { PAYMENT_CONFIG } from '../../config/paymentConfig';
import { apiService } from '../../services/apiService';

export const SupportModal = ({ isOpen, onClose }) => {
  const [selectedTier, setSelectedTier] = useState(PAYMENT_CONFIG.tiers[1] || PAYMENT_CONFIG.tiers[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [activePaymentMethod, setActivePaymentMethod] = useState('card'); // 'card' | 'paypal'
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const [stripeError, setStripeError] = useState(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const paypalContainerRef = useRef(null);

  const currentAmount = customAmount ? parseFloat(customAmount) || 1 : selectedTier?.amount || 3;

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
      const { clientSecret } = await apiService.createTipSession(currentAmount);
      // If Stripe embedded checkout is used, or fallback redirect
      if (clientSecret) {
        // Redirect to Stripe checkout
        window.location.href = `https://checkout.stripe.com/c/pay/${clientSecret}`;
      }
    } catch (err) {
      console.warn('Stripe checkout error:', err);
      setStripeError(
        'The tip server is currently waking up or configuring live keys. You can also tip via PayPal below!'
      );
    } finally {
      setIsProcessingStripe(false);
    }
  };

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
              <p className="text-[11px] text-slate-400 m-0">Keep free live translation active for everyone</p>
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
              LinguaFlow is completely free. Tipping helps support server capacity so everyone gets a smooth, fast meeting experience!
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

          {/* Payment Method Selector */}
          <div className="space-y-3 pt-1">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActivePaymentMethod('card')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activePaymentMethod === 'card'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card / Apple Pay / Google Pay / Bank</span>
              </button>
              <button
                onClick={() => setActivePaymentMethod('paypal')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activePaymentMethod === 'paypal'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🅿️ PayPal</span>
              </button>
            </div>

            {/* Tab 1: Card / Stripe / Pay by Bank */}
            {activePaymentMethod === 'card' && (
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <span className="text-xs font-bold text-slate-200">
                    Visa, Mastercard, Apple Pay, Google Pay, Pay by Bank
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>

                <p className="text-xs text-slate-300 m-0">
                  Click below to contribute{' '}
                  <strong>
                    {PAYMENT_CONFIG.currencySymbol}
                    {currentAmount}
                  </strong>{' '}
                  securely via Stripe:
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
                      <span>Connecting to Checkout...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        Proceed with {PAYMENT_CONFIG.currencySymbol}
                        {currentAmount}
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
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Thank you for making LinguaFlow lively! 💖</span>
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
