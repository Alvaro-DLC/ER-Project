const express = require("express");
const mysql = require('mysql');
const app = express();
const pool = dbConnection();
const bcrypt = require("bcrypt");
const session = require("express-session");
const saltRounds = 10;

app.set("trust proxy", 1); // trust first proxy
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
  }),
);


// note(1): need to add table for custom builds/sets and not gonna use the comments

// max load in api is 100
// # of bosses:106; https://eldenring.fanapis.com/api/bosses?limit=100&page[1-2]
// # of Armors: 568; https://eldenring.fanapis.com/api/armors?limit=100&page=[1-5]
// # of weapons: 307; https://eldenring.fanapis.com/api/weapons?limit=100&page[1-3]

// [admin] id:1 username:'admin' passwrd:'s3cr3t'
// [user]  id:2 username:'SoulsPlayer' passwrd:'password'

app.set("view engine", "ejs");
app.use(express.static("public"));
//to parse Form data sent using POST method
app.use(express.urlencoded({extended: true}));

app.get('/home', (req, res) => {
  let username = req.session.username;
  res.render('home', {user:username, userId:req.session.userId});
});

app.get('/', (req, res) => {
   res.render('login')
});

app.get('/signup' , (req, res) => {
  res.render('signup')
});

app.post("/signup", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  let valid = true;
  let hashedPassword = await
  bcrypt.hash(password, saltRounds);
  let usernames = `SELECT username FROM admin`;
  let users = await executeSQL(usernames);
  for(let user of users) {
    if(username == user.username) {
      valid = false;
      res.render('signup', {"error":"Username unavailabe"});
    }
  }
  if(valid){
    let sql = `INSERT INTO admin (username, password) VALUES (?, ?)`;
    let rows = await executeSQL(sql,[username, hashedPassword])
    console.log(rows.insertId);
    let sql2 = 'INSERT INTO `er_userCollection` (`adminId`) VALUES (?)';
    let rows2 = await executeSQL(sql2, [rows.insertId]);
    res.render("login.ejs");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("login.ejs");
});

app.post("/login", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  let hashedPassword = "";
  
  let sql = `SELECT *
              FROM admin
              WHERE username = ?`;
  let rows = await executeSQL(sql, [username]);

  if (rows.length > 0) {
    hashedPassword = rows[0].password;
  }
  
  const match = await bcrypt.compare(password, hashedPassword);
  if (match == true) {
    req.session.authenticated = true;
    req.session.username = username;
    req.session.adminId = rows[0].adminId;
    res.redirect("/home");
  } else {
    // if(match==false)
    res.render("login.ejs", { error: "Wrong credentials!" });
  }
});

app.get("/weapons", async (req, res) => {
  let userId = req.session.adminId;
  if (userId == undefined){
      userId = 0;
  }
  let itemList = await getList("weaponList", userId);
  
  let weaponsList = [];
  for(let i=0; i < 4; i++){
    let response = await fetch(`https://eldenring.fanapis.com/api/weapons?limit=150&page=${i}`);
    let weapons = await response.json();
    weaponsList = weaponsList.concat(weapons.data);
  }
  
  console.log(weaponsList);
  res.render("weapons", { weapons: weaponsList, userCollection: itemList, userId:userId});
});

app.get("/armors", async (req, res) => {
  let userId = req.session.adminId;
  if (userId == undefined){
      userId = 0;
  }
  let itemList = await getList("armorList", userId);
  
  let armorsList = [];
  for(let i=0; i < 5; i++){
    let response = await fetch(`https://eldenring.fanapis.com/api/armors?limit=150&page=${i}`);
    let armors = await response.json();
    armorsList = armorsList.concat(armors.data);
  }

  res.render("armors", { armors: armorsList, userCollection: itemList, userId:userId});
});

app.get("/bosses", async (req, res) => {
  let userId = req.session.adminId;
  if (userId == undefined){
      userId = 0;
  }
  let itemList = await getList("bossList", userId);
  
  let bossesList = [];
  for(let i=0; i < 2; i++){
    let response = await fetch(`https://eldenring.fanapis.com/api/bosses?limit=150&page=${i}`);
    let bosses = await response.json();
    bossesList = bossesList.concat(bosses.data);
  }
  res.render("bosses", { bosses: bossesList, userCollection: itemList, userId:userId});
});

app.post("/armors", async (req, res) => {
  let updatedList = "";
  for(let i = 1; i <= 106; i++){
    let itemId = req.body[`item`+i];
    if(itemId != undefined){
      if(updatedList == ""){
        updatedList = updatedList + itemId;
      }
      else{
        updatedList = updatedList + "," + itemId;
      }
    }
  }
  let sql = `UPDATE er_userCollection
            SET armorList = ?
            where adminId = ?`;
  let params = [updatedList, req.session.adminId];
  let rows = await executeSQL(sql, params);
  res.redirect("/armors");
});

app.post("/weapons", async (req, res) => {
  let updatedList = "";
  for(let i = 1; i <= 106; i++){
    let itemId = req.body[`item`+i];
    if(itemId != undefined){
      if(updatedList == ""){
        updatedList = updatedList + itemId;
      }
      else{
        updatedList = updatedList + "," + itemId;
      }
    }
  }
  let sql = `UPDATE er_userCollection
            SET weaponList = ?
            where adminId = ?`;
  let params = [updatedList, req.session.adminId];
  let rows = await executeSQL(sql, params);
  res.redirect("/weapons");
});

app.post("/bosses", async (req, res) => {
  let updatedList = "";
  for(let i = 1; i <= 106; i++){
    let itemId = req.body[`item`+i];
    if(itemId != undefined){
      if(updatedList == ""){
        updatedList = updatedList + itemId;
      }
      else{
        updatedList = updatedList + "," + itemId;
      }
    }
  }
  let sql = `UPDATE er_userCollection
            SET bossList = ?
            where adminId = ?`;
  let params = [updatedList, req.session.adminId];
  let rows = await executeSQL(sql, params);
  res.redirect("/bosses");
});

app.get("/collections", async (req, res) => {
  let username = req.session.username;
  let userId = req.session.adminId;
  if (userId == undefined){
    userId = 0;
  }
  res.render('collection', {user:username, userId:userId});
});

app.get("/builds", async (req, res) => {
  userId = req.session.adminId;
  if (userId == undefined){
    userId = 0;
  }
  
  let armorsList = [];
  for(let i=0; i < 5; i++){
    let response = await fetch(`https://eldenring.fanapis.com/api/armors?limit=150&page=${i}`);
    let armors = await response.json();
    armorsList = armorsList.concat(armors.data);
  }
  
  let weaponsList = [];
  for(let i=0; i < 4; i++){
    let response1 = await fetch(`https://eldenring.fanapis.com/api/weapons?limit=150&page=${i}`);
    let weapons = await response1.json();
    weaponsList = weaponsList.concat(weapons.data);
  }

  let sql = `SELECT admin.username, er_userBuilds.*
             FROM admin
             JOIN er_userBuilds
             ON admin.adminId = er_userBuilds.adminId`;
  let rows = await executeSQL(sql);
  
  res.render('builds', {builds:rows, userId:userId, armors:armorsList, weapons:weaponsList});
});

app.post("/builds", async (req, res) => {
  let userId = req.session.adminId;
  let helm = req.body.helm;
  let chestArmor = req.body.chestArmor;
  let legArmor = req.body.legArmor;
  let gauntlets = req.body.gauntlets;
  let weapons = req.body.weapon;
  console.log(userId, helm, chestArmor, legArmor, gauntlets, weapons)

  let sql = `INSERT INTO er_userBuilds (adminId, helm, chestArmor, legArmor, gauntlets, weapons) VALUES (?, ?, ?, ?, ?, ?)`;
  let rows = await executeSQL(sql, [userId, helm, chestArmor, legArmor, gauntlets, weapons]);
  console.log(rows)
  res.redirect("/builds");
});

// collection lists api:
// gets the cetain list chosen from the users collection
app.get('/api/:listType/:id', async (req, res) => {
  let userId = req.params.id;
  let listType = req.params.listType;
  let itemList = await getList(listType, userId);
  res.send(itemList);
});

async function getList(listType, userId) {
  let itemList = [];
  let sql = `SELECT ${listType} FROM er_userCollection WHERE adminId = ?`;
  let list = await executeSQL(sql, [userId]);
  if(listType == "bossList"){
    itemList = list[0].bossList.split(",");
  }
  else if(listType == "weaponList"){
    itemList = list[0].weaponList.split(",");
  }
  else if(listType == "armorList"){
    itemList = list[0].armorList.split(",");
  }
  return itemList;
}

//dbTest
app.get("/dbTest", async function(req, res){
let sql = "SELECT CURDATE()";
let rows = await executeSQL(sql);
res.send(rows);
});

//functions
async function executeSQL(sql, params){
return new Promise (function (resolve, reject) {
pool.query(sql, params, function (err, rows, fields) {
if (err) throw err;
   resolve(rows);
});
});
}//executeSQL

function dbConnection(){
   const pool  = mysql.createPool({
      connectionLimit: 10,
      host: "izm96dhhnwr2ieg0.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
      user: "j8snngn2qos2xrop",
      password: "qbkys9xl3h7zonnc",
      database: "htt71zxstkv53r3s"
   }); 
   return pool;
} //dbConnection

//start server
app.listen(3000, () => {
console.log("Expresss server running...")
} )
