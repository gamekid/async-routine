# async-routine
A promise-based orchestration tool for asynchronous javascript.

# Setup
npm install async-routine

*Node.js*
```
const AsyncRoutine = require('async-flow-routine');
```

*Angular.js*
```
<script src="libs/async-routine/async-routine.js"></script>

angular
  .run(["$q", function ($q) {
    AsyncRoutine.Promise = $q;    
  }]);
```

# Usage
```
new AsyncRoutine()
  .first('connection', prGetConnection)
  
  .then('users', r => r.connection.prFetch('users'))
  .and('userRoles', r => new Promise( (resolve, reject) {
    r.connection.cbFetch('userRoles', function (err, results) {
      if (err) return reject(err);
      
      reutrn resolve(results);
    })
  })
  
  .then(r => r.connection.close())
  
  // execute routine
  .exec()
  .then(r => {
    delete r.connection;
    client.json(r);
  })
  .catch(err => {
    // receives any reject in routine
    client.error(err);
  });
```

#  Routine
Build a routine by stringing together actions with expressive methods - .first, .last, .then, .and, .with

*Syncronous*
Use the methods .then, .first, .last to run these actions one after the next, waiting for the previous actions to complete before running.

*Asyncronous*
Use the methods .and, .with to run these actions simultaneously with the previous actions.

```
new AsyncRoutine()

  .first(action1)
  .and(action2)
  .and(action3) // these three tasks will run Asyncronously (at the same time)

  .then(action4) // use .then() to wait for all previous actions to complete
  .and(action5)

  .last(action6)
```

*Action*
Action Key (optional): This string is used as the property key appended to the *responses* object with the results of the Action Function given.
Action Function: A function that receives the *responses* object and may or may not return a value. If it returns a promise, the results of that promise will be stored in the responses object when they come in, or else the non-promise return variable will be immediately stored the responses object.

```
  .then('actionKey', actionFn)
```

*Responses*
This object accumulates the responses of each action that is given a key. Each response will be available on the next .then() action.

```
new AsyncRoutine()
  .first('users', prGetUsers)
  .and( responses => {
    console.log(responses.users); // undefined
  })

  .then( responses => {
    console.log(responses.users); // [user1, user2, user3...]
  })

```

*Execute*
Be sure to .exec() the routine to run it all. .exec() will return a promise.


*Pro-Tip*
Build the routine dynamically.

```
let routine = new AsyncRoutine()
  .first('connection', prGetConnection)
  .wait(); // use .wait().and() if .then() can't be done

for (let file of uploads) {
  routine.and(() => prUploadFile(file));
}

routine
  .exec()
  .then(...)
  .catch(...);
```