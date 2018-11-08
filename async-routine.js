'use strict';

function AsyncRoutine() {
  let self = this;

  /////////////////////////////////////////////// UTILITIES ////

  // default promise, override by setting AsyncRoutine.Promise = $q
  self.Promise = function (fn) {
    return new Promise(fn);
  }

  self.PromiseResolve = function (value) {
    return self.Promise(function (resolve, reject) {
      return resolve(value);
    });
  }

  /////////////////////////////////////////////// ROUTINE BUILDING METHODS ////

  self.routine = [];
  self.currentActions = null;

  self.then = function (keyOrFn, possibleFn) {
    return self.wait().and(keyOrFn, possibleFn);
  }

  self.wait = function () {
    // make a new group of actions
    self.currentActions = [];
    self.routine.push(self.currentActions);
    return self;
  }

  self.action = function (keyOrFn, possibleFn) {
    // check to see if we have a step going
    if (self.currentActions === null) {
      self.wait();
    }
    // add this action to current group
    if (typeof possibleFn === 'function') {
      let step = {};
      step[keyOrFn] = possibleFn;
      self.currentActions.push(step);
    } else {
      self.currentActions.push(keyOrFn);
    }
    return self;
  }

  // setup aliases
  self.first = self.after = self.last = self.then;
  self.and = self.with = self.action;

  ///////////////////////////////////////////// ACTION PROCESSING ////

  self.exec = function (formatResponses) { // returns a promise
    // clean up state
    self.routine = self.routine.filter(function (actions) {
      return actions.length > 0;
    });
    self.responses = {};
    self.completion = [];
    self.isComplete = false;
    self.promise = self.Promise(function (resolve, reject) {
      // save resolve and reject actions for other methods
      self.resolve = function () {
        self.isComplete = true;
        return resolve(self.responses);
      };
      self.reject = function (err) {
        self.isComplete = true;
        return reject(err);
      };
      // start the steps
      self.doStep(0);
    });
    if (typeof formatResponses === 'function') {
      return self.Promise(function (resolve, reject) {
        self.promise
          .then(function (responses) {
            return resolve(formatResponses(responses));
          })
          .catch(function (err) { return reject(err) });
      });
    } else {
      return self.promise;
    }
  }

  self.doStep = function (index) {
    if (self.isComplete) {
      return;
    }

    // check if previous step (group of actions) is completed
    if (index != 0) {
      let curCompletion = self.completion[index - 1];
      for (let i = 0; i < curCompletion.length; i++) {
        if (!curCompletion[i]) {
          return;
        }
      }
    }

    // if this step doesn't exist, we're done
    if (index == self.routine.length) {
      return self.resolve();
    }

    // setup next step callback
    let nextStep = function () {
      self.doStep(index + 1);
    };

    // get actions for current step
    let actions = self.routine[index];

    // execute actions in current step
    self.doActions(actions, nextStep);
  };

  self.doActions = function (actions, nextStep) {
    let stepCompletion = [];
    self.completion.push(stepCompletion);

    actions.forEach(function (action) {
      // get and check the function
      let fn = typeof action === 'object' ? action[Object.keys(action)[0]] : action;

      if (typeof fn !== 'function') {
        self.reject('Action is not a Function');
      }

      // run the function
      let possiblePromise = fn(self.responses);

      // check if no response
      if (typeof possiblePromise === 'undefined') {
        stepCompletion.push(true);
        return nextStep();
      } else {
        stepCompletion.push(false);
        // convert response into a promise (if it isn't already)
        let definitelyPromise = typeof possiblePromise.then === "function" ?
          possiblePromise :
          self.PromiseResolve(possiblePromise);

        definitelyPromise
          .then(function (response) {
            // mark as complete
            stepCompletion[actions.indexOf(action)] = true;
            // should we put this in responses?
            if (typeof action === 'object') {
              self.responses[Object.keys(action)] = response;
            }
            return nextStep();
          })
          .catch(self.reject);
      }
    });
  };
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exports = AsyncRoutine;
}