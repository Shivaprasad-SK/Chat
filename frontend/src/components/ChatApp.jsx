import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  Send,
  UserPlus,
  Users,
  Settings,
  QrCode,
  Camera,
  Check,
  X,
  Circle,
  Dot,
} from "lucide-react";
import io from "socket.io-client";

const ChatApp1 = () => {
  // State management
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [activeView, setActiveView] = useState("login");
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [friendId, setFriendId] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Auth form states
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const socket = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (token && user) {
      socket.current = io("http://localhost:5000");

      socket.current.emit("user_connected", user.id);

      socket.current.on("receive_message", (message) => {
        if (
          activeChat &&
          (message.sender._id === activeChat._id ||
            message.receiver._id === activeChat._id)
        ) {
          setMessages((prev) => [...prev, message]);
        }
        loadConversations();
      });

      socket.current.on("message_sent", (message) => {
        setMessages((prev) => [...prev, message]);
        loadConversations();
      });

      socket.current.on("user_typing", ({ isTyping, senderName }) => {
        setIsTyping(isTyping);
        setTypingUser(senderName);
      });

      socket.current.on(
        "friend_online",
        ({
          userId,
          //    username
        }) => {
          setFriends((prev) =>
            prev.map((friend) =>
              friend._id === userId ? { ...friend, isOnline: true } : friend
            )
          );
        }
      );

      socket.current.on(
        "friend_offline",
        ({
          userId,
          // , username
        }) => {
          setFriends((prev) =>
            prev.map((friend) =>
              friend._id === userId ? { ...friend, isOnline: false } : friend
            )
          );
        }
      );

      return () => {
        socket.current?.disconnect();
      };
    }
  }, [token, user, activeChat]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load user data on token change
  useEffect(() => {
    if (token) {
      loadUserData();
    }
  }, [token]);

  const loadUserData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setFriends(data.friends);
      setFriendRequests(data.friendRequests);
      loadConversations();
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log("Conversations loaded line no 140:", conversations);
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };
  const hasUnreadMessages = (friendId) => {
    const conversation = conversations.find(
      (conv) =>
        conv &&
        Array.isArray(conv.participants) &&
        conv.participants.some((p) => String(p._id || p) === String(friendId))
    );
    return conversation && conversation.unreadCount > 0;
  };
  const loadMessages = async (friendId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/messages/${friendId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("token", data.token);
        setActiveView("chat");
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Login failed");
      console.error("Login error:", error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("token", data.token);
        setActiveView("chat");
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Registration failed");
      console.error("Registration error:", error);
    }
  };

  const sendFriendRequest = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/send-friend-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ uniqueId: friendId }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        alert("Friend request sent successfully!");
        setFriendId("");
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Failed to send friend request");
      console.error("Error sending friend request:", error);
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/accept-friend-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ requestId }),
        }
      );

      if (response.ok) {
        loadUserData();
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && activeChat && socket.current) {
      socket.current.emit("send_message", {
        senderId: user.id,
        receiverId: activeChat._id,
        content: newMessage,
        messageType: "text",
      });
      setNewMessage("");
    }
  };

  const handleTyping = () => {
    if (activeChat && socket.current) {
      socket.current.emit("typing", {
        receiverId: activeChat._id,
        isTyping: true,
        senderName: user.username,
      });

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.current.emit("typing", {
          receiverId: activeChat._id,
          isTyping: false,
          senderName: user.username,
        });
      }, 1000);
    }
  };

  const selectChat = (friend) => {
    setActiveChat(friend);
    loadMessages(friend._id);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setActiveView("login");
    socket.current?.disconnect();
  };

  // Login/Register Forms
  if (activeView === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <MessageCircle className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">ChatApp</h1>
            <p className="text-gray-600">Connect with friends securely</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, email: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Login
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setActiveView("register")}
              className="text-blue-600 hover:underline"
            >
              Don't have an account? Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === "register") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <MessageCircle className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-600">Join ChatApp today</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={registerForm.username}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, username: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, email: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, password: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Register
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setActiveView("login")}
              className="text-blue-600 hover:underline"
            >
              Already have an account? Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.username[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {user?.username}
                </h2>
                <p className="text-sm text-gray-500">ID: {user?.uniqueId}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>

          {/* Add Friend */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter friend ID"
              value={friendId}
              onChange={(e) => setFriendId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={sendFriendRequest}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setQrModalOpen(true)}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
            >
              <QrCode className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">
              Friend Requests
            </h3>
            {friendRequests.map((request) => (
              <div
                key={request._id}
                className="flex items-center justify-between mb-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
                    {request.from.username[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700">
                    {request.from.username}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => acceptFriendRequest(request._id)}
                    className="bg-green-600 text-white p-1 rounded hover:bg-green-700"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button className="bg-red-600 text-white p-1 rounded hover:bg-red-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Friends ({friends.length})
            </h3>
            {friends.map((friend) => (
              <div
                key={friend._id}
                onClick={() => selectChat(friend)}
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition ${
                  activeChat?._id === friend._id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                    {friend.username[0].toUpperCase()}
                  </div>
                  {friend.isOnline ? (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  ) : (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white"></div>
                  )}
                  {hasUnreadMessages(friend._id) && (
                    <span className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {friend.username}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {friend.isOnline
                      ? "Online"
                      : `Last seen ${new Date(
                          friend.lastSeen
                        ).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                    {activeChat.username[0].toUpperCase()}
                  </div>
                  {activeChat.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {activeChat.username}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {activeChat.isOnline
                      ? "Online"
                      : `Last seen ${new Date(
                          activeChat.lastSeen
                        ).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${
                    message.sender?._id === user?.id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender._id === user.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender._id === user.id
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <Dot className="h-2 w-2 animate-bounce" />
                      <Dot
                        className="h-2 w-2 animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <Dot
                        className="h-2 w-2 animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                    <span className="text-xs">{typingUser} is typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No Chat Selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select a friend to start chatting
              </h3>
              <p className="text-gray-500">
                Choose a friend from the sidebar to begin your conversation
              </p>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Your QR Code
              </h3>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                {user?.qrCode ? (
                  <img src={user.qrCode} alt="QR Code" className="mx-auto" />
                ) : (
                  <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                    <QrCode className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Share this QR code with friends
              </p>
              <p className="text-lg font-mono bg-gray-100 px-3 py-2 rounded">
                {user?.uniqueId}
              </p>
              <button
                onClick={() => setQrModalOpen(false)}
                className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatApp1;
