var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { isValidObjectId } from "mongoose";
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
        try {
            user.name = name;
            yield user.save();
            socket.emit("set-name-success");
        }
        catch (e) {
            socket.emit("error", e);
        }
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
        try {
            let election = yield Election.findOne({ code });
            if (election) {
                socket.emit("error", { message: "room code already in use" });
            }
            else {
                let options = ['option1', 'option2', 'option3', 'option4', 'option5', 'option6', 'option7', 'option8'];
                election = new Election({ code, admin: user._id, options });
                yield election.save();
                socket.emit("group-create-success", election);
            }
        }
        catch (e) {
            socket.emit("error", e);
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
                    yield Election.findByIdAndUpdate(election._id, { $push: { votes: vote._id } });
                }
                election = yield Election.findById(electionId).populate('votes');
                if (getNumVoters(electionId) === (election === null || election === void 0 ? void 0 : election.votes.length)) {
                    if (election) {
                        yield Vote.deleteMany({ '_id': {
                                $in: [election.votes.map(vote => vote._id)]
                            } });
                        const winner = getWinner(election.votes);
                        election.options.shift();
                        election.options.shift();
                        election.options.push(winner);
                        election.votes = [];
                        yield election.save();
                        socket.emit('update', {
                            id: election._id,
                            options: election.options
                        });
                    }
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
        let rooms = [...socket.rooms];
        let roomToSize = new Map();
        rooms.forEach(room => {
            var _a, _b;
            roomToSize.set(room, (_b = (_a = io.sockets.adapter.rooms.get(room)) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0);
        });
        const votes = yield Vote.find({ voter: user._id });
        yield Vote.deleteMany({ voter: user._id });
        yield Promise.all(rooms.map((room) => __awaiter(void 0, void 0, void 0, function* () {
            if (isValidObjectId(room)) {
                const election = yield Election.findById(room);
                if (election) {
                    // remove all votes related to this person
                    election.votes = election.votes.filter(vote => !votes.find(v => v._id === vote));
                    yield election.save();
                    // delete election if that was the last person
                    if (roomToSize.get(room) === 1) {
                        yield Election.findByIdAndDelete(election._id);
                    }
                }
            }
        })));
        yield User.findByIdAndDelete(user._id);
    }));
}));
export default api;
