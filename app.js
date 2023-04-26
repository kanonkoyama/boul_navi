const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');

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
    res.locals.name = "ゲスト"
    res.locals.isLoggedIn = false;
  }else{
    console.log("ログインしています");
    res.locals.name = req.session.name;
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

app.get("/area", (req,res) => {
  res.render("area.ejs");
});

app.get("/location",(req,res) => {
  res.render("location.ejs");
});

app.get("/search", (req,res) => {
  res.render("search.ejs");
});

app.get("/signup",(req,res) => {
  res.render("signup.ejs", {errors: []});
});

app.post("/signup", 
  (req,res,next) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const errors = [];
    if(name === ""){
      errors.push("名前を入力してください");
    };
    if(email === ""){
      errors.push("メールアドレスを入力してください");
    };
    if(password === ""){
      errors.push("パスワードを入力してください");
    };
    if(errors.length > 0){
      res.render("signup.ejs", {errors: errors});
    }else{
      next();
   }
  },
  (req,res,next) => {
    const email = req.body.email;
    const errors = [];
    connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      (error,results) => {
        if(results.length > 0){
          errors.push("既に登録されているメールアドレスです");
          res.render("signup.ejs",{errors: errors});
        }else{
          next();
        }
      }
    );
  },
  (req,res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    bcrypt.hash(password,10,(error,results) => {
    connection.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hash],
      (error,results) => {
        req.session.userId = results.insertId;
        req.session.name = name;
        res.redirect("/");
      }
    );
    });
  }
);

app.get("/login", (req,res) => {
  res.render("login.ejs");
});

app.post("/login", (req,res) => {
  const email = req.body.email;
  connection.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (error,results) => {
      if(results.length > 0){
        const plain = req.body.password;
        const hash = results[0].password;
        bcrypt.compare(plain, hash, (error,isEqual) => {
          if(isEqual){
            req.session.userId = results[0].id
            req.session.name = results[0].name
            res.redirect("/");
          }else{
            res.redirect("/login");
          }
        });    
      }else{
        res.redirect("/login");
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
