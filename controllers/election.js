const Election = require('../schemas/election');

const { io } = require('../utils/socketApi');

class ElectionController {
    // will be queried for code
    static async getElections(req, res, next) {
        try {
            let query = {};
            if (req.query.code) {
                query = { code: req.query.code };
            }
            let elections = await Election.find(query);
            res.send(elections);
        } catch (err) {
            next(err);
        }
    }
    // when create room is pressed
    static async createElection(req, res, next) {
        try {
            let election = new Election(req.body);
            await election.save();
            res.send(election);
        } catch (err) {
            next(err);
        }
    }
    // will have status update
    static async editElection(req, res, next) {
        try {
            await Election.findByIdAndUpdate(req.params.id, req.body);
            res.sendStatus(200);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = ElectionController;