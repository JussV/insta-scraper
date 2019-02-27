'use strict';

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: String,
    username: String,
    description: String,
    followers: Number,
    following: Number
});

module.exports = mongoose.model('User', UserSchema);