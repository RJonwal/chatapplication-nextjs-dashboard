import bcrypt from "bcrypt";
import { generateToken } from "../lib/utils.js"
import User from "../models/user.model.js";
import fs from 'fs';
import path from 'path';

export const signup = async (req, res) => {
    // console.log("Received body:", req.body); 
    const { firstName, lastName, company, email, password } = req.body;
    try {
        if (!firstName || !lastName || !company || !email || !password ) {
            return res.status(400).json({ message: "All fields are required", success: false })
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 character", success: false })
        }

        const user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "Email is already exist", success: false })

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt)

        const newUser = new User({
            firstName,
            lastName,
            company,
            email,
            password: hashPassword
        })

        if (newUser) {
            // generateToken(newUser._id, res);
            await newUser.save();

            res.status(201).json({
                // _id: newUser._id,
                // firstName: newUser.firstName,
                // lastName: newUser.lastName,
                // company: newUser.company,
                // email: newUser.email,
                message: "Registration successfully",
                success: true
            })

        } else {
            res.status(400).json({ message: "Invalid user data", success: false })
        }

    } catch (error) {
        console.log("error in signup controller", error.message);
        res.status(500).json({ message: "Internal server error", success: false })
    }
}

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required", success: false })
        }
        const user = await User.findOne({ email });

        if (!user) {
            res.status(400).json({ message: "Invaild Credentials", success: false })
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            res.status(400).json({ message: "Invaild Credentials", success: false })
        }
        const jwtToken = generateToken(user._id, res);

        res.status(200).json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            company: user.company,
            // email: user.email,
            message: "Login successfully",
            success: true,
            jwtToken,
            // name: user.firstName ,
        })

    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ message: "Internal server error", success: false })

    }
}

export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user)
    } catch (error) {
        console.log("Error in CheckAuth contoller", error.message);
        res.status(500).json({ message: "Internal server error" })

    }
}

export const logout = (req, res) => {
        try {
            res.cookie("jwt", "", { maxAge: 0 });
            res.status(200).json({ message: "Loggout successfully" })
        } catch (error) {
            console.log("Error in Logout contoller", error.message);
            res.status(500).json({ message: "Internal server error" })

        }
    }


export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { firstName, lastName, company, password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "User not found", success: false });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (company) user.company = company;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    if (req.file) {
      const allowedTypes = [".jpg", ".jpeg", ".png"];
      const ext = path.extname(req.file.originalname).toLowerCase();

      if (!allowedTypes.includes(ext)) {
        fs.unlinkSync(req.file.path);
        return res
          .status(400)
          .json({ message: "Only JPG, JPEG, and PNG images are allowed", success: false });
      }

      if (req.file.size > 1 * 1024 * 1024) {
        fs.unlinkSync(req.file.path);
        return res
          .status(400)
          .json({ message: "Image must not be larger than 1MB", success: false });
      }

      // Remove old image
      if (user.image && fs.existsSync(`uploads/${user.image}`)) {
        fs.unlinkSync(`uploads/${user.image}`);
      }

      user.image = req.file.filename;
    }

    await user.save();

    return res
      .status(200)
      .json({ message: "Profile updated successfully", success: true });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

export const viewProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    return res.status(200).json({
      success: true,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        company: user.company || null,
        image: user.image || null,
        email: user.email || null,
    });
  } catch (error) {
    console.error("Error fetching profile:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};


export const removeProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    if (user.image) {
      const imagePath = path.join("uploads", user.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      user.image = null;
      await user.save();
    }

    return res.status(200).json({ message: "Profile image removed successfully", success: true });
  } catch (error) {
    console.error("Error removing profile image:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};


export const socialLogin = async (req, res) => {
  try {
    const { email, name, provider } = req.body;

    if (!email || !provider ) {
      return res.status(400).json({
        message: "Email, provider, and providerId are required",
        success: false,
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        firstName: name?.split(" ")[0] || "",
        lastName: name?.split(" ")[1] || "",
        provider,
        providerId,
      });
    }

    const token = generateToken(user._id, res);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        provider: user.provider,
      },
    });
  } catch (err) {
    console.error("Error in socialLogin controller:", err.message);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    console.log(userId, "target userId");

    if (myId.toString() === userId) {
      return res.status(400).json({ error: "You cannot block yourself" });
    }

    const me = await User.findById(myId);
    if (!me) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log(me, "me");

    const alreadyBlocked = me.blockedUsers?.some(
      (id) => id.toString() === userId
    );
    console.log(alreadyBlocked, "alreadyBlocked");

    let message;
    if (alreadyBlocked) {
      await User.findByIdAndUpdate(myId, { $pull: { blockedUsers: userId } });
      message = "User unblocked successfully";
    } else {
      await User.findByIdAndUpdate(myId, { $addToSet: { blockedUsers: userId } });
      message = "User blocked successfully";
    }
    console.log(message, "message");

    res.status(200).json({ success: true, message });
  } catch (error) {
    console.error("Error in blockUser:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
