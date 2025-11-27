// counselor_dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const postWorkshopModal = document.getElementById("postWorkshopModal");
    const closePostWorkshop = document.getElementById("closePostWorkshop");
    const postWorkshopForm = document.getElementById("postWorkshopForm");

    const counselorData = sessionStorage.getItem("counselor");
    const counselor = counselorData ? JSON.parse(counselorData) : null;

    if (!counselor) {
        alert("You need to log in as a counselor.");
        return;
    }

    closePostWorkshop.addEventListener("click", () => {
        postWorkshopModal.style.display = "none";
    });

    postWorkshopForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const newWorkshop = {
            workshopTitle: document.getElementById("workshopTitle").value.trim(),
            date: document.getElementById("date").value,
            time: document.getElementById("time").value,
            location: document.getElementById("location").value.trim(),
            description: document.getElementById("description").value.trim(),
            counselorID: counselor._id
        };

        const response = await fetch("/workshops", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newWorkshop)
        });

        const result = await response.json();
        if (response.ok) {
            alert("Workshop posted successfully!");
            postWorkshopModal.style.display = "none";
        } else {
            alert("Error: " + result.message);
        }
    });
});

function openWorkshopModal() {
    document.getElementById("postWorkshopModal").style.display = "block";
}

function matchOpportunities() {
    window.location.href = "Cmatching.html";
}

function viewMessages() {
    const stored = sessionStorage.getItem("counselor");
    if (!stored) {
        alert("Session expired. Please log in again.");
        return;
    }

    const parsed = JSON.parse(stored);
    sessionStorage.setItem("counselor", JSON.stringify(parsed));

    window.location.href = "Counselormessenger.html";
}

function loadStudentApplications() {
    window.location.href = "StudentApplications.html";
}

function logout() {
    sessionStorage.clear();
    localStorage.clear();
    showLogoutPopup();
    setTimeout(() => {
        window.location.href = "welcome.html";
    }, 2000);
}

function showLogoutPopup() {
    const existingPopup = document.querySelector(".logout-popup");
    if (existingPopup) existingPopup.remove();

    const popup = document.createElement("div");
    popup.textContent = "Logging Out... See you soon!";
    popup.className = "logout-popup";
    document.body.appendChild(popup);

    setTimeout(() => popup.classList.add("visible"), 10);
    setTimeout(() => {
        popup.classList.add("slide-out");
        setTimeout(() => popup.remove(), 500);
    }, 1500);
}
