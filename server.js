const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');

const mongoose = require('mongoose')//.set('debug', true);
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
  date: {type: Date},
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
  const from_date = (req.query.from && new Date(req.query.from).toString() !== "Invalid Date")
    ? new Date(req.query.from)
    : null;
  const to_date = (req.query.to && new Date(req.query.to).toString() !== "Invalid Date")
    ? new Date(req.query.to)
    : null;
  const limit = isNaN(req.query.limit) ? 0 : Number(req.query.limit);

  let date_params = {userid: req.params._id};
  let date_range = {};

  if (from_date) {
    date_range['$gte'] = from_date;
  }
  if (to_date) {
    date_range['$lte'] = to_date;
  }
  if (Object.keys(date_range).length > 0) {
    date_params['date'] = date_range;
  }

  const user = User.findById(req.params._id);
  const logs = Exercise.find(
    date_params,
    'description duration date',
    {limit: limit},
  );

  Promise.all([user, logs])
    .then(([user_data, log_data]) => {
      // This is temporary solution to convert Date objects to String
      let exercises = [];
      log_data.forEach(log => {
        exercises.push({
          description: log.description,
          duration: log.duration,
          date: log.date.toDateString(),
        })
      })

      res.json({
        _id: user_data._id,
        username: user_data.username,
        count: exercises.length,
        log: exercises,
      });
    })
    .catch(err => {
      res.send(err);
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

  user.save()
    .then(data => {
      if (data) res.send(user);
    })
  .catch(err => res.send(err));
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

  const save_promise = exercise.save();
  const user_promise = User.findById(req.params._id);

  Promise.all([save_promise, user_promise])
    .then(([saved_data, user_data]) => {
      const response = {
        _id: user_data._id,
        username: user_data.username,
        description: saved_data.description,
        duration: saved_data.duration,
        date: saved_data.date.toDateString(),
      }
      res.json(response);
    })
    .catch(err => {
      res.send(err);
    })
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
