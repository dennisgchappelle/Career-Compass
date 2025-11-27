// Cmatching.js

document.addEventListener("DOMContentLoaded", function () {
    const jobList = document.getElementById("jobList");
    const matchModal = document.getElementById("matchModal");
    const studentSelect = document.getElementById("studentSelect");
    const confirmMatchBtn = document.getElementById("confirmMatchBtn");
    const cancelMatchBtn = document.getElementById("cancelMatchBtn");

    let selectedJobId = null;
    let allStudents = [];

    async function fetchJobs() {
        try {
            const response = await fetch("/jobs");
            const jobs = await response.json();
            renderJobs(jobs);
        } catch (error) {
            console.error("Error fetching jobs:", error);
        }
    }

    async function fetchStudents() {
        try {
            const response = await fetch("/users/by-role/student");
            allStudents = await response.json();
            console.log("Fetched students:", allStudents); // ✅ Debugging
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    }

    function renderJobs(jobs) {
        jobList.innerHTML = "";
        jobs.forEach(job => {
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <h3>${job.jobTitle}</h3>
                <p><strong>Company:</strong> ${job.company}</p>
                <p><strong>Location:</strong> ${job.location}</p>
                <p><strong>Salary:</strong> $${job.salary}</p>
                <button onclick="openMatchModal('${job._id}')">Match Student</button>
            `;
            jobList.appendChild(card);
        });
    }

    window.openMatchModal = function (jobId) {
        selectedJobId = jobId;

        studentSelect.innerHTML = "";
        allStudents.forEach(student => {
            if (student._id) {  // ✅ Safe check
                const option = document.createElement("option");
                option.value = student._id;
                option.textContent = `${student.firstName} ${student.lastName}`;
                studentSelect.appendChild(option);
            }
        });

        matchModal.style.display = "block";
    };

    confirmMatchBtn.addEventListener("click", async function () {
        const studentId = studentSelect.value;
        const counselor = JSON.parse(sessionStorage.getItem("counselor"));

        if (!counselor || !counselor._id || !studentId || !selectedJobId) {
            alert("Missing counselorId, studentId, or jobId.");
            return;
        }

        console.log("Counselor ID:", counselor._id);
        console.log("Student ID:", studentId);
        console.log("Job ID:", selectedJobId);

        try {
            const response = await fetch("/matches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    counselorId: counselor._id,
                    studentId: studentId,
                    jobId: selectedJobId
                })
            });

            const result = await response.json();
            if (response.ok) {
                alert("Student matched to job successfully!");

                // ✅ Find the job info for the message
                const selectedJob = await fetch(`/jobs`)
                    .then(res => res.json())
                    .then(jobs => jobs.find(job => job._id === selectedJobId));

                if (!selectedJob) {
                    console.error("Selected job not found for message.");
                    return;
                }

                const defaultMessage = `Greetings! I think the ${selectedJob.jobTitle} role at ${selectedJob.company} fits your skill set. You will now see a Gold Star above the job. Please, check it out!`;

                const customMessage = prompt("Enter a message to send to the student:", defaultMessage);

                if (customMessage && customMessage.trim().length > 0) {
                    const selectedStudent = allStudents.find(s => s._id === studentId);
                    if (selectedStudent) {
                        await fetch("/messages/universal-send", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                senderId: counselor.messageSenderID,      // ✅ Counselor sending
                                receiverId: selectedStudent.messageReceiverID, // ✅ Student receiving
                                message: customMessage.trim()
                            })
                        });
                        console.log("Custom message sent!");
                    }
                } else {
                    console.log("No message sent (counselor cancelled prompt).");
                }

                matchModal.style.display = "none";
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error("Error matching student or sending message:", error);
            alert("Error matching student or sending message.");
        }
    });


    cancelMatchBtn.addEventListener("click", function () {
        matchModal.style.display = "none";
    });

    // ✅ FETCH EVERYTHING ON PAGE LOAD
    fetchJobs();
    fetchStudents();
});
