import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
    {
        email:{
            type:String,
            required:true,
            unique:true
        },
        name:{
            type:String,
        },
        firstName:{
            type:String,
        },
         lastName:{
            type:String,
        },
         company:{
            type:String,
        },
        password:{
            type:String,
        },
        blockedUsers: [{ type: mongoose.Schema.Types.ObjectId}],
          image:{
            type:String,
        },
        fcmToken: {type:String},
          provider: { type: String,default: null},
          providerId: { type: String }, 
    },
    { timestamps: true },
) 
const User = mongoose.model("User",userSchema);
export default User;
