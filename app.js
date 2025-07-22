const express = require('express'); 
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');

const app = express();

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Republic_C207',
    database: 'ca2'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Middleware setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/dashboard');
    }
};

// Registration validation middleware
const validateRegistration = (req, res, next) => {
    const { username, email, password, current_swimsafer_level, contact, role } = req.body;
    const messages = [];
    const errorFields = [];

    if (!username) { messages.push('Username is required'); errorFields.push('username'); }
    if (!email) { messages.push('Email is required'); errorFields.push('email'); }
    if (!password || password.length < 6) {
        messages.push('Password must be at least 6 characters'); errorFields.push('password');
    }
    if (!contact) { messages.push('Contact is required'); errorFields.push('contact'); }
    if (!current_swimsafer_level){messages.push('Current SwimSafer level is required'); errorFields.push('current_swimsafer_level')}
    if (!role) { messages.push('Role must be selected'); errorFields.push('role'); }

    if (messages.length > 0) {
        const cleanedFormData = { ...req.body };
        errorFields.forEach(field => delete cleanedFormData[field]);

        req.flash('error', messages);
        req.flash('errorFields', errorFields);
        req.flash('formData', cleanedFormData);
        return res.redirect('/register');
    }
    next();
};

// Routes

// Home route - send welcome page with login and register buttons
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Swimming Test App</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    </head>
    <body>
      <div class="container text-center mt-5">
        <h1>Welcome to Swimming Test App</h1>
        <div class="mt-4">
          <a href="/login" class="btn btn-primary mx-2">Login</a>
          <a href="/register" class="btn btn-success mx-2">Register</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Registration form
app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0] || {},
        errorFields: req.flash('errorFields')[0] || []
    });
});

// Registration handler
app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password, current_swimsafer_level, contact, role } = req.body;

    const sql = 'INSERT INTO users (username, email, password, current_swimsafer_level, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    connection.query(sql, [username, email, password, current_swimsafer_level, contact, role], (err, result) => {
        if (err) {
            console.error('Error inserting user:', err.message);
            req.flash('error', ['Registration failed. Please try again.']);
            return res.redirect('/register');
        }
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});


// Login form
app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

// Login handler
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    connection.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error('Error querying database:', err.message);
            req.flash('error', 'An error occurred. Please try again.');
            return res.redirect('/login');
        }

        if (results.length > 0) {
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            return res.redirect('/dashboard');
        } else {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }
    });
});

// Dashboard route (user must be logged in)
app.get('/dashboard', checkAuthenticated, (req, res) => {
  res.send('Dashboard page - user: ' + req.session.user.username);
});


// Admin-only route
app.get('/admin', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('admin', { user: req.session.user });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Error destroying session:', err);
        res.redirect('/login');
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}/`));











