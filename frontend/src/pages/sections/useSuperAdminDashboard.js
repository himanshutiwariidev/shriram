import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { listFromResponse } from "./shared";

const EMPTY_TENANT_FORM = {
  organizationName: "", companyEmail: "", companyPhone: "", website: "",
  gstNumber: "", panNumber: "", address: "", city: "", state: "", country: "", postalCode: "",
  timezone: "Asia/Kolkata", currency: "INR", businessType: "",
  planName: "starter", trialDays: 14, subscriptionStartDate: "", subscriptionExpiresAt: "",
  maxUsers: "", maxBranches: "", maxDepartments: "", maxProjects: "", maxClients: "", maxStorageMB: "", status: "trial",
  adminName: "", adminEmail: "", adminMobile: "", adminPassword: "", adminDesignation: "",
  enabledFeatures: [],
};

export default function useSuperAdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [deleteOrg, setDeleteOrg] = useState(null);
  const [tab, setTab] = useState("organizations");
  const [featureCatalog, setFeatureCatalog] = useState([]);
  const [plans, setPlans] = useState([]);
  const [createTenantForm, setCreateTenantForm] = useState(EMPTY_TENANT_FORM);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const [pendingOwnerPhotoFile, setPendingOwnerPhotoFile] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/superadmin/organizations");
      setOrganizations(listFromResponse(data, "organizations"));
    } catch {
      showToast("Failed to load organizations", false);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatureCatalog = async () => {
    try {
      const { data } = await API.get("/superadmin/organizations/meta/feature-catalog");
      const catalog = data?.catalog || [];
      setFeatureCatalog(catalog);
      // Default a brand-new tenant to everything enabled unless the Super
      // Admin explicitly unchecks something.
      setCreateTenantForm((prev) => ({
        ...prev,
        enabledFeatures: catalog.flatMap((group) => group.features.map((f) => f.key)),
      }));
    } catch {
      showToast("Failed to load feature catalog", false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data } = await API.get("/superadmin/organizations/meta/plans");
      setPlans(data?.plans || []);
    } catch {
      showToast("Failed to load plans", false);
    }
  };

  useEffect(() => { fetchOrganizations(); fetchFeatureCatalog(); fetchPlans(); }, []);

  // Standard plans auto-populate (and lock) the limit fields from the live
  // Plan document; only "custom" leaves them editable. Matches "standard
  // plans should remain locked" — the limits always reflect the plan's
  // current definition, not a value frozen at selection time.
  const applyPlanToForm = (planName, plansList) => {
    if (planName === "custom") {
      setCreateTenantForm((prev) => ({ ...prev, planName }));
      return;
    }
    const plan = plansList.find((p) => p.key === planName);
    setCreateTenantForm((prev) => ({
      ...prev,
      planName,
      trialDays: plan?.trialDays ?? prev.trialDays,
      maxUsers: plan?.maxUsers ?? "",
      maxBranches: plan?.maxBranches ?? "",
      maxDepartments: plan?.maxDepartments ?? "",
      maxProjects: plan?.maxProjects ?? "",
      maxClients: plan?.maxClients ?? "",
      maxStorageMB: plan?.maxStorageMB ?? "",
    }));
  };
  const handlePlanChange = (planName) => applyPlanToForm(planName, plans);

  // Populate the default "starter" plan's limits as soon as plans load, so
  // the form isn't showing blank/locked limit fields before any interaction.
  useEffect(() => {
    if (plans.length > 0) applyPlanToForm("starter", plans);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setCreatingTenant(true);
    try {
      const { data } = await API.post("/superadmin/organizations", createTenantForm);

      // The org doesn't exist until this call returns, so a selected logo
      // uploads in a second call right after — one continuous action from
      // the Super Admin's perspective, two requests under the hood. A logo
      // upload failure shouldn't undo the tenant that was just created.
      if (pendingLogoFile && data?.organization?._id) {
        try {
          const formData = new FormData();
          formData.append("logo", pendingLogoFile);
          await API.post(`/superadmin/organizations/${data.organization._id}/logo`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch {
          showToast("Tenant created, but the logo upload failed — you can add it from the tenant's Branding tab.", false);
        }
      }

      // Same staged-upload-after-create pattern as the logo: the owner User
      // doesn't exist until tenant creation succeeds, so the photo uploads
      // in a follow-up call that resolves the owner via Organization.createdBy.
      if (pendingOwnerPhotoFile && data?.organization?._id) {
        try {
          const formData = new FormData();
          formData.append("photo", pendingOwnerPhotoFile);
          await API.post(`/superadmin/organizations/${data.organization._id}/owner-photo`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch {
          showToast("Tenant created, but the owner photo upload failed — you can add it from the tenant's Owner tab.", false);
        }
      }

      showToast("Tenant created successfully");
      setCreateTenantForm((prev) => ({ ...EMPTY_TENANT_FORM, enabledFeatures: prev.enabledFeatures }));
      setPendingLogoFile(null);
      setPendingOwnerPhotoFile(null);
      fetchOrganizations();
      setTab("organizations");
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to create tenant", false);
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleSuspend = async (organization) => {
    try {
      await API.patch(`/superadmin/organizations/${organization._id}/suspend`);
      showToast(`${organization.name} suspended`);
      fetchOrganizations();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to suspend organization", false);
    }
  };

  const handleActivate = async (organization) => {
    try {
      await API.patch(`/superadmin/organizations/${organization._id}/activate`);
      showToast(`${organization.name} activated`);
      fetchOrganizations();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to activate organization", false);
    }
  };

  const handleDeleteOrg = async () => {
    try {
      await API.delete(`/superadmin/organizations/${deleteOrg._id}`);
      showToast(`${deleteOrg.name} and all its data deleted`);
      setDeleteOrg(null);
      fetchOrganizations();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to delete organization", false);
    }
  };

  const handleLogout = async () => {
    try { await API.post("/users/logout"); } catch { /* local logout should continue if API logout fails */ }
    logout();
    navigate("/");
  };

  return {
    organizations, loading, toast, setToast,
    deleteOrg, setDeleteOrg,
    tab, setTab,
    featureCatalog, plans, createTenantForm, setCreateTenantForm, creatingTenant, handleCreateTenant, handlePlanChange,
    pendingLogoFile, setPendingLogoFile,
    fetchOrganizations, handleSuspend, handleActivate, handleDeleteOrg, handleLogout,
  };
}
