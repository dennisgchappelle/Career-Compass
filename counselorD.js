
function loadStudentApplications() {
    const university = document.getElementById("universitySelect").value;
    if (!university) return;

    fetch(`/counselor/students/university-applications?university=${encodeURIComponent(university)}`)
        .then(res => res.json())
        .then(data => displayStudents(data))
        .catch(err => {
            console.error("Error fetching student data:", err);
            alert("Failed to load student data.");
        });
}

    function displayStudents(studentsWithApplications) {
        const container = document.createElement("div");
        container.style.marginTop = "2rem";

        studentsWithApplications.forEach(({ student, applications }) => {
            const card = document.createElement("div");
            card.className = "dashboard-card";

            let appList = "<ul>";
            applications.forEach((app, index) => {
                const detailId = `app-details-${student._id}-${index}`;
                const mailtoLink = `mailto:${app.email}`;
                appList += `
                    <li>
                        <strong>${app.jobTitle}</strong> - ${app.status}
                       <button style="..." onclick="toggleDetails('${detailId}')">🔽</button>
                       <button style="..." onclick="window.location.href='${mailtoLink}'">📧</button>
                       <button style="background-color:#28a745; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.9rem;" onmouseover="this.style.backgroundColor='#218838'" onmouseout="this.style.backgroundColor='#28a745'" onclick="window.open('viewapplicants.html?jobId=${app.jobId}', '_blank')">🔍</button>
                        <div id="${detailId}" style="display:none; margin-top: 0.5rem;">
                            <strong>Email:</strong> ${app.email}<br/>
                            ${app.skills?.length ? `<strong>Skills:</strong> ${app.skills.join(", ")}<br/>` : ""}
                            ${app.resume ? `<a href="${app.resume}" target="_blank">📄 View Resume</a><br/>` : ""}
                            <em>Applied on: ${new Date(app.appliedAt).toLocaleDateString()}</em>
                        </div>
                    </li>
                `;
            });
            appList += "</ul>";

            card.innerHTML = `
                <div>
                    <h3>${student.firstname || "N/A"} ${student.lastname || "N/A"}</h3>
                    <p><strong>Username:</strong> ${student.username || "N/A"}</p>
                    <p><strong>Major:</strong> ${student.major || "N/A"}</p>
                    <p><strong>University:</strong> ${student.university || "N/A"}</p>
                    <h4>Applications:</h4>
                    ${applications.length === 0 ? "<p>No applications submitted.</p>" : appList}
                </div>
            `;

            container.appendChild(card);
        });

        document.querySelector(".dashboard-content").appendChild(container);
    }


function toggleDetails(id) {
    const element = document.getElementById(id);
    if (element) {
        element.style.display = (element.style.display === "none") ? "block" : "none";
    }
}
function populateUniversityDropdown() {
    fetch("/universities")
        .then(res => res.json())
        .then(universities => {
            const select = document.getElementById("universitySelect");
            universities.forEach(u => {
                const option = document.createElement("option");
                option.value = u;
                option.textContent = u;
                select.appendChild(option);
            });
        })
        .catch(err => console.error("Error loading universities:", err));
}
