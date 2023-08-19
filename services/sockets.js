const { Server } = require('socket.io');
const Election = require("../schemas/election");
const Vote = require('../schemas/vote');

const io = new Server();
const api = { io };

function determineWinner(votes) {
    let tally = {};
    for (let vote of votes) {
        tally[vote.option]++;
    }
    let max = 0;
    let winner = "";
    tally.foreach((value, key) => {
        if (value > max) {
            max = value;
            winner = key;
        }
    });
    return winner;
}

async function everyoneVoted(electionId) {
    let all_votes = await Vote.find({ election: electionId });
    let room = io.sockets.adapter.rooms.get(electionId);
    return room != undefined && all_votes.length === room.size;
}

async function endRound(socket, electionId) {
    let all_votes = await Vote.find({ election: electionId });
    let winner = determineWinner(all_votes);
    let election = await Election.findById(electionId);
    election.options.shift();
    election.options.shift();
    election.options.push(winner);
    election.options.save();
    socket.emit("results", { results: election.options });
}

io.on('connection', async (socket) => {
    socket.on('join-group', async ({ code }) => {
        let election = await Election.findOne({ code });
        if (election) {
            socket.join(election._id);
        } else {
            socket.emit("error", { message: "room does not exist" });
        }
    });
    socket.on('create-group', async ({ code, restaurants }) => {
        let election = await Election.findOne({ code });
        if (election == null) {
            election = new Election({ code, admin: socket.id, options: restaurants });
            await election.save();
            socket.join(election._id);
        } else {
            socket.emit("error", { message: "room code already in use" });
        }
    });
    socket.on('vote', async ({ electionId, option }) => {
        let filter = { election: electionId, voter: socket.id };
        let update = { option };
        let options = { upsert: true };
        await Vote.findOneAndUpdate(filter, update, options);
        let roundEnded = await everyoneVoted(socket, electionId);
        if (roundEnded) {
            await endRound(socket, electionId);
        }
    });
    socket.on('disconnecting', async () => {
        console.log('disconnecting');
        console.log(socket.rooms.size);
        for (let electionId in socket.rooms) {
            console.log(io.sockets.adapter.rooms.get(electionId)?.size);
            if (io.sockets.adapter.rooms.get(electionId)?.size === 1) {
                console.log(io.sockets.adapter.rooms.get(electionId).size);
                await Election.findByIdAndDelete(electionId);
            }
        }
        await Vote.deleteMany({ voter: socket.id });
    });
    socket.on('disconnect', async () => {
        let elections = await Election.find({});
        console.log(elections);
        for (let election in elections) {
            let everyoneVotes = await everyoneVoted(election._id);
            if (everyoneVotes) {
                await endRound(socket, election._id);
            }
        }
    });
});

module.exports = api;