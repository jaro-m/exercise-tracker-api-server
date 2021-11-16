const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
  console.log('MongoDB connected!!');
}).catch(err => {
  console.log('Failed to connect to MongoDB', err);
});

const {Schema} = mongoose;

const userSchema = new Schema({
  username : {type: String, required: true},
})

const exerciseSchema = new Schema({
  userid : {type: String, required: true},
  description: {type: String, required: false},
  duration: {type: Number, required: true},
  date: {type: String},
})

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

require('dotenv').config()

app.use(cors())
app.use(express.static('public'))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users/:_id/logs', function(req, res) {
  const user = User.findById(req.params._id, function(err, data) {
    if (!err) {
      var logs = Exercise.find({userid: req.params._id}, 'description duration date', function(error, exercise_data) {
        if (!error) {
          logs = exercise_data;
        } else {
          logs = [];
        };
        res.json({
          _id: data._id,
          username: data.username,
          count: logs.length,
          log: logs,
        });
      });
    } else {
      res.send({error2: err})
    };
  });
});

app.get('/api/users', function(req, res) {
  let users = User.find({}, function(err, data) {
    if (err) {
      res.json({error: err});
    } else {
      res.send(data);
    }
  });
});

app.post('/api/users', function(req, res) {
  let user = new User({username: req.body.username});

  try {
    user.save();
    res.send(user);
  } catch (error) {
    res.send({error: error});
  }
});

app.post('/api/users/:_id/exercises', function(req, res) {
  var date = new Date(req.body.date);

  if (date.toString() === "Invalid Date") {
    date = new Date();
  }

  const exercise = new Exercise({
    userid: req.params._id,
    description: req.body.description,
    duration: req.body.duration,
    date: date.toDateString(),
  });
  exercise.save(function(err, data) {
    if (err) {
      res.send(err);
    }
  });

  const user = User.findById(req.params._id, function(err, user_data) {
    if (!err) {
      const response = {
        _id: user_data._id,
        username: user_data.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date,
      }
      res.json(response);
    } else {
      res.send(err);
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
