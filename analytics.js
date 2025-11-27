document.addEventListener("DOMContentLoaded", () => {
    loadPlatformStats();

    const roleSelect = document.getElementById("roleSelect");
    const userSelect = document.getElementById("userSelect");

    roleSelect.addEventListener("change", async () => {
        const role = roleSelect.value;
        userSelect.innerHTML = `<option value="">-- Select User --</option>`;
        userSelect.disabled = true;

        if (!role) return;

        const response = await fetch(`/users/by-role/${role}`);
        const users = await response.json();

        users.forEach(user => {
            const option = document.createElement("option");
            option.value = user._id;
            option.textContent = `${user.firstName} ${user.lastName}`;
            userSelect.appendChild(option);
        });

        userSelect.disabled = false;
    });

    userSelect.addEventListener("change", async () => {
        const userId = userSelect.value;
        const role = roleSelect.value;
        if (!userId || !role) return;

        const response = await fetch(`/analytics/${role}/${userId}`);
        const analytics = await response.json();
        renderUserAnalytics(role, analytics);
    });
});

async function loadPlatformStats() {
    try {
        const response = await fetch("/analytics/platform");
        const stats = await response.json();

        const container = document.getElementById("platformStatsContent");
        container.innerHTML = `
      <div class="stat-item">🧑‍🎓 Students: <strong>${stats.studentCount}</strong></div>
      <div class="stat-item">🧑‍💼 Recruiters: <strong>${stats.recruiterCount}</strong></div>
      <div class="stat-item">🎓 Counselors: <strong>${stats.counselorCount}</strong></div>
      <div class="stat-item">🛡️ Admins: <strong>${stats.adminCount}</strong></div>
    `;
    } catch (err) {
        console.error("Failed to load platform stats", err);
    }
}

function renderUserAnalytics(role, data) {
    const container = document.getElementById("userAnalyticsContainer");
    container.innerHTML = "";

    if (role === "student") {
        container.innerHTML = `
      <div class="stat-item">📄 Jobs Applied: <strong>${data.totalApplied}</strong></div>
      <div class="stat-item">📚 Workshops Attended: <strong>${data.totalWorkshops}</strong></div>
      <div class="stat-item">🕓 Most Recent Application:</div>
        ${data.mostRecentApplication
            ? `<div style="margin-left: 1rem;">
        <div><strong>Title:</strong> ${data.mostRecentApplication.title}</div>
        <div><strong>Company:</strong> ${data.mostRecentApplication.company}</div>
        <div><strong>Applied At:</strong> ${new Date(data.mostRecentApplication.appliedAt).toLocaleString()}</div>
     </div>`
            : `<div style="margin-left: 1rem;">N/A</div>`}
      <div class="stat-item">🕓 Most Recent Workshop:</div>
       ${data.mostRecentWorkshop
            ? `<div style="margin-left: 1rem;">
        <div><strong>Title:</strong> ${data.mostRecentWorkshop.title}</div>
        <div><strong>Date:</strong> ${new Date(data.mostRecentWorkshop.attendedAt).toLocaleString()}</div>
        <div><strong>Counselor:</strong> ${data.mostRecentWorkshop.counselorName}</div>
     </div>`
            : `<div style="margin-left: 1rem;">N/A</div>`}

        }
    `;
    } else if (role === "recruiter") {
        container.innerHTML = `
      <div class="stat-item">📢 Jobs Posted: <strong>${data.totalJobs}</strong></div>
      <div class="stat-item">👥 Total Applicants: <strong>${data.totalApplicants}</strong></div>
      <div class="stat-item">🔥 Most Applied Job: <pre>${JSON.stringify(data.mostAppliedJob?.jobTitle || "N/A", null, 2)}</pre></div>
      <div class="stat-item">🆕 Most Recent Job: <pre>${JSON.stringify(data.mostRecentJob?.jobTitle || "N/A", null, 2)}</pre></div>
    `;
    } else if (role === "counselor") {
        container.innerHTML = `
      <div class="stat-item">📚 Workshops Posted: <strong>${data.totalWorkshops}</strong></div>
      <div class="stat-item">💼 Jobs Recommended: <strong>${data.totalRecommended || 0}</strong></div>
      <div class="stat-item">👤 Student Most Interacted With: <pre>${JSON.stringify(data.topStudent || "N/A", null, 2)}</pre></div>
    `;
    }

}
