import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Building2, Calendar, ClipboardList, Clock,
  LayoutDashboard, Layers, Plus, UserPlus, Users,
  BarChart3, Receipt, Tag, Store, Wallet, FileText, TrendingUp, Map, MailOpen,
  Megaphone, MessageSquare, BarChart2, CalendarDays, Shield, Award,
} from "lucide-react";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  PROJECT_CHART_COLORS,
  PROJECT_EMPTY_FORM,
  PROJECT_TAB_FIELDS,
  PROJECT_TAB_LABELS,
  PRIORITY_COLORS,
  daysUntil,
  escapeCsvValue,
  fmtMin,
  formatCsvDate,
  listFromResponse,
} from "./shared";

// Maps a Client's latest Work Progress status onto the same 3-bucket model used by
// plain Tasks (pending/in-progress/completed), so clients assigned via the Client
// Detail page's "Assign Task" action count toward the same Total/Done/In-Progress/
// Pending stats as real Task-model entries shown on "All Tasks".
const mapProgressToTaskStatus = (progressStatus) => {
  if (progressStatus === "Completed") return "completed";
  if (progressStatus === "In Progress") return "in-progress";
  return "pending";
};

export default function useAdminDashboard() {
  const navigate = useNavigate();
  const { role: authRole, logout } = useAuth();

  const [users, setUsers] = useState([]);
  const [tasksState, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [projectsState, setProjects] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  // null = not loaded yet — treated as "nothing locked" to avoid a flash of
  // locked icons before the request resolves; see isTabLocked() below.
  const [enabledFeatures, setEnabledFeatures] = useState(null);
  const [lockedFeatureModal, setLockedFeatureModal] = useState(null); // tab label, or null when closed
  const [subscription, setSubscription] = useState(null);
  const [featureCatalog, setFeatureCatalog] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalDeliverables: 0,
    completedDeliverables: 0,
    pendingDeliverables: 0,
    overallCompletionPercent: 0,
    totalRevenue: 0,
    outstandingPayments: 0,
    overduePayments: 0,
    collectedThisMonth: 0,
  });
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [showPw, setShowPw] = useState(false);

  const EMPTY_USER_FORM = {
    name: "", email: "", password: "", role: "user", branchId: "", departmentId: "",
    phone: "", employeeId: "", dob: "", bloodGroup: "", gender: "",
    emergencyContact: "", address: "", aadhaar: "", pan: "",
    qualification: "", experience: "", joiningDate: "", relievingDate: "",
    // file objects — not serialisable to JSON, kept separate from text fields
    _photoFile: null, _resumeFile: null,
  };
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" });
  const [branchForm, setBranchForm] = useState({ name: "", address: "", manager: "", phone: "", workingHours: "", timezone: "", status: "active" });
  const [departmentForm, setDepartmentForm] = useState({ name: "", description: "", branch: "" });
  const [projectForm, setProjectForm] = useState(PROJECT_EMPTY_FORM);
  const [projectFormTab, setProjectFormTab] = useState("allProjects");
  const [projectListTab, setProjectListTab] = useState("allProjects");

  const [editTask, setEditTask] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({});
  const [editUser, setEditUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({});
  const [editProject, setEditProject] = useState(null);
  const [showEditPw, setShowEditPw] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [editBranchForm, setEditBranchForm] = useState({});
  const [editDepartment, setEditDepartment] = useState(null);
  const [editDepartmentForm, setEditDepartmentForm] = useState({});

  const [deleteTask, setDeleteTask] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteProject, setDeleteProject] = useState(null);
  const [deleteBranch, setDeleteBranch] = useState(null);
  const [deleteDepartment, setDeleteDepartment] = useState(null);
  const [payUser, setPayUser] = useState(null);
  const [payingSalary, setPayingSalary] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    salaryMonth: new Date().toISOString().slice(0, 7),
    basicSalary: "",
    homeAllowance: "",
    travelAllowance: "",
    otherAllowance: "",
    leaves: "",
    pf: "",
    deductions: "",
  });

  const [attFilters, setAttFilters] = useState({ date: "", userId: "", status: "", month: new Date().toISOString().slice(0, 7) });
  const [attRows, setAttRows] = useState([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState(null);
  const [attPage, setAttPage] = useState(1);
  const [attPagination, setAttPagination] = useState({ total: 0, totalPages: 1 });
  const [attSummary, setAttSummary] = useState({ todayOverallMinutes: 0, monthlyTotalMinutes: 0 });

  const [leaves, setLeaves] = useState([]);
  const [leaveActionId, setLeaveActionId] = useState(null);

  const [attDashboardDate, setAttDashboardDate] = useState(new Date().toISOString().slice(0, 10));
  const [attDashboard, setAttDashboard] = useState(null);
  const [attDashboardLoading, setAttDashboardLoading] = useState(false);
  const [attDashboardError, setAttDashboardError] = useState(null);

  const tasks = Array.isArray(tasksState) ? tasksState : [];
  const projects = Array.isArray(projectsState) ? projectsState : [];

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => { try { const { data } = await API.get("/users"); setUsers(listFromResponse(data, "users")); } catch { /* dashboard keeps partial data when a widget fails */ } };
  const fetchTasks = async () => { try { const { data } = await API.get("/tasks"); setTasks(listFromResponse(data, "tasks")); } catch { /* dashboard keeps partial data when a widget fails */ } };
  const fetchClients = async () => { try { const { data } = await API.get("/clients"); setClients(listFromResponse(data, "clients")); } catch { /* dashboard keeps partial data when a widget fails */ } };
  const fetchProjects = async () => { try { const { data } = await API.get("/projects"); setProjects(listFromResponse(data, "projects")); } catch { /* dashboard keeps partial data when a widget fails */ } };
  const fetchProposals = async () => { try { const { data } = await API.get("/clients/proposals/all"); setProposals(listFromResponse(data, "proposals")); } catch { /* dashboard keeps partial data when a widget fails */ } };
  const fetchReminders = async () => { try { const { data } = await API.get("/clients/reminders/all"); setReminders(listFromResponse(data, "reminders")); } catch { /* dashboard keeps partial data when a widget fails */ } };
  const fetchDashboardStats = async (range) => {
    try {
      const params = range?.start && range?.end ? { start: range.start, end: range.end } : undefined;
      const { data } = await API.get("/clients/dashboard-stats", { params });
      setDashboardStats(data);
    } catch { /* dashboard keeps partial data when a widget fails */ }
  };

  const fetchLeaves = async () => {
    try { const { data } = await API.get("/leaves"); setLeaves(Array.isArray(data) ? data : []); }
    catch { /* dashboard keeps partial data when a widget fails */ }
  };

  const fetchBranches = async () => { try { const { data } = await API.get("/branches"); setBranches(listFromResponse(data, "branches")); } catch { /* HR/non-admin roles get 403 here — fine, dashboard keeps partial data */ } };
  const fetchDepartments = async () => { try { const { data } = await API.get("/departments"); setDepartments(listFromResponse(data, "departments")); } catch { /* HR/non-admin roles get 403 here — fine, dashboard keeps partial data */ } };
  const fetchTenantFeatures = async () => {
    try { const { data } = await API.get("/tenant/features"); setEnabledFeatures(data.enabledFeatures || []); }
    catch { setEnabledFeatures([]); }
  };
  const fetchSubscription = async () => {
    try { const { data } = await API.get("/tenant/subscription"); setSubscription(data); }
    catch { /* dashboard keeps partial data when a widget fails */ }
  };
  const fetchFeatureCatalog = async () => {
    try { const { data } = await API.get("/tenant/feature-catalog"); setFeatureCatalog(data?.catalog || []); }
    catch { /* the Subscription tab just shows fewer feature badges */ }
  };

  useEffect(() => { fetchUsers(); fetchTasks(); fetchClients(); fetchProjects(); fetchProposals(); fetchReminders(); fetchDashboardStats(); fetchLeaves(); fetchBranches(); fetchDepartments(); fetchTenantFeatures(); fetchSubscription(); fetchFeatureCatalog(); }, []);

  // Plan/feature changes made by Super Admin propagate here without
  // requiring the tenant admin to log out — same polling pattern already
  // used for attendance below.
  useEffect(() => {
    const interval = setInterval(() => { fetchTenantFeatures(); fetchSubscription(); }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLeaveDecision = async (leaveId, status) => {
    setLeaveActionId(leaveId);
    try {
      await API.put(`/leaves/${leaveId}/status`, { status });
      showToast(`Leave request ${status}`);
      fetchLeaves();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to update leave request", false);
    } finally {
      setLeaveActionId(null);
    }
  };

  const fetchAttendance = async () => {
    setAttLoading(true);
    setAttError(null);
    try {
      const { data } = await API.get("/attendance", { params: { ...attFilters, page: attPage, limit: 10 } });
      setAttRows(Array.isArray(data?.rows) ? data.rows : []);
      setAttPagination(data?.pagination || { total: 0, totalPages: 1 });
      setAttSummary(data?.summary || { todayOverallMinutes: 0, monthlyTotalMinutes: 0 });
    } catch (error) {
      setAttError(error?.response?.data?.message || "Failed to load attendance records");
    } finally {
      setAttLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, [attFilters, attPage]);

  const fetchAttDashboard = async () => {
    setAttDashboardLoading(true);
    setAttDashboardError(null);
    try {
      const { data } = await API.get("/attendance/dashboard", { params: { date: attDashboardDate } });
      setAttDashboard(data);
    } catch (error) {
      setAttDashboardError(error?.response?.data?.message || "Failed to load attendance dashboard");
    } finally { setAttDashboardLoading(false); }
  };

  useEffect(() => { fetchAttDashboard(); }, [attDashboardDate]);

  useEffect(() => {
    if (tab !== "attendance") return;
    const interval = setInterval(() => { fetchAttendance(); fetchLeaves(); fetchAttDashboard(); }, 20000);
    return () => clearInterval(interval);
  }, [tab, attFilters, attPage, attDashboardDate]);

  const setAttFilter = (key, value) => {
    setAttFilters(prev => ({ ...prev, [key]: value }));
    setAttPage(1);
  };

  const handleExport = async () => {
    try {
      const { data } = await API.get("/attendance/export/excel", { params: attFilters, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to export attendance", false);
    }
  };

  const computeRunning = (row) => row.displayWorkingMinutes ?? 0;
  const attUsers = users.filter(u => !["admin", "client"].includes(u.role));
  const attActiveNow = attRows.filter(r => r.status === "Active").length;
  const selectedDayTotal = fmtMin(attSummary.todayOverallMinutes || 0);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      const { _photoFile, _resumeFile, ...textFields } = userForm;
      Object.entries(textFields).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (_photoFile)  fd.append("photo",  _photoFile);
      if (_resumeFile) fd.append("resume", _resumeFile);
      await API.post("/users", fd);
      showToast("User created successfully");
      setUserForm(EMPTY_USER_FORM);
      fetchUsers();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to create user", false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await API.post("/tasks", taskForm);
      showToast("Task created successfully");
      setTaskForm({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" });
      fetchTasks();
    } catch {
      showToast("Failed to create task", false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    const normalizedCredentials = (projectForm.credentials || [])
      .map(credential => ({
        credentialType: credential.credentialType || "",
        userId: credential.userId || "",
        password: credential.password || "",
      }))
      .filter(credential => credential.credentialType || credential.userId || credential.password);
    const payload = {
      ...projectForm,
      projectCategory: projectFormTab || projectForm.projectCategory || "allProjects",
      credentials: normalizedCredentials,
      credentialType: normalizedCredentials[0]?.credentialType || projectForm.credentialType || "",
      userId: normalizedCredentials[0]?.userId || projectForm.userId || "",
      password: normalizedCredentials[0]?.password || projectForm.password || "",
    };

    try {
      if (editProject) {
        await API.put(`/projects/${editProject._id}`, payload);
        showToast("Project updated successfully");
      } else {
        await API.post("/projects", payload);
        showToast("Project saved successfully");
      }
      setEditProject(null);
      setProjectForm(PROJECT_EMPTY_FORM);
      setProjectFormTab("allProjects");
      setProjectListTab(payload.projectCategory);
      fetchProjects();
      setTab("projects");
    } catch (error) {
      showToast(error?.response?.data?.message || (editProject ? "Failed to update project" : "Failed to save project"), false);
    }
  };

  const openCreateProject = () => {
    setEditProject(null);
    setProjectForm({ ...PROJECT_EMPTY_FORM, projectCategory: "allProjects" });
    setProjectFormTab("allProjects");
    setTab("createProject");
  };

  const openEditProject = (project) => {
    const toDateInput = (value) => {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 10);
    };

    setEditProject(project);
    const projectCategory = project.projectCategory || "allProjects";
    const credentials = project.credentials?.length
      ? project.credentials.map(credential => ({
        credentialType: credential.credentialType || "",
        userId: credential.userId || "",
        password: credential.password || "",
      }))
      : [{ credentialType: project.credentialType || "", userId: project.userId || "", password: project.password || "" }];
    setProjectFormTab(projectCategory);
    setProjectForm({
      projectCategory,
      companyName: project.companyName || "",
      domain: project.domain || "",
      handoverdate: toDateInput(project.handoverdate),
      salesPerson: project.salesPerson || "",
      businesstype: project.businesstype || "",
      assignTo: project.assignTo || "",
      technology: project.technology || "",
      deployedDate: toDateInput(project.deployedDate),
      developer: project.developer || "",
      websiteDueDate: toDateInput(project.websiteDueDate),
      domainDueDate: toDateInput(project.domainDueDate),
      platform: project.platform || "",
      domainProvider: project.domainProvider || "",
      hostingProvider: project.hostingProvider || "",
      domainOwnership: project.domainOwnership || "",
      hostingOwnership: project.hostingOwnership || "",
      status: project.status || "Active",
      userId: project.userId || "",
      password: project.password || "",
      credentialType: project.credentialType || "",
      credentials,
    });
    setTab("createProject");
  };

  const cancelProjectForm = () => {
    setEditProject(null);
    setProjectForm(PROJECT_EMPTY_FORM);
    setProjectFormTab("allProjects");
    setTab("projects");
  };

  const handleDownloadProjectsCsv = (selectedProjectTab = "allProjects") => {
    const getProjectCategory = (project) => {
      if (project.projectCategory && project.projectCategory !== "allProjects") return project.projectCategory;
      if (project.assignTo || project.technology) return "ongoingProjects";
      return project.projectCategory || "allProjects";
    };
    const projectsToExport = projects.filter(project => getProjectCategory(project) === selectedProjectTab);
    const tabLabel = PROJECT_TAB_LABELS[selectedProjectTab] || "Projects";

    if (!projectsToExport.length) {
      showToast(`No ${tabLabel.toLowerCase()} available to export`, false);
      return;
    }

    const formatCredentialsForCsv = (project) => {
      const credentials = project.credentials?.length
        ? project.credentials
        : project.credentialType || project.userId || project.password
          ? [{ credentialType: project.credentialType, userId: project.userId, password: project.password }]
          : [];
      return credentials
        .map(credential => [credential.credentialType, credential.userId, credential.password].filter(Boolean).join(" - "))
        .filter(Boolean)
        .join(" | ");
    };
    const exportFields = [
      { key: "projectCategory", label: "Project Tab" },
      ...(PROJECT_TAB_FIELDS[selectedProjectTab] || PROJECT_TAB_FIELDS.allProjects),
      ...(selectedProjectTab === "allProjects" ? [{ key: "status", label: "Status" }] : []),
      ...(selectedProjectTab === "credentials" ? [{ key: "credentials", label: "Credentials" }] : []),
    ];

    const header = exportFields.map(field => escapeCsvValue(field.label)).join(",");
    const rows = projectsToExport.map(project => exportFields.map(field => {
      let rawValue = project[field.key];
      if (field.key === "projectCategory") rawValue = PROJECT_TAB_LABELS[project.projectCategory] || project.projectCategory;
      if (field.key === "credentials") rawValue = formatCredentialsForCsv(project);
      const value = field.type === "date" ? formatCsvDate(rawValue) : rawValue;
      return escapeCsvValue(value);
    }).join(","));
    const csv = [header, ...rows].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tabLabel.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast(`${tabLabel} CSV downloaded`);
  };

  const openEditTask = (task) => {
    setEditTask(task);
    setEditTaskForm({ title: task.title || "", description: task.description || "", assignedTo: task.assignedTo?._id || task.assignedTo || "", priority: task.priority || "medium", status: task.status || "pending", dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "" });
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try { await API.put(`/tasks/update-task/${editTask._id}`, editTaskForm); showToast("Task updated successfully"); setEditTask(null); fetchTasks(); }
    catch { showToast("Failed to update task", false); }
  };

  const handleDeleteTask = async () => {
    try { await API.delete(`/tasks/${deleteTask._id}`); showToast("Task deleted"); setDeleteTask(null); fetchTasks(); }
    catch { showToast("Failed to delete task", false); }
  };

  const openEditUser = (user) => {
    setEditUser(user);
    const toDate = (v) => (v ? String(v).slice(0, 10) : "");
    setEditUserForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "user",
      password: "",
      branchId: user.branchId?._id || user.branchId || "",
      departmentId: user.departmentId?._id || user.departmentId || "",
      phone: user.phone || "",
      employeeId: user.employeeId || "",
      dob: toDate(user.dob),
      bloodGroup: user.bloodGroup || "",
      gender: user.gender || "",
      emergencyContact: user.emergencyContact || "",
      address: user.address || "",
      aadhaar: user.aadhaar || "",
      pan: user.pan || "",
      qualification: user.qualification || "",
      experience: user.experience || "",
      joiningDate: toDate(user.joiningDate),
      relievingDate: toDate(user.relievingDate),
      _photoFile: null,
      _resumeFile: null,
    });
    setShowEditPw(false);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const { _photoFile, _resumeFile, password, ...textFields } = editUserForm;
      const fd = new FormData();
      Object.entries(textFields).forEach(([k, v]) => { if (v !== undefined) fd.append(k, v); });
      if (password) fd.append("password", password);
      if (_photoFile)  fd.append("photo",  _photoFile);
      if (_resumeFile) fd.append("resume", _resumeFile);
      await API.put(`/users/${editUser._id}`, fd);
      showToast("User updated successfully");
      setEditUser(null);
      fetchUsers();
    } catch {
      showToast("Failed to update user", false);
    }
  };

  const handleDeleteUser = async () => {
    try { await API.delete(`/users/${deleteUser._id}`); showToast("User deleted"); setDeleteUser(null); fetchUsers(); }
    catch { showToast("Failed to delete user", false); }
  };

  const handleDeleteProject = async () => {
    try { await API.delete(`/projects/${deleteProject._id}`); showToast("Project deleted"); setDeleteProject(null); fetchProjects(); }
    catch { showToast("Failed to delete project", false); }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      await API.post("/branches", branchForm);
      showToast("Branch created successfully");
      setBranchForm({ name: "", address: "", manager: "", phone: "", workingHours: "", timezone: "", status: "active" });
      fetchBranches();
      setTab("branches");
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to create branch", false);
    }
  };

  const openEditBranch = (branch) => {
    setEditBranch(branch);
    setEditBranchForm({
      name: branch.name || "",
      address: branch.address || "",
      manager: branch.manager?._id || branch.manager || "",
      phone: branch.phone || "",
      workingHours: branch.workingHours || "",
      timezone: branch.timezone || "",
      status: branch.status || "active",
    });
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    try { await API.put(`/branches/${editBranch._id}`, editBranchForm); showToast("Branch updated successfully"); setEditBranch(null); fetchBranches(); }
    catch { showToast("Failed to update branch", false); }
  };

  const handleDeleteBranch = async () => {
    try { await API.delete(`/branches/${deleteBranch._id}`); showToast("Branch deleted"); setDeleteBranch(null); fetchBranches(); }
    catch { showToast("Failed to delete branch", false); }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      await API.post("/departments", departmentForm);
      showToast("Department created successfully");
      setDepartmentForm({ name: "", description: "", branch: "" });
      fetchDepartments();
      setTab("departments");
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to create department", false);
    }
  };

  const openEditDepartment = (department) => {
    setEditDepartment(department);
    setEditDepartmentForm({
      name: department.name || "",
      description: department.description || "",
      branch: department.branch?._id || department.branch || "",
    });
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    try { await API.put(`/departments/${editDepartment._id}`, editDepartmentForm); showToast("Department updated successfully"); setEditDepartment(null); fetchDepartments(); }
    catch { showToast("Failed to update department", false); }
  };

  const handleDeleteDepartment = async () => {
    try { await API.delete(`/departments/${deleteDepartment._id}`); showToast("Department deleted"); setDeleteDepartment(null); fetchDepartments(); }
    catch { showToast("Failed to delete department", false); }
  };

  const handleLogout = async () => {
    try { await API.post("/users/logout"); } catch { /* local logout should continue if API logout fails */ }
    logout();
    navigate("/");
  };

  const salaryPreview = useMemo(() => {
    const salaryMonth = salaryForm.salaryMonth;
    const basicSalary = Number(salaryForm.basicSalary) || 0;
    const homeAllowance = Number(salaryForm.homeAllowance) || 0;
    const travelAllowance = Number(salaryForm.travelAllowance) || 0;
    const otherAllowance = Number(salaryForm.otherAllowance) || 0;
    const leavesInput = Math.max(0, Number(salaryForm.leaves) || 0);
    const pf = Number(salaryForm.pf) || 0;
    const deductions = Number(salaryForm.deductions) || 0;

    const match = /^(\d{4})-(\d{2})$/.exec(String(salaryMonth || "").trim());
    const daysInMonth = match ? new Date(Number(match[1]), Number(match[2]), 0).getDate() : 30;
    const leaves = Math.min(leavesInput, daysInMonth);
    const leaveDeduction = Number(((basicSalary / Math.max(daysInMonth, 1)) * leaves).toFixed(2));
    const totalAllowances = homeAllowance + travelAllowance + otherAllowance;
    const totalDeductions = pf + deductions + leaveDeduction;
    const inHand = Math.max(0, Number((basicSalary + totalAllowances - totalDeductions).toFixed(2)));

    return { daysInMonth, leaves, leaveDeduction, totalAllowances, totalDeductions, inHand };
  }, [salaryForm]);

  const openPaySalary = (user) => {
    setPayUser(user);
    setSalaryForm({
      salaryMonth: new Date().toISOString().slice(0, 7),
      basicSalary: "",
      homeAllowance: "",
      travelAllowance: "",
      otherAllowance: "",
      leaves: "",
      pf: "",
      deductions: "",
    });
  };

  const handlePaySalary = async (e) => {
    e.preventDefault();
    if (!payUser) return;

    setPayingSalary(true);
    try {
      await API.post(`/salary/pay/${payUser._id}`, salaryForm);
      showToast(`Salary slip sent to ${payUser.email}`);
      setPayUser(null);
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to send salary slip", false);
    } finally {
      setPayingSalary(false);
    }
  };

  // Clients assigned to a non-sales User via the Client Detail page's "Assign Task"
  // action are real assigned work too — fold them into the same task counts shown
  // on "All Tasks" so the Dashboard's Total/Done/In-Progress/Pending stay consistent.
  const assignedClientTasks = clients.filter(c => c.assignedUser);
  const assignedClientStatuses = assignedClientTasks.map(c => {
    const latest = c.workProgress?.[c.workProgress.length - 1];
    return mapProgressToTaskStatus(latest?.status);
  });
  const totalTaskCount = tasks.length + assignedClientTasks.length;

  const done = tasks.filter(t => t.status === "completed").length
    + assignedClientStatuses.filter(s => s === "completed").length;
  const inProg = tasks.filter(t => t.status === "in-progress").length
    + assignedClientStatuses.filter(s => s === "in-progress").length;
  const pend = tasks.filter(t => !t.status || t.status === "pending").length
    + assignedClientStatuses.filter(s => s === "pending").length;
  const admins = users.filter(u => u.role === "admin").length;
  const regularUsers = users.filter(u => u.role === "user").length;
  const completionRate = totalTaskCount ? Math.round((done / totalTaskCount) * 100) : 0;
  const activeProjects = projects.filter(p => p.status === "Active").length;

  const getProjectCategory = (project) => {
    if (project.projectCategory && project.projectCategory !== "allProjects") return project.projectCategory;
    if (project.assignTo || project.technology) return "ongoingProjects";
    return project.projectCategory || "allProjects";
  };

  const ongoingProjects = projects.filter(project => getProjectCategory(project) === "ongoingProjects").length;

  const projectDueStats = projects.reduce((stats, project) => {
    const websiteDays = daysUntil(project.websiteDueDate);
    const domainDays = daysUntil(project.domainDueDate);
    if (websiteDays !== null && websiteDays < 0) stats.overdue += 1;
    if (domainDays !== null && domainDays < 0) stats.overdue += 1;
    if (websiteDays !== null && websiteDays >= 0 && websiteDays <= 30) stats.websiteDueSoon += 1;
    if (domainDays !== null && domainDays >= 0 && domainDays <= 30) stats.domainDueSoon += 1;
    return stats;
  }, { websiteDueSoon: 0, domainDueSoon: 0, overdue: 0 });

  const projectDueDetails = projects.reduce((details, project) => {
    const projectName = project.companyName || project.domain || "Unnamed project";
    const websiteDays = daysUntil(project.websiteDueDate);
    const domainDays = daysUntil(project.domainDueDate);
    if (websiteDays !== null && websiteDays >= 0 && websiteDays <= 30) {
      details.websiteDueSoon.push({ name: projectName, domain: project.domain, date: project.websiteDueDate, type: "Website" });
    }
    if (domainDays !== null && domainDays >= 0 && domainDays <= 30) {
      details.domainDueSoon.push({ name: projectName, domain: project.domain, date: project.domainDueDate, type: "Domain" });
    }
    if (websiteDays !== null && websiteDays < 0) {
      details.overdue.push({ name: projectName, domain: project.domain, date: project.websiteDueDate, type: "Website" });
    }
    if (domainDays !== null && domainDays < 0) {
      details.overdue.push({ name: projectName, domain: project.domain, date: project.domainDueDate, type: "Domain" });
    }
    return details;
  }, { websiteDueSoon: [], domainDueSoon: [], overdue: [] });

  const projectAssignChartData = Object.entries(
    projects.reduce((acc, project) => {
      const assignee = (project.assignTo || "").trim();
      if (!assignee) return acc;
      acc[assignee] = (acc[assignee] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value], i) => ({ name, value, fill: PROJECT_CHART_COLORS[i % PROJECT_CHART_COLORS.length] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const projectPlatformChartData = Object.entries(
    projects.reduce((acc, project) => {
      const platform = (project.platform || project.technology || "").trim();
      if (!platform) return acc;
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count], i) => ({ name, count, fill: PROJECT_CHART_COLORS[i % PROJECT_CHART_COLORS.length] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const projectDueChartData = [
    { id: "websiteDueSoon", name: "Website Due", count: projectDueStats.websiteDueSoon, fill: "#0891b2", projects: projectDueDetails.websiteDueSoon },
    { id: "domainDueSoon", name: "Domain Due", count: projectDueStats.domainDueSoon, fill: "#d97706", projects: projectDueDetails.domainDueSoon },
    { id: "overdue", name: "Overdue", count: projectDueStats.overdue, fill: "#dc2626", projects: projectDueDetails.overdue },
  ];

  const statusPieData = [
    { name: "Completed", value: done },
    { name: "In Progress", value: inProg },
    { name: "Pending", value: pend },
  ].filter(d => d.value > 0);

  const priorityBarData = [
    { name: "Low", count: tasks.filter(t => t.priority === "low").length, fill: PRIORITY_COLORS.low },
    { name: "Medium", count: tasks.filter(t => t.priority === "medium").length, fill: PRIORITY_COLORS.medium },
    { name: "High", count: tasks.filter(t => t.priority === "high").length, fill: PRIORITY_COLORS.high },
  ];

  const tasksByUser = users
    .filter(u => u.role === "user")
    .map(u => ({
      name: u.name?.split(" ")[0] || "?",
      total: tasks.filter(t => t.assignedTo?._id === u._id || t.assignedTo === u._id).length,
      done: tasks.filter(t => (t.assignedTo?._id === u._id || t.assignedTo === u._id) && t.status === "completed").length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const role = authRole || "";

  const ROLE_TABS = {
    hr: [
      { id: "users", label: "Users", Icon: Users, section: "overview" },
      { id: "attendance", label: "Attendance", Icon: Clock, section: "overview" },
      { id: "meetings", label: "Meetings", Icon: Calendar, section: "overview" },
      { id: "salary", label: "Salary", Icon: Briefcase, section: "manage" },
      { id: "createUser", label: "New User", Icon: UserPlus, section: "manage" },
    ],
    sales: [
      { id: "clients",      label: "Clients",       Icon: Building2,  section: "overview" },
      { id: "meetings",     label: "Meetings",       Icon: Calendar,   section: "overview" },
    ],
  };

  const TABS = ROLE_TABS[role] || [
    // fallback to admin-like access if role is missing/unknown
    // Organization Profile and Subscription are reached from the profile
    // dropdown's "Profile" page now, not the sidebar — see MyProfileSection.jsx.
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard, section: "overview" },
    { id: "tasks", label: "All Tasks", Icon: ClipboardList, section: "overview" },
    { id: "users", label: "All Users", Icon: Users, section: "overview" },
    { id: "attendance", label: "Attendance", Icon: Clock, section: "overview" },
    { id: "meetings", label: "Meetings", Icon: Calendar, section: "overview" },
    { id: "clients", label: "Clients", Icon: Building2, section: "overview" },
    { id: "projects", label: "Projects", Icon: Briefcase, section: "overview" },
    { id: "branches", label: "Branches", Icon: Building2, section: "overview" },
    { id: "departments", label: "Departments", Icon: Layers, section: "overview" },
    { id: "salary", label: "Salary", Icon: Briefcase, section: "manage" },
    { id: "createTask", label: "New Task", Icon: Plus, section: "manage" },
    { id: "createProject", label: "New Project", Icon: Plus, section: "manage" },
    { id: "createUser", label: "New User", Icon: UserPlus, section: "manage" },
    { id: "createBranch", label: "New Branch", Icon: Plus, section: "manage" },
    { id: "createDepartment", label: "New Department", Icon: Plus, section: "manage" },
    // Finance section
    { id: "salesTargets",      label: "Sales Targets",     Icon: TrendingUp, section: "finance" },
    { id: "expenseDashboard",  label: "Finance Overview",  Icon: BarChart3,  section: "finance" },
    { id: "collections",       label: "Collections",       Icon: TrendingUp, section: "finance" },
    { id: "expenses",          label: "Expenses",          Icon: Receipt,    section: "finance" },
    { id: "expenseCategories", label: "Categories",        Icon: Tag,        section: "finance" },
    { id: "vendors",           label: "Vendors",           Icon: Store,      section: "finance" },
    { id: "budgets",           label: "Budgets",           Icon: Wallet,     section: "finance" },
    { id: "expenseReports",    label: "Reports",           Icon: FileText,   section: "finance" },
    { id: "gmbScraper",        label: "GMB Scraper",       Icon: Map,        section: "automation" },
    { id: "mailAutomation",    label: "Mail Automation",   Icon: MailOpen,   section: "automation" },
    // Operations & Communication
    { id: "announcements",    label: "Announcements",     Icon: Megaphone,      section: "ops" },
    { id: "companyCalendar",  label: "Company Calendar",  Icon: Calendar,       section: "ops" },
    { id: "teamChat",         label: "Team Chat",         Icon: MessageSquare,  section: "ops" },
    { id: "reportBuilder",    label: "Report Builder",    Icon: BarChart2,      section: "ops" },
    // HR
    { id: "holidayShift",    label: "Holidays & Shifts",  Icon: CalendarDays,  section: "hr" },
    { id: "leavePolicy",     label: "Leave Policy",        Icon: Shield,        section: "hr" },
    { id: "performance",     label: "Performance Reviews", Icon: Award,         section: "hr" },
  ];

  // Tabs with no entry here (dashboard, users/createUser, salary/createSalary
  // omitted intentionally... ) are always shown — see featureCatalog.js for
  // why "users" isn't gateable. Maps a tab id to the feature key that must be
  // enabled for it to appear in the sidebar.
  const TAB_FEATURE_MAP = {
    attendance: "attendance",
    meetings: "meetings",
    clients: "clients",
    projects: "projects",
    createProject: "projects",
    tasks: "tasks",
    createTask: "tasks",
    salary: "payroll",
    branches: "branches",
    createBranch: "branches",
    departments: "departments",
    createDepartment: "departments",
    expenseDashboard:  "expenses",
    collections:       "expenses",
    expenses:          "expenses",
    expenseCategories: "expenses",
    vendors:           "expenses",
    budgets:           "expenses",
    expenseReports:    "expenses",
    gmbScraper:        "gmb_scraper",
    mailAutomation:    "mail_automation",
  };

  // The sidebar always shows every tab — locked ones are greyed out with a
  // popup instead of disappearing (a deliberate UX choice: users should know
  // additional modules exist rather than the menu silently shrinking).
  const isTabLocked = (tabId) => {
    const featureKey = TAB_FEATURE_MAP[tabId];
    if (!featureKey) return false; // not a gateable tab — always unlocked
    if (enabledFeatures === null) return false; // not loaded yet — don't flash locked
    return !enabledFeatures.includes(featureKey);
  };

  const currentLabel = TABS.find(t => t.id === tab)?.label || "Dashboard";

  return {
    users, tasks, clients, projects, proposals, reminders, dashboardStats,
    branches, departments, branchForm, setBranchForm, departmentForm, setDepartmentForm,
    tab, setTab, toast, setToast, showPw, setShowPw,
    userForm, setUserForm, taskForm, setTaskForm, projectForm, setProjectForm, projectFormTab, setProjectFormTab, projectListTab, setProjectListTab,
    editTask, setEditTask, editTaskForm, setEditTaskForm,
    editUser, setEditUser, editUserForm, setEditUserForm, editProject, setEditProject, showEditPw, setShowEditPw,
    editBranch, setEditBranch, editBranchForm, setEditBranchForm,
    editDepartment, setEditDepartment, editDepartmentForm, setEditDepartmentForm,
    deleteTask, setDeleteTask, deleteUser, setDeleteUser, deleteProject, setDeleteProject,
    deleteBranch, setDeleteBranch, deleteDepartment, setDeleteDepartment,
    payUser, setPayUser, payingSalary, salaryForm, setSalaryForm, salaryPreview,
    handleCreateUser, handleCreateTask, handleCreateProject, handleDownloadProjectsCsv,
    openCreateProject, openEditProject, cancelProjectForm,
    openEditTask, handleUpdateTask, handleDeleteTask,
    openEditUser, handleUpdateUser, handleDeleteUser,
    handleCreateBranch, openEditBranch, handleUpdateBranch, handleDeleteBranch,
    handleCreateDepartment, openEditDepartment, handleUpdateDepartment, handleDeleteDepartment,
    openPaySalary, handlePaySalary, handleDeleteProject, handleLogout,
    done, inProg, pend, completionRate, activeProjects, ongoingProjects,
    projectDueStats, projectAssignChartData, projectPlatformChartData, projectDueChartData,
    statusPieData, priorityBarData,
    tasksByUser, admins, regularUsers, totalTaskCount, TABS, currentLabel,
    isTabLocked, lockedFeatureModal, setLockedFeatureModal,
    subscription, featureCatalog,
    fetchDashboardStats,
    attFilters, setAttFilter, setAttFilters, attUsers, handleExport, attError, attLoading,
    attRows, computeRunning, attPagination, attPage, setAttPage, selectedDayTotal, attSummary, attActiveNow,
    leaves, leaveActionId, handleLeaveDecision,
    attDashboard, attDashboardLoading, attDashboardError, attDashboardDate, setAttDashboardDate,
  };
}
