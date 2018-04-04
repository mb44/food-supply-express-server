const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const morgan = require('morgan')

const app = express()
app.use(morgan('combined')) // for printing out logs
app.use(bodyParser.json()) // allow the app to easily parse json requsts
app.use(cors()) // allow any client to access this server (security risk)

var admin = require('firebase-admin')
var serviceAccount = require('../serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://foodwastereduction-6ca48.firebaseio.com'
})

var users = null

// Firebase
// Get a database reference to our posts
var db = admin.database()

var usersRef = db.ref('users')

// Attach an asynchronous callback to read the data at our posts reference
usersRef.on('value', function (snapshot) {
  console.log(snapshot.val())
  users = snapshot.val()
}, function (errorObject) {
  console.log('The read failed: ' + errorObject.code)
})

// HTTP Endpoints
// 1. get users
app.get('/users', (req, res) => {
  res.send({
    users: users
  })
})

// 2. add user
app.post('/users', (req, res) => {
  console.log(req.body.email)

  console.log(req.body.token)

  admin.auth().createUser({
    email: req.body.email,
    password: req.body.password
  })
    .then(function (userRecord) {
      // Add user to database
      usersRef.child(userRecord.uid).set({
        email: req.body.email,
        privileges: req.body.privileges
      })

      console.log('Successfully created new user:' + userRecord.uid)
      res.status(200).send('Successfully adder new user')
    })
    .catch(function (error) {
      console.log('Error creating new user:' + error)
      res.status(500).send('Error creating new user')
    })
})

// 3. update user (email and privileges)
app.patch('/users/:uid', (req, res) => {
  /*
  console.log('ID TOKEN: ' + req.body.idToken)

  admin.auth().verifyIdToken(req.body.idToken)
    .then(function (decodedToken) {
      var uid = decodedToken.uid
      console.log('User id: ' + uid)
    }).catch(function (error) {
      res.status(500).send(error)
    })
  */
  var currentUserRef = usersRef.child(req.params.uid)
  admin.auth().updateUser(req.params.uid, {
    email: req.body.email
  })
    .then(function (userRecord) {
      currentUserRef.update({
        'email': req.body.email,
        'privileges': req.body.privileges
      }, function (error) {
        if (error) {
          console.log('User privileges not updated: ' + error)
          res.status(500).send('User privileges not updated')
        } else {
          // See the UserRecord reference doc for the contents of userRecord.
          console.log('Successfully updated user', userRecord.toJSON())
          res.status(200).send('Successfully updated user')
        }
      })
    })
    .catch(function (error) {
      console.log('Error updating user:', error)
      res.status(500).send(error)
    })
})

// 4. delete user
app.delete('/users/:uid', (req, res) => {
  var currentUserRef = usersRef.child(req.params.uid)

  admin.auth().deleteUser(req.params.uid)
    .then(function () {
      currentUserRef.remove().then(function () {
        console.log('uid: ' + req.params.uid + ' succcessfully deleted')
        res.status(200).send('User succcessfully deleted')
      })
    })
    .catch(function (error) {
      console.log('Error deleting user:' + error)
      res.status(500).send('Error deleting user')
    })
})

app.listen(process.env.PORT || 8081)
