import { ModifyResult, isValidObjectId } from "mongoose";
import mongoose from "mongoose";
import { Server, Socket } from "socket.io";
import Election from '../models/election.js';
import Vote from '../models/vote.js';
import User from "../models/user.js";

type ObjectId = mongoose.Types.ObjectId;

interface CreateGroupRequest {
    code: string,
};

interface JoinGroupRequest {
    code: string,
};

interface VoteRequest {
    electionId: ObjectId,
    option: String,
};

interface Vote {
    _id: ObjectId,
    option: string,
    voter: ObjectId,
};

interface Election {
    _id: ObjectId,
    code: string,
    options: Array<string>,
    admin: ObjectId,
    votes: Array<ObjectId>,
};

const io = new Server();
const api = { io };

function getWinner(votes: Vote[]): string {
    const optionToVoteCount = votes.reduce((map, vote) => {
        map.set(vote.option, map.get(vote.option) ?? 0 + 1);
        return map;
    }, new Map<string, number>());
    return [...optionToVoteCount.entries()].reduce((a, e) => e[1] > a[1]? e: a)[0];
}

function getNumVoters(electionId: ObjectId): Number {
    return io.sockets.adapter.rooms.get(electionId.toString())?.size ?? 0;
}

io.on('connection', async (socket: Socket) => {
    let user = new User({ sid: socket.id });
    await user.save();

    socket.on('set-name', async ({ name }) => {
        try {
            user.name = name;
            await user.save();
            socket.emit("set-name-success");
        } catch (e) {
            socket.emit("error", e);
        }
    });

    socket.on('join-group', async ({ code }: JoinGroupRequest) => {
        let election = await Election.findOne({ code });
        if (election) {
            socket.join(election._id.toString());
            socket.emit("joined", {
                id: election._id,
                code: code,
            });
        } else {
            socket.emit("error", { message: "room does not exist" });
        }
    });

    socket.on('create-group', async ({ code }: CreateGroupRequest) => {
        try {
            let election = await Election.findOne({ code });
            if (election) {
                socket.emit("error", { message: "room code already in use" });
            } else {
                let options = ['option1', 'option2', 'option3', 'option4', 'option5', 'option6', 'option7', 'option8'];
                election = new Election({ code, admin: user._id, options });
                await election.save();
                socket.emit("group-create-success", election);
            }
        } catch (e) {
            socket.emit("error", e);
        }
    });

    socket.on('vote', async ({ electionId, option }: VoteRequest) => {
        try {
            let election = await Election.findById(electionId).populate<{ votes: Vote[] }>('votes');
            if (election) {
                let vote = election.votes.find(vote => vote.voter === user._id);
                if (vote) {
                    await Vote.findByIdAndUpdate(
                        vote._id,
                        { option }
                    );
                } else {
                    let vote = new Vote({ voter: user._id, option });
                    await vote.save();
                    await Election.findByIdAndUpdate(
                        election._id,
                        { $push: { votes: vote._id }},
                    );
                }
                election = await Election.findById(electionId).populate<{ votes: Vote[] }>('votes');
                if (getNumVoters(electionId) === election?.votes.length) {
                    if (election) {
                        await Vote.deleteMany({ '_id': {
                            $in: [election.votes.map(vote => vote._id)]
                        }});
                        const winner = getWinner(election.votes);
                        election.options.shift();
                        election.options.shift();
                        election.options.push(winner);
                        election.votes = [];
                        await election.save();
                        socket.emit('update', {
                            id: election._id,
                            options: election.options
                        });
                    }
                }
            } else {
                throw new Error(`Election ${electionId} does not exist`);
            }
        } catch (e) {
            socket.emit('error', e);
        }
    });

    socket.on('disconnecting', async () => {
        let rooms = [...socket.rooms];
        let roomToSize = new Map<string, number>();
        rooms.forEach(room => {
            roomToSize.set(room, io.sockets.adapter.rooms.get(room)?.size ?? 0);
        });
        const votes = await Vote.find({ voter: user._id });
        await Vote.deleteMany({ voter: user._id });
        await Promise.all(rooms.map(async (room) => {
            if (isValidObjectId(room)) {
                const election = await Election.findById(room);
                if (election) {
                    // remove all votes related to this person
                    election.votes = election.votes.filter(vote => !votes.find(v => v._id === vote));
                    await election.save();
                    // delete election if that was the last person
                    if (roomToSize.get(room) === 1) {
                        await Election.findByIdAndDelete(election._id);
                    }
                }
            }
        }));
        await User.findByIdAndDelete(user._id);
    });
});

export default api;