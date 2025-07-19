(function() {
    'use strict';
    
    if (typeof window.CustomEvent !== 'function') {
      function CustomEvent(event, params) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        const evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
      }
      CustomEvent.prototype = window.Event.prototype;
      window.CustomEvent = CustomEvent;
    }
    
    if (!window.Promise) {
      console.warn('⚠️ Promise not supported - VN Engine may not work properly');
    }
    
    if (!Array.from) {
      Array.from = function(arrayLike) {
        return Array.prototype.slice.call(arrayLike);
      };
    }
    
    if (!Object.assign) {
      Object.assign = function(target) {
        if (target == null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }
        const to = Object(target);
        for (let index = 1; index < arguments.length; index++) {
          const nextSource = arguments[index];
          if (nextSource != null) {
            for (const nextKey in nextSource) {
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      };
    }
    
    if (!('classList' in document.documentElement)) {
      Object.defineProperty(HTMLElement.prototype, 'classList', {
        get: function() {
          const self = this;
          function update(fn) {
            return function(value) {
              const classes = self.className.split(/\s+/);
              const index = classes.indexOf(value);
              fn(classes, index, value);
              self.className = classes.join(' ');
            };
          }
          return {
            add: update(function(classes, index, value) {
              if (!~index) classes.push(value);
            }),
            remove: update(function(classes, index) {
              if (~index) classes.splice(index, 1);
            }),
            toggle: update(function(classes, index, value) {
              if (~index) classes.splice(index, 1);
              else classes.push(value);
            }),
            contains: function(value) {
              return !!~self.className.split(/\s+/).indexOf(value);
            },
            item: function(i) {
              return self.className.split(/\s+/)[i] || null;
            }
          };
        }
      });
    }
    
  })();
