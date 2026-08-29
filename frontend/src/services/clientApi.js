import axios from "axios";
import { getAuth } from "./authStorage";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://crm.cybertricksmedia.in/api",
});

// Attach token automatically
API.interceptors.request.use((req) => {
  const { token } = getAuth();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// ============= CLIENT OPERATIONS =============

export const createClient = (clientData) =>
  API.post("/clients", clientData);

export const getAllClients = () =>
  API.get("/clients");

export const getClientById = (clientId) =>
  API.get(`/clients/${clientId}`);

export const updateClient = (clientId, updateData) =>
  API.put(`/clients/${clientId}`, updateData);

export const deleteClient = (clientId) =>
  API.delete(`/clients/${clientId}`);

export const getClientActivity = (clientId) =>
  API.get(`/clients/${clientId}/activity`);

export const getUsersByRole = (role) =>
  API.get(`/users/by-role/${role}`);

export const assignUserToClient = (clientId, userId) =>
  API.put(`/clients/${clientId}/assign`, { userId });

export const getClientRemarks = (clientId) =>
  API.get(`/clients/${clientId}/remarks`);

export const addClientRemark = (clientId, message) =>
  API.post(`/clients/${clientId}/remarks`, { message });

export const getWorkProgress = (clientId) =>
  API.get(`/clients/${clientId}/work-progress`);

export const addWorkProgress = (clientId, payload) =>
  API.post(`/clients/${clientId}/work-progress`, payload);

export const updateWorkProgress = (clientId, entryId, payload) =>
  API.put(`/clients/${clientId}/work-progress/${entryId}`, payload);

export const uploadPiAttachment = (clientId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post(`/clients/${clientId}/pi-attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const deletePiAttachment = (clientId, attachmentId) =>
  API.delete(`/clients/${clientId}/pi-attachments/${attachmentId}`);

// ============= PROPOSAL OPERATIONS =============

export const createProposal = (proposalData) =>
  API.post("/clients/proposals/create", proposalData);

export const getAllProposals = (clientId = null) => {
  const url = clientId ? `/clients/proposals/all?clientId=${clientId}` : "/clients/proposals/all";
  return API.get(url);
};

export const getProposalById = (proposalId) =>
  API.get(`/clients/proposals/${proposalId}`);

export const sendProposal = (proposalId) =>
  API.post(`/clients/proposals/${proposalId}/send`);

export const updateProposal = (proposalId, updateData) =>
  API.put(`/clients/proposals/${proposalId}`, updateData);

export const deleteProposal = (proposalId) =>
  API.delete(`/clients/proposals/${proposalId}`);

export const downloadInvoice = async (proposalId, fileName = "invoice.pdf") => {
  const response = await API.get(`/clients/proposals/${proposalId}/invoice`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ============= DELIVERABLES OPERATIONS =============

export const addDeliverable = (proposalId, deliverableData) =>
  API.post(`/clients/proposals/${proposalId}/deliverables`, deliverableData);

export const updateDeliverable = (proposalId, deliverableId, updateData) =>
  API.put(`/clients/proposals/${proposalId}/deliverables/${deliverableId}`, updateData);

export const deleteDeliverable = (proposalId, deliverableId) =>
  API.delete(`/clients/proposals/${proposalId}/deliverables/${deliverableId}`);

// ============= PAYMENT OPERATIONS =============

export const addPayment = (proposalId, paymentData) =>
  API.post(`/clients/proposals/${proposalId}/payments`, paymentData);

// ============= DASHBOARD STATS =============

export const getDashboardStats = () =>
  API.get("/clients/dashboard-stats");

// ============= PAYMENT REMINDER OPERATIONS =============

export const createPaymentReminder = (reminderData) =>
  API.post("/clients/reminders/create", reminderData);

export const getAllReminders = (clientId = null) => {
  const url = clientId ? `/clients/reminders/all?clientId=${clientId}` : "/clients/reminders/all";
  return API.get(url);
};

export const sendPaymentReminder = (reminderId) =>
  API.post(`/clients/reminders/${reminderId}/send`);

export const updatePaymentReminder = (reminderId, updateData) =>
  API.put(`/clients/reminders/${reminderId}`, updateData);

export const deletePaymentReminder = (reminderId) =>
  API.delete(`/clients/reminders/${reminderId}`);

// ============= CLIENT PORTAL (role: "client") =============

export const getMyProject = () =>
  API.get("/clients/my-project");
