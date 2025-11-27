document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("workshopForm");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const counselor = JSON.parse(sessionStorage.getItem("counselor"));
        if (!counselor || !counselor._id) {
            alert("Session expired. Please log in again.");
            return;
        }

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
            window.location.href = "workshop.html";
        } else {
            alert("Error: " + result.message);
        }
    });

    async function loadPostedWorkshops() {
        const counselor = JSON.parse(sessionStorage.getItem("counselor"));
        if (!counselor || !counselor._id) return;

        try {
            const response = await fetch(`/workshops/by-counselor/${counselor._id}`);
            const workshops = await response.json();
            const container = document.getElementById("workshopList");
            container.innerHTML = "";

            if (workshops.length === 0) {
                container.innerHTML = "<p>No workshops posted yet.</p>";
                return;
            }

            workshops.forEach(workshop => {
                const card = document.createElement("div");
                card.className = "card";
                card.innerHTML = `
                    <div class="card-header">${workshop.workshopTitle}</div>
                    <div class="card-content">
                        <p><strong>Date:</strong> ${workshop.date}</p>
                        <p><strong>Time:</strong> ${workshop.time}</p>
                        <p><strong>Location:</strong> ${workshop.location}</p>
                        <p><strong>Description:</strong> ${workshop.description}</p>
                    </div>
                    <div class="card-footer">
                        <button class="blue-btn" onclick='viewAttendees(${JSON.stringify(workshop.attendees || [])})'>View Attendees</button>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (error) {
            console.error("Error loading posted workshops:", error);
        }
    }

    window.viewAttendees = function(attendees) {
        const modal = document.getElementById("attendeeModal");
        const list = document.getElementById("attendeeList");

        list.innerHTML = "";

        if (!attendees || attendees.length === 0) {
            list.innerHTML = "<li>No attendees registered yet.</li>";
        } else {
            attendees.forEach(a => {
                const li = document.createElement("li");
                li.textContent = `${a.firstName} ${a.lastName}`;
                list.appendChild(li);
            });
        }

        modal.style.display = "flex";
    };

    window.closeAttendeeModal = function() {
        document.getElementById("attendeeModal").style.display = "none";
    };


    loadPostedWorkshops();
});
