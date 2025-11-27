const { v4: uuidv4 } = require('uuid');
const express = require('express');
const router = express.Router(); // ✅ Fix: Define the router
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');


const app = express();
const PORT = 3000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname, {
    index: false // disables automatic serving of index.html
}));


// MongoDB Connection String
const uri = "mongodb+srv://tbrown12354:SGoku1932@coursecompass.lespq.mongodb.net/?appName=CourseCompass";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        deprecationErrors: true // (optional to keep, safe)
    }
});


let database, studentsCollection, recruitersCollection, jobsCollection;

async function connectDB() {
    try {
        await client.connect();
        database = client.db("CourseCompass");

        studentsCollection = database.collection("students");
        recruitersCollection = database.collection("recruiters");
        jobsCollection = database.collection("jobs");
        messagesCollection = database.collection("messages");
        adminsCollection = database.collection("admins");
        counselorsCollection = database.collection("counselors"); // ✅ Add this line
        workshopsCollection = database.collection("workshops"); // ✅ NEW

        console.log("✅ Successfully connected to MongoDB!");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
    }
}


async function isUsernameTaken(username) {
    const collections = [studentsCollection, recruitersCollection, counselorsCollection, adminsCollection];
    for (const col of collections) {
        const existing = await col.findOne({ username });
        if (existing) return true;
    }
    return false;
}


connectDB();

// Serve the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

// ✅ **Student Sign-In Route**
app.post('/student/signin', async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log("🔍 Searching for student username:", username);

        if (!studentsCollection) {
            return res.status(500).json({ message: "Database connection not established" });
        }

        const student = await studentsCollection.findOne({ username });

        if (!student || student.password !== password) {
            console.log(`❌ Invalid credentials for student: ${username}`);
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        console.log(`🎉 Student login successful for: ${username}`);
        res.status(200).json({ userType: "student", user: student });
    } catch (err) {
        console.error("❌ Error during student sign-in:", err.message);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

app.post("/student/signup", async (req, res) => {
    try {
        const { firstName, lastName, email, username, password, university } = req.body;

        if (!firstName || !lastName || !email || !username || !password || !university) {
            return res.status(400).json({ message: "All fields are required." });
        }

        if (await isUsernameTaken(username)) {
            return res.status(409).json({ message: "Username already exists across roles." });
        }

        const newStudent = {
            firstName,
            lastName,
            email,
            username,
            password,
            university,
            appliedJobs: [],
            workshopsAttended: [],
            isActive: true,
            createdAt: new Date(),
            messageSenderID: uuidv4(),
            messageReceiverID: uuidv4()

        };

        const result = await studentsCollection.insertOne(newStudent);

        if (result.acknowledged) {
            res.status(201).json({ message: "Signup successful!" });
        } else {
            res.status(500).json({ message: "Failed to register student." });
        }
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});


// ✅ **Recruiter Sign-In Route**
// ✅ Full Recruiter Sign-In Route with UUIDs
app.post("/recruiter/signin", async (req, res) => {
    const { username, password } = req.body;

    try {
        const recruiter = await recruitersCollection.findOne({ username });

        if (!recruiter || recruiter.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // ✅ Send UUIDs for messaging in response
        res.status(200).json({
            message: "Login successful",
            user: {
                recruiterId: recruiter._id.toString(),
                username: recruiter.username,
                messageSenderID: recruiter.messageSenderID,
                messageReceiverID: recruiter.messageReceiverID
            }
        });
    } catch (error) {
        console.error("Recruiter sign-in error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


app.post("/recruiter/signup", async (req, res) => {
    try {
        const { firstName, lastName, email, username, password, company } = req.body;

        if (!firstName || !lastName || !email || !username || !password || !company) {
            return res.status(400).json({ message: "All fields are required." });
        }

        if (await isUsernameTaken(username)) {
            return res.status(409).json({ message: "Username already exists across roles." });
        }

        const newRecruiter = {
            firstName,
            lastName,
            email,
            username,
            password,
            company,
            jobsPosted: [],
            isActive: true,
            createdAt: new Date(),
            messageSenderID: uuidv4(),
            messageReceiverID: uuidv4()

        };

        const result = await recruitersCollection.insertOne(newRecruiter);

        if (result.acknowledged) {
            res.status(201).json({ message: "Recruiter signup successful!" });
        } else {
            res.status(500).json({ message: "Failed to register recruiter." });
        }
    } catch (error) {
        console.error("Recruiter signup error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

// ✅ **Recruiter Posts a Job**
// ✅ UPDATED recruiter job posting with MongoDB ID and recruiter profile update
app.post('/jobs', async (req, res) => {
    try {
        const { jobTitle, company, location, salary, description, skillsRequired, recruiterID } = req.body;

        if (!jobTitle || !company || !location || !salary || !description || !skillsRequired || !recruiterID) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const newJob = {
            jobId: uuidv4(),
            jobTitle,
            company,
            location,
            salary: Number(salary),
            description,
            skillsRequired: Array.isArray(skillsRequired)
                ? skillsRequired.map(skill => skill.trim())
                : skillsRequired.split(',').map(skill => skill.trim()),
            recruiterID,
            postedDate: new Date(),
            applicants: [],
            approved: false  // 🔒 default to not approved
        };


        const result = await jobsCollection.insertOne(newJob);
        const insertedId = result.insertedId;

        if (result.acknowledged) {
            // ✅ Update recruiter with job info
            await recruitersCollection.updateOne(
                { _id: new ObjectId(recruiterID) },
                { $push: { jobsPosted: { jobId: insertedId.toString(), jobTitle: newJob.jobTitle } } }
            );

            res.status(201).json({ message: "Job posted successfully!", job: newJob });
        } else {
            res.status(500).json({ message: "Failed to insert job into database." });
        }
    } catch (error) {
        console.error("Error posting job:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});



// API to Delete a Job
app.delete('/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        console.log(`Deleting job with ID: ${jobId}`);

        // Check if job exists before deleting
        const jobExists = await jobsCollection.findOne({ _id: new ObjectId(jobId) });
        if (!jobExists) {
            return res.status(404).json({ message: "Job not found." });
        }

        const deleteResult = await jobsCollection.deleteOne({ _id: new ObjectId(jobId) });

        if (deleteResult.deletedCount === 1) {
            console.log("Job deleted successfully.");
            res.status(200).json({ message: "Job deleted successfully!" });
        } else {
            console.error("Job deletion failed.");
            res.status(500).json({ message: "Failed to delete job from database." });
        }
    } catch (error) {
        console.error("Error deleting job:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

app.get("/universities", async (req, res) => {
    try {
        const universities = await studentsCollection.distinct("university");
        res.json(universities);
    } catch (err) {
        console.error("Error fetching universities:", err);
        res.status(500).json({ message: "Failed to fetch universities" });
    }
});

app.get("/students/universities", async (req, res) => {
    try {
        const universities = await studentsCollection.distinct("university");
        res.json(universities.filter(Boolean));
    } catch (err) {
        console.error("Error fetching universities:", err);
        res.status(500).json({ error: "Failed to fetch universities" });
    }
});



// ✅ Get All Jobs (Visible to Students)
app.get('/jobs', async (req, res) => {
    try {
        const jobs = await jobsCollection.find({ approved: true }).toArray();
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching jobs", error: error.message });
    }
});


// ✅ Get Jobs Posted by Specific Recruiter
app.get('/jobs/recruiter/:recruiterID', async (req, res) => {
    const { recruiterID } = req.params;

    try {
        const jobs = await jobsCollection.find({ recruiterID }).toArray();
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching recruiter's jobs", error: error.message });
    }
});

// ✅ **Student Applies for a Job**
app.post('/jobs/:jobID/apply', async (req, res) => {
    try {
        const { jobID } = req.params;
        const { studentID, firstName, lastName, email, phone, skills, address, resume } = req.body;

        if (!studentID || !jobID) {
            return res.status(400).json({ message: "Missing student or job ID." });
        }

        // Find the job using MongoDB ObjectId
        const job = await jobsCollection.findOne({ _id: new ObjectId(jobID) });
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        // Create application from form input
        const application = {
            studentID,
            firstName,
            lastName,
            email,
            phone,
            skills: skills ? skills.split(",").map(skill => skill.trim()) : [],
            address,
            resume,
            appliedAt: new Date(),
            status: "Pending"
        };

        // Append application to job's applicant list
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobID) },
            { $push: { applicants: application } }
        );

        // Reference job in student's appliedJobs array
        await studentsCollection.updateOne(
            { _id: new ObjectId(studentID) },
            {
                $push: {
                    appliedJobs: {
                        jobId: jobID,
                        jobTitle: job.jobTitle
                    }
                }
            }
        );

        res.status(200).json({ message: "Application submitted successfully!" });
    } catch (error) {
        console.error("Error submitting application:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});






// ✅ Send a Message
// ✅ Universal Messaging Route (Cross-role)
app.post('/messages/universal-send', async (req, res) => {
    const { senderId, receiverId, message } = req.body;

    if (!senderId || !receiverId || !message) {
        return res.status(400).json({ error: "senderId, receiverId, and message are required." });
    }

    try {
        const newMessage = {
            senderId,           // must be messageSenderID of sender
            receiverId,         // must be messageReceiverID of receiver
            message,
            timestamp: new Date()
        };

        await messagesCollection.insertOne(newMessage);
        res.status(201).json({ message: "Message sent successfully", data: newMessage });
    } catch (error) {
        console.error("Error in universal-send:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
});

// ✅ Universal Message Fetching Route for all roles
app.get('/messages/:receiverId', async (req, res) => {
    const { receiverId } = req.params;

    try {
        console.log("🧠 Server fetching messages for receiverId:", req.params.receiverId);

        const messages = await messagesCollection
            .find({ receiverId })
            .sort({ timestamp: -1 }) // newest first
            .toArray();

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages for receiver:", error);
        res.status(500).json({ message: "Failed to retrieve messages", error: error.message });
    }
});

app.get('/users/lookup/:messageSenderID', async (req, res) => {
    const { messageSenderID } = req.params;

    const collections = [
        { collection: adminsCollection, role: 'Admin' },
        { collection: counselorsCollection, role: 'Counselor' },
        { collection: recruitersCollection, role: 'Recruiter' },
        { collection: studentsCollection, role: 'Student' }
    ];

    for (const { collection, role } of collections) {
        const user = await collection.findOne({ messageSenderID });
        if (user) {
            return res.json({
                name: `${user.firstName || user.firstname} ${user.lastName || user.lastname}`,
                role,
                messageReceiverID: user.messageReceiverID // ✅ Include this
            });
        }
    }

    res.status(404).json({ message: "User not found" });
});


// GET /messages/conversation?user1=...&user2=...
app.get("/messages/conversation", async (req, res) => {
    const { user1, user2 } = req.query;

    try {
        const messages = await database.collection("messages").find({
            $or: [
                { senderId: user1, receiverId: user2 },
                { senderId: user2, receiverId: user1 }
            ]
        }).sort({ timestamp: 1 }).toArray();

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch conversation" });
    }
});

// 👇 New conversation route to support recruiter replies visibility
app.get('/messages/thread/:recruiterSenderId/:recruiterReceiverId/:applicantSenderId', async (req, res) => {
    const { recruiterSenderId, recruiterReceiverId, applicantSenderId } = req.params;

    try {
        const messages = await messagesCollection.find({
            $or: [
                { senderId: recruiterSenderId, receiverId: applicantSenderId },
                { senderId: recruiterReceiverId, receiverId: applicantSenderId },
                { senderId: applicantSenderId, receiverId: recruiterSenderId },
                { senderId: applicantSenderId, receiverId: recruiterReceiverId }
            ]
        }).sort({ timestamp: 1 }).toArray();

        res.status(200).json(messages);
    } catch (error) {
        console.error("❌ Failed to fetch message thread:", error);
        res.status(500).json({ error: 'Server error fetching thread' });
    }
});

app.get("/messages/thread/:recruiterSenderId/:recruiterReceiverId/:applicantSenderId/:applicantReceiverId", async (req, res) => {
    const { recruiterSenderId, recruiterReceiverId, applicantSenderId, applicantReceiverId } = req.params;

    try {
        const messages = await database.collection("messages").find({
            $or: [
                { senderId: recruiterSenderId, receiverId: applicantReceiverId },
                { senderId: applicantSenderId, receiverId: recruiterReceiverId },
            ],
        }).toArray();

        res.json(messages);
    } catch (error) {
        console.error("Thread fetch error:", error);
        res.status(500).json({ message: "Failed to fetch message thread" });
    }
});

app.get("/messages/thread/:id1/:id2", async (req, res) => {
    const { id1, id2 } = req.params;
    try {
        const threadMessages = await db.collection("messages")
            .find({
                $or: [
                    { senderId: id1, receiverId: id2 },
                    { senderId: id2, receiverId: id1 }
                ]
            })
            .toArray();

        res.json(threadMessages);
    } catch (err) {
        res.status(500).send("Error fetching messages.");
    }
});


// ✅ Updated route to return full applicant info with messageReceiverID
app.get('/jobs/:jobId/applicants', async (req, res) => {
    try {
        const { jobId } = req.params;

        // Find the job by ObjectId
        const job = await jobsCollection.findOne({ _id: new ObjectId(jobId) });

        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        // Fetch full student info for each applicant using their stored studentID
        const enrichedApplicants = await Promise.all(
            (job.applicants || []).map(async (app) => {
                const student = await studentsCollection.findOne({ _id: new ObjectId(app.studentID) });

                if (!student) return null;

                return {
                    firstName: app.firstName,
                    lastName: app.lastName,
                    email: app.email,
                    phone: app.phone,
                    address: app.address,
                    skills: app.skills,
                    studentID: app.studentID,
                    messageReceiverID: student.messageReceiverID,
                    messageSenderID: student.messageSenderID // 🔥 This was missing
                };
            })
        );

        // Filter out any null entries from removed or broken student references
        const validApplicants = enrichedApplicants.filter(Boolean);

        res.status(200).json(validApplicants);
    } catch (error) {
        console.error("Error fetching applicants:", error);
        res.status(500).json({ message: "Error fetching applicants", error: error.message });
    }
});

// Sign-in endpoint for counselors
app.post('/counselor/signin', async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log("🔍 Searching for counselor username:", username);

        if (!counselorsCollection) {
            return res.status(500).json({ message: "Database connection not established" });
        }

        // Search for the counselor in the counselors collection (case-insensitive)
        const counselor = await counselorsCollection.findOne({ username });

        if (!counselor) {
            console.log(`❌ Counselor not found: ${username}`);
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        console.log(`🔍 Stored password in DB: "${counselor.password}"`);
        console.log(`🔍 Entered password: "${password}"`);

        // Ensure the stored password matches exactly with the entered password
        if (!counselor || counselor.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        if (counselor.active === false) {
            return res.status(403).json({ message: "Account is deactivated. Contact admin." });
        }


        console.log(`🎉 Login successful for: ${username}`);
        res.status(200).json({ counselor });
    } catch (err) {
        console.error("❌ Error during counselor sign-in:", err.message);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

app.get('/counselors', async (req, res) => {
    try {
        if (!counselorsCollection) {
            return res.status(500).json({ message: "Database connection not established" });
        }

        const counselors = await counselorsCollection.find({}).toArray();
        res.status(200).json(counselors);
    } catch (error) {
        console.error("❌ Error fetching counselors:", error.message);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

// ✅ **Counselor Signup Route**
app.post('/counselor/signup', async (req, res) => {
    try {
        console.log("🔍 Received data:", req.body);

        const { firstName, lastName, username, password, major, university } = req.body;

        if (!firstName || !lastName || !username || !password || !major || !university) {
            console.error("❌ Missing required fields:", req.body);
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!counselorsCollection) {
            console.error("❌ Database connection not established");
            return res.status(500).json({ message: "Database connection error" });
        }

        if (await isUsernameTaken(username)) {
            return res.status(400).json({ message: "Username already exists across roles" });
        }


        // Create the counselor object (without counselorId)
        const newCounselor = {
            firstName,
            lastName,
            username,
            password,
            major,
            isActive: true,
            university,
            createdAt: new Date(),
            messageSenderID: uuidv4(),
            messageReceiverID: uuidv4()

        };

        await counselorsCollection.insertOne(newCounselor);
        res.status(201).json({ message: "Signup successful!" });
    } catch (error) {
        console.error("❌ Error during counselor signup:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

// ✅ **Admin Signup Route (Fixed)**
app.post('/admin/signup', async (req, res) => {
    try {
        console.log("🔍 Received data:", req.body);

        const { firstName, lastName, username, password } = req.body;

        if (!firstName || !lastName || !username || !password) {
            console.error("❌ Missing required fields:", req.body);
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!adminsCollection) {
            console.error("❌ Database connection not established");
            return res.status(500).json({ message: "Database connection error" });
        }

        if (await isUsernameTaken(username)) {
            return res.status(400).json({ message: "Username already exists across roles" });
        }

        // ✅ Hash the password before saving it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new admin document
        const newAdmin = {
            firstName,
            lastName,
            username,
            password: hashedPassword, // ✅ Store hashed password
            createdAt: new Date(),
            isActive: true,
            messageSenderID: uuidv4(),
            messageReceiverID: uuidv4()

        };

        await adminsCollection.insertOne(newAdmin);
        res.status(201).json({ message: "Admin registered successfully!" });
    } catch (error) {
        console.error("❌ Error during admin signup:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

// ✅ **Admin Sign-In Route (Fixed)**
app.post('/admin/signin', async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log("🔍 Searching for admin username:", username);

        if (!adminsCollection) {
            return res.status(500).json({ message: "Database connection not established" });
        }

        // Search for the admin in the database
        const admin = await adminsCollection.findOne({ username });

        if (!admin) {
            console.log(`❌ Admin not found: ${username}`);
            return res.status(400).json({ message: "Invalid username or password" });
        }

        // ✅ Compare entered password with stored hashed password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            console.log(`❌ Incorrect password for: ${username}`);
            return res.status(400).json({ message: "Invalid username or password" });
        }

        console.log(`🎉 Admin login successful for: ${username}`);
        res.status(200).json({ admin });
    } catch (err) {
        console.error("❌ Error during admin sign-in:", err.message);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
});

app.get('/admin/users', async (req, res) => {
    try {
        if (!studentsCollection || !recruitersCollection || !counselorsCollection || !adminsCollection) {
            return res.status(500).json({ message: "Database connection not established" });
        }

        const students = await studentsCollection.find().toArray();
        const recruiters = await recruitersCollection.find().toArray();
        const counselors = await counselorsCollection.find().toArray();
        const admins = await adminsCollection.find().toArray(); // ✅ ADD THIS

        const users = [
            ...students.map(user => ({ ...user, role: "Student" })),
            ...recruiters.map(user => ({ ...user, role: "Recruiter" })),
            ...counselors.map(user => ({ ...user, role: "Counselor" })),
            ...admins.map(user => ({ ...user, role: "Admin" })) // ✅ ADD THIS
        ];

        res.status(200).json(users);
    } catch (error) {
        console.error("❌ Error fetching users:", error.message);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});



app.delete('/admin/delete/:role/:id', async (req, res) => {
    const { role, id } = req.params;

    let collection;
    switch (role) {
        case "student":
            collection = studentsCollection;
            break;
        case "recruiter":
            collection = recruitersCollection;
            break;
        case "counselor":
            collection = counselorsCollection;
            break;
        default:
            return res.status(400).json({ message: "Invalid role" });
    }

    try {
        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User deleted successfully!" });
    } catch (error) {
        console.error("❌ Error deleting user:", error.message);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

app.get('/admin/user/:role/:id', async (req, res) => {
    const { role, id } = req.params;

    let collection;
    switch (role) {
        case "student":
            collection = studentsCollection;
            break;
        case "recruiter":
            collection = recruitersCollection;
            break;
        case "counselor":
            collection = counselorsCollection;
            break;
        default:
            return res.status(400).json({ message: "Invalid role" });
    }

    try {
        const user = await collection.findOne({ _id: new ObjectId(id) });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("❌ Error fetching user details:", error.message);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

app.get('/api/student/appliedJobs', async (req, res) => {
    try {
        const { studentID } = req.query;
        if (!studentID) {
            return res.status(400).json({ message: "Missing studentID" });
        }

        const student = await studentsCollection.findOne({ _id: new ObjectId(studentID) });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.status(200).json({ appliedJobs: student.appliedJobs || [] });
    } catch (error) {
        console.error("Error fetching applied jobs:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Fetch job details by jobId
app.get('/api/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await jobsCollection.findOne({ _id: new ObjectId(jobId) });

        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }

        res.status(200).json(job);
    } catch (error) {
        console.error("Error fetching job details:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

app.patch('/admin/jobs/:jobId/approve', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { approved, reviewed } = req.body;

        const update = { approved: approved === true };
        if (reviewed !== undefined) update.reviewed = reviewed;

        const result = await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) },
            { $set: update }
        );

        if (result.modifiedCount === 1) {

            res.json({ message: approved ? "✅ Job approved." : "❌ Job unapproved." });
        } else {
            res.status(404).json({ message: "Job not found or no change applied." });
        }
    } catch (error) {
        console.error("Error approving job:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

app.patch('/admin/toggle-status/:role/:id', async (req, res) => {
    const { role, id } = req.params;
    let collection;
    if (role === "student") collection = studentsCollection;
    else if (role === "recruiter") collection = recruitersCollection;
    else if (role === "counselor") collection = database.collection("counselors");
    else return res.status(400).json({ message: "Invalid role provided." });


    try {
        const user = await collection.findOne({ _id: new ObjectId(id) });
        if (!user) return res.status(404).json({ message: "User not found" });

        const newStatus = !user.active;
        await collection.updateOne({ _id: new ObjectId(id) }, { $set: { active: newStatus } });

        res.json({ message: `User account ${newStatus ? "activated" : "deactivated"}`, active: newStatus });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

app.get('/admin/jobs/all', async (req, res) => {
    try {
        const allJobs = await jobsCollection.find().toArray();
        res.status(200).json(allJobs);
    } catch (error) {
        console.error("❌ Error fetching all jobs for admin:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


app.get('/counselor/students/matching-university', async (req, res) => {
    const { university } = req.query;

    if (!university) {
        return res.status(400).json({ message: "University parameter is required." });
    }

    try {
        const matchingStudents = await studentsCollection.find({ university }).toArray();
        res.status(200).json(matchingStudents);
    } catch (error) {
        console.error("❌ Error fetching students by university:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

app.get('/counselor/students/university-applications', async (req, res) => {
    const { university } = req.query;

    if (!university) {
        return res.status(400).json({ message: "University parameter is required." });
    }

    try {
        const students = await studentsCollection.find({ university }).toArray();
        const allJobs = await jobsCollection.find().toArray();

        // Match studentID with job applicants
        const enrichedStudents = students.map(student => {
            const studentIdStr = student._id.toString();

            const studentApplications = allJobs
                .filter(job =>
                    job.applicants?.some(app => app.studentID === studentIdStr)
                )
                .map(job => {
                    const appData = job.applicants.find(app => app.studentID === studentIdStr);
                    return {
                        jobTitle: job.jobTitle,
                        company: job.company,
                        jobId: job.jobId, // ✅ include jobId so counselor UI can link to applicants
                        status: appData?.status || "Pending",
                        appliedAt: appData?.appliedAt,
                        email: appData?.email || "N/A",
                        resume: appData?.resume || null,
                        skills: appData?.skills || []
                    };
                });

            return {
                student: {
                    _id: student._id,
                    firstname: student.firstName,
                    lastname: student.lastName,
                    username: student.username,
                    major: student.major,
                    university: student.university
                },
                applications: studentApplications
            };
        });




        res.json(enrichedStudents);
    } catch (error) {
        console.error("Error fetching student applications:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// --- NEW counselor matching route ---
app.post("/matches", async (req, res) => {
    const { counselorId, studentId, jobId } = req.body;

    if (!counselorId || !studentId || !jobId) {
        return res.status(400).json({ message: "Missing counselorId, studentId, or jobId" });
    }

    try {
        const recommendation = {
            counselorId,
            jobId,
            recommendedAt: new Date()
        };

        const updateResult = await studentsCollection.updateOne(
            { _id: new ObjectId(studentId) },
            { $push: { recommendedJobs: recommendation } }
        );

        if (updateResult.modifiedCount === 1) {
            res.status(201).json({ message: "Job recommended to student successfully!" });
        } else {
            res.status(404).json({ message: "Student not found or update failed." });
        }
    } catch (error) {
        console.error("Error recommending job:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get('/users/by-role/:role', async (req, res) => {
    const { role } = req.params;
    let collection;
    switch (role.toLowerCase()) {
        case "student": collection = studentsCollection; break;
        case "recruiter": collection = recruitersCollection; break;
        case "counselor": collection = counselorsCollection; break;
        case "admin": collection = adminsCollection; break;
        default: return res.status(400).json({ message: "Invalid role" });
    }

    try {
        const users = await collection.find().toArray();
        const result = users.map(u => ({
            _id: u._id.toString(),  // ✅ Add MongoDB _id
            firstName: u.firstName,
            lastName: u.lastName,
            messageSenderID: u.messageSenderID,
            messageReceiverID: u.messageReceiverID
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: "Error fetching users by role" });
    }
});

app.get("/workshops/by-counselor/:counselorID", async (req, res) => {
    try {
        const { counselorID } = req.params;
        const workshops = await workshopsCollection.find({ counselorID }).toArray();
        res.json(workshops);
    } catch (error) {
        console.error("Error fetching workshops by counselor:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/workshops/:workshopID/register", async (req, res) => {
    const { workshopID } = req.params;
    const { studentID, firstName, lastName } = req.body;

    if (!studentID || !firstName || !lastName) {
        return res.status(400).json({ message: "Missing student information" });
    }

    try {
        // Get the full workshop to retrieve counselorID
        const workshop = await workshopsCollection.findOne({ _id: new ObjectId(workshopID) });
        if (!workshop) {
            return res.status(404).json({ message: "Workshop not found" });
        }

        // Add student to workshop's attendee list
        await workshopsCollection.updateOne(
            { _id: new ObjectId(workshopID) },
            { $addToSet: { attendees: { studentID, firstName, lastName } } }
        );

        // Add workshop info to student's document
        await studentsCollection.updateOne(
            { _id: new ObjectId(studentID) },
            {
                $addToSet: {
                    workshopsAttended: {
                        workshopID,
                        attendedAt: new Date(),
                        counselorID: workshop.counselorID
                    }
                }
            }
        );

        res.status(200).json({ message: "Successfully registered for the workshop" });
    } catch (error) {
        console.error("Error registering for workshop:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// ✅ Fetch all workshops (for students)
app.get("/workshops", async (req, res) => {
    try {
        const workshops = await workshopsCollection.find().toArray();
        res.status(200).json(workshops);
    } catch (error) {
        console.error("Error fetching workshops:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post('/workshops', async (req, res) => {
    try {
        const { workshopTitle, date, time, location, description, counselorID } = req.body;

        if (!workshopTitle || !date || !time || !location || !description || !counselorID) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const newWorkshop = {
            workshopId: uuidv4(),
            workshopTitle,
            date,
            time,
            location,
            description,
            counselorID,
            postedDate: new Date(),
            attendees: []  // Empty initially
        };

        const result = await workshopsCollection.insertOne(newWorkshop);
        const insertedId = result.insertedId;

        if (result.acknowledged) {
            await counselorsCollection.updateOne(
                { _id: new ObjectId(counselorID) },
                { $push: { workshopsPosted: { workshopId: insertedId.toString(), workshopTitle: newWorkshop.workshopTitle } } }
            );
            res.status(201).json({ message: "Workshop posted successfully!", workshop: newWorkshop });
        } else {
            res.status(500).json({ message: "Failed to insert workshop into database." });
        }
    } catch (error) {
        console.error("Error posting workshop:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

app.get("/analytics/platform", async (req, res) => {
    try {
        const [studentCount, recruiterCount, counselorCount, adminCount] = await Promise.all([
            studentsCollection.countDocuments(),
            recruitersCollection.countDocuments(),
            counselorsCollection.countDocuments(),
            adminsCollection.countDocuments()
        ]);

        res.json({
            studentCount,
            recruiterCount,
            counselorCount,
            adminCount
        });
    } catch (err) {
        console.error("Error fetching platform analytics:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});


app.get("/analytics/recruiter/:id", async (req, res) => {
    const recruiterId = req.params.id;

    try {
        const jobs = await jobsCollection.find({ recruiterID: recruiterId }).toArray();

        const totalJobs = jobs.length;
        const totalApplicants = jobs.reduce((sum, job) => sum + (job.applicants?.length || 0), 0);
        const mostAppliedJob = jobs.reduce((prev, curr) => {
            return (curr.applicants?.length || 0) > (prev.applicants?.length || 0) ? curr : prev;
        }, { applicants: [] });

        const mostRecentJob = jobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate))[0];

        res.json({
            totalJobs,
            totalApplicants,
            mostAppliedJob,
            mostRecentJob
        });
    } catch (err) {
        console.error("Error fetching recruiter analytics:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/analytics/student/:id", async (req, res) => {
    const studentId = req.params.id;

    try {
        const student = await studentsCollection.findOne({ _id: new ObjectId(studentId) });
        if (!student) return res.status(404).json({ message: "Student not found" });

        const totalApplied = (student.appliedJobs || []).length;
        const totalWorkshops = (student.workshopsAttended || []).length;

        let mostRecentWorkshop = null;
        let mostRecentApplication = null;

        // Most Recent Workshop
        if (student.workshopsAttended?.length > 0) {
            const lastWorkshopEntry = student.workshopsAttended[student.workshopsAttended.length - 1];

            const workshop = await workshopsCollection.findOne({ _id: new ObjectId(lastWorkshopEntry.workshopID) });
            const counselor = await counselorsCollection.findOne({ _id: new ObjectId(lastWorkshopEntry.counselorID) });

            mostRecentWorkshop = {
                title: workshop?.workshopTitle || "N/A",
                attendedAt: lastWorkshopEntry.attendedAt,
                counselorName: counselor ? `${counselor.firstName} ${counselor.lastName}` : "N/A"
            };
        }

        // Most Recent Application
        if (student.appliedJobs?.length > 0) {
            const lastApplication = student.appliedJobs[student.appliedJobs.length - 1];

            const job = await jobsCollection.findOne({ _id: new ObjectId(lastApplication.jobId) });

            mostRecentApplication = {
                title: job?.jobTitle || "N/A",
                company: job?.company || "N/A",
                appliedAt: lastApplication.appliedAt || "N/A"
            };
        }

        res.json({
            totalApplied,
            totalWorkshops,
            mostRecentApplication,
            mostRecentWorkshop
        });
    } catch (err) {
        console.error("Error fetching student analytics:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});



app.get("/analytics/counselor/:id", async (req, res) => {
    const counselorId = req.params.id;

    try {
        const workshops = await workshopsCollection.find({ counselorID: counselorId }).toArray();
        const students = await studentsCollection.find({ "recommendedJobs.counselorId": counselorId }).toArray();

        const totalWorkshops = workshops.length;

        let recommendationCount = 0;
        const interactionMap = {};

        students.forEach(student => {
            const recs = student.recommendedJobs?.filter(r => r.counselorId === counselorId) || [];
            recommendationCount += recs.length;

            const name = `${student.firstName} ${student.lastName}`;
            interactionMap[name] = (interactionMap[name] || 0) + recs.length;
        });

        const topStudent = Object.entries(interactionMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        res.json({
            totalWorkshops,
            totalRecommended: recommendationCount,
            topStudent
        });
    } catch (err) {
        console.error("Error fetching counselor analytics:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});






// ✅ Add suggestedJobs field to student model when created (ensure frontend reflects this too)
// Within student signup logic:
// suggestedJobs: []


// ✅ Front-end JavaScript to suggest job (add this to counselor_dashboard.js)
function suggestJobToStudent(studentId, studentName) {
    fetch('/jobs')
        .then(res => res.json())
        .then(jobs => {
            const jobOptions = jobs.map(job => `<option value="${job.jobId}">${job.jobTitle} at ${job.company}</option>`).join('');
            const modal = document.createElement('div');
            modal.className = 'job-suggest-modal';
            modal.innerHTML = `
                <div class="modal-content" style="background:#fff;padding:20px;border-radius:10px;box-shadow:0 4px 8px rgba(0,0,0,0.1);">
                    <h3>Suggest a Job to ${studentName}</h3>
                    <select id="suggestedJobSelect">${jobOptions}</select>
                    <button onclick="submitJobSuggestion('${studentId}')">Suggest</button>
                    <button onclick="this.parentElement.parentElement.remove()">Cancel</button>
                </div>`;
            document.body.appendChild(modal);
        });
}

function submitJobSuggestion(studentId) {
    const jobId = document.getElementById('suggestedJobSelect').value;
    const counselor = JSON.parse(sessionStorage.getItem("counselor"));

    fetch('/counselor/suggest-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            counselorId: counselor.messageSenderID,
            studentId,
            jobId
        })
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            document.querySelector('.job-suggest-modal').remove();
        })
        .catch(err => {
            console.error("Error suggesting job:", err);
            alert("Failed to suggest job.");
        });
}


// ✅ Inject Suggest Job button into student display cards
// This should go inside displayStudents() function in counselor_dashboard.js
// Example placement:
// const card.innerHTML = ` ...
//   <button onclick="suggestJobToStudent('${student._id}', '${student.firstname} ${student.lastname}')">Suggest Job</button>
// `;
// Above or below application details





// Start the server pl
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
