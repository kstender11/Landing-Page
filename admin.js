(function () {
    const API_LIST  = "/api/admin/list";
    const API_STATS = "/api/admin/stats";
  
    const $ = (id) => document.getElementById(id);
    const tokenInStorage = () => sessionStorage.getItem("ADMIN_TOKEN") || localStorage.getItem("ADMIN_TOKEN") || "";
  
    $("token").value = tokenInStorage();
  
    $("saveToken").addEventListener("click", () => {
      const t = $("token").value.trim();
      if (!t) { alert("Enter a token"); return; }
      sessionStorage.setItem("ADMIN_TOKEN", t);
      localStorage.setItem("ADMIN_TOKEN", t);
      loadAll();
    });
  
    $("refresh").addEventListener("click", loadAll);
    $("search").addEventListener("input", debounce(loadTable, 300));
    $("export").addEventListener("click", exportCSV);
  
    let cacheDocs = [];
  
    async function fetchJSON(url, opts = {}) {
      const token = tokenInStorage();
      const headers = Object.assign({ "x-admin-token": token }, opts.headers || {});
      const res = await fetch(url, Object.assign({}, opts, { headers }));
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      return data;
    }
  
    async function loadStats() {
      $("stats").textContent = "Loading stats…";
      try {
        const s = await fetchJSON(API_STATS);
        const top = (s.topReferrers || []).slice(0, 5).map(r =>
          `${r.name || r.email} (${r.referralCount || 0})`
        ).join(", ");
        $("stats").innerHTML =
          `<b>Total:</b> ${s.total} &nbsp; <b>Referred signups:</b> ${s.referred} &nbsp; <span class="pill">Top:</span> ${top || "—"}`;
      } catch (e) {
        $("stats").innerHTML = `<span class="warn">Stats error:</span> ${e.message}`;
      }
    }
  
    async function loadTable() {
      const q = $("search").value.trim();
      const url = q ? `${API_LIST}?q=${encodeURIComponent(q)}&limit=500` : `${API_LIST}?limit=500`;
      const data = await fetchJSON(url);
      cacheDocs = data.docs || [];
      renderTable(cacheDocs);
    }
  
    function renderTable(docs) {
      const tbody = $("tbody");
      if (!docs.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="muted">No results</td></tr>`;
        return;
      }
      const rows = docs.map(d => {
        const created = d.createdAt ? new Date(d.createdAt).toLocaleString() : "";
        const name = d.name || [d.firstName, d.lastName].filter(Boolean).join(" ") || "—";
        const city = d.cityPreference || "—";
        const refLink = d.referralCode ? `${location.origin}?ref=${d.referralCode}` : "—";
        return `<tr>
          <td>${escapeHTML(name)}</td>
          <td>${escapeHTML(d.email)}</td>
          <td>${escapeHTML(city)}</td>
          <td>${escapeHTML(d.referralCode || "")}</td>
          <td>${escapeHTML(d.referredBy || "")}</td>
          <td>${Number(d.referralCount || 0)}</td>
          <td>${created}</td>
          <td class="muted">${escapeHTML(d.source || "")}</td>
        </tr>`;
      }).join("");
      tbody.innerHTML = rows;
    }
  
    function exportCSV() {
      if (!cacheDocs.length) { alert("Nothing to export"); return; }
      const header = ["email","firstName","lastName","name","cityPreference","referralCode","referredBy","referralCount","source","createdAt"];
      const lines = [header.join(",")];
      cacheDocs.forEach(d => {
        const row = [
          d.email || "",
          d.firstName || "",
          d.lastName || "",
          d.name || "",
          d.cityPreference || "",
          d.referralCode || "",
          d.referredBy || "",
          String(d.referralCount || 0),
          d.source || "",
          d.createdAt || ""
        ].map(csvEscape).join(",");
        lines.push(row);
      });
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `clubview-subscribers-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  
    function escapeHTML(s) {
      return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }
    function csvEscape(s) {
      const v = String(s ?? "");
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      // minimal CSV escape
    }
    function debounce(fn, ms) {
      let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }
  
    async function loadAll() {
      try {
        await loadStats();
        await loadTable();
      } catch (e) {
        $("tbody").innerHTML = `<tr><td colspan="8" class="warn">Auth or load error: ${e.message}</td></tr>`;
      }
    }
  
    // auto-load if token exists
    if (tokenInStorage()) loadAll();
  })();
  