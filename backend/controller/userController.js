import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import generateTokenAndSetCookie from "../utils/helpers/generateTokenAndSetCookie.js";

const signupUser = async (req, res) => {
    try {
        const { name, email, username, password } = req.body;
        const user = await User.findOne({ $or: [{ email, username }] })

        if (user) {
            return res.status(400).json({ message: "User already exists!" })
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = new User({
            name,
            email,
            username,
            password: hashedPassword
        })

        await newUser.save();

        if (newUser) {
            generateTokenAndSetCookie(newUser._id, res)
            res.status(201).json({
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                username: newUser.username,
            })
        } else {
            res.status(400).json({ message: "Invalid user data" })
        }

    } catch (error) {
        res.status(500).json({ message: error.message })
        console.log("Error in signupUser: ", error)
    }
}

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username })

        const isPasswordCorrect = await bcrypt.compare(password, user?.password);

        if (!user || !isPasswordCorrect) res.status(400).json({ message: "Invalid username or password" })

        generateTokenAndSetCookie(user._id, res);

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            password: user.password
        });

    } catch (error) {
        res.status(500).json({ message: error.message })
        console.log("Error in loginUser: ", error)
    }
}

const logoutUser = (req, res) => {
    try {
        res.cookie("jwt", "", { maxAge: 1 })
        res.status(200).json({ message: "User logged out succesfully" })
    } catch {
        res.status(500).json({ message: error.message })
        console.log("Error in logoutUser: ", error)
    }
}

const followUnfollowUser = async (req, res) => {
    try {
        const { id } = req.params
        const userToModify = await User.findById(id)
        const currentUser = await User.findById(req.user._id)

        if (id === req.user._id.toString()) return res.status(400).json({ message: "You cannot follow/unfollow yourself" })

        if (!userToModify || !currentUser) return res.status(400).json({ message: "User not found" });

        const isFollowing = currentUser.following.includes(id)

        if (isFollowing) {
            // unfollow
            // modify following of currentUser and followers of userToModify 
            await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } })
            await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } })
            res.status(200).json({ message: "User unfollowed succesfully" })
        } else {
            // follow
            await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } })
            await User.findByIdAndUpdate(req.user._id, { $push: { following: id } })
            res.status(200).json({ message: "User followed succesfully" })
        }

    } catch (error) {
        res.status(500).json({ message: error.message })
        console.log("Error in followUnfollowUser: ", error)
    }
}

const updateUser = async (req, res) => {
    const { username, name, email, password, profilePic, bio } = req.body;
    const userId = req.user._id;
    try {
        let user = await User.findById(userId)
        if (!user) return res.status(500).json({ message: "User not found" })

        if (req.params.id !== userId.toString()) return res.status(500).json({ message: "You cannot update other user's profile" })

        if (password) {
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password, salt)
            user.password = hashedPassword
        }

        user.name = name || user.name
        user.email = email || user.email
        user.username = username || user.username
        user.profilePic = profilePic || user.profilePic
        user.bio = bio || user.bio

        user = await user.save();

        res.status(200).json({message: "Profile updated succesfully", user})


    } catch (error) {
        res.status(500).json({ message: error.message })
        console.log("Error in updateUser: ", error)
    }
}

const getUserProfile = async (req, res) => {
    const {username} = req.params;
    try {
        const user = await User.findOne({username}).select("-password").select("-updatedAt")
        if(!user) return res.status(400).json({message: "User not found"})

        res.status(200).json(user)

    } catch (error) {
        res.status(500).json({message: error.message})
        console.log("Error in getUserProfile: ", error)
    }
}

export { signupUser, loginUser, logoutUser, followUnfollowUser, updateUser, getUserProfile }