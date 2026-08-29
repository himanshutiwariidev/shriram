import React, { useRef, useState } from "react";
import {
  Building2, Eye, EyeOff, Layers, Lock, Mail, Shield, User, UserPlus,
  Phone, Calendar, Droplets, UserCheck, MapPin, CreditCard, FileText,
  GraduationCap, Briefcase, Upload, X, Image,
} from "lucide-react";
import { FieldIcon, FormField, baseInp } from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export default function CreateUserSection({
  userForm,
  setUserForm,
  handleCreateUser,
  showPw,
  setShowPw,
  branches = [],
  departments = [],
}) {
  const { T } = useTenantTheme();
  const photoRef = useRef(null);
  const resumeRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const set = (field) => (e) =>
    setUserForm((f) => ({ ...f, [field]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUserForm((f) => ({ ...f, _photoFile: file }));
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleResumeChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUserForm((f) => ({ ...f, _resumeFile: file }));
  };

  const removePhoto = () => {
    setUserForm((f) => ({ ...f, _photoFile: null }));
    setPhotoPreview(null);
    if (photoRef.current) photoRef.current.value = "";
  };

  const removeResume = () => {
    setUserForm((f) => ({ ...f, _resumeFile: null }));
    if (resumeRef.current) resumeRef.current.value = "";
  };

  const isClient = userForm.role === "client";

  const sectionHead = (title) => (
    <div style={{
      fontSize: 11, fontWeight: 700, color: T.brand, textTransform: "uppercase",
      letterSpacing: ".08em", marginBottom: 14, paddingBottom: 8,
      borderBottom: `1.5px solid ${T.brandLight}`,
    }}>{title}</div>
  );

  return (
    <div className="fade-up" style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>
          Add New User
        </h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
          Create a new account and assign a role
        </p>
      </div>

      <form onSubmit={handleCreateUser}>
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 26 }}>

          {/* ── Account ─────────────────────────────────────────────── */}
          <div>
            {sectionHead("Account Details")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FormField label="Full Name">
                <div style={{ position: "relative" }}>
                  <FieldIcon icon={User} />
                  <input className="inp" style={baseInp} type="text" placeholder="John Doe" value={userForm.name} onChange={set("name")} required />
                </div>
              </FormField>
              <FormField label="Role">
                <div style={{ position: "relative" }}>
                  <FieldIcon icon={Shield} />
                  <select className="inp" style={{ ...baseInp, appearance: "none" }} value={userForm.role} onChange={set("role")}>
                    <option value="user">User</option>
                    <option value="hr">HR</option>
                    <option value="sales">Sales</option>
                    <option value="client">Client</option>
                  </select>
                </div>
              </FormField>
              <FormField label="Email Address" span2>
                <div style={{ position: "relative" }}>
                  <FieldIcon icon={Mail} />
                  <input className="inp" style={baseInp} type="email" placeholder="john@example.com" value={userForm.email} onChange={set("email")} required />
                </div>
              </FormField>
              <FormField label="Branch">
                <div style={{ position: "relative" }}>
                  <FieldIcon icon={Building2} />
                  <select className="inp" style={{ ...baseInp, appearance: "none" }} value={userForm.branchId} onChange={set("branchId")}>
                    <option value="">Unassigned</option>
                    {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              </FormField>
              <FormField label="Department">
                <div style={{ position: "relative" }}>
                  <FieldIcon icon={Layers} />
                  <select className="inp" style={{ ...baseInp, appearance: "none" }} value={userForm.departmentId} onChange={set("departmentId")}>
                    <option value="">Unassigned</option>
                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
              </FormField>
              <FormField label="Password" span2>
                <div style={{ position: "relative" }}>
                  <FieldIcon icon={Lock} />
                  <input className="inp" style={baseInp} type={showPw ? "text" : "password"} placeholder="Set a strong password" value={userForm.password} onChange={set("password")} required />
                  <button type="button" onClick={() => setShowPw((p) => !p)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 0 }}>
                    {showPw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                  </button>
                </div>
              </FormField>
            </div>
          </div>

          {/* ── Employee fields (non-client only) ───────────────────── */}
          {!isClient && (
            <>
              {/* Personal Info */}
              <div>
                {sectionHead("Personal Information")}
                <div style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start" }}>
                  {/* Photo upload */}
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 8 }}>Photo</div>
                    <div style={{ position: "relative", width: 96, height: 96, borderRadius: 12, border: `2px dashed ${T.inputBorder}`, background: T.inputBg, overflow: "hidden", display: "grid", placeItems: "center", cursor: "pointer" }}
                      onClick={() => photoRef.current?.click()}>
                      {photoPreview ? (
                        <>
                          <img src={photoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button type="button" onClick={(e) => { e.stopPropagation(); removePhoto(); }}
                            style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,.55)", border: "none", borderRadius: "50%", width: 20, height: 20, display: "grid", placeItems: "center", cursor: "pointer" }}>
                            <X size={10} color="#fff" />
                          </button>
                        </>
                      ) : (
                        <div style={{ textAlign: "center", color: T.textMuted }}>
                          <Image size={22} strokeWidth={1.5} />
                          <div style={{ fontSize: 9, marginTop: 4 }}>Upload</div>
                        </div>
                      )}
                    </div>
                    <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handlePhotoChange} />
                  </div>

                  {/* Right side grid */}
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <FormField label="Employee ID">
                      <div style={{ position: "relative" }}>
                        <FieldIcon icon={CreditCard} />
                        <input className="inp" style={baseInp} type="text" placeholder="EMP001" value={userForm.employeeId} onChange={set("employeeId")} />
                      </div>
                    </FormField>
                    <FormField label="Phone">
                      <div style={{ position: "relative" }}>
                        <FieldIcon icon={Phone} />
                        <input className="inp" style={baseInp} type="tel" placeholder="9876543210" value={userForm.phone} onChange={set("phone")} />
                      </div>
                    </FormField>
                    <FormField label="Date of Birth">
                      <div style={{ position: "relative" }}>
                        <FieldIcon icon={Calendar} />
                        <input className="inp" style={baseInp} type="date" value={userForm.dob} onChange={set("dob")} />
                      </div>
                    </FormField>
                    <FormField label="Gender">
                      <div style={{ position: "relative" }}>
                        <FieldIcon icon={UserCheck} />
                        <select className="inp" style={{ ...baseInp, appearance: "none" }} value={userForm.gender} onChange={set("gender")}>
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </FormField>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <FormField label="Blood Group">
                    <div style={{ position: "relative" }}>
                      <FieldIcon icon={Droplets} />
                      <select className="inp" style={{ ...baseInp, appearance: "none" }} value={userForm.bloodGroup} onChange={set("bloodGroup")}>
                        <option value="">Select</option>
                        {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </FormField>
                  <FormField label="Emergency Contact">
                    <div style={{ position: "relative" }}>
                      <FieldIcon icon={Phone} />
                      <input className="inp" style={baseInp} type="tel" placeholder="Emergency number" value={userForm.emergencyContact} onChange={set("emergencyContact")} />
                    </div>
                  </FormField>
                  <FormField label="Address" span2>
                    <div style={{ position: "relative" }}>
                      <FieldIcon icon={MapPin} />
                      <input className="inp" style={baseInp} type="text" placeholder="Full address" value={userForm.address} onChange={set("address")} />
                    </div>
                  </FormField>
                </div>
              </div>

              {/* Identity */}
              <div>
                {sectionHead("Identity & Compliance")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <FormField label="Aadhaar Number">
                    <div style={{ position: "relative" }}>
                      <FieldIcon icon={CreditCard} />
                      <input className="inp" style={baseInp} type="text" placeholder="XXXX XXXX XXXX" value={userForm.aadhaar} onChange={set("aadhaar")} maxLength={14} />
                    </div>
                  </FormField>
                  <FormField label="PAN Number">
                    <div style={{ position: "relative" }}>
                      <FieldIcon icon={CreditCard} />
                      <input className="inp" style={{ ...baseInp, textTransform: "uppercase" }} type="text" placeholder="ABCDE1234F" value={userForm.pan} onChange={set("pan")} maxLength={10} />
                    </div>
                  </FormField>
                </div>
              </div>

              {/* Professional */}
              <div>
                {sectionHead("Professional Details")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <FormField label="Qualification">
                    <div style={{ position: "relative" }}>
                      <FieldIcon icon={GraduationCap} />
                      <input className="inp" style={baseInp} type="text" placeholder="e.g. B.Tech, MBA" value={userForm.qualification} onChange={set("qualification")} />
                    </div>
                  </FormField>
                  <FormField label="Experience">
                    <div style={{ position: "relative" }}>
                      <FieldIcon icon={Briefcase} />
                      <input className="inp" style={baseInp} type="text" placeholder="e.g. 3 years, Fresher" value={userForm.experience} onChange={set("experience")} />
                    </div>
                  </FormField>
                  <FormField label="Joining Date">
                    <div style={{ position: "relative" }}>
                      <FieldIcon icon={Calendar} />
                      <input className="inp" style={baseInp} type="date" value={userForm.joiningDate} onChange={set("joiningDate")} />
                    </div>
                  </FormField>
                  <FormField label="Relieving Date">
                    <div style={{ position: "relative" }}>
                      <FieldIcon icon={Calendar} />
                      <input className="inp" style={baseInp} type="date" value={userForm.relievingDate} onChange={set("relievingDate")} />
                    </div>
                  </FormField>
                </div>

                {/* Resume upload */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 8 }}>Resume / CV</div>
                  {userForm._resumeFile ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 9, padding: "10px 14px" }}>
                      <FileText size={16} color={T.brand} />
                      <span style={{ fontSize: 12.5, color: T.textPrimary, flex: 1 }}>{userForm._resumeFile.name}</span>
                      <button type="button" onClick={removeResume} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2 }}>
                        <X size={14} color={T.textMuted} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => resumeRef.current?.click()}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 16px", borderRadius: 9, border: `1.5px dashed ${T.inputBorder}`, background: T.inputBg, color: T.textMuted, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", width: "100%" }}
                    >
                      <Upload size={14} strokeWidth={2} />
                      Click to upload PDF, DOC, or DOCX (max 5 MB)
                    </button>
                  )}
                  <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={handleResumeChange} />
                </div>
              </div>
            </>
          )}

          {/* ── Submit ─────────────────────────────────────────────── */}
          <button
            className="pri-btn"
            type="submit"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: ".03em", border: "none", cursor: "pointer" }}
          >
            <UserPlus size={16} strokeWidth={2} /> Create {isClient ? "Client User" : "Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
