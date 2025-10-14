"use client";
import { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { connectSocket, getSocket, disconnectSocket } from "../../lib/socket";
import { addMessage, clearUnread, fetchChatHistoryThunk, markMessagesAsReadThunk, moveUserToTop, sendMessageThunk, setOnlineUsers, setUnreadCounts } from "@/store/slices/messageSlice";
import ChatSidebar from "./ChatSidebar";
import Image from "next/image";

const ChatMessages = () => {
  const dispatch = useAppDispatch();
  const hostName = process.env.NEXT_PUBLIC_IMAGE_URL!
  const { profile } = useAppSelector((state) => state.auth);
  const { selectedUser, messages, onlineUsers, users } = useAppSelector((state) => state.messages);
  console.log(messages, "messagesssss");

  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      connectSocket(userId);
    }

    const socket = getSocket();
    if (!socket) return;

    socket.on("initialUnreadCounts", (data) => {
      dispatch(setUnreadCounts(data));
    });

    socket.on("newMessage", (msg) => {
      console.log(msg, "newMessage");

      const currentUserId = localStorage.getItem("userId")?.replace(/"/g, "");

      const senderId = msg.sender_id || msg.senderId;
      const receiverId = msg.receiver_id || msg.receiverId;

      if (selectedUser && (senderId === selectedUser._id || receiverId === selectedUser._id)) {
        dispatch(addMessage(msg));
      }
      dispatch(moveUserToTop(senderId === currentUserId ? receiverId : senderId));
      
      if (senderId === currentUserId) return;

      if (selectedUser && senderId === selectedUser._id) {
        dispatch(markMessagesAsReadThunk(senderId));
        dispatch(clearUnread(senderId));
      }
      else {
        dispatch({
          type: "messages/incrementUnread",
          payload: senderId,
        });
      }
    });

    socket.on("getOnlineUsers", (users) => {
      dispatch(setOnlineUsers(users));
    });

    socket.on("unreadCountsUpdate", (data) => {
      dispatch(setUnreadCounts(data));
    });

    socket.on("userTyping", ({ senderId, isTyping }) => {
      if (selectedUser && senderId === selectedUser._id) {
        setIsTyping(isTyping);
      }
    });


    return () => {
      socket?.off("newMessage");
      socket?.off("unreadCountsUpdate");
      socket?.off("getOnlineUsers");
      socket?.off("userTyping");
      socket?.off("messageDeleted");
      disconnectSocket();
    };
  }, [dispatch, selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      dispatch(fetchChatHistoryThunk(selectedUser._id));
    }
  }, [selectedUser, dispatch]);

  const handleSend = () => {
    if (!message.trim() && !attachment) return;
    if (!selectedUser) return;

    const formData = new FormData();
    formData.append("text", message);
    if (attachment) formData.append("attachment", attachment);
    console.log(attachment, "attachment");


    const dateObj = new Date();
    const createdDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;

    const dateLabel = "Today";

    const senderMsg = {
      id: Date.now().toString(),
      sender_id: localStorage.getItem("userId"),
      receiver_id: selectedUser._id,
      content: message,
      // attachment: attachment ? URL.createObjectURL(attachment) : null,
      // attachmentType: attachment?.type || null,
      // attachmentName: attachment?.name || null,
        attachment: attachment
    ? { url: URL.createObjectURL(attachment), type: attachment.type, name: attachment.name }
    : null,
      created_date: createdDate,
      created_time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
      date_time_label: dateLabel,
      is_read: true,
    };
    console.log(senderMsg, "senderMsg");

    dispatch(addMessage(senderMsg));

    dispatch(sendMessageThunk({ receiverId: selectedUser._id, formData }));

    setMessage("");
    setAttachment(null);

    const socket = getSocket();
    if (socket && selectedUser) {
      socket.emit("userTyping", {
        senderId: localStorage.getItem("userId"),
        receiverId: selectedUser._id,
        isTyping: false,
      });
    }
  };

  const handleTyping = (e: any) => {
    setMessage(e.target.value);

    const socket = getSocket();
    if (socket && selectedUser) {
      socket.emit("userTyping", {
        senderId: localStorage.getItem("userId"),
        receiverId: selectedUser._id,
        isTyping: true,
      });

      if (typingTimeout.current) clearTimeout(typingTimeout.current);

      typingTimeout.current = setTimeout(() => {
        socket.emit("userTyping", {
          senderId: localStorage.getItem("userId"),
          receiverId: selectedUser._id,
          isTyping: false,
        });
      }, 2000);
    }
  };


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  console.log(attachment, "attachmentttttt");

  return (
    <div className="flex h-screen bg-gray-100">
      <ChatSidebar />

      <div className="flex flex-col flex-1">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center h-full text-center
              w-full h-11 rounded-lg border px-4 text-sm
              bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
              dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400
              dark:focus:ring-brand-500 dark:focus:border-brand-500
            ">
            <h2 className="text-2xl font-bold">Welcome to Chatty!</h2>
            <p className="text-base-content/60">
              Select a conversation from the sidebar to start chatting
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-2  w-full h-11 rounded-lg border px-4 text-sm
               bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400
               focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
               dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400
               dark:focus:ring-brand-500 dark:focus:border-brand-500
               ">
              <Image
                width={44}
                height={44}
                src={
                  selectedUser?.image
                    ? `${hostName}uploads/${selectedUser.image}`
                    : "/images/user/owner.jpg"
                }
                alt={`${selectedUser?.firstName}`}
                className="w-10 h-10 rounded-full"
              />

              <div className="flex-1">
                <h2 className="font-semibold">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h2>
                <p className="text-xs">
                  {isTyping ? (
                    <span className="italic text-gray-500">Typing...</span>
                  ) : onlineUsers.includes(selectedUser._id) ? (
                    <span className="text-green-500">● Online</span>
                  ) : (
                    <span className="text-gray-400">● Offline</span>
                  )}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto  w-full h-11 rounded-lg border px-4 text-sm
              bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
              dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400
              dark:focus:ring-brand-500 dark:focus:border-brand-500
              ">
              {Object.entries(messages?.messages || {}).map(([dateLabel, msgs]) => {
                return (
                  <div key={dateLabel}>
                    <div className="text-center my-2 text-gray-500 text-sm font-medium">
                      {dateLabel}
                    </div>

                    {msgs.map((msg: any) => {
                      const currentUserId = localStorage.getItem("userId")?.replace(/"/g, "");
                      const isMyMessage = msg.sender_id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMyMessage ? "justify-end" : "justify-start"} mb-2`}
                        >
                          <div className="relative group bg-blue-100 p-3 rounded-lg max-w-sm dark:bg-gray-900 border border-gray-300">
                            <p>{msg.content}</p>
                            {/* Attachment preview */}
                            {msg.attachment && (
                              <>
                                {/* Image */}
                                <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer">
                                {msg.attachment.type?.startsWith("image/") && (
                                  <img
                                    src={msg.attachment.url}
                                     alt={msg.attachment.name}
                                    className="w-full h-30 object-cover rounded-md mb-1"
                                  />
                                )}
                                </a>

                                {/* Video */}
                                {msg.attachment.type?.startsWith("video/") && (
                                  <video
                                      src={msg.attachment.url}
                                    //  alt={msg.attachment.name}
                                    controls
                                    className="w-full h-30 rounded-md mb-1"
                                  />
                                )}

                                {/* PDF */}
                                {msg.attachment.type?.startsWith("application/pdf") && (
                                  <a
                                    href={msg.attachment.url}
                                    target="_blank"
                                    className="flex items-center gap-1 text-blue-600 underline mb-1"
                                  >
                                    {/* 📄 {attachment?.name} */}
                                   📄 {msg.attachment.type}
                                  </a>
                                )}

                                {/* Other files */}
                                {!msg.attachment.type?.startsWith("image/") &&
                                  !msg.attachment.type?.startsWith("video/") &&
                                  msg.attachment.type !== "application/pdf" && (
                                    <a
                                      href={msg.attachment.url}
                                      target="_blank"
                                      className="flex items-center gap-1 text-blue-600 underline mb-1"
                                    >
                                      📎 {"file.pdf"}
                                    </a>
                                  )}
                              </>
                            )}

                            <span className="text-xs text-gray-500 block mt-1 text-right">
                              {msg.created_time}
                            </span>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t flex items-center gap-2 dark:bg-gray-900">
              <input
                type="file"
                id="attachment"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="attachment"
                className="cursor-pointer p-2 bg-gray-200 rounded-full"
              >
                📎
              </label>

              <input
                value={message}
                onChange={handleTyping}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Write Something..."
                className="flex-1 p-2 rounded-full border bg-gray-50"
              />

              {attachment && (
                <div className="flex items-center gap-2 mt-2">
                  {/* <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1"> */}
                  {/* {attachment.name} */}
                  {attachment.type.startsWith("image/") && (
                    <img
                      src={URL.createObjectURL(attachment)}
                      alt="preview"
                      className="w-20 h-20 object-cover rounded-md border"
                    />
                  )}
                  {/* Video preview */}
                  {attachment.type.startsWith("video/") && (
                    <video
                      src={URL.createObjectURL(attachment)}
                      className="w-32 h-20 rounded-md border"
                      controls
                    />
                  )}

                  {/* PDF or other files */}
                  {attachment.type === "application/pdf" && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md border dark:bg-gray-800 dark:text-white dark:border-gray-600">
                      📄 {attachment.name}
                    </div>
                  )}

                  {/* Fallback for other unknown file types */}
                  {!attachment.type.startsWith("image/") &&
                    !attachment.type.startsWith("video/") &&
                    attachment.type !== "application/pdf" && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md border dark:bg-gray-800 dark:text-white dark:border-gray-600">
                        📎 {attachment.name}
                      </div>
                    )}
                  <button
                    type="button"
                    className="text-red-500 font-bold"
                    onClick={() => setAttachment(null)}
                  >
                    ×
                  </button>
                  {/* </span> */}
                </div>
              )}
              <button
                onClick={handleSend}
                className="p-2 bg-blue-500 text-white rounded-full px-4"
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatMessages;
