// API Service for communicating with the Render backend
import { API_BASE_URL } from '../config/paymentConfig';

class ApiService {
  constructor() {
    this.serverStatus = 'unknown'; // 'unknown' | 'warming' | 'ready' | 'offline'
    this.statusListeners = [];
    this.userId = this.getOrCreateUserId();
  }

  getOrCreateUserId() {
    try {
      let id = localStorage.getItem('linguaflow_user_id');
      if (!id) {
        id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('linguaflow_user_id', id);
      }
      return id;
    } catch {
      return 'anonymous_user';
    }
  }

  onStatusChange(callback) {
    this.statusListeners.push(callback);
    callback(this.serverStatus);
  }

  notifyStatus(newStatus) {
    if (this.serverStatus !== newStatus) {
      this.serverStatus = newStatus;
      this.statusListeners.forEach((fn) => fn(newStatus));
    }
  }

  // Wake up the backend on page load
  async pingHealth() {
    this.notifyStatus('warming');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        this.notifyStatus('ready');
        return true;
      }
    } catch (e) {
      // Cold boot on Render can take 30-50s
      console.log('Backend waking up in background...');
    }

    // Retry once after 12s if still cold
    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (res.ok) {
          this.notifyStatus('ready');
        }
      } catch {
        this.notifyStatus('offline');
      }
    }, 12000);

    return false;
  }

  // Check daily Smart mode usage
  async getUsage() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/usage`, {
        headers: { 'x-user-id': this.userId }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return { dailyLimitMinutes: 30, usedMinutes: 0, remainingMinutes: 30, hasRemaining: true };
  }

  // Smart Mode translation via backend Gemini
  async translateSmart(text, sourceLang, targetLang) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId
        },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang,
          sessionDurationSeconds: 4
        })
      });

      const data = await res.json();

      if (!res.ok || data.fallback) {
        return {
          translatedText: '',
          fallback: true,
          error: data.error || 'busy',
          message: data.message || 'Smart mode is currently busy, switched to Basic.'
        };
      }

      return {
        translatedText: data.translatedText,
        fallback: false,
        remainingMinutes: data.remainingMinutes
      };
    } catch (err) {
      return {
        translatedText: '',
        fallback: true,
        error: 'network',
        message: 'Could not connect to Smart server, using Basic mode.'
      };
    }
  }

  // Create Stripe Checkout Session
  async createTipSession(amountGbp) {
    const res = await fetch(`${API_BASE_URL}/api/tips/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountGbp,
        returnUrl: window.location.origin
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create checkout session');
    }

    return await res.json();
  }
}

export const apiService = new ApiService();
