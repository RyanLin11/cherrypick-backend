var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import mongoose from "mongoose";
import { Server } from "socket.io";
import Election from '../models/election.js';
import Vote from '../models/vote.js';
import User from "../models/user.js";
;
;
;
;
;
const io = new Server();
const api = { io };
function getWinner(votes) {
    const optionToVoteCount = votes.reduce((map, vote) => {
        var _a;
        map.set(vote.option, (_a = map.get(vote.option)) !== null && _a !== void 0 ? _a : 0 + 1);
        return map;
    }, new Map());
    return [...optionToVoteCount.entries()].reduce((a, e) => e[1] > a[1] ? e : a)[0];
}
function getNumVoters(electionId) {
    var _a, _b;
    return (_b = (_a = io.sockets.adapter.rooms.get(electionId.toString())) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0;
}
io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
    let user = new User({ sid: socket.id });
    yield user.save();
    socket.on('set-name', ({ name }) => __awaiter(void 0, void 0, void 0, function* () {
        user.name = name;
        yield user.save();
    }));
    socket.on('join-group', ({ code }) => __awaiter(void 0, void 0, void 0, function* () {
        let election = yield Election.findOne({ code });
        if (election) {
            socket.join(election._id.toString());
            socket.emit("joined", {
                id: election._id,
                code: code,
            });
        }
        else {
            socket.emit("error", { message: "room does not exist" });
        }
    }));
    socket.on('create-group', ({ code }) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const update = {
            $setOnInsert: {
                admin: socket.id,
            }
        };
        const options = {
            rawResult: true,
            upsert: true
        };
        const result = yield Election.findByIdAndUpdate(code, update, options);
        if (!result || ((_a = result === null || result === void 0 ? void 0 : result.lastErrorObject) === null || _a === void 0 ? void 0 : _a.updatedExisting)) {
            socket.emit("error", { message: "room code already in use" });
        }
        else {
            const election = result.value;
            socket.join(election._id);
            socket.emit("group-join-successful");
        }
    }));
    socket.on('vote', ({ electionId, option }) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            let election = yield Election.findById(electionId).populate('votes');
            if (election) {
                let vote = election.votes.find(vote => vote.voter === user._id);
                if (vote) {
                    yield Vote.findByIdAndUpdate(vote._id, { option });
                }
                else {
                    let vote = new Vote({ voter: user._id, option });
                    yield vote.save();
                    election = yield Election.findByIdAndUpdate(election._id, { $push: { votes: vote._id } });
                }
                if (getNumVoters(electionId) === (election === null || election === void 0 ? void 0 : election.votes.length)) {
                    const winner = getWinner(election.votes);
                    election.options.shift();
                    election.options.shift();
                    election.options.push(winner);
                    yield election.save();
                    socket.emit('update', {
                        id: election._id,
                        options: election.options
                    });
                }
            }
            else {
                throw new Error(`Election ${electionId} does not exist`);
            }
        }
        catch (e) {
            socket.emit('error', e);
        }
    }));
    socket.on('disconnecting', () => __awaiter(void 0, void 0, void 0, function* () {
        yield Promise.all([...socket.rooms].map((room) => __awaiter(void 0, void 0, void 0, function* () {
            const election = yield Election.findOne({ code: room });
            if (election) {
                // remove all votes related to this person
                // delete election if that was the last person
                if (getNumVoters(new mongoose.Types.ObjectId(room)) === 1) {
                    yield Election.findByIdAndDelete(election._id);
                }
            }
        })));
    }));
}));
export default api;
