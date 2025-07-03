const mysql = require("mysql2");           
const express = require("express");
const app = express();
const path = require("path");
const methodOverride = require("method-override");
const {v4: uuidv4} = require("uuid"); 
const session = require("express-session");

app.use(session({
  secret: "secret_key",
  resave: false,
  saveUninitialized: true
}));

const port = 8080;

app.use(methodOverride("_method"));
app.use(express.urlencoded({extended : true}));
app.set("view engine","ejs");
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(path.join(__dirname, "public")));      


const db = mysql.createConnection({      
  host: 'localhost',
  user: 'root',
  database: 'municipalTacker',
  password: ''
});


app.get("/", (req, res) => {
  const query = `
  SELECT complaints.*, users.username 
  FROM complaints 
  JOIN users ON complaints.compId = users.id
  ORDER BY dateOfReport DESC`;


  db.query(query, (err, results) => {
    if (err) throw err;
    res.render("index.ejs", { complaints: results });
  });
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.post("/login", (req, res) => {
    const { username, password, mailId } = req.body;
    const q = "SELECT * FROM users WHERE username = ? AND password = ? AND mailId = ?";

    db.query(q, [username, password, mailId], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
        req.session.username = username;
        res.redirect("/user");  
        } else {
        res.send("Invalid credentials");
        }
    });
})

app.get("/signup", (req, res) => {
    res.render("signup.ejs");
});


app.post("/signup", (req, res) => {
  const { username, password, mailId } = req.body;
  const id = uuidv4();
  const q = "INSERT INTO users (id, username, password, mailId) VALUES (?, ?, ?, ?)";
  db.query(q, [id, username, password, mailId], (err, result) => {
    if (err) {
      console.log(err);
      return res.send("Database error");
    }
    res.redirect("/login");
  });
});


app.get("/user", (req, res) => {
  if (!req.session.username) return res.redirect("/login");

  const username = req.session.username;
  const query = `
  SELECT complaints.*, users.username 
  FROM complaints 
  JOIN users ON complaints.compId = users.id
  ORDER BY dateOfReport DESC`;


  db.query(query, (err, results) => {
    if (err) throw err;
    res.render("user.ejs", { user: username, complaints: results });
  });

});


app.post("/user", (req, res) => {
    console.log(req.session.username);
    res.render("user.ejs", {user: req.session.username});
});


app.get("/newPost", (req, res) => {
  res.render("newPost.ejs", {user: req.session.username});
});

app.post("/newPost", (req, res) => {
  const username = req.session.username;
  const {complaint, address, dateOfReport} = req.body;
  const complaintId = uuidv4();

  const getUserIdQuery = "SELECT id FROM users WHERE username = ?";
  db.query(getUserIdQuery, [username], (err, result) => {
    if (err) throw err;

    console.log("Session username:", req.session.username);

    if (result.length === 0) return res.send("User not found");

    const userId = result[0].id;
    const insertQuery = "INSERT INTO complaints (compId, complaint, address, dateOfReport, complaintId) VALUES (?, ?, ?, ?, ?)";
    db.query(insertQuery, [userId, complaint, address, dateOfReport, complaintId], (err2) => {
      if (err2) throw err2;
      res.redirect("/user");
    });
  });

})

app.get("/myPosts", (req, res) => {
  if (!req.session.username) return res.redirect("/login");

  const username = req.session.username;
  const query = `
    SELECT complaints.*, users.username 
    FROM complaints 
    JOIN users ON complaints.compId = users.id 
    WHERE users.username = ?`;

  db.query(query, [username], (err, results) => {
    if (err) throw err;
    res.render("myPosts.ejs", { user: username, complaints: results });
  });
})

app.delete("/myPosts/:id", (req, res) => {
  const complaintId = req.params.id;
  const username = req.session.username;

  const getUserIdQuery = "SELECT id FROM users WHERE username = ?";
  db.query(getUserIdQuery, [username], (err, result) => {
    if (err) throw err;
    if (result.length === 0) return res.send("User not found");

    const userId = result[0].id;
    const deleteQuery = "DELETE FROM complaints WHERE complaintId = ? AND compId = ?";
    db.query(deleteQuery, [complaintId, userId], (err2) => {
      if (err2) throw err2;
      res.redirect("/myPosts");
    });
  });
});


app.listen(port, () => {
    console.log("listening");
});
