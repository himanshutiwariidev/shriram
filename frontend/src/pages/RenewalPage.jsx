import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { getAuth, clearAuth } from "../services/authStorage";
import logo from "../assets/logo.png";

const PLANS = [
  { key: "starter",      label: "Starter",      price: 999,  desc: "Up to 5 users, core CRM features" },
  { key: "professional", label: "Professional",  price: 2499, desc: "Up to 25 users, advanced features" },
  { key: "business",     label: "Business",      price: 4999, desc: "Up to 100 users, full feature set" },
  { key: "enterprise",   label: "Enterprise",    price: 9999, desc: "Unlimited users, white-label ready" },
];

const DURATIONS = [
  { months: 1,  label: "1 Month",  discount: 0    },
  { months: 3,  label: "3 Months", discount: 0.05 },
  { months: 6,  label: "6 Months", discount: 0.10 },
  { months: 12, label: "1 Year",   discount: 0.15 },
];

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });

export default function RenewalPage() {
  const navigate = useNavigate();
  const { token, userName, userEmail, tenantId } = getAuth();

  const [selectedPlan, setSelectedPlan]     = useState("professional");
  const [selectedDur,  setSelectedDur]      = useState(1);
  const [loading,      setLoading]          = useState(false);
  const [status,       setStatus]           = useState(null); // "success" | "error"
  const [statusMsg,    setStatusMsg]        = useState("");
  const [notice,       setNotice]           = useState("");

  useEffect(() => {
    const n = sessionStorage.getItem("authNotice");
    if (n) { setNotice(n); sessionStorage.removeItem("authNotice"); }
    // If no token at all, send to login
    if (!token || !tenantId) navigate("/");
  }, [token, tenantId, navigate]);

  const calcTotal = (planKey, months) => {
    const plan = PLANS.find((p) => p.key === planKey);
    const dur  = DURATIONS.find((d) => d.months === months);
    if (!plan || !dur) return 0;
    return Math.round(plan.price * months * (1 - dur.discount));
  };

  const handlePay = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Failed to load Razorpay. Check your internet connection.");

      const { data } = await API.post("/subscription/create-order", {
        planName:       selectedPlan,
        durationMonths: selectedDur,
      });

      const { orderId, amount, currency, keyId } = data;
      const planLabel = PLANS.find((p) => p.key === selectedPlan)?.label || selectedPlan;

      const options = {
        key:         keyId,
        amount,
        currency,
        name:        "Bharat Bizmart",
        description: `${planLabel} Plan — ${selectedDur} month${selectedDur > 1 ? "s" : ""}`,
        image:       logo,
        order_id:    orderId,
        handler:     async (response) => {
          try {
            await API.post("/subscription/verify", {
              orderId:   response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            setStatus("success");
            setStatusMsg("Payment successful! Redirecting to your dashboard…");
            setTimeout(() => navigate("/admin"), 2800);
          } catch (err) {
            setStatus("error");
            setStatusMsg(err?.response?.data?.message || "Payment verification failed. Contact support.");
          }
        },
        prefill:  { name: userName || "", email: userEmail || "" },
        theme:    { color: "#f7931e" },
        modal:    { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setStatus("error");
        setStatusMsg("Payment failed. Please try again.");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setStatus("error");
      setStatusMsg(err?.response?.data?.message || err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  const handleLogout = () => { clearAuth(); navigate("/"); };

  const total = calcTotal(selectedPlan, selectedDur);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .plan-card { border: 2px solid #e5e7eb; border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: border-color .18s, box-shadow .18s; background: #fff; }
        .plan-card.active { border-color: #f7931e; box-shadow: 0 0 0 3px rgba(247,147,30,.15); }
        .dur-btn { border: 2px solid #e5e7eb; border-radius: 10px; padding: 10px 16px; cursor: pointer; background: #fff; font-family: inherit; font-size: 13.5px; font-weight: 500; transition: all .16s; }
        .dur-btn.active { border-color: #f7931e; background: #fff7ed; color: #ea580c; font-weight: 600; }
        .pay-btn { background: linear-gradient(135deg, #f7931e, #e8590c); color: #fff; border: none; border-radius: 12px; padding: 15px 32px; font-size: 16px; font-weight: 700; cursor: pointer; width: 100%; font-family: inherit; transition: opacity .16s; }
        .pay-btn:disabled { opacity: .55; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 560, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, padding: "0 4px" }}>
        <img src={logo} alt="Bharat Bizmart" style={{ height: 32 }} />
        <button onClick={handleLogout} style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          Sign out
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 20, boxShadow: "0 4px 32px rgba(0,0,0,.08)", overflow: "hidden" }}>

        {/* Banner */}
        <div style={{ background: "linear-gradient(135deg, #f7931e 0%, #e8590c 100%)", padding: "28px 32px" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            Renew Your Subscription
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.85)", lineHeight: 1.5 }}>
            {notice || "Your subscription has expired. Choose a plan below to continue using Bharat Bizmart CRM."}
          </div>
        </div>

        <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Success / Error message */}
          {status === "success" && (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "14px 18px", color: "#16a34a", fontWeight: 600, fontSize: 14 }}>
              {statusMsg}
            </div>
          )}
          {status === "error" && (
            <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 12, padding: "14px 18px", color: "#dc2626", fontWeight: 500, fontSize: 14 }}>
              {statusMsg}
            </div>
          )}

          {/* Plan selector */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#6b7280", marginBottom: 12 }}>Select Plan</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {PLANS.map((p) => (
                <div key={p.key} className={`plan-card${selectedPlan === p.key ? " active" : ""}`} onClick={() => setSelectedPlan(p.key)}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, lineHeight: 1.4 }}>{p.desc}</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#f7931e" }}>₹{p.price.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af" }}>/mo</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Duration selector */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#6b7280", marginBottom: 12 }}>Select Duration</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DURATIONS.map((d) => (
                <button key={d.months} className={`dur-btn${selectedDur === d.months ? " active" : ""}`} onClick={() => setSelectedDur(d.months)}>
                  {d.label}
                  {d.discount > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "#16a34a", fontWeight: 700 }}>{d.discount * 100}% off</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div style={{ background: "#f9fafb", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13.5, color: "#374151" }}>
                {PLANS.find((p) => p.key === selectedPlan)?.label} × {selectedDur} month{selectedDur > 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: 13.5, color: "#374151" }}>
                ₹{(PLANS.find((p) => p.key === selectedPlan)?.price * selectedDur).toLocaleString()}
              </span>
            </div>
            {DURATIONS.find((d) => d.months === selectedDur)?.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#16a34a" }}>Duration discount ({DURATIONS.find((d) => d.months === selectedDur).discount * 100}%)</span>
                <span style={{ fontSize: 13, color: "#16a34a" }}>
                  −₹{(PLANS.find((p) => p.key === selectedPlan)?.price * selectedDur * DURATIONS.find((d) => d.months === selectedDur).discount).toLocaleString()}
                </span>
              </div>
            )}
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: "#111827" }}>₹{total.toLocaleString()}</span>
            </div>
          </div>

          {/* Pay button */}
          <button className="pay-btn" onClick={handlePay} disabled={loading || status === "success"}>
            {loading ? "Opening payment…" : `Pay ₹${total.toLocaleString()} with Razorpay`}
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
            Secured by Razorpay · All major UPI, cards &amp; net banking accepted
          </p>
        </div>
      </div>
    </div>
  );
}
