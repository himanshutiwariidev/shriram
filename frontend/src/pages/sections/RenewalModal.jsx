import React, { useState } from "react";
import { X } from "lucide-react";
import API from "../../services/api";
import { getAuth } from "../../services/authStorage";

const PLANS = [
  { key: "starter",      label: "Starter",      price: 999  },
  { key: "professional", label: "Professional",  price: 2499 },
  { key: "business",     label: "Business",      price: 4999 },
  { key: "enterprise",   label: "Enterprise",    price: 9999 },
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

const calcTotal = (planKey, months) => {
  const plan = PLANS.find((p) => p.key === planKey);
  const dur  = DURATIONS.find((d) => d.months === months);
  if (!plan || !dur) return 0;
  return Math.round(plan.price * months * (1 - dur.discount));
};

export default function RenewalModal({ onClose, onSuccess, currentPlan }) {
  const { userName, userEmail } = getAuth();
  const [plan,    setPlan]    = useState(currentPlan || "professional");
  const [dur,     setDur]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const total = calcTotal(plan, dur);

  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Failed to load Razorpay. Check your connection.");

      const { data } = await API.post("/subscription/create-order", {
        planName: plan, durationMonths: dur,
      });

      const planLabel = PLANS.find((p) => p.key === plan)?.label || plan;
      const options = {
        key:         data.keyId,
        amount:      data.amount,
        currency:    data.currency,
        name:        "Bharat Bizmart",
        description: `${planLabel} — ${dur} month${dur > 1 ? "s" : ""}`,
        order_id:    data.orderId,
        handler:     async (response) => {
          try {
            await API.post("/subscription/verify", {
              orderId:   response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            onSuccess?.(`Subscription renewed! Your ${planLabel} plan is now active.`);
            onClose();
          } catch (err) {
            setError(err?.response?.data?.message || "Verification failed. Contact support.");
            setLoading(false);
          }
        },
        prefill: { name: userName || "", email: userEmail || "" },
        theme:   { color: "#f7931e" },
        modal:   { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setError("Payment failed. Please try again.");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.22)" }}>

        {/* Header */}
        <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: "#111827" }}>Renew / Upgrade Subscription</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex" }}><X size={18} /></button>
        </div>

        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 20 }}>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "11px 14px", color: "#dc2626", fontSize: 13.5 }}>
              {error}
            </div>
          )}

          {/* Plan selector */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#6b7280", marginBottom: 10 }}>Plan</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {PLANS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPlan(p.key)}
                  style={{
                    border: `2px solid ${plan === p.key ? "#f7931e" : "#e5e7eb"}`,
                    borderRadius: 12, padding: "12px 14px", cursor: "pointer", background: plan === p.key ? "#fff7ed" : "#fff",
                    textAlign: "left", fontFamily: "inherit", transition: "all .15s",
                    boxShadow: plan === p.key ? "0 0 0 3px rgba(247,147,30,.12)" : "none",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "#111827" }}>{p.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#f7931e", marginTop: 4 }}>₹{p.price.toLocaleString()}<span style={{ fontWeight: 400, fontSize: 11, color: "#9ca3af" }}>/mo</span></div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration selector */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#6b7280", marginBottom: 10 }}>Duration</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DURATIONS.map((d) => (
                <button
                  key={d.months}
                  onClick={() => setDur(d.months)}
                  style={{
                    border: `2px solid ${dur === d.months ? "#f7931e" : "#e5e7eb"}`,
                    borderRadius: 9, padding: "9px 14px", cursor: "pointer",
                    background: dur === d.months ? "#fff7ed" : "#fff",
                    fontFamily: "inherit", fontSize: 13, fontWeight: dur === d.months ? 700 : 500,
                    color: dur === d.months ? "#ea580c" : "#374151",
                  }}
                >
                  {d.label}
                  {d.discount > 0 && <span style={{ marginLeft: 5, color: "#16a34a", fontWeight: 700, fontSize: 11 }}>{d.discount * 100}% off</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: "#f9fafb", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13.5, color: "#374151" }}>
                {PLANS.find((p) => p.key === plan)?.label} × {dur} mo
              </span>
              <span style={{ fontWeight: 800, fontSize: 17, color: "#111827" }}>₹{total.toLocaleString()}</span>
            </div>
            {DURATIONS.find((d) => d.months === dur)?.discount > 0 && (
              <div style={{ fontSize: 12, color: "#16a34a", marginTop: 4 }}>
                Saving ₹{(PLANS.find((p) => p.key === plan)?.price * dur * DURATIONS.find((d) => d.months === dur).discount).toLocaleString()} with {DURATIONS.find((d) => d.months === dur).discount * 100}% duration discount
              </div>
            )}
          </div>

          <button
            onClick={handlePay}
            disabled={loading}
            style={{ background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .6 : 1, width: "100%", fontFamily: "inherit" }}
          >
            {loading ? "Opening payment…" : `Pay ₹${total.toLocaleString()} with Razorpay`}
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: -8 }}>
            Secured by Razorpay · UPI, cards &amp; net banking accepted
          </p>
        </div>
      </div>
    </div>
  );
}
