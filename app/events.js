// This object is mixed into the prototype of other objects
// to enable a pub/sub design pattern.

var events = {

  listeners: [],

  addEventListener: function (type, listener) {
    if (typeof this.listeners[type] === "undefined") {
      this.listeners[type] = [];
    }

    this.listeners[type].push(listener);
  },

  // trigger an event. the first argument to all observers
  // is the event object. any other parameters passed to
  // dispatchEvent will also be passed onto the listeners.
  dispatchEvent: function (event) {
    if (typeof event === "string") {
      event = {type: event};
    }

    if (!event.target) {
      event.target = this;
    }

    if (this.listeners[event.type] instanceof Array) {
      var listener = this.listeners[event.type];
      for (var i = 0; i < listener.length; i++) {
        listener[i].apply(this, [].slice.call(arguments));
      }
    }
  },

  removeEventListener: function (type, listener) {
    if (this.listeners[type] instanceof Array) {
      var listeners = this.listeners[type];
      for (var i = 0; i < listeners.length; i++) {
        if (listeners[i] === listener) {
          listeners.splice(i, 1);
          break;
        }
      }
    }
  }
};
