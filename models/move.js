'use strict'

var mongoose = require('mongoose');
var schema = mongoose.Schema;

var MoveSchema = new schema({
    gmailId: { type: String, default: '' },
    price: { type: Number, default: 0 },
    lastMove: { type: String, default: '' }

});

module.exports = mongoose.model('Move', MoveSchema);