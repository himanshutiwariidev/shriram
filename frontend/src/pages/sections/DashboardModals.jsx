import React, { useRef, useState } from "react";
import {
  Activity, AlertCircle, Briefcase, Building2, Calendar, ClipboardList,
  Clock, Eye, EyeOff, Layers, Lock, Mail, MapPin, Phone, Save, Shield, User,
  CreditCard, Droplets, FileText, GraduationCap, Image, Upload, UserCheck, X,
} from "lucide-react";
import {
  ConfirmModal,
  FieldIcon,
  FormField,
  Modal,
  baseInp,
  baseInpNoIcon,
  fmtCurrency,
} from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const backendBase = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:4050";

function EditUserModal({ editUser, setEditUser, editUserForm, setEditUserForm, showEditPw, setShowEditPw, handleUpdateUser, branches, departments, T }) {
  const photoRef = useRef(null);
  const resumeRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(
    editUser?.profileImage ? `${backendBase}${editUser.profileImage}` : null
  );

  const set = (field) => (e) => setEditUserForm((f) => ({ ...f, [field]: e.target.value }));
  const isClient = editUserForm.role === "client";

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditUserForm((f) => ({ ...f, _photoFile: file }));
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleResumeChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditUserForm((f) => ({ ...f, _resumeFile: file }));
  };

  const sh = (label) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: T.brand, textTransform: "uppercase", letterSpacing: ".07em", margin: "16px 0 10px", paddingBottom: 6, borderBottom: `1px solid ${T.brandLight}` }}>{label}</div>
  );

  return (
    <Modal title={`Edit User — ${editUser.name}`} onClose={() => setEditUser(null)} width={680}>
      <form onSubmit={handleUpdateUser}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Account */}
          <div style={{ gridColumn: "1/-1" }}>{sh("Account")}</div>
          <FormField label="Full Name"><div style={{ position: "relative" }}><FieldIcon icon={User} /><input className="inp" style={baseInp} type="text" placeholder="Full name" value={editUserForm.name || ""} onChange={set("name")} required /></div></FormField>
          <FormField label="Role"><div style={{ position: "relative" }}><FieldIcon icon={Shield} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editUserForm.role || "user"} onChange={set("role")}><option value="user">User</option><option value="admin">Admin</option><option value="hr">HR</option><option value="sales">Sales</option><option value="client">Client</option></select></div></FormField>
          <FormField label="Email Address" span2><div style={{ position: "relative" }}><FieldIcon icon={Mail} /><input className="inp" style={baseInp} type="email" placeholder="Email" value={editUserForm.email || ""} onChange={set("email")} required /></div></FormField>
          <FormField label="Branch"><div style={{ position: "relative" }}><FieldIcon icon={Building2} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editUserForm.branchId || ""} onChange={set("branchId")}><option value="">Unassigned</option>{branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select></div></FormField>
          <FormField label="Department"><div style={{ position: "relative" }}><FieldIcon icon={Layers} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editUserForm.departmentId || ""} onChange={set("departmentId")}><option value="">Unassigned</option>{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></div></FormField>
          <FormField label="New Password (optional)" span2>
            <div style={{ position: "relative" }}>
              <FieldIcon icon={Lock} />
              <input className="inp" style={baseInp} type={showEditPw ? "text" : "password"} placeholder="Leave blank to keep current" value={editUserForm.password || ""} onChange={set("password")} />
              <button type="button" onClick={() => setShowEditPw((p) => !p)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 0 }}>
                {showEditPw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
              </button>
            </div>
          </FormField>

          {/* Employee fields */}
          {!isClient && (
            <>
              <div style={{ gridColumn: "1/-1" }}>{sh("Personal Information")}</div>
              {/* Photo */}
              <div style={{ gridColumn: "1/-1", display: "flex", gap: 14, alignItems: "center", marginBottom: 4 }}>
                <div style={{ position: "relative", width: 72, height: 72, borderRadius: 10, border: `2px dashed ${T.inputBorder}`, background: T.inputBg, overflow: "hidden", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }} onClick={() => photoRef.current?.click()}>
                  {photoPreview ? (
                    <>
                      <img src={photoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPhotoPreview(null); setEditUserForm((f) => ({ ...f, _photoFile: null })); }} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.5)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "grid", placeItems: "center", cursor: "pointer" }}><X size={9} color="#fff" /></button>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", color: T.textMuted }}><Image size={18} strokeWidth={1.5} /><div style={{ fontSize: 8, marginTop: 2 }}>Photo</div></div>
                  )}
                </div>
                <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handlePhotoChange} />
                <div style={{ flex: 1, fontSize: 11.5, color: T.textMuted }}>Click photo to change. Accepted: PNG, JPG, WebP (max 5 MB)</div>
              </div>

              <FormField label="Employee ID"><div style={{ position: "relative" }}><FieldIcon icon={CreditCard} /><input className="inp" style={baseInp} type="text" placeholder="EMP001" value={editUserForm.employeeId || ""} onChange={set("employeeId")} /></div></FormField>
              <FormField label="Phone"><div style={{ position: "relative" }}><FieldIcon icon={Phone} /><input className="inp" style={baseInp} type="tel" placeholder="9876543210" value={editUserForm.phone || ""} onChange={set("phone")} /></div></FormField>
              <FormField label="Date of Birth"><div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="date" value={editUserForm.dob || ""} onChange={set("dob")} /></div></FormField>
              <FormField label="Gender"><div style={{ position: "relative" }}><FieldIcon icon={UserCheck} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editUserForm.gender || ""} onChange={set("gender")}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div></FormField>
              <FormField label="Blood Group"><div style={{ position: "relative" }}><FieldIcon icon={Droplets} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editUserForm.bloodGroup || ""} onChange={set("bloodGroup")}><option value="">Select</option>{BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}</select></div></FormField>
              <FormField label="Emergency Contact"><div style={{ position: "relative" }}><FieldIcon icon={Phone} /><input className="inp" style={baseInp} type="tel" placeholder="Emergency number" value={editUserForm.emergencyContact || ""} onChange={set("emergencyContact")} /></div></FormField>
              <FormField label="Address" span2><div style={{ position: "relative" }}><FieldIcon icon={MapPin} /><input className="inp" style={baseInp} type="text" placeholder="Full address" value={editUserForm.address || ""} onChange={set("address")} /></div></FormField>

              <div style={{ gridColumn: "1/-1" }}>{sh("Identity & Professional")}</div>
              <FormField label="Aadhaar"><div style={{ position: "relative" }}><FieldIcon icon={CreditCard} /><input className="inp" style={baseInp} type="text" placeholder="XXXX XXXX XXXX" value={editUserForm.aadhaar || ""} onChange={set("aadhaar")} maxLength={14} /></div></FormField>
              <FormField label="PAN"><div style={{ position: "relative" }}><FieldIcon icon={CreditCard} /><input className="inp" style={{ ...baseInp, textTransform: "uppercase" }} type="text" placeholder="ABCDE1234F" value={editUserForm.pan || ""} onChange={set("pan")} maxLength={10} /></div></FormField>
              <FormField label="Qualification"><div style={{ position: "relative" }}><FieldIcon icon={GraduationCap} /><input className="inp" style={baseInp} type="text" placeholder="e.g. B.Tech" value={editUserForm.qualification || ""} onChange={set("qualification")} /></div></FormField>
              <FormField label="Experience"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="text" placeholder="e.g. 3 years" value={editUserForm.experience || ""} onChange={set("experience")} /></div></FormField>
              <FormField label="Joining Date"><div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="date" value={editUserForm.joiningDate || ""} onChange={set("joiningDate")} /></div></FormField>
              <FormField label="Relieving Date"><div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="date" value={editUserForm.relievingDate || ""} onChange={set("relievingDate")} /></div></FormField>

              {/* Resume */}
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 7 }}>Resume / CV</div>
                {editUserForm._resumeFile ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 8, padding: "8px 12px" }}>
                    <FileText size={14} color={T.brand} />
                    <span style={{ fontSize: 12, color: T.textPrimary, flex: 1 }}>{editUserForm._resumeFile.name}</span>
                    <button type="button" onClick={() => setEditUserForm((f) => ({ ...f, _resumeFile: null }))} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={13} color={T.textMuted} /></button>
                  </div>
                ) : editUser?.resume ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={`${backendBase}${editUser.resume}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: T.brand, textDecoration: "none" }}>View current resume</a>
                    <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
                    <button type="button" onClick={() => resumeRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.textMuted, fontFamily: "inherit" }}>Replace</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => resumeRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: `1.5px dashed ${T.inputBorder}`, background: T.inputBg, color: T.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    <Upload size={13} strokeWidth={2} /> Upload PDF, DOC or DOCX
                  </button>
                )}
                <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={handleResumeChange} />
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button type="button" onClick={() => setEditUser(null)} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", border: "none", cursor: "pointer" }}>
            <Save size={14} strokeWidth={2} /> Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function DashboardModals({
  users,
  branches = [],
  departments = [],
  editTask,
  setEditTask,
  editTaskForm,
  setEditTaskForm,
  handleUpdateTask,
  editUser,
  setEditUser,
  editUserForm,
  setEditUserForm,
  showEditPw,
  setShowEditPw,
  handleUpdateUser,
  editBranch,
  setEditBranch,
  editBranchForm,
  setEditBranchForm,
  handleUpdateBranch,
  editDepartment,
  setEditDepartment,
  editDepartmentForm,
  setEditDepartmentForm,
  handleUpdateDepartment,
  payUser,
  setPayUser,
  payingSalary,
  salaryForm,
  setSalaryForm,
  salaryPreview,
  handlePaySalary,
  deleteTask,
  setDeleteTask,
  handleDeleteTask,
  deleteUser,
  setDeleteUser,
  handleDeleteUser,
  deleteProject,
  setDeleteProject,
  handleDeleteProject,
  deleteBranch,
  setDeleteBranch,
  handleDeleteBranch,
  deleteDepartment,
  setDeleteDepartment,
  handleDeleteDepartment,
}) {
  const { T } = useTenantTheme();
  return (
    <>
      {editTask && (
        <Modal title="Edit Task" onClose={() => setEditTask(null)}>
          <form onSubmit={handleUpdateTask}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <FormField label="Task Title" span2><div style={{ position: "relative" }}><FieldIcon icon={ClipboardList} /><input className="inp" style={baseInp} type="text" placeholder="Task title" value={editTaskForm.title} onChange={e => setEditTaskForm({ ...editTaskForm, title: e.target.value })} required /></div></FormField>
              <FormField label="Assign To"><div style={{ position: "relative" }}><FieldIcon icon={User} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editTaskForm.assignedTo} onChange={e => setEditTaskForm({ ...editTaskForm, assignedTo: e.target.value })}><option value="">Unassigned</option>{users.filter(u => u.role === "user").map(u => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div></FormField>
              <FormField label="Due Date"><div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="date" value={editTaskForm.dueDate} onChange={e => setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })} /></div></FormField>
              <FormField label="Priority"><div style={{ position: "relative" }}><FieldIcon icon={AlertCircle} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editTaskForm.priority} onChange={e => setEditTaskForm({ ...editTaskForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></FormField>
              <FormField label="Status" span2><div style={{ position: "relative" }}><FieldIcon icon={Activity} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editTaskForm.status} onChange={e => setEditTaskForm({ ...editTaskForm, status: e.target.value })}><option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option></select></div></FormField>
              <FormField label="Description" span2><textarea className="inp" style={{ ...baseInpNoIcon, minHeight: 80 }} placeholder="Optional description…" value={editTaskForm.description} onChange={e => setEditTaskForm({ ...editTaskForm, description: e.target.value })} /></FormField>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEditTask(null)} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
                <Save size={14} strokeWidth={2} /> Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editUser && <EditUserModal
        editUser={editUser} setEditUser={setEditUser}
        editUserForm={editUserForm} setEditUserForm={setEditUserForm}
        showEditPw={showEditPw} setShowEditPw={setShowEditPw}
        handleUpdateUser={handleUpdateUser}
        branches={branches} departments={departments} T={T}
      />}

      {payUser && (
        <Modal title={`Pay Salary • ${payUser.name}`} onClose={() => !payingSalary && setPayUser(null)} width={640}>
          <form onSubmit={handlePaySalary}>
            <div style={{ marginBottom: 18, padding: "14px 16px", borderRadius: 12, background: T.brandLight, border: `1px solid ${T.brandMid}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.brand }}>Salary slip will be emailed to</div>
              <div style={{ fontSize: 14, color: T.textPrimary, marginTop: 5 }}>{payUser.email}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              <FormField label="Salary Month"><div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="month" value={salaryForm.salaryMonth} onChange={e => setSalaryForm({ ...salaryForm, salaryMonth: e.target.value })} required /></div></FormField>
              <FormField label="Basic Salary"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="50000" value={salaryForm.basicSalary} onChange={e => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })} required /></div></FormField>
              <FormField label="Home Allowance"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="5000" value={salaryForm.homeAllowance} onChange={e => setSalaryForm({ ...salaryForm, homeAllowance: e.target.value })} /></div></FormField>
              <FormField label="Travel Allowance"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="3000" value={salaryForm.travelAllowance} onChange={e => setSalaryForm({ ...salaryForm, travelAllowance: e.target.value })} /></div></FormField>
              <FormField label="Other Allowance"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="2000" value={salaryForm.otherAllowance} onChange={e => setSalaryForm({ ...salaryForm, otherAllowance: e.target.value })} /></div></FormField>
              <FormField label="Leaves"><div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="number" min="0" step="1" placeholder="0" value={salaryForm.leaves} onChange={e => setSalaryForm({ ...salaryForm, leaves: e.target.value })} /></div></FormField>
              <FormField label="PF"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="1800" value={salaryForm.pf} onChange={e => setSalaryForm({ ...salaryForm, pf: e.target.value })} /></div></FormField>
              <FormField label="Other Deductions"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="500" value={salaryForm.deductions} onChange={e => setSalaryForm({ ...salaryForm, deductions: e.target.value })} /></div></FormField>
              <FormField label="Auto Calculated In Hand" span2><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={{ ...baseInp, background: T.brandLight, color: T.brand, fontWeight: 700 }} type="text" value={fmtCurrency(salaryPreview.inHand)} readOnly /></div></FormField>
            </div>

            <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                ["Leave Cut", salaryPreview.leaveDeduction, "#c2410c", "#fff7ed", "#fdba74"],
                ["Allowances", salaryPreview.totalAllowances, T.green, T.greenBg, T.greenBorder],
                ["Deductions", salaryPreview.totalDeductions, T.red, T.redBg, T.redBorder],
                ["In Hand", salaryPreview.inHand, T.brand, T.brandLight, T.brandMid],
              ].map(([label, value, color, bg, border]) => (
                <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>{fmtCurrency(value)}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 12, background: "#fff", border: `1px solid ${T.borderLight}`, fontSize: 12.5, color: T.textSecondary, lineHeight: 1.65 }}>
              Final salary is auto-calculated using the selected month. Leave deduction = basic salary / {salaryPreview.daysInMonth} days × {salaryPreview.leaves} leave{salaryPreview.leaves !== 1 ? "s" : ""}.
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setPayUser(null)} disabled={payingSalary} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: payingSalary ? "default" : "pointer", fontFamily: "inherit", opacity: payingSalary ? 0.7 : 1 }}>Cancel</button>
              <button className="pri-btn" type="submit" disabled={payingSalary} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", opacity: payingSalary ? 0.8 : 1 }}>
                <Save size={14} strokeWidth={2} /> {payingSalary ? "Sending..." : "Pay & Send Slip"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editBranch && (
        <Modal title="Edit Branch" onClose={() => setEditBranch(null)}>
          <form onSubmit={handleUpdateBranch}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <FormField label="Branch Name" span2><div style={{ position: "relative" }}><FieldIcon icon={Building2} /><input className="inp" style={baseInp} type="text" placeholder="Branch name" value={editBranchForm.name} onChange={e => setEditBranchForm({ ...editBranchForm, name: e.target.value })} required /></div></FormField>
              <FormField label="Address" span2><div style={{ position: "relative" }}><FieldIcon icon={MapPin} /><input className="inp" style={baseInp} type="text" placeholder="Street, city" value={editBranchForm.address} onChange={e => setEditBranchForm({ ...editBranchForm, address: e.target.value })} /></div></FormField>
              <FormField label="Manager"><div style={{ position: "relative" }}><FieldIcon icon={User} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editBranchForm.manager || ""} onChange={e => setEditBranchForm({ ...editBranchForm, manager: e.target.value })}><option value="">Unassigned</option>{users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div></FormField>
              <FormField label="Phone"><div style={{ position: "relative" }}><FieldIcon icon={Phone} /><input className="inp" style={baseInp} type="text" placeholder="Contact number" value={editBranchForm.phone} onChange={e => setEditBranchForm({ ...editBranchForm, phone: e.target.value })} /></div></FormField>
              <FormField label="Working Hours"><div style={{ position: "relative" }}><FieldIcon icon={Clock} /><input className="inp" style={baseInp} type="text" placeholder="9:00 AM - 6:00 PM" value={editBranchForm.workingHours} onChange={e => setEditBranchForm({ ...editBranchForm, workingHours: e.target.value })} /></div></FormField>
              <FormField label="Status"><div style={{ position: "relative" }}><FieldIcon icon={Building2} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editBranchForm.status} onChange={e => setEditBranchForm({ ...editBranchForm, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div></FormField>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEditBranch(null)} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
                <Save size={14} strokeWidth={2} /> Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editDepartment && (
        <Modal title="Edit Department" onClose={() => setEditDepartment(null)}>
          <form onSubmit={handleUpdateDepartment}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <FormField label="Department Name" span2><div style={{ position: "relative" }}><FieldIcon icon={Layers} /><input className="inp" style={baseInp} type="text" placeholder="Department name" value={editDepartmentForm.name} onChange={e => setEditDepartmentForm({ ...editDepartmentForm, name: e.target.value })} required /></div></FormField>
              <FormField label="Branch" span2><div style={{ position: "relative" }}><FieldIcon icon={Building2} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editDepartmentForm.branch || ""} onChange={e => setEditDepartmentForm({ ...editDepartmentForm, branch: e.target.value })}><option value="">No specific branch</option>{branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select></div></FormField>
              <FormField label="Description" span2><textarea className="inp" style={{ ...baseInpNoIcon, minHeight: 80 }} placeholder="Optional description…" value={editDepartmentForm.description} onChange={e => setEditDepartmentForm({ ...editDepartmentForm, description: e.target.value })} /></FormField>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEditDepartment(null)} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
                <Save size={14} strokeWidth={2} /> Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTask && <ConfirmModal title="Delete Task" message={`Are you sure you want to delete "${deleteTask.title}"? This action cannot be undone.`} onConfirm={handleDeleteTask} onClose={() => setDeleteTask(null)} />}
      {deleteUser && <ConfirmModal title="Delete User" message={`Are you sure you want to delete the account for "${deleteUser.name}"? All their task assignments may be affected.`} onConfirm={handleDeleteUser} onClose={() => setDeleteUser(null)} />}
      {deleteProject && <ConfirmModal title="Delete Project" message={`Are you sure you want to delete "${deleteProject.companyName}"? This action cannot be undone.`} onConfirm={handleDeleteProject} onClose={() => setDeleteProject(null)} />}
      {deleteBranch && <ConfirmModal title="Delete Branch" message={`Are you sure you want to delete "${deleteBranch.name}"? This action cannot be undone.`} onConfirm={handleDeleteBranch} onClose={() => setDeleteBranch(null)} />}
      {deleteDepartment && <ConfirmModal title="Delete Department" message={`Are you sure you want to delete "${deleteDepartment.name}"? This action cannot be undone.`} onConfirm={handleDeleteDepartment} onClose={() => setDeleteDepartment(null)} />}
    </>
  );
}
