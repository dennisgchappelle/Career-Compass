document.addEventListener("DOMContentLoaded", () => {
    fetchJobs();

    document.getElementById("applicationForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        await submitApplication();
    });

    document.getElementById("closeApplication").addEventListener("click", () => {
        document.getElementById("applicationModal").style.display = "none";
    });

    document.getElementById("sortSalary").addEventListener("change", filterAndDisplayJobs);
    document.getElementById("filterCompany").addEventListener("change", filterAndDisplayJobs);
    document.getElementById("filterTitle").addEventListener("change", filterAndDisplayJobs);
    document.getElementById("filterRecommended").addEventListener("change", filterAndDisplayJobs);
});

let allJobs = [];

async function fetchJobs() {
    try {
        const response = await fetch("/jobs");
        allJobs = await response.json();
        populateFilterOptions();
        filterAndDisplayJobs();
    } catch (error) {
        console.error("Error fetching jobs:", error);
    }
}

function populateFilterOptions() {
    const companies = new Set();
    const titles = new Set();

    allJobs.forEach(job => {
        companies.add(job.company);
        titles.add(job.jobTitle);
    });

    const companySelect = document.getElementById("filterCompany");
    companySelect.innerHTML = '<option value="">All Companies</option>';
    companies.forEach(company => {
        companySelect.innerHTML += `<option value="${company}">${company}</option>`;
    });

    const titleSelect = document.getElementById("filterTitle");
    titleSelect.innerHTML = '<option value="">All Titles</option>';
    titles.forEach(title => {
        titleSelect.innerHTML += `<option value="${title}">${title}</option>`;
    });
}

function filterAndDisplayJobs() {
    const sortSalary = document.getElementById("sortSalary").value;
    const selectedCompany = document.getElementById("filterCompany").value;
    const selectedTitle = document.getElementById("filterTitle").value;
    const recommendedOnly = document.getElementById("filterRecommended").checked;

    const student = JSON.parse(sessionStorage.getItem("student"));
    const recommendedJobs = (student.recommendedJobs || []).map(rec => rec.jobId);

    let filteredJobs = [...allJobs];

    if (selectedCompany) {
        filteredJobs = filteredJobs.filter(job => job.company === selectedCompany);
    }
    if (selectedTitle) {
        filteredJobs = filteredJobs.filter(job => job.jobTitle === selectedTitle);
    }
    if (recommendedOnly) {
        filteredJobs = filteredJobs.filter(job => recommendedJobs.includes(job._id));
    }
    if (sortSalary === "asc") {
        filteredJobs.sort((a, b) => a.salary - b.salary);
    } else if (sortSalary === "desc") {
        filteredJobs.sort((a, b) => b.salary - a.salary);
    }

    renderJobCards(filteredJobs);
}


function renderJobCards(jobs) {
    const jobCardsContainer = document.getElementById("jobCards");
    jobCardsContainer.innerHTML = "";

    const student = JSON.parse(sessionStorage.getItem("student"));
    const recommendedJobs = (student.recommendedJobs || []).map(rec => rec.jobId);

    if (jobs.length === 0) {
        jobCardsContainer.innerHTML = "<p>No jobs match the selected criteria.</p>";
        return;
    }

    jobs.forEach(job => {
        const isRecommended = recommendedJobs.includes(job._id);

        const jobCard = document.createElement("div");
        jobCard.classList.add("card");

        jobCard.innerHTML = `
            ${isRecommended ? '<div class="star-badge">⭐</div>' : ''}
            <div class="card-header">${job.jobTitle}</div>
            <div class="card-content">
                <p><strong>Company:</strong> ${job.company}</p>
                <p><strong>Location:</strong> ${job.location}</p>
                <p><strong>Salary:</strong> $${job.salary}</p>
                <p><strong>Description:</strong> ${job.description}</p>
                <p><strong>Skills Required:</strong> ${job.skillsRequired.join(", ")}</p>
            </div>
            <div class="card-footer">
                <button onclick="openApplicationModal('${job._id}')">Apply Now</button>
            </div>
        `;

        jobCard.style.position = "relative"; // ⭐ Ensure the star can float inside
        jobCardsContainer.appendChild(jobCard);
    });
}


function openApplicationModal(jobId) {
    document.getElementById("applicationForm").dataset.jobId = jobId;
    document.getElementById("applicationModal").style.display = "block";
}

async function submitApplication() {
    const jobID = document.getElementById("applicationForm").dataset.jobId;
    const student = JSON.parse(sessionStorage.getItem("student"));

    if (!student || !jobID) {
        alert("Missing student or job ID.");
        return;
    }

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phoneNumber = document.getElementById("phoneNumber").value.trim();
    const skills = document.getElementById("skills").value.trim();
    const address = document.getElementById("address").value.trim();
    const resumeFile = document.getElementById("resume").files[0];

    if (!firstName || !lastName || !email || !phoneNumber || !skills || !address) {
        alert("All fields except resume are required.");
        return;
    }

    let resumeBase64 = "";
    if (resumeFile) resumeBase64 = await toBase64(resumeFile);

    const applicationData = {
        studentID: student._id,
        firstName,
        lastName,
        email,
        phone: phoneNumber,
        skills,
        address,
        resume: resumeBase64
    };

    const response = await fetch(`/jobs/${jobID}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applicationData)
    });

    const result = await response.json();
    if (response.ok) {
        alert("Application submitted successfully!");
        document.getElementById("applicationModal").style.display = "none";
    } else {
        alert("Error: " + result.message);
    }
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
