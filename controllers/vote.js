const Vote = require('../schemas/vote');
const { io } = require('../services/sockets');

class VoteController {
    static async createVote(req, res, next) {
        try {
            let vote = new Vote(req.body);
            await vote.save();
            res.send(vote);
        } catch (err) {
            next(err);
        }
    }
};

module.exports = VoteController;