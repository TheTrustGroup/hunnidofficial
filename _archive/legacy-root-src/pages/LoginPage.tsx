// ============================================================
// LoginPage.tsx  —  warehouse-pos/src/pages/LoginPage.tsx
// Premium dark brand panel + clean form. Mobile-first.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { validateLoginForm } from '../lib/validationSchemas';

const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconEyeOn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

/** Hunnid Official full logo — icon + wordmark. One source of truth for brand on login. */
const HunnidLogoFull = ({ width = 280 }: { width?: number }) => (
  <svg
    width={width}
    height={width * (120 / 480)}
    viewBox="0 0 480 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="flex-shrink-0"
    aria-hidden
  >
    <defs>
      <linearGradient id="loginIconGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7dd4fc" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="loginStrokeGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#5cacfa" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <rect x="0" y="10" width="100" height="100" rx="22" fill="#0f172a" />
    <rect
      x="0"
      y="10"
      width="100"
      height="100"
      rx="22"
      fill="none"
      stroke="url(#loginStrokeGrad)"
      strokeWidth="1.5"
      opacity="0.6"
    />
    <rect x="24" y="32" width="14" height="56" rx="3" fill="url(#loginIconGrad)" />
    <rect x="62" y="32" width="14" height="56" rx="3" fill="url(#loginIconGrad)" />
    <rect x="24" y="55" width="52" height="10" rx="3" fill="white" opacity="0.95" />
    <circle cx="82" cy="94" r="4" fill="#5cacfa" opacity="0.7" />
    <text
      x="118"
      y="66"
      fontFamily="'Helvetica Neue', 'Arial Black', sans-serif"
      fontSize="34"
      fontWeight="900"
      letterSpacing="-0.5"
      fill="white"
    >
      Hunnid
    </text>
    <text
      x="118"
      y="100"
      fontFamily="'Helvetica Neue', Arial, sans-serif"
      fontSize="26"
      fontWeight="700"
      letterSpacing="3.5"
      fill="#5cacfa"
    >
      OFFICIAL
    </text>
    <line x1="118" y1="73" x2="390" y2="73" stroke="#5cacfa" strokeWidth="1" opacity="0.25" />
  </svg>
);

const SERVER_UNREACHABLE = 'Cannot reach the server. Check your connection and try again.';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [showOfflineOption, setShowOfflineOption] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const { user, isAuthenticated, login, logout, loginOffline, sessionExpired, clearSessionExpired, authError, clearAuthError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    clearSessionExpired();
  }, [clearSessionExpired]);

  useEffect(() => {
    if (searchParams.get('session_expired') === '1') {
      setError('Your session expired. Please sign in again.');
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const t = setTimeout(() => { setReady(true); emailRef.current?.focus(); }, 60);
    return () => clearTimeout(t);
  }, []);

  // Show authError or sessionExpired in banner
  const bannerError = authError ?? (sessionExpired ? 'Your session expired. Please sign in again.' : null) ?? error;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const result = validateLoginForm(email, password);
    if (!result.success) {
      const first = Object.values(result.errors)[0];
      setError(first ?? 'Please check your email and password.');
      if (first) showToast('error', first);
      return;
    }
    if (loading) return;

    setLoading(true);
    setError('');
    setShowOfflineOption(false);
    clearAuthError();

    try {
      const redirectPath = await login(result.data.email, result.data.password);
      showToast('success', 'Login successful');
      navigate(redirectPath, { replace: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setError(message);
      const isServerUnreachable =
        message === SERVER_UNREACHABLE ||
        /load failed|failed to fetch|network error|networkrequestfailed/i.test(message);
      if (isServerUnreachable) {
        setShowOfflineOption(true);
        showToast('error', SERVER_UNREACHABLE);
      } else {
        showToast('error', message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleContinueOffline() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      showToast('error', 'Enter your email first');
      return;
    }
    loginOffline(trimmedEmail);
    showToast('success', 'Signed in offline. Your local inventory is available.');
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-[var(--min-h-viewport)] flex flex-col md:flex-row" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Dark brand panel ────────────────────────────────── */}
      <div className="relative overflow-hidden md:w-[400px] md:min-h-screen flex-shrink-0
                      flex flex-col justify-between px-5 py-6 md:px-12 md:py-14
                      bg-[#0A0E1A]">

        {/* Background grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.045] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="g" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M44 0L0 0 0 44" fill="none" stroke="white" strokeWidth="0.8"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>

        {/* Primary (brand) atmospheric glows */}
        <div className="absolute -top-20 -left-10 w-72 h-72 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(92,172,250,0.18) 0%, transparent 70%)' }}/>
        <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(92,172,250,0.1) 0%, transparent 70%)' }}/>
        {/* Vertical separator line */}
        <div className="absolute right-0 top-0 bottom-0 w-px hidden md:block"
             style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.07), transparent)' }}/>

        {/* Brand block — full logo (icon + wordmark); tagline + bullets desktop only */}
        <div className="relative z-10">
          <div className="md:hidden">
            <HunnidLogoFull width={160} />
          </div>
          <div className="hidden md:block">
            <HunnidLogoFull width={280} />
            <p className="text-slate-500 text-[14px] mt-5 leading-relaxed max-w-[260px]">
              Warehouse & point-of-sale system for your stores.
            </p>
            <div className="mt-7 space-y-2.5">
              {['Multi-warehouse inventory', 'Size-based stock tracking', 'Fast POS checkout'].map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#5cacfa' }}
                  />
                  <span className="text-[12px] text-slate-500">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Version */}
        <div className="relative z-10 hidden md:block">
          <p className="text-[11px] text-slate-700 font-mono">warehouse.hunnidofficial.com</p>
        </div>
      </div>

      {/* ── Form panel ──────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-4 py-8 md:py-0 md:px-6">
        <div className={`w-full max-w-[340px] md:max-w-[380px] transition-all duration-500
                         ${ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
             style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}>

          {/* Form header */}
          <div className="mb-6">
            <h2 className="text-xl md:text-[30px] font-black text-slate-900 tracking-tight leading-tight">
              Welcome back
            </h2>
            <p className="text-slate-400 text-[13px] md:text-[14px] mt-1 font-medium">
              Sign in to your workspace
            </p>
          </div>

          {/* Already signed in: offer "Sign in as different user" so shared links can show login */}
          {isAuthenticated && user && (
            <div className="mb-6 p-5 rounded-2xl bg-slate-100 border border-slate-200">
              <p className="text-[14px] font-medium text-slate-700">
                You are signed in as <strong className="text-slate-900">{user.email}</strong>.
              </p>
              <p className="text-[13px] text-slate-500 mt-1 mb-4">
                To use another account, sign out and sign in again.
              </p>
              <button
                type="button"
                onClick={async () => {
                  setSigningOut(true);
                  try {
                    await logout();
                    clearAuthError();
                    setError('');
                  } finally {
                    setSigningOut(false);
                  }
                }}
                disabled={signingOut}
                className="w-full py-2.5 px-4 rounded-xl text-[14px] font-semibold
                           bg-slate-200 text-slate-800 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
              >
                {signingOut ? 'Signing out…' : 'Sign in as different user'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/', { replace: true })}
                className="w-full mt-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900"
              >
                Continue to dashboard
              </button>
            </div>
          )}

          {/* Error banner */}
          {bannerError && (
            <div className="mb-5 px-4 py-3.5 rounded-2xl bg-red-50 border border-red-200
                            flex gap-3 items-start" style={{ animation: 'slideDown 0.2s ease' }}>
              <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-[13px] font-semibold text-red-700 leading-snug">{bannerError}</p>
            </div>
          )}

          {/* Form (hidden when already signed in so "different user" flow is clear) */}
          {!isAuthenticated && (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Email */}
            <div>
              <label htmlFor="login-email"
                     className="block text-[11px] font-bold text-slate-500 uppercase tracking-[0.09em] mb-2">
                Email address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <IconMail/>
                </span>
                <input
                  ref={emailRef}
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); clearAuthError(); }}
                  placeholder="admin@hunnidofficial.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full pl-11 pr-4 rounded-xl md:rounded-2xl border-[1.5px] border-slate-200 bg-white
                             text-[14px] md:text-[15px] text-slate-900 placeholder:text-slate-300
                             focus:outline-none focus:border-primary-400 focus:ring-[3px] focus:ring-primary-100
                             disabled:opacity-50 transition-all duration-150 h-11 md:h-[52px]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password"
                     className="block text-[11px] font-bold text-slate-500 uppercase tracking-[0.09em] mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <IconLock/>
                </span>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); clearAuthError(); }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full pl-11 pr-12 rounded-xl md:rounded-2xl border-[1.5px] border-slate-200 bg-white
                             text-[14px] md:text-[15px] text-slate-900 placeholder:text-slate-300
                             focus:outline-none focus:border-primary-400 focus:ring-[3px] focus:ring-primary-100
                             disabled:opacity-50 transition-all duration-150 h-11 md:h-[52px]"
                />
                <button type="button" tabIndex={-1}
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400
                                   hover:text-slate-600 transition-colors p-1">
                  {showPw ? <IconEyeOff/> : <IconEyeOn/>}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl md:rounded-2xl border-none bg-primary-500 hover:bg-primary-600
                           text-white text-[14px] md:text-[16px] font-extrabold tracking-wide
                           flex items-center justify-center gap-3 h-12 md:h-[56px]
                           disabled:bg-slate-200 disabled:text-slate-400
                           active:scale-[0.98] transition-all duration-150"
                style={{
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(92,172,250,0.35)',
                }}
              >
                {loading ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                         style={{ animation: 'spin 0.7s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Continue offline */}
            {showOfflineOption && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleContinueOffline}
                  className="w-full rounded-2xl border-2 border-slate-300 bg-transparent
                             text-slate-600 text-[14px] font-semibold
                             hover:bg-slate-100 hover:border-slate-400
                             py-3 transition-all duration-150"
                >
                  Continue offline
                </button>
              </div>
            )}
          </form>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center space-y-1">
            <p className="text-[12px] text-slate-400 font-medium">Warehouse Management System</p>
            <p className="text-[11px] text-slate-300 font-mono">v2.0 · hunnidofficial.com</p>
          </div>
        </div>
      </div>

      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap"/>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
