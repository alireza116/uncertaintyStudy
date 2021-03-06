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
  variables: Schema.Types.Mixed,
  states: Schema.Types.Mixed,
  intermission: Schema.Types.Mixed,
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
let variables = [
  ["Yearly Income", "Height"],
  ["Weight of a Diamond", "Price of a Diamond"],
  ["Yearly Income", "Stress"],
  ["Vaccination Rate", "Rate of Illness"],
  ["Exercise amount", "Body Weight"]
];

let states = ["mc", "draw"];
// let states = ["draw","mc"];
let stateIndex = 0;
// const numTopics = 3;

const Response = mongoose.model("uncertainty3Belief", responseSchema);

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
  res.status(200).send(req.session.variables[req.session.varIndex]);
});

router.get("/api/consent", function(req, res) {
  // 0 is low 1 is high 2 is control //
  // for order 0 is basic anchoring first, then with map visualization and 1 is map visualization first and then basic anchoring//

  if (!req.session.userid) {
    let token = randomstring.generate(8);
    let state = states[stateIndex];
    let varIndex = 0;
    // group = 2;
    req.session.userid = token;
    req.session.completed = false;
    req.session.postQuestion = false;
    req.session.preQuestion = false;
    req.session.states = shuffle(states);
    req.session.state = req.session.states[stateIndex];
    req.session.stateIndex = stateIndex;
    req.session.varIndex = 0;
    req.session.variables = shuffle(variables);
    // console.log(req.session);

    let newResponse = new Response({
      usertoken: token,
      variables: req.session.variables,
      states: states
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

router.post("/api/intermission", function(req, res) {
  let token = req.session.userid;
  let data = req.body;
  // console.log(data);
  Response.findOneAndUpdate(
    { usertoken: token },
    {
      intermission: data
    },
    function(err, doc) {
      if (err) return res.send(500, { error: err });
      console.log("yeaah");
      return res.send("successfully saved!");
    }
  );
});

router.post("/api/study", function(req, res) {
  let token = req.session.userid;
  let data = req.body;

  data["mode"] = req.session.state;
  data["variables"] = req.session.variables[req.session.varIndex];

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
      req.session.preQuestion = true;
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
      req.session.postQuestion = true;
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

router.get("/intermission", function(req, res) {
  if (req.session.completed) {
    res.render("debrief.html");
  } else {
    res.render("intermission.html");
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
router.get("/instructions-draw", function(req, res) {
  if (req.session.completed) {
    res.render("debrief.html");
  } else {
    res.render("instructions-draw.html");
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
  if (req.session.state === "draw") {
    res.render("instructions-LC.html");
  } else if (req.session.state === "mc") {
    res.render("instructions-MC.html");
  } else {
    res.send("error!");
  }
});

router.get("/study", function(req, res) {
  console.log(req.session.state);
  if (req.session.state === "draw") {
    res.render("lineChartDraw.html");
  } else if (req.session.state === "mc") {
    res.render("lineChartMC.html");
  } else {
    res.send("error!");
  }
});

router.get("/next", function(req, res) {
  console.log(req.session.state);
  console.log(req.session.variables[req.session.varIndex]);
  req.session.varIndex += 1;
  if (
    req.session.varIndex >= variables.length &&
    req.session.stateIndex === 0
  ) {
    req.session.stateIndex += 1;
    req.session.varIndex = 0;
    req.session.state = req.session.states[req.session.stateIndex];
    res.redirect("/intermission");
  } else if (
    req.session.varIndex >= variables.length &&
    req.session.stateIndex === 1
  ) {
    req.session.completed = true;
    res.redirect("/postforms");
  } else {
    res.redirect("/study");
  }
});

router.get("/debrief", function(req, res) {
  if (
    req.session.completed &&
    req.session.postQuestion &&
    req.session.preQuestion
  ) {
    res.render("debrief.html");
  } else if (!req.session.preQuestion) {
    res.redirect("preforms");
  } else if (!req.session.postQuestion && !req.session.completed) {
    res.redirect("study");
  } else if (!req.session.postQuestion) {
    res.redirect("postforms");
  }
});

function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

module.exports = router;
