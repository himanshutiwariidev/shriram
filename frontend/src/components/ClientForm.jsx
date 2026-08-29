import React, { useState, useEffect } from "react";
import { createClient, updateClient, getUsersByRole } from "../services/clientApi";
import SearchableSelect from "./SearchableSelect";
import "./ClientForm.css";

const ClientForm = ({ client, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    clientName: "",
    email: "",
    phone: "",
    companyName: "",
    gstNo: "",
    tanNo: "",
    salesPerson: "",
    leadSource: "",
    clientType: "",
    projectType: "service",
    projectName: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    contactPerson: "",
    designation: "",
    status: "open",
    notes: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [salesUsers, setSalesUsers] = useState([]);
  const [salesUsersLoading, setSalesUsersLoading] = useState(true);

  useEffect(() => {
    if (client) {
      setFormData({
        ...client,
        salesPerson: client.salesPerson?._id || client.salesPerson || "",
        password: "",
      });
    }
  }, [client]);

  useEffect(() => {
    let isMounted = true;
    getUsersByRole("sales")
      .then((res) => {
        if (isMounted) setSalesUsers(res.data || []);
      })
      .catch(() => {
        if (isMounted) setSalesUsers([]);
      })
      .finally(() => {
        if (isMounted) setSalesUsersLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // leadSource/clientType are optional enum fields on the backend — an empty
    // string isn't a valid enum value, so omit them entirely when left blank.
    const payload = { ...formData };
    if (!payload.leadSource) delete payload.leadSource;
    if (!payload.clientType) delete payload.clientType;
    if (!payload.salesPerson) delete payload.salesPerson;
    // These are populated/relational/computed fields carried on `client` for display —
    // never echo them back on submit, or a populated object (e.g. assignedUser:{_id,name})
    // would get cast into its own ObjectId field and fail.
    delete payload._id;
    delete payload.__v;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.hasLoginAccess;
    delete payload.assignedUser;
    delete payload.assignedBy;
    delete payload.assignedDate;
    delete payload.remarks;
    delete payload.workProgress;
    delete payload.totalProjects;
    delete payload.totalAmount;
    delete payload.onboardedAt;

    try {
      if (client?._id) {
        await updateClient(client._id, payload);
      } else {
        await createClient(payload);
      }
      alert(client?._id ? "Client updated successfully" : "Client onboarded successfully");
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="client-form-container">
      <h2>{client?._id ? "Edit Client" : "Onboard New Client"}</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="client-form">
        <div className="form-row">
          <div className="form-group">
            <label>Client Name *</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              required
              placeholder="Enter client name"
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter email"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Phone *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="Enter phone number"
            />
          </div>
          <div className="form-group">
            <label>Company Name</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Enter company name"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Sales Person *</label>
            <SearchableSelect
              options={salesUsers.map((u) => ({ value: u._id, label: u.name }))}
              value={formData.salesPerson}
              onChange={(value) => setFormData((prev) => ({ ...prev, salesPerson: value }))}
              placeholder={salesUsersLoading ? "Loading sales users..." : "Select sales person"}
              emptyLabel="No Sales User Found"
              disabled={salesUsersLoading}
            />
          </div>
          <div className="form-group">
            <label>Lead Source</label>
            <select name="leadSource" value={formData.leadSource} onChange={handleChange}>
              <option value="">Select lead source</option>
              <option value="cold call">Cold Call</option>
              <option value="reference">Reference</option>
              <option value="visit">Visit</option>
              <option value="self">Self</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Client Type</label>
            <select name="clientType" value={formData.clientType} onChange={handleChange}>
              <option value="">Select client type</option>
              <option value="pvt ltd">Pvt Ltd</option>
              <option value="ltd">Ltd</option>
              <option value="llp">LLP</option>
              <option value="hup">HUF</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Deals In *</label>
            <select name="projectType" value={formData.projectType} onChange={handleChange} required>
              <option value="service">Service</option>
              <option value="product">Product</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
              required
              placeholder="Enter project name"
            />
          </div>
          <div className="form-group">
            <label>TAN No.</label>
            <input
              type="text"
              name="tanNo"
              value={formData.tanNo}
              onChange={handleChange}
              placeholder="Enter TAN No."
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Contact Person</label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="Enter contact person name"
            />
          </div>
          <div className="form-group">
            <label>Designation</label>
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="Enter designation"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter address"
            />
          </div>
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter city"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="Enter state"
            />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Enter country"
            />
          </div>
          <div className="form-group">
            <label>Zip Code</label>
            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleChange}
              placeholder="Enter zip code"
            />
          </div>
          <div className="form-group">
            <label>GST No.</label>
            <input
              type="text"
              name="gstNo"
              value={formData.gstNo}
              onChange={handleChange}
              placeholder="Enter Gst No."
            />
          </div>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add any additional notes"
            rows="4"
          />
        </div>

        <div className="form-group">
          <label>Client Login Password {client?.hasLoginAccess && "(leave blank to keep unchanged)"}</label>
          <input
            type="text"
            name="password"
            value={formData.password}
            onChange={handleChange}
            minLength={6}
            placeholder={client?.hasLoginAccess ? "Set a new password to reset" : "Set a password so this client can log in and view their project"}
          />
          <small style={{ color: "#6b7280", fontSize: 12 }}>
            Must be at least 6 characters. Setting a password creates a login account for this client
            (role: client) so they can sign in on the main login page and see only their own project,
            deliverables, and payments.
          </small>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? "Saving..." : client?._id ? "Update Client" : "Onboard Client"}
          </button>
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
