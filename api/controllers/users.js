const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Log = require('../models/log');

const performLog = async (userId, action, reference, key, res) => {
    try {
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return console.log({ message: 'User not found' });
        }

        var newReference = null;

        if (key === 'user') {
            const _user = await User.findOne({ _id: reference });
            newReference = _user.firstName + ' ' + _user.lastName + ' (USER)';
        }
        else if (key === 'item') {
            const _item = await Item.findOne({ _id: reference });
            newReference = _item.name + ' (ITEM)';
        } else {
            return console.log({ message: 'Invalid key' });
        }

        const name = user.firstName + ' ' + user.lastName;

        const log = new Log({
            _id: new mongoose.Types.ObjectId(),
            name: name,
            action: action,
            reference: newReference,
        });

        await log.save();
        return console.log({ message: 'Log saved successfully', log });

    } catch (err) {
        console.error('Error performing log:', err);
        if (res) {
            return console.log({
                message: 'Error in performing log',
                error: err.message
            });
        }
    }
};

exports.users_get_user = async (req, res, next) => {
    try {
        const { active, query, filter } = req.query;

        const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        let searchCriteria = {};
        const queryConditions = [];

        if (query) {
            const escapedQuery = escapeRegex(query);
            const orConditions = [];
            if (mongoose.Types.ObjectId.isValid(query)) {
                orConditions.push({ _id: query });
            }

            orConditions.push(
                { controlNumber: { $regex: escapedQuery, $options: 'i' } },
                { firstName: { $regex: escapedQuery, $options: 'i' } },
                { lastName: { $regex: escapedQuery, $options: 'i' } },
                { middleName: { $regex: escapedQuery, $options: 'i' } },
                { employeeId: { $regex: escapedQuery, $options: 'i' } },
                { division: { $regex: escapedQuery, $options: 'i' } },
                { username: { $regex: escapedQuery, $options: 'i' } },
            );

            queryConditions.push({ $or: orConditions });
        }

        if (filter) {
            const escapedFilter = escapeRegex(filter);
            queryConditions.push({
                $or: [
                    { controlNumber: { $regex: escapedFilter, $options: 'i' } },
                    { firstName: { $regex: escapedFilter, $options: 'i' } },
                    { lastName: { $regex: escapedFilter, $options: 'i' } },
                    { middleName: { $regex: escapedFilter, $options: 'i' } },
                    { employeeId: { $regex: escapedFilter, $options: 'i' } },
                    { division: { $regex: escapedFilter, $options: 'i' } },
                    { username: { $regex: escapedFilter, $options: 'i' } },
                    { role: { $regex: escapedFilter, $options: 'i' } },
                ],
            });
        }

        if (active) {
            const isActive = active === 'true';
            queryConditions.push({ active: isActive });
        }

        if (queryConditions.length > 0) {
            searchCriteria = { $and: queryConditions };
        }

        const users = await User.find(searchCriteria);

        return res.status(200).json(users);


    }
    catch (error) {
        return res.status(500).json({
            message: "Error in retrieving users",
            error: error
        })
    }
};

exports.users_profile_userB = (req, res, next) => {

    try {
        const AUTH_TOKEN = req.body.token;
        if (!AUTH_TOKEN) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = AUTH_TOKEN;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        User.findOne({ _id: decoded.userId })
            .exec()
            .then(user => {
                return res.status(200).json(user);
            })
            .catch(err => {
                return res.status(500).json({
                    message: "Error in retrieving user information",
                    error: err
                });
            })
    } catch (error) {
        return res.status(500).json({
            message: "Error in validating token",
            error: error
        });
    }


};

exports.users_profile_user = (req, res, next) => {
    User.findOne({ _id: req.userData.userId })
        .exec()
        .then(user => {
            return res.status(200).json(user);
        })
        .catch(err => {
            return res.status(500).json({
                error: err
            });
        });
};

exports.users_token_validation = (req, res, next) => {
    try {
        const AUTH_TOKEN = req.body.token;
        if (!AUTH_TOKEN) {
            return res.status(401).json({ isValid: false });
        }

        const token = AUTH_TOKEN;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        return res.json({ isValid: true });
    } catch (error) {
        return res.status(500).json({ isValid: false });
    }
};

exports.users_create_user = (req, res, next) => {

    User.find({ username: req.body.username })
        .then(user => {
            if (user.length >= 1) {
                return res.status(200).json({
                    message: "Employee Id already exists"
                });
            }
            else {
                bcrypt.hash(req.body.password, 10, (err, hash) => {
                    if (err) {
                        return res.status(500).json({
                            message: "Error in hashing password",
                            error: err
                        });
                    }
                    else {
                        const userId = new mongoose.Types.ObjectId();

                        const user = new User({
                            _id: userId,
                            firstName: req.body.firstName,
                            lastName: req.body.lastName,
                            middleName: req.body.middleName,
                            division: req.body.division,
                            username: req.body.username,
                            password: hash,
                        })
                        performLog("admin", "create", userId, "user", res)
                        user.save()
                            .then(doc => {
                                return res.status(201).json({ doc });
                            })
                            .catch(err => {
                                return res.status(500).json({
                                    message: "Error in creating user",
                                    error: err
                                });
                            });
                    }
                });
            }
        })
        .catch(err => {
            return res.status(500).json({
                message: "Error in finding user",
                error: err
            })
        })
};

exports.users_login_user = (req, res, next) => {
    User.find({ username: req.body.username })
        .exec()
        .then(user => {
            if (user.length < 1) {
                return res.status(401).json({
                    message: 'Invalid Username'
                });
            }
            bcrypt.compare(req.body.password, user[0].password, (err, result) => {
                if (err) {
                    return res.status(401).json({
                        message: 'Invalid Password'
                    });
                }
                if (result) {
                    const token = jwt.sign({
                        userId: user[0]._id,
                        username: user[0].username,
                    },
                        process.env.JWT_SECRET, //private key
                        {
                            expiresIn: "8h"
                        }
                    )

                    return res.status(200).json({ token });
                }
                return res.status(401).json({
                    message: 'Login failed'
                });
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })

};

exports.users_update_user = async (req, res, next) => {
    const id = req.params.id;
    const updateFields = req.body;
    let userExist = false;
    await User.find({ username: updateFields.username })
        .then(user => {
            if (user.length >= 1) {
                userExist = true;
            }
        })

    if (userExist) {
        return res.status(200).json({
            message: "Employee Id already exists"
        });
    }
    else {

        performLog("admin", "update", id, "user", res)
        if (updateFields.password) {
            const bcrypt = require('bcrypt');
            const saltRounds = 10;

            bcrypt.hash(updateFields.password, saltRounds, (err, hash) => {
                if (err) {
                    return res.status(500).json({
                        message: "Error in hashing password",
                        error: err
                    });
                }
                updateFields.password = hash;
                performUpdate(id, updateFields, res);
            });
        }
        else {
            performUpdate(id, updateFields, res);
        }

    }


};

const performUpdate = (id, updateFields, res) => {
    User.findByIdAndUpdate(id, updateFields, { new: true })
        .then((updated) => {
            if (!updated) {
                return res.status(404).json({ message: "id not found" });
            }
            return res.status(200).json(updated);
        })
        .catch((err) => {
            return res.status(500).json({
                message: "Error in updating user",
                error: err
            });
        })
};

