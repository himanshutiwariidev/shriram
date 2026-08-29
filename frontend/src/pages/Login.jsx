import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [mounted, setMounted]   = useState(false);
  const [noticeModal, setNoticeModal] = useState(null); // { message } | null
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  // Set by services/api.js when an active session is forcibly ended
  // (organization suspended/expired/deleted mid-session) — shown once,
  // then cleared, on landing back here.
  useEffect(() => {
    const stashed = sessionStorage.getItem("authNotice");
    if (stashed) {
      setNoticeModal({ title: "Session Ended", message: stashed });
      sessionStorage.removeItem("authNotice");
    }
  }, []);

  const NOTICE_TITLES = {
    ORG_SUSPENDED: "Account Suspended",
    ORG_EXPIRED: "Subscription Expired",
    ORG_NOT_FOUND: "Organization Not Found",
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await API.post("/users/login", { email, password });
      login({ token: data.token, user: data.user });
      const role = data.user.role;
      if (role === "superadmin") navigate("/superadmin");
      else if (role === "admin") navigate("/admin");
      else if (role === "hr") navigate("/hr");
      else if (role === "sales") navigate("/sales");
      else if (role === "client") navigate("/client/dashboard");
      else navigate("/dashboard");
    } catch (err) {
      const code = err?.response?.data?.code;
      const serverMessage = err?.response?.data?.message;
      if (typeof code === "string" && code.startsWith("ORG_")) {
        setNoticeModal({ title: NOTICE_TITLES[code] || "Account Notice", message: serverMessage });
      } else {
        setError(serverMessage || "Invalid credentials. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #080b14; }

        .login-root {
          min-height: 100vh;
          display: flex;
          background: #080b14;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          position: relative;
        }

        /* ── animated mesh background ── */
        .bg-mesh {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 80% 60% at 70% 20%, rgba(255,160,0,0.09) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 20% 80%, rgba(255,100,0,0.07) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 90% 80%, rgba(255,200,50,0.05) 0%, transparent 50%),
            #080b14;
        }

        /* ── grid lines ── */
        .bg-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* ── orbs ── */
        .orb {
          position: fixed; border-radius: 50%; pointer-events: none; z-index: 0;
          filter: blur(80px);
          animation: drift 12s ease-in-out infinite alternate;
        }
        .orb1 { width: 500px; height: 500px; top: -120px; right: -80px; background: rgba(255,145,0,0.12); animation-duration: 14s; }
        .orb2 { width: 380px; height: 380px; bottom: -100px; left: -60px; background: rgba(255,80,20,0.09); animation-duration: 10s; animation-delay: -5s; }
        .orb3 { width: 280px; height: 280px; top: 40%; left: 35%; background: rgba(255,180,0,0.06); animation-duration: 16s; animation-delay: -8s; }

        @keyframes drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 40px) scale(1.08); }
        }

        /* ── split layout ── */
        .left-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px;
          position: relative;
          z-index: 1;
          opacity: 0;
          transform: translateX(-30px);
          transition: opacity .7s ease, transform .7s ease;
        }
        .left-panel.in { opacity: 1; transform: translateX(0); }

        .right-panel {
          width: 480px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          position: relative;
          z-index: 1;
        }

        /* ── brand mark ── */
        .brand-mark {
          display: flex; align-items: center; gap: 12px; margin-bottom: 64px;
        }
        .brand-icon {
          width: 42px; height: 42px; border-radius: 10px;
          background: linear-gradient(135deg, #ff9500, #ff5500);
          display: grid; place-items: center;
          box-shadow: 0 0 32px rgba(255,140,0,0.4);
        }
        .brand-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px; letter-spacing: .08em;
          color: #ffffff; line-height: 1;
        }
        .brand-sub {
          font-size: 10px; color: rgba(255,255,255,0.35);
          letter-spacing: .2em; text-transform: uppercase;
          font-weight: 500; margin-top: 2px;
        }

        /* ── headline ── */
        .headline {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(52px, 6vw, 82px);
          line-height: .95;
          color: #ffffff;
          letter-spacing: .03em;
          margin-bottom: 24px;
        }
        .headline span {
          display: block;
          background: linear-gradient(90deg, #ff9500, #ffcc00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .tagline {
          font-size: 15px; color: rgba(255,255,255,0.42);
          font-weight: 400; line-height: 1.7; max-width: 380px;
          margin-bottom: 56px;
        }

        /* ── stats row ── */
        .stats {
          display: flex; gap: 40px;
        }
        .stat-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 34px; color: #ff9500; line-height: 1;
          letter-spacing: .04em;
        }
        .stat-lbl {
          font-size: 11px; color: rgba(255,255,255,0.35);
          letter-spacing: .12em; text-transform: uppercase;
          font-weight: 500; margin-top: 4px;
        }
        .stat-div {
          width: 1px; background: rgba(255,255,255,0.08); align-self: stretch;
        }

        /* ── decorative line ── */
        .deco-line {
          width: 64px; height: 3px; border-radius: 99px;
          background: linear-gradient(90deg, #ff9500, #ff5500);
          margin-bottom: 32px;
          box-shadow: 0 0 16px rgba(255,140,0,0.5);
        }

        /* ── card ── */
        .login-card {
          width: 100%;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 48px 40px;
          backdrop-filter: blur(24px);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04) inset,
            0 40px 100px rgba(0,0,0,0.5);
          opacity: 0;
          transform: translateY(24px);
          transition: opacity .7s ease .15s, transform .7s ease .15s;
        }
        .login-card.in { opacity: 1; transform: translateY(0); }

        .card-eyebrow {
          font-size: 10.5px; letter-spacing: .22em; text-transform: uppercase;
          color: #ff9500; font-weight: 600; margin-bottom: 10px;
        }
        .card-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px; color: #fff; letter-spacing: .06em;
          margin-bottom: 6px;
        }
        .card-sub {
          font-size: 13px; color: rgba(255,255,255,0.35);
          margin-bottom: 36px; line-height: 1.6;
        }

        /* ── field ── */
        .field { margin-bottom: 18px; }
        .field-label {
          font-size: 11px; font-weight: 600; letter-spacing: .1em;
          text-transform: uppercase; color: rgba(255,255,255,0.45);
          display: block; margin-bottom: 8px;
        }
        .field-wrap { position: relative; }
        .field-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.25); display: flex; pointer-events: none;
        }
        .field-input {
          width: 100%; padding: 13px 14px 13px 42px;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: #fff; font-size: 14px; font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color .2s, background .2s, box-shadow .2s;
        }
        .field-input::placeholder { color: rgba(255,255,255,0.2); font-size: 13px; }
        .field-input:focus {
          border-color: rgba(255,149,0,0.6);
          background: rgba(255,149,0,0.05);
          box-shadow: 0 0 0 3px rgba(255,149,0,0.12);
        }
        .pw-toggle {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.25); display: flex; padding: 0;
          transition: color .15s;
        }
        .pw-toggle:hover { color: rgba(255,255,255,0.55); }

        /* ── error ── */
        .error-box {
          background: rgba(220,38,38,0.12);
          border: 1px solid rgba(220,38,38,0.3);
          border-radius: 10px; padding: 11px 14px;
          font-size: 13px; color: #fca5a5;
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 18px;
        }

        /* ── account notice modal (suspended/expired/not-found) ── */
        .notice-overlay {
          position: fixed; inset: 0; z-index: 2000;
          display: flex; align-items: center; justify-content: center;
          background: rgba(8,11,20,0.7); backdrop-filter: blur(6px);
          animation: fadeIn .18s ease;
        }
        .notice-card {
          width: min(380px, 90vw);
          background: #10131f;
          border: 1px solid rgba(255,149,0,0.25);
          border-radius: 20px;
          padding: 36px 30px 28px;
          text-align: center;
          box-shadow: 0 24px 80px rgba(0,0,0,.5);
          animation: slideUp .22s cubic-bezier(.22,1,.36,1);
        }
        .notice-icon {
          width: 56px; height: 56px; border-radius: 50%;
          background: rgba(255,149,0,0.12);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 18px;
        }
        .notice-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24px; letter-spacing: .04em; color: #fff;
          margin-bottom: 12px;
        }
        .notice-message {
          font-size: 13.5px; color: rgba(255,255,255,0.55);
          line-height: 1.7; margin-bottom: 24px;
        }
        .notice-ok {
          padding: 11px 32px; border: none; border-radius: 10px; cursor: pointer;
          background: linear-gradient(135deg, #ff9500, #ff5500);
          color: #fff; font-family: 'Bebas Neue', sans-serif;
          font-size: 15px; letter-spacing: .06em;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

        /* ── submit ── */
        .submit-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #ff9500, #ff5500);
          border: none; border-radius: 12px; cursor: pointer;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px; letter-spacing: .12em;
          color: #fff;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: filter .2s, transform .15s, box-shadow .2s;
          box-shadow: 0 8px 32px rgba(255,140,0,0.3);
          margin-top: 8px;
          position: relative; overflow: hidden;
        }
        .submit-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0; transition: opacity .2s;
        }
        .submit-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 12px 40px rgba(255,140,0,0.45); }
        .submit-btn:hover::before { opacity: 1; }
        .submit-btn:active { transform: translateY(0); filter: brightness(.97); }
        .submit-btn:disabled { filter: brightness(.6); cursor: not-allowed; transform: none; }

        /* spinner */
        .spin {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          animation: spin .7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── footer note ── */
        .card-footer {
          margin-top: 28px; padding-top: 22px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: space-between;
        }
        .footer-badge {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; color: rgba(255,255,255,0.25);
        }
        .dot-green { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.6); flex-shrink: 0; animation: pulse 2s ease infinite; }
        @keyframes pulse { 0%,100%{box-shadow:0 0 8px rgba(34,197,94,0.6)} 50%{box-shadow:0 0 16px rgba(34,197,94,0.9)} }

        .footer-copy {
          font-size: 11px; color: rgba(255,255,255,0.18);
        }

        /* ── bottom left copy ── */
        .bottom-left {
          position: fixed; bottom: 32px; left: 64px; z-index: 2;
          font-size: 11px; color: rgba(255,255,255,0.18);
          letter-spacing: .08em;
        }

        /* ── responsive ── */
        @media (max-width: 900px) {
          .left-panel { display: none; }
          .right-panel { width: 100%; padding: 32px 24px; }
        }
      `}</style>

      <div className="login-root">
        <div className="bg-mesh" />
        <div className="bg-grid" />
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />

        {/* ── LEFT PANEL ── */}
        <div className={`left-panel${mounted ? " in" : ""}`}>
          <div className="brand-mark">
            <div className="brand-icon">
              {/* Lightning bolt icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z" fill="white" strokeWidth="0"/>
              </svg>
            </div>
            <div>
              <div className="brand-name">Bharat Bizmart</div>
              <div className="brand-sub">Performance Marketing Agency</div>
            </div>
          </div>

          <div className="deco-line" />

          <h1 className="headline">
            Growth.<br />
            <span>Measured.</span><br />
            Delivered.
          </h1>

          <p className="tagline">
            Your central command for campaigns, clients,<br />
            and conversions. Everything in one place.
          </p>

          <div className="stats">
            <div>
              <div className="stat-num">120+</div>
              <div className="stat-lbl">Projects</div>
            </div>
            <div className="stat-div" />
            <div>
              <div className="stat-num">10+</div>
              <div className="stat-lbl">Years</div>
            </div>
            <div className="stat-div" />
            <div>
              <div className="stat-num">25+</div>
              <div className="stat-lbl">Experts</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          <div className={`login-card${mounted ? " in" : ""}`}>

            <div className="card-eyebrow">CRM Portal</div>
            <div className="card-title">Welcome Back</div>
            <div className="card-sub">Sign in to access your workspace</div>

            <form onSubmit={handleLogin}>

              {error && (
                <div className="error-box">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="field">
                <label className="field-label">Email Address</label>
                <div className="field-wrap">
                  <span className="field-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
                  </span>
                  <input
                    className="field-input"
                    type="email"
                    placeholder="you@bharatbizmart.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="field">
                <label className="field-label">Password</label>
                <div className="field-wrap">
                  <span className="field-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input
                    className="field-input"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(p => !p)}>
                    {showPw
                      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? <div className="spin" /> : (
                  <>
                    Sign In
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </>
                )}
              </button>
            </form>

            <div className="card-footer">
              <div className="footer-badge">
                <div className="dot-green" />
                All systems operational
              </div>
              <div className="footer-copy">© 2025 BB</div>
            </div>
          </div>
        </div>

        <div className="bottom-left">bharatbizmart.com · CRM v1.0</div>

        {noticeModal && (
          <div className="notice-overlay">
            <div className="notice-card">
              <div className="notice-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div className="notice-title">{noticeModal.title}</div>
              <p className="notice-message">{noticeModal.message}</p>
              <button className="notice-ok" onClick={() => setNoticeModal(null)}>OK</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
