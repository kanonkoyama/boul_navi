const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');
const methodOverride = require('method-override'); 
require('dotenv').config();

const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride('_method'));

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: process.env.DBpassword,
  database: 'boul_navi',
  multipleStatements: true,
  dateStrings: 'date'
});

var nl2br = function (str) {
  if(str){
  str = str.replace(/\r\n/g, '<br>');
  str = str.replace(/(\n|\r)/g, '<br>');
  }
  return str;
};

app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);


app.use((req,res,next) => {
  if(req.session.userId === undefined){
    res.locals.isLoggedIn = false;
  }else{
    res.locals.id = req.session.userId;
    res.locals.isLoggedIn = true;
  }
  next();
});
  
app.get('/', (req, res) => {
  connection.query(
    "SELECT * FROM gims LEFT JOIN informations ON gims.id = informations.gim_id",
    (error,results) => {
      const errors = [];
      console.log(error);
      res.render("top.ejs", {gims: results, errors: errors});
    }
  );
});

app.post("/list",(req,res) => {
  console.log(req.body.area);
  const area_id = req.body.area;
  connection.query(
    "SELECT * FROM gims LEFT JOIN informations ON gims.id = informations.gim_id WHERE area_id = ?",
    [area_id],
    (error,results) => {
      console.log(error);
      console.log(results);
      const errors = []
      if(results.length > 0){
        res.render("list.ejs", {gims: results, errors: [] });
      }else{
        errors.push("ご希望のエリアでは見つかりませんでした")
        res.render("list.ejs", {gims: results, errors: errors});
      }}
  );
});

app.get("/list",(req,res) => {
  connection.query(
    "SELECT * FROM gims LEFT JOIN informations ON gims.id = informations.gim_id",
    (error,results) => {
      const errors = []
      console.log(error);
      res.render("list.ejs", {gims: results, errors: []});
    }
  );
});

app.get("/gim/:id",(req,res) => {
  const id = req.params.id;
  connection.query(
    "SELECT * FROM gims LEFT JOIN informations ON gims.id = informations.gim_id WHERE gims.id = ?;SELECT reviews.id,user_id,content,name,create_day FROM reviews JOIN users ON reviews.user_id = users.id WHERE reviews.gim_id = ?",
    [id,id],
    (error,results) => {
      console.log(error);
      var gim_latlng = results[0].map((result) => {
        var latlng = {
          "lat": result.lat,
          "lng": result.lng
        };
        return latlng;
      });
      var gim_informations = results[0].map((result) => {
        var gim = {
          "id": result.id,
          "name": result.name,
          "content": nl2br(result.content),
          "tell": result.tell,
          "time": nl2br(result.time),
          "regular_holiday": nl2br(result.regular_holiday),
          "initial_registration": result.initial_registration,
          "price": nl2br(result.price),
          "website": result.website,
          "address": nl2br(result.address),
        };
        return gim;
      });
      const review_text = [];
      if(results[1].length === 0){
        review_text.push("まだこのジムの口コミはありません");
      }
      var reviews = results[1].map((result1) => {
        console.log(result1);
        var review = {
          "id": result1.id,
          "user_id": result1.user_id,
          "content": nl2br(result1.content),
          "name": result1.name,
          "create_day": result1.create_day
        }
        return review;
      });
      res.render("gim.ejs", {gim_latlng: gim_latlng[0],gim_informations: gim_informations[0],reviews: reviews,review_text: review_text});
    }
  );
});

app.get("/review/:id",(req,res,next) => {
  const errors = [];
  const id = req.params.id;
  if(res.locals.isLoggedIn === false){
    errors.push("ログインしてください")
  };
  if(errors.length > 0){
    res.render("login.ejs",{errors: errors})
  }else{
    next();
  }
},
(req,res) => {  
  const id = req.params.id;
  connection.query(
    "SELECT * FROM gims WHERE id = ?",
    [id],
    (error,results) => {
      console.log(error);
      res.render("review.ejs", {gim: results[0], errors: []});
    }
  );
});

app.post("/create/:id",(req,res,next) => {
  const errors = [];
  if(req.body.content === ""){
    errors.push("内容を入力してください");
  };
  if(errors.length > 0){
    const id = req.params.id;
    connection.query(
      "SELECT * FROM gims WHERE id = ?",
      [id],
      (error,results) => {
        console.log(error);
        res.render("review.ejs", {gim: results[0],errors: errors}); 
      });   
  }else{
    next();
  }
},
(req,res) => {  
  const user_id = req.session.userId;
  const gim_id = req.params.id;
  const content = req.body.content;
  connection.query(
    "INSERT INTO reviews (user_id, gim_id, content,create_day) VALUES (?, ?, ?, CURDATE())",
    [user_id, gim_id, content],
    (error,results) => {
      console.log(error);
      res.redirect("/");
    }
  );
});

app.delete("/delete/:id", (req,res) => {
  connection.query(
    "DELETE FROM reviews WHERE id = ?",
    [req.params.id],
    (error,results) => {
      console.log(results);
      console.log(error);
      res.redirect("/list");
    }
  );
});

app.get("/area", (req,res) => {
  res.render("area.ejs");
});

app.get("/location",(req,res) => {
  connection.query(
    "SELECT gims.id,lat_id,lng_id,name,address,lat,lng FROM gims LEFT JOIN informations ON gims.id = informations.gim_id",
    (error,results) => {
      console.log(error);
      res.render("location.ejs",{gim_latlng: results});
    },
  );
});

app.get("/search", (req,res) => {
  res.render("search.ejs");
});

app.get("/contact", (req,res) => {
  res.render("contact.ejs", {errors: []});
});

app.post("/contact/create", 
  (req,res,next) => {
    const errors = [];
    if(req.body.content === ""){
      errors.push("内容を入力してください");
    };
    if(errors.length > 0){
      res.render("contact.ejs", {errors: errors});  
    }else{
      next();
    }
  },
  (req,res) => {
    const content = req.body.content;
    const user_id = req.session.userId;
    connection.query(
      "INSERT INTO contacts (content, user_id) VALUES (?,?)",
      [content, user_id],
      (error,results) => {
        console.log(error);
        res.redirect("/");
      }
    );
});

app.get("/contact/index",(req,res) => {
  if(req.session.userId !== 1){
    const errors = [];
    errors.push("権限がありません");
    connection.query(
      "SELECT * FROM gims LEFT JOIN informations ON gims.id = informations.gim_id",
      (error,results) => {
        const errors = [];
        console.log(error);
        res.render("top.ejs", {gims: results, errors: errors});
      }
    );
  }else{
    connection.query(
    "SELECT * FROM contacts LEFT JOIN users ON contacts.user_id = users.id",
    (error,results) => {
      var user_contacts = results.map((result) => {
        var contacts = {
          "user_name": result.name,
          "content": nl2br(result.content) 
        };
        return contacts;
      });
      console.log(error);
      res.render("contact.index.ejs", {user_contacts: user_contacts});
    });   
    }
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
        console.log(error);
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
    bcrypt.hash(password,10,(error,hash) => {
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
  res.render("login.ejs", {errors: []});
});

app.post("/login", (req,res) => {
  const email = req.body.email;
  const errors = [];
  connection.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (error,results) => {
      console.log(error);
      if(results.length > 0){
        const plain = req.body.password;
        const hash = results[0].password;
        bcrypt.compare(plain, hash, (error,isEqual) => {
          if(isEqual){
            req.session.userId = results[0].id
            req.session.name = results[0].name
            res.redirect("/");
          }else{
            errors.push("メールアドレス又はパスワードが間違っています");
            res.render("login.ejs", {errors: errors});
          }
        });    
      }else{
        errors.push("メールアドレス又はパスワードが間違っています");
        res.render("login.ejs", {errors: errors});
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
