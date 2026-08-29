const mongoose = require("mongoose")

const ConnectedDB=async()=>{
    try{
        const conn= await mongoose.connect(process.env.MONGO_URI);
console.log("Connected DB:", mongoose.connection.name);    }catch(error){
        console.error("database connection failed")
        console.error(error.message);
        process.exit(1);
    }
}
module.exports=ConnectedDB