const express = require('express');
const mysql = require('mysql');
const session = require('express-session');

const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '1227Kumakuma',
  database: 'boul_navi'
});

app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req,res,next) => {
  if(req.session.userId === undefined){
    console.log("ログインしていません");
    res.locals.username = "ゲスト"
    res.locals.isLoggedIn = false;
  }else{
    console.log("ログインしています");
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
  }
  next();
});
  
app.get('/', (req, res) => {
  res.render("top.ejs");
});

app.get("/list",(req,res) => {
  connection.query(
    "SELECT * FROM gims",
    (error,results) => {
      res.render("list.ejs", {gims: results});
    }
  );
});

app.get("/gim/:id",(req,res) => {
  const id = req.params.id;
  connection.query(
    "SELECT * FROM gims WHERE id = ?",
    [id],
    (error,results) => {
      res.render("gim.ejs", {gim: results[0]});
    }
  );
});

app.get("/review/:id",(req,res) => {
  const id = req.params.id;
  connection.query(
    "SELECT * FROM gims WHERE id = ?",
    [id],
    (error,results) => {
      res.render("review.ejs", {gim: results[0]});
    }
  );
});

app.post("/create",(req,res) => {
  connection.query(
    "INSERT INTO reviews (content) VALUES (?)",
    [req.body.content],
    (error,results) => {
      res.redirect("/gim/:id");
    }
  );
});

app.post("/delete", (req,res) => {
  connection.query(
    "DELETE FROM reviews WHERE id = ?",
    [req.params.id],
    (error,results) => {
      res.redirect("list");
    }
  );
});

app.get("/login", (req,res) => {
  res.render("login.ejs");
});

app.post("/login", (req,res) => {
  const email = req.body.email;
  connection.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (error,results) => {
      if(req.body.password === results[0].password){
        req.session.userId = results[0].id
        req.session.username = results[0].name
        res.redirect("/");
      }else{
        res.render("login.ejs");
      } 
    }
  );
});

app.get("/logout", (req,res) => {
  req.session.destroy((error) => {
    res.redirect("/");
  });
});

  app.listen(3000);
