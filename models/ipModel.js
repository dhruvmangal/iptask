const mongoose =  require('mongoose');

const IPSchema = new mongoose.Schema({
    ipAddress : {
        type : String,
        required : true
    },
    user : {
        type : String,
        required : true
    }
},{
    timestamps: true
})

module.exports = mongoose.model('IP',IPSchema );