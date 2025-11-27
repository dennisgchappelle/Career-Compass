document.addEventListener("DOMContentLoaded", () => {
    fetchWorkshops();
});

async function fetchWorkshops() {
    try {
        const response = await fetch("/workshops");
        const workshops = await response.json();
        const workshopCardsContainer = document.getElementById("workshopCards");

        workshopCardsContainer.innerHTML = ""; // Clear existing

        workshops.forEach(workshop => {
            const card = document.createElement("div");
            card.classList.add("card");
            card.innerHTML = `
                <div class="card-header">${workshop.workshopTitle}</div>
                <div class="card-content">
                    <p><strong>Date:</strong> ${workshop.date}</p>
                    <p><strong>Time:</strong> ${workshop.time}</p>
                    <p><strong>Location:</strong> ${workshop.location}</p>
                    <p><strong>Description:</strong> ${workshop.description}</p>
                </div>
                <div class="card-footer">
                    <button onclick="registerForWorkshop('${workshop._id}')">Register</button>
                </div>
            `;
            workshopCardsContainer.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching workshops:", error);
    }
}

async function registerForWorkshop(workshopId) {
    const studentData = sessionStorage.getItem("student");
    const student = studentData ? JSON.parse(studentData) : null;

    if (!student || !student._id) {
        alert("You must be logged in as a student to register.");
        return;
    }

    const confirmRegister = confirm("Are you sure you want to register for this workshop?");
    if (!confirmRegister) return;

    try {
        const response = await fetch(`/workshops/${workshopId}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                studentID: student._id,
                firstName: student.firstName,
                lastName: student.lastName
            })
        });

        const result = await response.json();
        if (response.ok) {
            alert("Successfully registered for the workshop!");

            // ✅ Find the button and update it
            const button = document.querySelector(`button[onclick="registerForWorkshop('${workshopId}')"]`);
            if (button) {
                button.textContent = "Registered";
                button.style.backgroundColor = "green";
                button.disabled = true;
            }
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        console.error("Error registering:", error);
        alert("Failed to register.");
    }
}

