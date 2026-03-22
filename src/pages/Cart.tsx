import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Tag, User, Pencil, Store, Wallet, CreditCard, Sparkles, Mail, Shield, CheckCircle2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../hooks/useSiteSettings';
import {
  getBestAutomaticOffer,
  getCartAddOnTotal,
  getOfferCode,
  getOfferDiscountAmount,
  getOfferEligibilityError,
  getOfferMode,
  getOfferRuleSummary,
} from '../lib/offers';
import { customerSupabase } from '../lib/supabase';
import { readCheckoutSuccessOrder, storeCheckoutSuccessOrder } from '../lib/checkoutSuccess';
import { getServiceModeLabel } from '../lib/orderLabels';
import { createCounterOrder } from '../lib/counterOrder';
import type { MenuItem, PaymentMethod, Offer, PickupOption, SelectedCustomization } from '../types';
import { useToast } from '../components/Toast';
import { cancelRazorpayPayment, createRazorpayOrder, loadRazorpayScript, verifyRazorpayPayment } from '../lib/razorpay';
import { playOrderSound } from '../lib/sounds';
import CustomizationModal from '../components/CustomizationModal';

const SESSION_KEYWORDS = ['session expired', 'sign in again', 'please sign in'];

export default function CartPage() {
  const { items, subtotal, itemCount, removeItem, updateQuantity, clearCart, addItem } = useCart();
  const { user, profile } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pickupOption, setPickupOption] = useState<PickupOption>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
  const [couponError, setCouponError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<{ cartItemId: string; menuItem: MenuItem } | null>(null);
  const pendingSuccessOrderId = readCheckoutSuccessOrder();

  useEffect(() => {
    if (profile) {
      if (profile.full_name && !name) setName(profile.full_name);
      if (profile.phone && !phone) setPhone(profile.phone);
    }
  }, [profile, name, phone]);

  useEffect(() => {
    if (items.length > 0 || !pendingSuccessOrderId) return;
    navigate(`/order-success/${pendingSuccessOrderId}`, { replace: true });
  }, [items.length, navigate, pendingSuccessOrderId]);

  useEffect(() => {
    void loadActiveOffers();
  }, []);

  async function loadActiveOffers() {
    const now = new Date().toISOString();
    const { data } = await customerSupabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .lte('valid_from', now)
      .gte('valid_until', now)
      .order('created_at', { ascending: false });

    setActiveOffers(data || []);
  }

  async function applyCoupon() {
    setCouponError('');
    if (!couponCode.trim()) return;
    const matchingOffer = activeOffers.find((offer) => (
      getOfferMode(offer) === 'coupon' && getOfferCode(offer) === couponCode.trim().toUpperCase()
    ));

    if (!matchingOffer) {
      setCouponError('Invalid or expired coupon code');
      setAppliedOffer(null);
      return;
    }

    const offerEligibilityError = getOfferEligibilityError(matchingOffer, {
      subtotal,
      itemCount,
      addOnTotal: getCartAddOnTotal(items),
    });

    if (offerEligibilityError) {
      setCouponError(offerEligibilityError);
      setAppliedOffer(null);
      return;
    }

    setAppliedOffer(matchingOffer);
    showToast('Coupon applied!');
  }

  const addOnTotal = getCartAddOnTotal(items);
  const pricingContext = { subtotal, itemCount, addOnTotal };
  const couponDiscount = appliedOffer ? getOfferDiscountAmount(appliedOffer, pricingContext) : 0;
  const automaticOffer = getBestAutomaticOffer(activeOffers, pricingContext);
  const automaticDiscount = automaticOffer?.discountAmount || 0;
  const featuredAutomaticOffer = automaticOffer?.offer || activeOffers.find((offer) => getOfferMode(offer) === 'automatic') || null;
  const discount = Math.min(subtotal, couponDiscount + automaticDiscount);
  const total = Math.max(0, subtotal - discount);
  const isFreeOrder = total <= 0;
  const serviceModeLabel = getServiceModeLabel({ order_type: 'pickup', pickup_option: pickupOption });

  useEffect(() => {
    if (!appliedOffer) return;

    const latestOffer = activeOffers.find((offer) => offer.id === appliedOffer.id) || appliedOffer;
    const offerEligibilityError = getOfferEligibilityError(latestOffer, {
      subtotal,
      itemCount,
      addOnTotal,
    });

    if (offerEligibilityError) {
      setAppliedOffer(null);
      setCouponError(`${latestOffer.title} is no longer eligible for this cart`);
      return;
    }

    if (latestOffer !== appliedOffer) {
      setAppliedOffer(latestOffer);
    }
  }, [activeOffers, addOnTotal, appliedOffer, itemCount, subtotal]);

  async function syncProfileDetails() {
    const customerEmail = profile?.email?.trim() || user?.email?.trim() || '';

    if (user) {
      const { error: profileUpdateError } = await customerSupabase.from('profiles').update({
        full_name: name.trim(),
        phone: phone.trim(),
      }).eq('id', user.id);

      if (profileUpdateError) {
        console.error('Failed to update profile before placing order', profileUpdateError);
      }
    }

    return customerEmail;
  }

  async function ensureFreshSession() {
    const { data, error } = await customerSupabase.auth.getSession();

    if (error || !data.session) {
      throw new Error('Please sign in to place your order.');
    }

    const expiresAtMs = data.session.expires_at ? data.session.expires_at * 1000 : 0;
    if (expiresAtMs && expiresAtMs - Date.now() < 60_000) {
      const { error: refreshError } = await customerSupabase.auth.refreshSession();
      if (refreshError) {
        throw new Error('Please sign in to place your order.');
      }
    }
  }

  async function startRazorpayCheckout(customerEmail: string) {
    const razorpayOrder = await createRazorpayOrder({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerEmail,
      pickupOption,
      subtotal,
      discount,
      total,
      items: items.map((item) => ({
        menu_item_id: item.menu_item.id,
        item_name: item.menu_item.name,
        quantity: item.quantity,
        unit_price: item.menu_item.price,
        customizations: item.customizations,
      })),
    });

    try {
      await loadRazorpayScript();

      const RazorpayCheckout = window.Razorpay;
      if (!RazorpayCheckout) {
        throw new Error('Razorpay checkout is unavailable');
      }

      await new Promise<void>((resolve, reject) => {
        let paymentFinalized = false;

        const checkout = new RazorpayCheckout({
          key: razorpayOrder.keyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: 'The Supreme Waffle',
          description: `${serviceModeLabel} Order`,
          order_id: razorpayOrder.razorpayOrderId,
          prefill: {
            name: razorpayOrder.customerName,
            email: razorpayOrder.customerEmail,
            contact: razorpayOrder.customerPhone,
          },
          notes: {
            app_order_id: razorpayOrder.appOrderId,
          },
          theme: {
            color: '#c8a03c',
          },
          retry: {
            enabled: true,
            max_count: 2,
          },
          modal: {
            confirm_close: true,
            ondismiss: () => {
              if (paymentFinalized) return;
              void cancelRazorpayPayment(razorpayOrder.appOrderId).catch((cancelError) => {
                console.error('Failed to cancel pending Razorpay order', cancelError);
              });
              reject(new Error('Payment cancelled'));
            },
          },
          handler: (response) => {
            paymentFinalized = true;

            void (async () => {
              try {
                const verification = await verifyRazorpayPayment({
                  appOrderId: razorpayOrder.appOrderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });

                const successfulOrderId = verification.appOrderId || razorpayOrder.appOrderId;
                storeCheckoutSuccessOrder(successfulOrderId);
                showToast('Order placed successfully');
                playOrderSound();
                navigate(`/order-success/${successfulOrderId}`, { replace: true });
                clearCart();
                resolve();
              } catch (verificationError) {
                console.error('Failed to verify Razorpay payment', verificationError);
                reject(verificationError instanceof Error ? verificationError : new Error('Payment verification failed'));
              }
            })();
          },
        });

        checkout.on('payment.failed', (failure) => {
          if (paymentFinalized) return;
          paymentFinalized = true;
          void cancelRazorpayPayment(razorpayOrder.appOrderId).catch((cancelError) => {
            console.error('Failed to cancel failed Razorpay payment', cancelError);
          });
          reject(new Error(failure.error?.description || 'Payment failed'));
        });

        checkout.open();
      });
    } catch (razorpayCheckoutError) {
      await cancelRazorpayPayment(razorpayOrder.appOrderId).catch((cancelError) => {
        console.error('Failed to cancel Razorpay order after checkout setup error', cancelError);
      });
      throw razorpayCheckoutError;
    }
  }

  async function handlePlaceOrder() {
    if (settings && !settings.site_is_open) {
      showToast(settings.reopening_text || 'Ordering is currently unavailable', 'error');
      return;
    }

    if (!user) {
      navigate('/auth', { state: { from: '/cart' } });
      return;
    }

    if (!name.trim() || !phone.trim()) {
      showToast('Please fill in your name and phone number', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await ensureFreshSession();
      const customerEmail = await syncProfileDetails();

      if (paymentMethod === 'card' && !isFreeOrder) {
        await startRazorpayCheckout(customerEmail);
        return;
      }

      const order = await createCounterOrder({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail,
        pickupOption,
        subtotal,
        discount,
        total,
        paymentMethod,
        items: items.map((item) => ({
          menu_item_id: item.menu_item.id,
          item_name: item.menu_item.name,
          quantity: item.quantity,
          unit_price: item.menu_item.price,
          customizations: item.customizations,
        })),
      });

      if (isFreeOrder && order.receiptEmailSent === false) {
        showToast('Order placed, but receipt email failed', 'error');
      }

      storeCheckoutSuccessOrder(order.appOrderId);
      showToast('Order placed successfully');
      playOrderSound();
      navigate(`/order-success/${order.appOrderId}`, { replace: true });
      clearCart();
    } catch (placeOrderError) {
      console.error('Unexpected order placement error', placeOrderError);
      const message = placeOrderError instanceof Error
        ? placeOrderError.message
        : (typeof placeOrderError === 'object' && placeOrderError !== null && 'message' in placeOrderError && typeof (placeOrderError as { message: unknown }).message === 'string')
          ? (placeOrderError as { message: string }).message
          : 'Failed to place order. Please try again.';
      const lowerMessage = message.toLowerCase();
      const isSessionError = SESSION_KEYWORDS.some((kw) => lowerMessage.includes(kw));
      if (isSessionError) {
        navigate('/auth', { state: { from: '/cart' }, replace: true });
      }
      showToast(message === 'Payment cancelled' ? 'Payment cancelled' : message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditConfirm(menuItem: MenuItem, quantity: number, customizations: SelectedCustomization[]) {
    if (!editingItem) return;
    removeItem(editingItem.cartItemId);
    addItem(menuItem, quantity, customizations);
    setEditingItem(null);
    showToast('Item updated!');
  }

  // Empty Cart States
  if (items.length === 0) {
    if (pendingSuccessOrderId) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center section-padding bg-brand-bg animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 
                          rounded-full flex items-center justify-center mb-6
                          border border-brand-gold/30 animate-pulse">
            <ShoppingBag size={40} className="text-brand-gold" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            Redirecting to your order...
          </h2>
          <p className="text-brand-text-muted text-[15px]">
            We are opening your order confirmation page.
          </p>
        </div>
      );
    }

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center section-padding bg-brand-bg animate-fade-in">
        <div className="w-28 h-28 bg-brand-surface rounded-3xl 
                        flex items-center justify-center mb-6
                        border border-brand-border">
          <ShoppingBag size={48} className="text-brand-text-dim" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          Your cart is empty
        </h2>
        <p className="text-brand-text-muted text-[15px] mb-6">
          Add some delicious waffles to get started
        </p>
        <Link to="/menu" className="btn-primary">
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-lg mx-auto px-4 py-6 pb-36 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            to="/menu" 
            className="inline-flex items-center gap-2 text-[13px] font-medium
                       text-brand-text-dim hover:text-brand-gold 
                       transition-colors duration-200 group"
          >
            <ArrowLeft 
              size={16} 
              className="group-hover:-translate-x-1 transition-transform duration-200" 
            />
            Back to Menu
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                          text-[12px] font-bold 
                          bg-brand-gold/10 text-brand-gold 
                          border border-brand-gold/25">
            <Store size={14} strokeWidth={2.5} />
            {serviceModeLabel}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[26px] font-extrabold tracking-tight text-white mb-6">
          Your Order 
          <span className="text-brand-text-dim font-semibold text-[18px] ml-2 tabular-nums">
            ({itemCount})
          </span>
        </h1>

        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="bg-brand-surface/80 backdrop-blur-sm rounded-2xl p-4 
                         border border-brand-border 
                         hover:border-brand-gold/20
                         transition-all duration-300
                         animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex gap-4">
                {/* Image */}
                <div className="relative">
                  <img
                    src={item.menu_item.image_url}
                    alt={item.menu_item.name}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                  />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-[15px] leading-snug">
                      {item.menu_item.name}
                    </h3>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 hover:bg-red-500/10 rounded-xl 
                                 text-brand-text-dim hover:text-red-400 
                                 transition-all duration-200 flex-shrink-0
                                 group"
                    >
                      <Trash2 
                        size={16} 
                        strokeWidth={2.2} 
                        className="group-hover:scale-110 transition-transform"
                      />
                    </button>
                  </div>

                  {/* Customizations */}
                  {item.customizations.length > 0 && (
                    <div className="mt-1.5 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CartCustomizations customizations={item.customizations} />
                      </div>
                      <button
                        onClick={() => setEditingItem({ cartItemId: item.id, menuItem: item.menu_item })}
                        className="flex items-center gap-1 text-[11px] font-bold 
                                   text-brand-gold hover:text-brand-gold-soft 
                                   transition-colors flex-shrink-0"
                      >
                        <Pencil size={11} />
                        Edit
                      </button>
                    </div>
                  )}

                  {item.customizations.length === 0 && (
                    <button
                      onClick={() => setEditingItem({ cartItemId: item.id, menuItem: item.menu_item })}
                      className="flex items-center gap-1.5 text-[12px] font-bold 
                                 text-brand-gold hover:text-brand-gold-soft 
                                 transition-colors mt-1.5"
                    >
                      <Plus size={12} />
                      Add toppings
                    </button>
                  )}

                  {/* Quantity & Price */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border-2 border-brand-gold/30 
                                    rounded-xl overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-9 h-9 flex items-center justify-center 
                                   text-brand-gold hover:bg-brand-gold/10 
                                   transition-colors"
                      >
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <span className="w-8 text-center text-[14px] font-bold 
                                       tabular-nums text-brand-gold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-9 h-9 flex items-center justify-center 
                                   text-brand-gold hover:bg-brand-gold/10 
                                   transition-colors"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                    <span className="font-bold text-brand-gold tabular-nums text-[16px]">
                      {'\u20B9'}{item.total_price.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add More Items */}
          <Link
            to="/menu"
            className="flex items-center justify-center gap-2 py-3.5 
                       text-[14px] font-bold text-brand-gold 
                       bg-brand-gold/5 hover:bg-brand-gold/10 
                       rounded-2xl border border-brand-gold/20
                       transition-all duration-300 group"
          >
            <Plus 
              size={16} 
              strokeWidth={2.5} 
              className="group-hover:rotate-90 transition-transform duration-300"
            />
            Add more items
          </Link>
        </div>

        {/* Sign In Prompt */}
        {!user && (
          <div className="bg-gradient-to-r from-brand-gold/10 to-brand-gold/5 
                          rounded-2xl p-5 border border-brand-gold/25 mb-5
                          animate-fade-in-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-gold/15 rounded-xl 
                              flex items-center justify-center flex-shrink-0">
                <User size={22} className="text-brand-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-[15px]">Sign in to continue</h3>
                <p className="text-[13px] text-brand-text-dim mt-0.5">
                  Track orders and save your details
                </p>
              </div>
              <Link
                to="/auth"
                state={{ from: '/cart' }}
                className="btn-primary text-[13px] py-2.5 px-5"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Customer Details */}
        {user && (
          <div className="bg-brand-surface/80 backdrop-blur-sm rounded-2xl p-5 
                          border border-brand-border mb-5 animate-fade-in-up"
               style={{ animationDelay: '0.1s' }}>
            <h3 className="font-bold text-white text-[14px] mb-4 flex items-center gap-2">
              <User size={16} className="text-brand-gold" />
              Your Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Your Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field text-[14px]"
              />
              <input
                type="tel"
                placeholder="Phone *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field text-[14px]"
              />
            </div>
          </div>
        )}

        {/* Service Mode Selection */}
        <div className="mb-5 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <h3 className="font-bold text-white text-[14px] mb-4 flex items-center gap-2">
            <Store size={16} className="text-brand-gold" />
            How would you like this order?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPickupOption('dine_in')}
              className={`relative flex flex-col items-center gap-3 p-5 
                          rounded-2xl border-2 transition-all duration-300 text-center
                          group ${
                pickupOption === 'dine_in'
                  ? 'border-brand-gold bg-brand-gold/10 shadow-glow-gold-soft'
                  : 'border-brand-border bg-brand-surface/60 hover:border-brand-gold/30'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center 
                              transition-all duration-300 ${
                pickupOption === 'dine_in' 
                  ? 'bg-brand-gold/20' 
                  : 'bg-brand-surface-light group-hover:bg-brand-gold/10'
              }`}>
                <Store size={22} className={`transition-colors ${
                  pickupOption === 'dine_in' ? 'text-brand-gold' : 'text-brand-text-dim'
                }`} />
              </div>
              <div>
                <span className={`text-[15px] font-bold block transition-colors ${
                  pickupOption === 'dine_in' ? 'text-white' : 'text-brand-text-muted'
                }`}>
                  Dine In
                </span>
                <span className="text-[12px] text-brand-text-dim">
                  Enjoy at the shop
                </span>
              </div>
              {pickupOption === 'dine_in' && (
                <CheckCircle2 
                  size={16} 
                  className="absolute top-3 right-3 text-brand-gold animate-scale-in" 
                />
              )}
            </button>
            <button
              onClick={() => setPickupOption('takeaway')}
              className={`relative flex flex-col items-center gap-3 p-5 
                          rounded-2xl border-2 transition-all duration-300 text-center
                          group ${
                pickupOption === 'takeaway'
                  ? 'border-brand-gold bg-brand-gold/10 shadow-glow-gold-soft'
                  : 'border-brand-border bg-brand-surface/60 hover:border-brand-gold/30'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center 
                              transition-all duration-300 ${
                pickupOption === 'takeaway' 
                  ? 'bg-brand-gold/20' 
                  : 'bg-brand-surface-light group-hover:bg-brand-gold/10'
              }`}>
                <ShoppingBag size={22} className={`transition-colors ${
                  pickupOption === 'takeaway' ? 'text-brand-gold' : 'text-brand-text-dim'
                }`} />
              </div>
              <div>
                <span className={`text-[15px] font-bold block transition-colors ${
                  pickupOption === 'takeaway' ? 'text-white' : 'text-brand-text-muted'
                }`}>
                  Takeaway
                </span>
                <span className="text-[12px] text-brand-text-dim">
                  Pack it to go
                </span>
              </div>
              {pickupOption === 'takeaway' && (
                <CheckCircle2 
                  size={16} 
                  className="absolute top-3 right-3 text-brand-gold animate-scale-in" 
                />
              )}
            </button>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="font-bold text-white text-[14px] mb-4 flex items-center gap-2">
            <Wallet size={16} className="text-brand-gold" />
            {isFreeOrder ? 'Payment covered by offer' : 'Payment Method'}
          </h3>
          {isFreeOrder ? (
            <div className="rounded-2xl border-2 border-emerald-500/30 
                            bg-emerald-500/10 p-5 text-center">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center 
                              mx-auto bg-emerald-500/20 mb-3">
                <Sparkles size={24} className="text-emerald-400" />
              </div>
              <span className="text-[16px] font-bold block text-white">
                Free Order
              </span>
              <span className="text-[13px] text-emerald-300 mt-1 block">
                Coupon covered the full amount. No payment required.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`relative flex flex-col items-center gap-3 p-5 
                            rounded-2xl border-2 transition-all duration-300 text-center
                            group ${
                  paymentMethod === 'card'
                    ? 'border-brand-gold bg-brand-gold/10 shadow-glow-gold-soft'
                    : 'border-brand-border bg-brand-surface/60 hover:border-brand-gold/30'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center 
                                transition-all duration-300 ${
                  paymentMethod === 'card' 
                    ? 'bg-brand-gold/20' 
                    : 'bg-brand-surface-light group-hover:bg-brand-gold/10'
                }`}>
                  <CreditCard size={22} className={`transition-colors ${
                    paymentMethod === 'card' ? 'text-brand-gold' : 'text-brand-text-dim'
                  }`} />
                </div>
                <div>
                  <span className={`text-[15px] font-bold block transition-colors ${
                    paymentMethod === 'card' ? 'text-white' : 'text-brand-text-muted'
                  }`}>
                    Pay Online
                  </span>
                  <span className="text-[12px] text-brand-text-dim">
                    UPI, cards & more
                  </span>
                </div>
                {paymentMethod === 'card' && (
                  <CheckCircle2 
                    size={16} 
                    className="absolute top-3 right-3 text-brand-gold animate-scale-in" 
                  />
                )}
              </button>
              <button
                onClick={() => setPaymentMethod('cod')}
                className={`relative flex flex-col items-center gap-3 p-5 
                            rounded-2xl border-2 transition-all duration-300 text-center
                            group ${
                  paymentMethod === 'cod'
                    ? 'border-brand-gold bg-brand-gold/10 shadow-glow-gold-soft'
                    : 'border-brand-border bg-brand-surface/60 hover:border-brand-gold/30'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center 
                                transition-all duration-300 ${
                  paymentMethod === 'cod' 
                    ? 'bg-brand-gold/20' 
                    : 'bg-brand-surface-light group-hover:bg-brand-gold/10'
                }`}>
                  <Wallet size={22} className={`transition-colors ${
                    paymentMethod === 'cod' ? 'text-brand-gold' : 'text-brand-text-dim'
                  }`} />
                </div>
                <div>
                  <span className={`text-[15px] font-bold block transition-colors ${
                    paymentMethod === 'cod' ? 'text-white' : 'text-brand-text-muted'
                  }`}>
                    Pay at Counter
                  </span>
                  <span className="text-[12px] text-brand-text-dim">
                    Cash / UPI
                  </span>
                </div>
                {paymentMethod === 'cod' && (
                  <CheckCircle2 
                    size={16} 
                    className="absolute top-3 right-3 text-brand-gold animate-scale-in" 
                  />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Coupon Section */}
        <div className="bg-brand-surface/80 backdrop-blur-sm rounded-2xl p-5 
                        border border-brand-border mb-5 animate-fade-in-up"
             style={{ animationDelay: '0.25s' }}>
          <h3 className="font-bold text-white text-[14px] mb-4 flex items-center gap-2">
            <Tag size={16} className="text-brand-gold" />
            Have a coupon?
          </h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-dim" />
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="input-field pl-10 text-[14px] uppercase"
              />
            </div>
            <button 
              onClick={applyCoupon} 
              className="btn-outline px-5 py-3 text-[13px] font-bold rounded-xl"
            >
              Apply
            </button>
          </div>
          {couponError && (
            <p className="text-red-400 text-[12px] mt-3 font-medium">
              {couponError}
            </p>
          )}
          {appliedOffer && (
            <div className="mt-3 bg-emerald-500/10 text-emerald-400 text-[13px] 
                            px-4 py-3 rounded-xl flex items-center justify-between
                            border border-emerald-500/20 animate-scale-in">
              <span className="font-semibold flex items-center gap-2">
                <CheckCircle2 size={14} />
                {appliedOffer.title} applied!
              </span>
              <button 
                onClick={() => { setAppliedOffer(null); setCouponCode(''); }} 
                className="font-bold hover:underline"
              >
                Remove
              </button>
            </div>
          )}
          {featuredAutomaticOffer && (
            <div className={`mt-3 text-[13px] px-4 py-3 rounded-xl border animate-fade-in ${
              automaticDiscount > 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-brand-gold/10 text-brand-gold border-brand-gold/20'
            }`}>
              <span className="font-semibold flex items-center gap-2">
                <Sparkles size={14} />
                {automaticDiscount > 0 
                  ? `${featuredAutomaticOffer.title} applied automatically!` 
                  : `${featuredAutomaticOffer.title} available:`}
              </span>
              <span className="block mt-1 text-[12px] opacity-80">
                {automaticDiscount > 0
                  ? `You saved Rs.${automaticDiscount.toFixed(0)}`
                  : getOfferRuleSummary(featuredAutomaticOffer)}
              </span>
            </div>
          )}
        </div>

        {/* Email Notification Info */}
        <div className="bg-brand-surface/60 rounded-2xl p-4 border border-brand-border 
                        mb-5 animate-fade-in-up flex items-center gap-3"
             style={{ animationDelay: '0.3s' }}>
          <div className="w-10 h-10 bg-brand-gold/10 rounded-xl 
                          flex items-center justify-center flex-shrink-0">
            <Mail size={18} className="text-brand-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-brand-text-muted">
              Order confirmation will be sent to your email
            </p>
            <p className="text-[11px] text-brand-text-dim mt-0.5">
              Receipt on payment, notification when ready
            </p>
          </div>
          <Shield size={16} className="text-emerald-400 flex-shrink-0" />
        </div>

        {/* Order Summary */}
        <div className="bg-brand-surface/80 backdrop-blur-sm rounded-2xl p-5 
                        border border-brand-border mb-6 animate-fade-in-up"
             style={{ animationDelay: '0.35s' }}>
          <h3 className="font-bold text-white text-[14px] mb-4">Order Summary</h3>
          <div className="space-y-2.5 text-[14px]">
            <div className="flex justify-between text-brand-text-muted">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium">{'\u20B9'}{subtotal.toFixed(0)}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Tag size={12} />
                  Coupon Discount
                </span>
                <span className="tabular-nums font-medium">-{'\u20B9'}{couponDiscount.toFixed(0)}</span>
              </div>
            )}
            {automaticDiscount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={12} />
                  Offer Discount
                </span>
                <span className="tabular-nums font-medium">-{'\u20B9'}{automaticDiscount.toFixed(0)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold 
                              py-2 bg-emerald-500/5 rounded-lg px-3 -mx-3">
                <span>Total Savings</span>
                <span className="tabular-nums">-{'\u20B9'}{discount.toFixed(0)}</span>
              </div>
            )}
            <div className="border-t border-brand-border pt-3 flex justify-between font-bold">
              <span className="text-white text-[16px]">Total</span>
              <span className="tabular-nums text-[20px] tracking-tight text-brand-gold">
                {'\u20B9'}{total.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Place Order Button - Fixed */}
        <div className="cart-submit-bar">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handlePlaceOrder}
              disabled={submitting || !!(settings && !settings.site_is_open)}
              className="btn-primary w-full text-center text-[16px] font-extrabold 
                         py-4 rounded-2xl tracking-tight
                         flex items-center justify-center gap-2"
            >
              {!user ? (
                <>
                  <User size={18} />
                  Sign In to Place Order
                </>
              ) : settings && !settings.site_is_open ? (
                settings.reopening_text || 'Orders Closed'
              ) : submitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-brand-bg/30 border-t-brand-bg 
                                  rounded-full animate-spin" />
                  {paymentMethod === 'card' && !isFreeOrder 
                    ? 'Opening Payment...' 
                    : 'Placing Order...'}
                </span>
              ) : isFreeOrder ? (
                <>
                  <Sparkles size={18} />
                  Place Order - FREE
                </>
              ) : (
                <>
                  Place Order - {'\u20B9'}{total.toFixed(0)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {editingItem && (
        <CustomizationModal
          item={editingItem.menuItem}
          onClose={() => setEditingItem(null)}
          onConfirm={handleEditConfirm}
        />
      )}
    </div>
  );
}

function CartCustomizations({ customizations }: { customizations: SelectedCustomization[] }) {
  const grouped: Record<string, string[]> = {};
  for (const c of customizations) {
    if (!grouped[c.group_name]) grouped[c.group_name] = [];
    grouped[c.group_name].push(c.option_name);
  }

  return (
    <div className="space-y-0.5">
      {Object.entries(grouped).map(([group, options]) => (
        <p key={group} className="text-[11px] text-brand-text-dim leading-snug truncate">
          <span className="text-brand-text-muted">{group}:</span> {options.join(', ')}
        </p>
      ))}
    </div>
  );
}
