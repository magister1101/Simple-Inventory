const mongoose = require('mongoose');
const path = require('path');
const QRCode = require('qrcode');

const User = require('../models/user');
const Item = require('../models/item');
const Log = require('../models/log');

const createLog = async (action, name, controlNumber, performedBy, description, res) => {
    const log = new Log({
        _id: new mongoose.Types.ObjectId(),
        controlNumber,
        name,
        action,
        performedBy,
        description,
    });

    try {
        await log.save();
    } catch (err) {
        return res.status(500).json({
            message: "Error creating log",
            error: err
        });
    }
};

const performUpdate = (id, updateFields, res) => {
    Item.findByIdAndUpdate(id, updateFields, { new: true })
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

exports.viewLogs = async (req, res, next) => {
    try {
        const { query, filter } = req.query;

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
                { name: { $regex: escapedQuery, $options: 'i' } },
                { reference: { $regex: escapedQuery, $options: 'i' } }
            );
            queryConditions.push({ $or: orConditions });
        }

        if (filter) {
            const escapedFilter = escapeRegex(filter);
            queryConditions.push({
                $or: [{ action: { $regex: escapedFilter, $options: 'i' } }],
            });
        }

        if (queryConditions.length > 0) {
            searchCriteria = { $and: queryConditions };
        }

        const logs = await Log.find(searchCriteria);

        const activityStrings = logs.map((log) => {
            const { name, action, reference, timestamp } = log;

            let referenceString = reference;
            if (typeof reference === 'object') {
                referenceString = JSON.stringify(reference)
                    .replace(/\\\"/g, '')      // Remove escaped double quotes
                    .replace(/{|}/g, '')       // Remove curly braces
                    .replace(/\"/g, '')        // Remove remaining double quotes
                    .trim();                   // Trim any extra spaces
            }

            // Format the timestamp to MM/DD/YYYY
            const date = new Date(timestamp);
            const month = date.getMonth() + 1; // getMonth() returns a zero-indexed value, so we add 1
            const day = date.getDate();
            const year = date.getFullYear();

            const formattedDate = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;

            // Return the formatted string
            return `${name} ${action} ${referenceString} on ${formattedDate}`;
        });

        return res.status(200).json({ logs: activityStrings });
    } catch (err) {
        console.error('Error retrieving log:', err);
        return res.status(500).json({
            message: 'Error in retrieving log',
            error: err.message,
        });
    }
};

exports.items_search_item = async (req, res) => {
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
                { name: { $regex: escapedQuery, $options: 'i' } },
                { category: { $regex: escapedQuery, $options: 'i' } },
                { location: { $regex: escapedQuery, $options: 'i' } },
                { description: { $regex: escapedQuery, $options: 'i' } },
                { loggedBy: { $regex: escapedQuery, $options: 'i' } }
            );

            queryConditions.push({ $or: orConditions });
        }

        if (filter) {
            const escapedFilter = escapeRegex(filter);
            queryConditions.push({
                $or: [
                    { controlNumber: { $regex: escapedFilter, $options: 'i' } },
                    { name: { $regex: escapedFilter, $options: 'i' } },
                    { category: { $regex: escapedFilter, $options: 'i' } },
                    { location: { $regex: escapedFilter, $options: 'i' } },
                    { description: { $regex: escapedFilter, $options: 'i' } },
                    { loggedBy: { $regex: escapedFilter, $options: 'i' } },
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

        const items = await Item.find(searchCriteria);

        return res.status(200).json(items);
    } catch (err) {
        return res.status(500).json({
            message: 'Error while searching items',
            error: err,
        });
    }
};

exports.logs_get_log = (req, res, next) => {
    Log.find()
        .exec()
        .then(doc => {
            const response = {
                count: doc.length,
                logs: doc
            }
            return res.status(200).json(response);
        })
        .catch(err => {
            return res.status(500).json({
                message: "Error in retrieving logs",
                error: err
            })
        })
};

exports.items_create_item = async (req, res, next) => {
    try {
        const userId = req.userData.userId;
        const itemId = new mongoose.Types.ObjectId();
        const item = new Item({
            _id: itemId,
            controlNumber: req.body.controlNumber,
            name: req.body.name,
            category: req.body.category,
            location: req.body.location,
            description: req.body.description,
            loggedBy: req.body.loggedBy,
        });
        await performLog(userId, 'create', itemId, 'item', res)

        const updatedItem = await item.save();

        return res.status(201).json({
            message: "Item successfully registered",
            createdItem: updatedItem
        });

    } catch (err) {
        return res.status(500).json({
            message: "Error in creating item",
            error: err
        });
    }
};

exports.items_update_item = async (req, res, next) => {
    const userId = req.userData.userId;
    const id = req.params.id;
    const updateFields = req.body;
    await performLog(userId, 'update', id, 'item', res)
    performUpdate(id, updateFields, res);
};




