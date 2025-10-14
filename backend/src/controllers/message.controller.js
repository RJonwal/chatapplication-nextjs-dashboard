import mongoose from "mongoose";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select(
      "-password"
    );

    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        })
          .sort({ createdAt: -1 })
          .lean();

          const unreadCount = await Message.countDocuments({
          senderId: user._id,
          receiverId: loggedInUserId,
          isRead: false,
        });

        let formattedMessage = null;
        if (lastMessage) {
          const dateObj = new Date(lastMessage.createdAt);
          formattedMessage = {
            content: lastMessage.text || "",
            attachment: lastMessage.attachment || null,
            created_time: dateObj.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Kolkata",
            }),
            created_date: dateObj.toLocaleDateString("en-GB"),
          };
        }

        return {
          ...user.toObject(),
          lastMessage: formattedMessage,
          unreadCount
        };
      })
    );

    res.status(200).json(usersWithLastMessage);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    const today = new Date();
    const groupedMessages = {};

    messages.forEach((msg) => {
      const dateObj = new Date(msg.createdAt);
      const createdDate = `${String(dateObj.getDate()).padStart(
        2,
        "0"
      )}-${String(dateObj.getMonth() + 1).padStart(
        2,
        "0"
      )}-${dateObj.getFullYear()}`;

      // Calculate difference in days using UTC to avoid timezone issues
      const todayUTC = new Date();
      const dayDiff = Math.floor(
        (Date.UTC(
          todayUTC.getFullYear(),
          todayUTC.getMonth(),
          todayUTC.getDate()
        ) -
          Date.UTC(
            dateObj.getFullYear(),
            dateObj.getMonth(),
            dateObj.getDate()
          )) /
          (1000 * 60 * 60 * 24)
      );

      // Determine date_time_label
      let dateLabel;
      if (dayDiff === 0) {
        dateLabel = "Today";
      } else if (dayDiff === 1) {
        dateLabel = "Yesterday";
      } else if (dayDiff < 7) {
        dateLabel = dateObj.toLocaleDateString("en-US", { weekday: "long" });
      } else {
        dateLabel = createdDate;
      }

      // Initialize array for this label if not exists
      if (!groupedMessages[dateLabel]) groupedMessages[dateLabel] = [];

      // Convert to IST (or your local timezone)
      const createdTime = dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });

      groupedMessages[dateLabel].push({
        id: msg._id,
        sender_id: msg.senderId,
        content: msg.text,
        attachment:msg.attachment || null,
        created_date: createdDate,
        created_time: createdTime,
        is_read: msg.isRead,
        date_time_label: dateLabel,
      });
    });

    res.status(200).json({ messages: groupedMessages });
  } catch (error) {
    console.log("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  const baseurl = process.env.BASE_URL;
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
      const attachment = req.file
      ? {
          url: `${baseurl}/uploads/${req.file.filename}`,
          type: req.file.mimetype,
          name: req.file.originalname,
        }
      : null;
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      attachment,
      isRead: false,
      delivered: false,
    });

    await newMessage.save();

    // Format message for frontend
    const dateObj = new Date(newMessage.createdAt);
    const createdDate = `${String(dateObj.getDate()).padStart(2, "0")}-${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}-${dateObj.getFullYear()}`;

    const today = new Date();
    const dayDiff = Math.floor(
      (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
        Date.UTC(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          dateObj.getDate()
        )) /
        (1000 * 60 * 60 * 24)
    );

    const dateLabel =
      dayDiff === 0
        ? "Today"
        : dayDiff === 1
        ? "Yesterday"
        : dayDiff < 7
        ? dateObj.toLocaleDateString("en-US", { weekday: "long" })
        : createdDate;

    const formattedMessage = {
      id: newMessage._id,
      sender_id: newMessage.senderId,
      receiver_id: newMessage.receiverId,
      content: newMessage.text,
      attachment: newMessage.attachment,
      created_date: createdDate,
      created_time: dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }),
      date_time_label: dateLabel,
      is_read: newMessage.isRead,
    };
    console.log(formattedMessage, "formattedMessage");

    // Send to receiver via socket
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", formattedMessage);
      const unreadCount = await Message.aggregate([
        {
          $match: {
            receiverId: new mongoose.Types.ObjectId(receiverId),
            isRead: false,
          },
        },
        { $group: { _id: "$senderId", count: { $sum: 1 } } },
      ]);
      io.to(receiverSocketId).emit("unreadCountsUpdate", unreadCount);
    }

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    const myId = req.user._id;

    await Message.updateMany(
      { senderId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

    // Recalculate unread counts for sidebar
    const unreadCounts = await Message.aggregate([
      { $match: { receiverId: myId, isRead: false } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);

    const receiverSocketId = getReceiverSocketId(myId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("unreadCountsUpdate", unreadCounts);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in markMessagesAsRead:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
