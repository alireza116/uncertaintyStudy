const express = require("express");
const router = express.Router();
const randomstring = require("randomstring");
const mongoose = require("mongoose");
const csv = require("csv-parser");
const fs = require("fs");
const math = require("mathjs");

const url =
  "mongodb://markant:emotion2019@ds159025.mlab.com:59025/markantstudy";

mongoose.connect(url);
mongoose.promise = global.Promise;

// const db = mongoose.anchoring;

function zip() {
  let args = [].slice.call(arguments);
  let shortest =
    args.length === 0
      ? []
      : args.reduce(function(a, b) {
          return a.length < b.length ? a : b;
        });

  return shortest.map(function(_, i) {
    return args.map(function(array) {
      return array[i];
    });
  });
}

const Schema = mongoose.Schema;

//stance : 1 == for  & 0 == against
// claim : 1== high  & 0 == low
// block: 1== Block & 0 == turn
// sentiment: 1== Hight & 0 == low
const responseSchema = new Schema({
  usertoken: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  prequestionnaire: Schema.Types.Mixed,
  postquestionnaire: Schema.Types.Mixed,
  responses: Schema.Types.Array,
  paid: { type: Boolean, Defult: false }
});

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
// function getGroupString(groupInt) {
//   if (groupInt === 0) {
//     return "control";
//   } else if (groupInt === 1) {
//     return "treatment";
//   }
// }

// const allData = JSON.parse(
//   fs.readFileSync(`public/data/finalData.json`, "utf8")
// );
const variables = [
  ["Yearly Income", "Height"],
  ["Weight of a Diamond", "Price of a Diamond"],
  ["Verbal SAT Score", "Math SAT Score"],
  ["Stress", "Yearly Income"],
  ["Vaccination Rate", "Rate of Illness"]
];


let states = ["mc","draw"];

// const numTopics = 3;

const Response = mongoose.model("uncertaintyBelief", responseSchema);

router.get("/api/userinfo", function(req, res) {
  if (req.session.userid) {
    res.json({
      token: req.session.userid
    });
  } else {
    res.send("please give consent first");
  }
});

router.get("/api/data", function(req, res) {
  res.status(200).send(variables[req.session.varIndex]);
});

router.get("/api/consent", function(req, res) {
  // 0 is low 1 is high 2 is control //
  // for order 0 is basic anchoring first, then with map visualization and 1 is map visualization first and then basic anchoring//

  if (!req.session.userid) {
    let token = randomstring.generate(8);
    let state = "mc";
    let varIndex = 0;
    // group = 2;
    req.session.userid = token;
    req.session.completed = false;
    req.session.state = state;
    req.session.varIndex = 0;
    // console.log(req.session);

    let newResponse = new Response({
      usertoken: token,
    });

    newResponse.save(function(err) {
      if (err) console.log(err);
      res.send({
        user: token
      });
    });
  } else {
    res.send("consent already given");
  }
});

router.post("/api/study", function(req, res) {
  let token = req.session.userid;
  let data = req.body;

  data["mode"] = req.session.state;
  data["variables"] = variables[req.session.varIndex];



  Response.findOneAndUpdate(
    { usertoken: token },
    {
      $push: { responses: data }
    },
    function(err, doc) {
      if (err) {
        return res.send(500, { error: err });
      }
      return res.send(200, `successfully saved study`);
    }
  );
});

router.post("/api/pre", function(req, res) {
  let token = req.session.userid;
  let data = req.body;
  // console.log(data);
  Response.findOneAndUpdate(
    { usertoken: token, prequestionnaire: { $exists: false } },
    {
      prequestionnaire: data
    },
    function(err, doc) {
      if (err) return res.send(500, { error: err });
      // console.log("yeaah");
      return res.send("successfully saved!");
    }
  );
});

router.post("/api/post", function(req, res) {
  let token = req.session.userid;
  let data = req.body;
  // console.log(data);
  Response.findOneAndUpdate(
    { usertoken: token, postquestionnaire: { $exists: false } },
    {
      postquestionnaire: data
    },
    function(err, doc) {
      if (err) return res.send(500, { error: err });
      console.log("yeaah");
      return res.send("successfully saved!");
    }
  );
});

router.get("/", function(req, res) {
  if (req.session.completed) {
    res.render("debrief.html");
  } else {
    res.render("consent.html");
  }
});

router.get("/consent", function(req, res) {
  if (req.session.completed) {
    res.render("debrief.html");
  } else {
    res.render("consent.html");
  }
});

router.get("/instructions", function(req, res) {
  if (req.session.completed) {
    res.render("debrief.html");
  } else {
    res.render("instructions.html");
  }
});

router.get("/instructions2", function(req, res) {
  if (req.session.completed) {
    res.render("debrief.html");
  } else {
    res.render("instructions2.html");
  }
});

router.get("/instructions-MC", function(req, res) {
  if (req.session.completed) {
    res.render("debrief.html");
  } else {
    res.render("instructions-MC.html");
  }
});


router.get("/preforms", function(req, res) {
  if (!req.session.completed) {
    res.render("preforms.html");
  }
});

router.get("/postforms", function(req, res) {
  res.render("postforms.html");
});

router.get("/instructions-study", function(req, res) {
  console.log(req.session.state);
    if (req.session.state === "draw"){
      res.render("instructions-LC.html");
    } else if (req.session.state === "mc") {
      res.render("instructions-MC.html")
    }
    else{
      res.send("error!");
    }
});

router.get("/study", function(req, res) {
  console.log(req.session.state);
    if (req.session.state === "draw"){
      res.render("lineChartDraw.html");
    } else if (req.session.state === "mc") {
      res.render("lineChartMC.html")
    }
    else{
      res.send("error!");
    }
});

router.get("/next", function(req, res) {
  console.log(req.session.state);
  console.log(variables[req.session.varIndex]);
  if (req.session.state==="mc"){
    req.session.state ="draw";
  } else if (req.session.state ==="draw"){
    req.session.state="mc";
    req.session.varIndex+=1;
  }
  if (req.session.varIndex >= variables.length) {
    req.session.completed = true;
    res.redirect("/postforms");
  } else {
    res.redirect("/study");
  }
});

router.get("/debrief", function(req, res) {
  res.render("debrief.html");
});
module.exports = router;
