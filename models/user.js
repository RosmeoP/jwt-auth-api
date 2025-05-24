import mongoose from 'mongoose'
const {schema} = mongoose


const userSchema = new  mongoose.Schema({
    email: {
        String,
        required: true,
        unique: true,

    },
    password: {
        String,
        required: true,
        unique: true,
    },
})

const User = mongoose.model('User', userSchema)
export default User