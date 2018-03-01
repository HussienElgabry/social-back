'use strict';

var bcrypt = require('bcrypt-nodejs');
var mongoosePaginate = require('mongoose-pagination');
var User = require('../models/user');
var jwt = require('../services/jwt');

function home (req, res) {
    res.status(200).send({
        message: 'Welcome!'
    });
};

function test (req, res) {
    console.log(req.body);
    res.status(200).send({
        message: 'Testing...'
    });
};

function saveUser (req, res) {
    var params = req.body;
    var user = new User();
    if (params.name && params.surname && params.nick && params.email && params.password) {
        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;
        User.find({ $or: [
            {email: user.email.toLowerCase()},
            {nick: user.nick.toLowerCase()}
        ]}).exec((err, users) => {
            if (err) return res.status(500).send({message: "Creating user error."}); 
            if (users && users.length >= 1) {
                return res.status(200).send({message: "User already exists."});
            } else {
                bcrypt.hash(params.password, null, null, (err, hash) => {
                    if (err) return res.status(500).send({message: "Saving user error."});
                    user.password = hash;
                });
                user.save((err, userStored) => {
                    if (err) return res.status(500).send({message: "Saving user error."});
                    if (userStored) {
                        return res.status(200).send({user: userStored});
                    } else {
                        return res.status(404).send({message: "User Not Found."});
                    }
                });
            }
        });
    } else {
        return res.status(200).send({message: 'Invalid Data.'});
    }
};

function loginUser(req, res) {
    var params = req.body;
    var email = params.email;
    var password = params.password;
    User.findOne({email: email}, (err, user) => {
        if (err) return res.status(500).send({message: "Login error."});
        if (user) {
            bcrypt.compare(password, user.password, (err, check) => {
                if (check) {
                    if (params.gettoken) {
                        return res.status(200).send({
                            token: jwt.createtoken(user)
                        });
                    } else {
                        user.password = undefined;
                        return res.status(200).send({user});
                    }
                } else {
                    return res.status(500).send({message: "Wrong email or password."});
                }
            });
        } else {
            return res.status(500).send({message: "Wrong email or password."});
        }
    });
}

function getUser(req, res) {
    var userId = req.params.id;

    User.findById(userId, (err, user) => {
        if (!user) return res.status(404).send({message: "User Not Found."});
        if (err) return res.status(500).send({message: "Request Error."});

        return res.status(200).send({user});
    });
}

function getUsers(req, res) {
    var identity_user_id = req.user.sub;
    var page = 1;

    if (req.params.page) {
        page = req.params.page;
    }

    var itemsPerPage = 5;
    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
        if (!users) return res.status(404).send({message: "Users Not Found."});
        if (err) return res.status(500).send({message: "Request Error."});

        return res.status(200).send({
            users,
            total,
            pages: Math.ceil(total/itemsPerPage)
        });
    });
}

module.exports = {
    home,
    test,
    saveUser,
    loginUser,
    getUser,
    getUsers
};
