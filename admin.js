document.addEventListener("DOMContentLoaded", () => {
    const allUsersButton = document.getElementById("allUsersButton");
    const logoutButton = document.getElementById("logoutButton");
    const recruiterBox = document.getElementById("ArecruiterBox");
    const studentBox = document.getElementById("AstudentBox");
    const counselorBox = document.getElementById("AcounselorBox");

    if (counselorBox) {
        counselorBox.addEventListener("click", () => {
            window.location.href = "admin_dashboard.html";
        });
    }

    if (studentBox) {
        studentBox.addEventListener("click", () => {
            window.location.href = "analytics.html";
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            showLogoutPopup();
            setTimeout(() => {
                window.location.href = "welcome.html";
            }, 2000);
        });
    }

    if (recruiterBox) {
        recruiterBox.addEventListener("click", () => {
            window.location.href = "AdminR_dashboard.html";
        });
    }

    // 🆕 Messages button handler with sessionStorage setup
    const messagesButton = document.querySelector("button[action-messages]") || document.querySelector("button");
    if (messagesButton && messagesButton.textContent.includes("Messages")) {
        messagesButton.addEventListener("click", () => {
            const adminUser = {
                messageSenderID: "admin-sender-uuid",
                messageReceiverID: "admin-receiver-uuid",
                role: "Admin",
                name: "Admin User"
            };
            sessionStorage.setItem("admin", JSON.stringify(adminUser));
            window.location.href = "AdminMessenger.html";
        });
    }
});

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
