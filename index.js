const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; // Render uses dynamic port

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // ✅ Needed for JSON POST
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb+srv://Archana:Archana2408@cluster0.c0vysdx.mongodb.net/studentDB?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
  })
  .catch(err => {
    console.log("❌ MongoDB Connection Error:", err);
  });

// Schemas
const courseSchema = new mongoose.Schema({
  courseName: String,
  teacher: String
});
const Course = mongoose.model('Course', courseSchema);

const studentSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
});
const Student = mongoose.model('Student', studentSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Registration
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const student = new Student({ name, email, password, courses: [] });
    await student.save();
    res.status(200).send('Registration successful!');
  } catch (err) {
    res.status(500).send('Error during registration');
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await Student.findOne({ email, password }).populate('courses');

  if (user) {
    if (user.courses.length === 0) {
      // Redirect to course registration
      res.status(200).json({ next: 'register-courses', email });
    } else {
      // Already has courses → go to courses page
      res.status(200).json({ next: 'courses', email });
    }
  } else {
    res.status(401).send('Invalid credentials');
  }
});

// Register Courses
app.post('/register-courses', async (req, res) => {
  const { email, courses } = req.body;

  const student = await Student.findOne({ email });
  if (!student) return res.status(404).send('Student not found');

  const courseDocs = await Promise.all(courses.map(async (name) => {
    let course = await Course.findOne({ courseName: name });
    if (!course) course = await Course.create({ courseName: name, teacher: 'TBD' });
    return course;
  }));

  student.courses = courseDocs.map(c => c._id);
  await student.save();

  res.status(200).send('Courses registered successfully');
});

// Get courses for a student
app.get('/student-courses/:email', async (req, res) => {
  const student = await Student.findOne({ email: req.params.email }).populate('courses');
  if (!student) return res.status(404).send('Student not found');
  res.json(student.courses);
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
