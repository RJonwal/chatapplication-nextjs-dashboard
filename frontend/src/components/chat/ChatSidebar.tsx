"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAuthToken, setUser, viewProfile } from "@/store/slices/authSlice";
import { chatSidebarThunk, clearUnread, fetchChatHistoryThunk, fetchNotificationThunk, markMessagesAsReadThunk, setSelectedUser } from "@/store/slices/messageSlice";
import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";


const ChatSidebar = () => {
  const hostName = process.env.NEXT_PUBLIC_SITE_URL!
  const imageUrl = process.env.NEXT_PUBLIC_IMAGE_URL!
  const { data: session } = useSession();
  const dispatch = useAppDispatch();
  const { users, unreadCounts, selectedUser, onlineUsers } = useAppSelector((state) => state.messages);
  const { token } = useAppSelector((state) => state.auth);
  const [searchTerm, setSearchTerm] = useState<string>("");
  console.log(users, "usersssss");
    const receivedNotificationUserId = localStorage.getItem("userId");

  useEffect(() => {
    dispatch(chatSidebarThunk());
    dispatch(viewProfile());
  }, [dispatch]);

  useEffect(() => {
    const tokenFromStorage = localStorage.getItem("token");
    if (tokenFromStorage && !token) {
      dispatch(setAuthToken(tokenFromStorage));
      dispatch(viewProfile());
      dispatch(chatSidebarThunk());
    }
  }, [dispatch, token]);

  useEffect(() => {
    const handleSocialLogin = async () => {
      if (!session) return;
      const existingToken = localStorage.getItem("token");
      if (existingToken) {
        dispatch(setAuthToken(existingToken));
        return;
      }

      try {
        const { email, name } = session.user as any;
        const provider = (session.user as any).provider;
        const providerId = (session.user as any).id || (session.user as any).sub;

        const res = await fetch(`${hostName}auth/social-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, provider, providerId }),
        });

        if (!res.ok) throw new Error("Social login failed");

        const { token, user } = await res.json();
        console.log(token, "tokennnnnn");

        dispatch(setAuthToken(token));
        dispatch(setUser(user));

        localStorage.setItem("token", token);
        localStorage.setItem("userId", user._id);
        localStorage.setItem("socialLoginDone", "true");

      } catch (err) {
        console.error("Social login error:", err);
      }
    };

    handleSocialLogin();
  }, [session, dispatch]);

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    if (!searchTerm) return users;

    return users.filter((user) =>
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleUserClick = (user: any) => {
    dispatch(setSelectedUser(user));
    dispatch(markMessagesAsReadThunk(user._id));
    dispatch(clearUnread(user._id));
    dispatch(fetchNotificationThunk(receivedNotificationUserId));
  };

  return (
    <div className="w-1/4 text-white border-r flex flex-col dark:bg-gray-900">

      <div className="p-3">
        <input
          type="text"
          placeholder="Search Here..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="
            w-full h-11 rounded-lg border px-4 text-sm
           bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
            dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400
            dark:focus:ring-brand-500 dark:focus:border-brand-500
           "
        />
      </div>

      <div className="overflow-y-auto flex-1">
        {filteredUsers.map((user) => {
          // console.log(user,"user11111");
          // const unread = user._id === selectedUser?._id ? 0 : unreadCounts[user._id] || 0;
          const unread = user._id === selectedUser?._id? 0 : unreadCounts[user._id] !== undefined? unreadCounts[user._id]: user.unreadCount || 0;
          // console.log(unread,"unread");
          return (
            <div
              key={user._id}
              className={`p-3 cursor-pointer flex items-center gap-3 transition-colors duration-200 ${selectedUser?._id === user._id ? "bg-blue-100 dark:bg-blue-900" : ""}`}
              onClick={() => handleUserClick(user)}
            >
              <div className="relative w-10 h-10 flex-shrink-0">
                <img
                  src={
                    user?.image
                      ? `${imageUrl}uploads/${user.image}`
                      : "/images/user/owner.jpg"
                  }
                  alt="profile"
                  className="w-10 h-10 rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-500">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-sm text-gray-500">
                  {user.lastMessage ? (
                    user.lastMessage.attachment ? (
                      user.lastMessage.attachment.name
                    ) : (
                      user.lastMessage.content.length > 25
                        ? `${user.lastMessage.content.slice(0, 25)}...`
                        : user.lastMessage.content
                    )
                  ) : null}
                </p>
              </div>

              {unread > 0 ? (
                <span className="bg-blue-500 text-white rounded-full px-2 text-xs">
                  {unread}
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatSidebar;
