/*
Inspired by:
https://github.com/jimmydo/js-toolbox/blob/master/toolbox.js
http://backbonejs.org
*/

(function () {
    var root = this;
    var o = function(){};

    if (typeof module !== 'undefined' && module.exports) module.exports = o;
    else root.o = o;

    var ArrayProto = Array.prototype;
    var slice = ArrayProto.slice;

    function Fn () {}

    function inherits (parent, protoProps, ownProps) {
        var child;
        if (protoProps && protoProps.hasOwnProperty('constructor')) {
            child = protoProps.constructor;
        } else {
            child = function () { parent.apply(this, arguments) };
        }

        _extend(child, parent);

        Fn.prototype = parent.prototype;
        child.prototype = new Fn();

        if (protoProps) _extend(child.prototype, protoProps);
        if (ownProps)   _extend(child, ownProps);

        child.prototype.constructor = child;
        child.__super = parent.prototype;

        return child;
    }

    function extend (protoProps, ownProps) {
        var child = inherits(this, protoProps, ownProps);
        child.extend = this.extend;
        return child;
    }

    function _extend (obj /*, arguments[1-n] */) {
        var args = slice.call(arguments, 1);
        var i, hash;
        for (i = 0; i < args.length; i++) {
            hash = args[i];
            for (var key in hash) {
                obj[key] = hash[key];
            }
        }
    }

    o.extend = extend;

}());


/*
// Example
var Obj = O.extend({
    constructor: function () {
        this.mario = 1;
        this.dario = 2;
    },
    echo: function () {
        console.log(this.mario);
    }
});

var obj = new Obj();
*/