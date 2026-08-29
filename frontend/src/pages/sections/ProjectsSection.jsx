import React, { useState } from "react";
import { Briefcase, Clock, Download, Globe2, KeyRound, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ChartCard, CustomTooltip, IconBtn, kpiGridStyle, KpiCard, PROJECT_TAB_FIELDS, PROJECT_TABS, PROJECT_TYPES, PROJECT_STATUS, fmtShortDate,
} from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

export default function ProjectsSection({
  projects,
  openCreateProject,
  handleDownloadProjectsCsv,
  projectAssignChartData,
  projectPlatformChartData,
  projectDueChartData,
  ongoingProjects,
  setDeleteProject,
  openEditProject,
  activeProjectTab,
  setActiveProjectTab,
}) {
  const { T } = useTenantTheme();
  const [selectedDueBucket, setSelectedDueBucket] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [projectSearchDraft, setProjectSearchDraft] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const selectedProjectTab = activeProjectTab || "allProjects";
  const PAGE_SIZE = 10;
  const getProjectCategory = (project) => {
    if (project.projectCategory && project.projectCategory !== "allProjects") return project.projectCategory;
    if (project.assignTo || project.technology) return "ongoingProjects";
    return project.projectCategory || "allProjects";
  };
  const projectTabCounts = PROJECT_TABS.reduce((acc, tab) => {
    acc[tab.id] = projects.filter(project => getProjectCategory(project) === tab.id).length;
    return acc;
  }, {});
  const tabProjects = projects.filter(project => getProjectCategory(project) === selectedProjectTab);
  const normalizedProjectSearch = projectSearch.trim().toLowerCase();
  const filteredProjects = normalizedProjectSearch
    ? tabProjects.filter(project => {
      const companyName = String(project.companyName || "").toLowerCase();
      const domain = String(project.domain || "").toLowerCase();
      return companyName.includes(normalizedProjectSearch) || domain.includes(normalizedProjectSearch);
    })
    : tabProjects;
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const pageProjects = filteredProjects.slice(pageStart, pageStart + PAGE_SIZE);
  const pageFrom = filteredProjects.length ? pageStart + 1 : 0;
  const pageTo = Math.min(pageStart + PAGE_SIZE, filteredProjects.length);
  const tableFields = selectedProjectTab === "allProjects"
    ? [...PROJECT_TAB_FIELDS.allProjects, { key: "status", label: "Status", type: "status" }]
    : selectedProjectTab === "credentials"
      ? [
        ...PROJECT_TAB_FIELDS.credentials,
        { key: "credentialType", label: "Type", type: "credentialColumn" },
        { key: "userId", label: "ID", type: "credentialColumn" },
        { key: "password", label: "Password", type: "credentialColumn" },
      ]
      : PROJECT_TAB_FIELDS[selectedProjectTab];
  const textCell = (value) => value || "-";
  const getCredentials = (project) => {
    if (project.credentials?.length) return project.credentials;
    if (project.credentialType || project.userId || project.password) {
      return [{ credentialType: project.credentialType, userId: project.userId, password: project.password }];
    }
    return [];
  };
  const renderCell = (project, field) => {
    if (field.type === "date") return fmtShortDate(project[field.key]);
    if (field.type === "credentialColumn") {
      const credentials = getCredentials(project);
      if (!credentials.length) return "-";
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {credentials.map((credential, index) => (
            <span key={index} style={{ color: field.key === "credentialType" ? T.textPrimary : T.textSecondary, fontWeight: field.key === "credentialType" ? 700 : 400 }}>
              {credential[field.key] || (field.key === "credentialType" ? "Credential" : "-")}
            </span>
          ))}
        </div>
      );
    }
    if (field.key === "status") {
      const sm = PROJECT_STATUS[project.status] || PROJECT_STATUS.Active;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.color, flexShrink: 0 }} />
          {sm.label}
        </span>
      );
    }
    if (field.key === "businesstype") {
      const bt = PROJECT_TYPES[project.businesstype] || PROJECT_TYPES.Service;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, color: bt.color, background: bt.bg, border: `1px solid ${bt.border}` }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: bt.color, flexShrink: 0 }} />
          {bt.label}
        </span>
      );
    }
    return textCell(project[field.key]);
  };
  const activeDueBucket =
    projectDueChartData.find(item => item.id === selectedDueBucket)
    || projectDueChartData.find(item => item.count > 0)
    || projectDueChartData[0];
  const activeAssigneeBucket = projectAssignChartData.find(item => item.name === selectedAssignee);
  const activeAssigneeProjects = activeAssigneeBucket
    ? projects.filter(project => (project.assignTo || "").trim() === activeAssigneeBucket.name)
    : [];
  const activePlatformBucket = projectPlatformChartData.find(item => item.name === selectedPlatform);
  const activePlatformProjects = activePlatformBucket
    ? projects.filter(project => ((project.platform || project.technology || "").trim()) === activePlatformBucket.name)
    : [];
  const handleProjectSearch = (event) => {
    event.preventDefault();
    setProjectSearch(projectSearchDraft.trim());
    setCurrentPage(1);
  };
  const clearProjectSearch = () => {
    setProjectSearchDraft("");
    setProjectSearch("");
    setCurrentPage(1);
  };
  const handleTabChange = (tabId) => {
    setActiveProjectTab(tabId);
    setCurrentPage(1);
  };
  const renderProjectDetailCards = (items, color, getBadge) => {
    if (!items.length) return null;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {items.map((project, index) => (
          <div key={`${project._id || project.name}-${index}`} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 12px", background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {project.companyName || project.name || project.domain || "Unnamed project"}
              </div>
              {getBadge && (
                <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, color, background: `${color}14`, border: `1px solid ${color}33`, borderRadius: 7, padding: "4px 7px" }}>
                  {getBadge(project)}
                </span>
              )}
            </div>
            <div style={{ marginTop: 7, color: T.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {project.domain || "No domain"}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Project Management</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{projects.length} saved project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="pri-btn" onClick={openCreateProject} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
            <Plus size={15} strokeWidth={2.5} /> Add Project
          </button>
        </div>
      </div>

      <div style={{ ...kpiGridStyle, marginBottom: 20 }}>
        <KpiCard Icon={Briefcase} label="Live Projects" value={projectTabCounts.allProjects || 0} color="#0f766e" bgColor="#ccfbf1" />
        <KpiCard Icon={Clock} label="Ongoing Projects" value={ongoingProjects} color={T.green} bgColor={T.greenBg} />
        <KpiCard Icon={KeyRound} label="Credentials" value={projectTabCounts.credentials || 0} color="#d97706" bgColor="#fffbeb" />
        <KpiCard Icon={Globe2} label="Domain Details" value={projectTabCounts.domainDetails || 0} color="#0891b2" bgColor="#ecfeff" />
      </div>

      {projects.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
          <ChartCard title="Project Assign To" subtitle="Project distribution by assignee">
            {projectAssignChartData.length === 0 ? (
              <div style={{ height: 240, display: "grid", placeItems: "center", color: T.textMuted, fontSize: 13 }}>No assigned project data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={projectAssignChartData} cx="50%" cy="50%" innerRadius={58} outerRadius={94} paddingAngle={3} dataKey="value" onClick={(entry) => setSelectedAssignee(entry?.name || "")} cursor="pointer">
                    {projectAssignChartData.map((entry, i) => <Cell key={i} fill={entry.fill} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {activeAssigneeBucket && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${T.borderLight}`, paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: activeAssigneeBucket.fill, letterSpacing: ".08em", textTransform: "uppercase" }}>
                    {activeAssigneeBucket.name} Projects
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>{activeAssigneeProjects.length} item{activeAssigneeProjects.length !== 1 ? "s" : ""}</div>
                </div>
                {renderProjectDetailCards(activeAssigneeProjects, activeAssigneeBucket.fill, project => project.technology || project.platform || "Project")}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Projects by Platform" subtitle="Platform split across saved projects">
            {projectPlatformChartData.length === 0 ? (
              <div style={{ height: 240, display: "grid", placeItems: "center", color: T.textMuted, fontSize: 13 }}>No platform data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={projectPlatformChartData} barSize={28} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(15,118,110,.06)" }} />
                  <Bar dataKey="count" name="Projects" radius={[8, 8, 0, 0]} onClick={(entry) => setSelectedPlatform(entry?.name || entry?.payload?.name || "")} cursor="pointer">
                    {projectPlatformChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {activePlatformBucket && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${T.borderLight}`, paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: activePlatformBucket.fill, letterSpacing: ".08em", textTransform: "uppercase" }}>
                    {activePlatformBucket.name} Projects
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>{activePlatformProjects.length} item{activePlatformProjects.length !== 1 ? "s" : ""}</div>
                </div>
                {renderProjectDetailCards(activePlatformProjects, activePlatformBucket.fill, project => project.assignTo || "Project")}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Upcoming Due Dates" subtitle="Website and domain due items in the next 30 days" style={{ gridColumn: "1 / -1" }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projectDueChartData} barSize={34} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(247, 147, 30,.05)" }} />
                <Bar dataKey="count" name="Items" radius={[8, 8, 0, 0]} onClick={(entry) => setSelectedDueBucket(entry?.id || entry?.payload?.id || "")} cursor="pointer">
                  {projectDueChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {activeDueBucket && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${T.borderLight}`, paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: activeDueBucket.fill, letterSpacing: ".08em", textTransform: "uppercase" }}>
                    {activeDueBucket.name} Projects
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>{activeDueBucket.count} item{activeDueBucket.count !== 1 ? "s" : ""}</div>
                </div>
                {activeDueBucket.projects?.length ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                    {activeDueBucket.projects.map((project, index) => (
                      <div key={`${project.type}-${project.name}-${index}`} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 12px", background: "#fff" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</div>
                          <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, color: activeDueBucket.fill, background: `${activeDueBucket.fill}14`, border: `1px solid ${activeDueBucket.fill}33`, borderRadius: 7, padding: "4px 7px" }}>{project.type}</span>
                        </div>
                        <div style={{ marginTop: 7, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, color: T.textMuted, fontSize: 12 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.domain || "No domain"}</span>
                          <span style={{ flexShrink: 0 }}>{fmtShortDate(project.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: T.textMuted, padding: "10px 0" }}>No projects in this bucket</div>
                )}
              </div>
            )}
          </ChartCard>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {PROJECT_TABS.map(tab => {
            const isActive = selectedProjectTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 9,
                  border: `1.5px solid ${isActive ? T.brandMid : T.border}`,
                  background: isActive ? T.brandLight : "#fff",
                  color: isActive ? T.brand : T.textSecondary,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {tab.label} ({projectTabCounts[tab.id] || 0})
              </button>
            );
          })}
        </div>
        <form onSubmit={handleProjectSearch} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", marginLeft: "auto" }}>
          <div style={{ position: "relative", minWidth: 240 }}>
            <Search size={15} strokeWidth={2} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              className="inp"
              value={projectSearchDraft}
              onChange={event => setProjectSearchDraft(event.target.value)}
              placeholder="Search company or domain"
              style={{
                width: "100%",
                height: 39,
                padding: "0 36px 0 34px",
                border: `1.5px solid ${T.inputBorder}`,
                borderRadius: 10,
                background: "#fff",
                color: T.textPrimary,
                fontSize: 13,
                fontFamily: "inherit",
                fontWeight: 600,
              }}
            />
            {(projectSearchDraft || projectSearch) && (
              <button
                type="button"
                onClick={clearProjectSearch}
                title="Clear search"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: T.textMuted,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                }}
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            )}
          </div>
          <button
            type="submit"
            style={{
              display: "flex", alignItems: "center", gap: 7, height: 39, padding: "0 15px",
              background: T.textPrimary,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Search size={14} strokeWidth={2.3} /> Search
          </button>
        </form>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => handleDownloadProjectsCsv(selectedProjectTab)}
          disabled={filteredProjects.length === 0}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "9px 16px",
            background: filteredProjects.length === 0 ? T.slateBg : "#fff",
            color: filteredProjects.length === 0 ? T.textMuted : T.teal,
            border: `1.5px solid ${filteredProjects.length === 0 ? T.slateBorder : "#99f6e4"}`,
            borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: filteredProjects.length === 0 ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          <Download size={15} strokeWidth={2.2} /> Download CSV
        </button>
      </div>

      {projectSearch && (
        <div style={{ marginBottom: 12, fontSize: 12.5, color: T.textMuted }}>
          Showing {filteredProjects.length} result{filteredProjects.length !== 1 ? "s" : ""} for <span style={{ color: T.textPrimary, fontWeight: 800 }}>"{projectSearch}"</span>
        </div>
      )}

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,.04)", overflow: "hidden" }}>
        {filteredProjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <Briefcase size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>{projectSearch ? "No matching projects found" : "No data saved in this tab yet"}</p>
            <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>{projectSearch ? "Try another company or domain name." : "Use Add Project to save details for this project tab."}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: Math.max(760, tableFields.length * 150), borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {tableFields.map(field => (
                    <th key={field.key} style={{ textAlign: "left", padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: T.textMuted, whiteSpace: "nowrap" }}>{field.label}</th>
                  ))}
                  <th style={{ textAlign: "left", padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: T.textMuted, whiteSpace: "nowrap" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageProjects.map((project, i) => (
                  <tr key={project._id} className="data-row" style={{ background: i % 2 === 0 ? "#fff" : T.bg, borderBottom: `1px solid ${T.borderLight}` }}>
                    {tableFields.map(field => (
                      <td key={field.key} style={{ padding: "13px 14px", color: field.key === "companyName" ? T.textPrimary : T.textSecondary, fontWeight: field.key === "companyName" ? 700 : 400, whiteSpace: "nowrap" }}>
                        {renderCell(project, field)}
                      </td>
                    ))}
                      <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <IconBtn icon={Pencil} color={T.brand} bg={T.brandLight} hoverBg={T.brandMid} onClick={() => openEditProject(project)} title="Update project" />
                          <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteProject(project)} title="Delete project" />
                        </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {filteredProjects.length > PAGE_SIZE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <div style={{ fontSize: 12.5, color: T.textMuted }}>
            Showing {pageFrom}-{pageTo} of {filteredProjects.length}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
              style={{
                padding: "8px 12px",
                borderRadius: 9,
                border: `1.5px solid ${T.border}`,
                background: safeCurrentPage === 1 ? T.slateBg : "#fff",
                color: safeCurrentPage === 1 ? T.textMuted : T.textPrimary,
                cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12.5, color: T.textMuted, fontWeight: 700 }}>Page {safeCurrentPage} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={safeCurrentPage === totalPages}
              style={{
                padding: "8px 12px",
                borderRadius: 9,
                border: `1.5px solid ${T.border}`,
                background: safeCurrentPage === totalPages ? T.slateBg : "#fff",
                color: safeCurrentPage === totalPages ? T.textMuted : T.textPrimary,
                cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
