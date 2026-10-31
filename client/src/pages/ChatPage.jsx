import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Swords,
  Coins,
  Check,
  CheckCheck,
  User,
  Clock,
  Sparkles,
  ImagePlus,
  Mic,
  Video,
  Download,
  X,
  Ban,
  Trash2,
  Unlock,
  Settings
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

export default function ChatPage({ initialTargetUserId, onChallengeDuel }) {
  const { user, refreshUser } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { success: toastSuccess, error: toastError, warning: toastWarning, confirm } = useToast();

  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const [attachmentType, setAttachmentType] = useState('image');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showGroupEditor, setShowGroupEditor] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ username: '', bio: '', avatar: '' });
  const [groupDraft, setGroupDraft] = useState({ name: '', memberIds: [] });
  const isCurrentChatBlocked = Boolean(activeUser && !activeUser.isGroup && user?.blockedUsers?.includes(activeUser._id));

  useEffect(() => () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const fetchConversations = async () => {
    try {
      const [data, groupData] = await Promise.all([api.getConversations(), api.getGroups()]);
      setConversations(data.conversations || []);
      setGroups(groupData.groups || []);
      if (!activeUser && data.conversations?.length > 0) {
        if (initialTargetUserId) {
          const match = data.conversations.find(c => c.user._id === initialTargetUserId);
          if (match) setActiveUser(match.user);
          else setActiveUser(data.conversations[0].user);
        } else {
          setActiveUser(data.conversations[0].user);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user?._id, initialTargetUserId]);

  // Load message thread
  useEffect(() => {
    if (!activeUser) return;
    async function loadThread() {
      try {
        const data = activeUser.isGroup
          ? await api.getGroupMessages(activeUser._id)
          : await api.getMessages(activeUser._id);
        setMessages(data.messages || []);
        if (activeUser.isGroup && socket) socket.emit('join_group_chat', { groupId: activeUser._id });
        scrollToBottom();
        // The server marks incoming messages as read when this thread is opened.
        // Refresh the sidebar so its unread badge disappears immediately.
        fetchConversations();
      } catch (err) {
        console.error(err);
      }
    }
    loadThread();
  }, [activeUser, socket]);

  // Socket real-time message listener
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (activeUser && (msg.sender === activeUser._id || msg.recipient === activeUser._id)) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();

        // Opening the active conversation means the message has been seen.
        if (msg.recipient === user?._id) {
          api.getMessages(activeUser._id)
            .then((data) => setMessages(data.messages || []))
            .catch(console.error);
        }
      }
      fetchConversations();
    };

    const handleTyping = ({ senderId, isTyping: senderIsTyping }) => {
      if (senderId === activeUser?._id) setIsTyping(senderIsTyping);
    };

    const handleGroupMessage = ({ groupId, message }) => {
      if (activeUser?.isGroup && activeUser._id === groupId) {
        setMessages((prev) => [...prev, message]);
        api.getGroupMessages(groupId).then((data) => setMessages(data.messages || [])).catch(console.error);
        scrollToBottom();
      }
      fetchConversations();
    };

    socket.on('receive_chat_message', handleNewMessage);
    socket.on('user_is_typing', handleTyping);
    socket.on('receive_group_message', handleGroupMessage);
    return () => {
      socket.off('receive_chat_message', handleNewMessage);
      socket.off('user_is_typing', handleTyping);
      socket.off('receive_group_message', handleGroupMessage);
    };
  }, [socket, activeUser, user?._id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const sendMessage = async ({ content, type = 'text', metadata = null }) => {
    if (!activeUser) return;
    try {
      const res = activeUser.isGroup
        ? await api.sendGroupMessage(activeUser._id, { content, type, metadata })
        : await api.sendMessage({ recipientId: activeUser._id, content, type, metadata });

      setMessages((prev) => [...prev, res.message]);
      scrollToBottom();
      fetchConversations();

      // Emit live socket event
      if (socket) {
        if (activeUser.isGroup) socket.emit('send_group_message', { groupId: activeUser._id, message: res.message });
        else socket.emit('send_chat_message', res.message);
      }
    } catch (err) {
      toastError(err.message || 'Failed to send message');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const content = inputMessage.trim();
    if (!content || !activeUser) return;

    setInputMessage('');
    if (socket) socket.emit('typing_indicator', { recipientId: activeUser._id, isTyping: false, senderName: user?.username });
    await sendMessage({ content });
  };

  const handleInputChange = (value) => {
    setInputMessage(value);
    if (!socket || !activeUser) return;

    socket.emit('typing_indicator', { recipientId: activeUser._id, isTyping: Boolean(value), senderName: user?.username });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_indicator', { recipientId: activeUser._id, isTyping: false, senderName: user?.username });
    }, 1000);
  };

  const selectAttachment = (type) => {
    setAttachmentType(type);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleAttachmentChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeUser) return;

    const type = attachmentType;
    if (!file.type.startsWith(`${type}/`)) {
      toastWarning(`Please choose a valid ${type} file.`);
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toastWarning('Please choose a file smaller than 4 MB. Attachments are stored locally in this demo app.');
      return;
    }

    const content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    await sendMessage({
      content,
      type,
      metadata: { fileName: file.name, mimeType: file.type, size: file.size }
    });
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toastWarning('Voice recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (audioBlob.size > 4 * 1024 * 1024) {
          toastWarning('Voice message is too large. Please record a shorter message.');
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          setRecordedAudio({
            content: reader.result,
            fileName: `voice-message-${Date.now()}.webm`,
            mimeType: audioBlob.type,
            size: audioBlob.size
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      toastError('Microphone permission is required to record a voice message.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const sendRecordedAudio = async () => {
    if (!recordedAudio) return;
    await sendMessage({
      content: recordedAudio.content,
      type: 'audio',
      metadata: {
        fileName: recordedAudio.fileName,
        mimeType: recordedAudio.mimeType,
        size: recordedAudio.size,
        isVoiceMessage: true
      }
    });
    setRecordedAudio(null);
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) return;
    try {
      const response = await api.createGroup({ name: groupName, memberIds: selectedMembers });
      setActiveUser({ ...response.group, isGroup: true, username: response.group.name, avatar: '' });
      setMessages([]);
      setGroupName('');
      setSelectedMembers([]);
      setShowCreateGroup(false);
      fetchConversations();
    } catch (error) {
      toastError(error.message || 'Failed to create group');
    }
  };

  const handleToggleBlock = async () => {
    if (!activeUser || activeUser.isGroup) return;
    try {
      if (isCurrentChatBlocked) {
        await api.unblockUser(activeUser._id);
        toastSuccess(`Unblocked ${activeUser.username}`);
      } else {
        const ok = await confirm({
          title: `Block ${activeUser.username}`,
          message: `Are you sure you want to block ${activeUser.username}? They will not be able to message you.`,
          confirmText: 'Block User',
          cancelText: 'Cancel',
          type: 'danger'
        });
        if (!ok) return;
        await api.blockUser(activeUser._id);
        toastSuccess(`Blocked ${activeUser.username}`);
      }
      await refreshUser();
    } catch (error) {
      toastError(error.message || 'Failed to update block state');
    }
  };

  const handleClearChat = async () => {
    if (!activeUser || activeUser.isGroup) return;
    const ok = await confirm({
      title: 'Clear Chat History',
      message: `Clear your chat history with ${activeUser.username}? This only clears it for you.`,
      confirmText: 'Clear Chat',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (!ok) return;
    try {
      await api.clearChat(activeUser._id);
      setMessages([]);
      fetchConversations();
      toastSuccess('Chat history cleared');
    } catch (error) {
      toastError(error.message || 'Failed to clear chat');
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      await api.updateProfile(profileDraft);
      await refreshUser();
      setShowProfileEditor(false);
      toastSuccess('Profile updated');
    } catch (error) {
      toastError(error.message || 'Failed to update profile');
    }
  };

  const saveGroupProfile = async (event) => {
    event.preventDefault();
    try {
      const result = await api.updateGroup(activeUser._id, groupDraft);
      setActiveUser({ ...result.group, isGroup: true, username: result.group.name, avatar: '' });
      setShowGroupEditor(false);
      fetchConversations();
      toastSuccess('Group updated');
    } catch (error) {
      toastError(error.message || 'Failed to update group');
    }
  };

  const loadImage = (event, update) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1024 * 1024) {
      toastWarning('Choose an image smaller than 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update(reader.result);
    reader.readAsDataURL(file);
  };

  // Send a 1v1 Duel Challenge invite directly into the chat
  const handleSendDuelInvite = async () => {
    if (!activeUser) return;
    const wager = 100; // default wager invite
    const inviteText = `⚔️ I challenged you to a 1v1 Coding Duel for ${wager} Coins! Winner takes both bets.`;

    try {
      const res = await api.sendMessage({
        recipientId: activeUser._id,
        content: inviteText,
        type: 'duel_invite',
        metadata: { wager }
      });

      setMessages((prev) => [...prev, res.message]);
      scrollToBottom();

      if (socket) {
        socket.emit('send_chat_message', res.message);
      }
      toastSuccess('Duel challenge sent!');
    } catch (err) {
      toastError(err.message || 'Failed to send challenge');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 h-[calc(100vh-61px)] text-white flex flex-col">
      <div className="flex-1 bg-[#161b22] border border-[#30363d] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Left Sidebar: Conversations List */}
        <div className="w-full md:w-80 border-r border-[#30363d] flex flex-col bg-[#0d1117]">
          <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Direct Messages
            </h2>
            <div className="flex gap-1"><button type="button" onClick={() => { setProfileDraft({ username: user?.username || '', bio: user?.bio || '', avatar: user?.avatar || '' }); setShowProfileEditor(true); }} title="Edit my chat profile" className="p-1 text-gray-400 hover:text-white"><Settings className="w-4 h-4" /></button><button type="button" onClick={() => setShowCreateGroup(true)} className="text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded-lg font-semibold hover:bg-blue-500/20">+ Group</button></div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#21262d]">
            {loadingConv ? (
              <div className="p-8 text-center text-xs text-gray-500">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                No conversations yet. Go to "Social" to chat with friends!
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = activeUser?._id === conv.user._id;
                const isOnline = onlineUsers.includes(conv.user._id) || conv.user.isOnline;
                return (
                  <button
                    key={conv.user._id}
                    onClick={() => setActiveUser(conv.user)}
                    className={`w-full p-3.5 flex items-center gap-3 text-left transition cursor-pointer ${
                      isSelected ? 'bg-[#21262d]' : 'hover:bg-[#161b22]'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={conv.user.avatar}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-gray-700"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0d1117]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate">{conv.user.username}</span>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-gray-500">
                            {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {!conv.lastMessage
                          ? 'Started a conversation'
                          : conv.lastMessage.type === 'image'
                          ? '📷 Image'
                          : conv.lastMessage.type === 'audio'
                          ? '🎵 Audio message'
                          : conv.lastMessage.type === 'video'
                          ? '🎬 Video'
                          : conv.lastMessage.content}
                      </p>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span title={`${conv.unreadCount} unread message${conv.unreadCount === 1 ? '' : 's'}`} className="min-w-6 h-6 px-1 rounded-full bg-amber-500 text-black font-extrabold text-[11px] flex items-center justify-center shadow-lg shadow-amber-500/30">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-[#30363d] max-h-52 overflow-y-auto">
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Group chats</div>
            {groups.length === 0 ? (
              <p className="px-4 pb-3 text-[11px] text-gray-500">Create a group with your friends.</p>
            ) : groups.map((group) => (
              <button key={group._id} type="button" onClick={() => setActiveUser({ ...group, isGroup: true, username: group.name, avatar: '' })} className={`w-full px-3.5 py-2.5 flex items-center gap-3 text-left hover:bg-[#161b22] ${activeUser?._id === group._id && activeUser?.isGroup ? 'bg-[#21262d]' : ''}`}>
                {group.avatar ? <img src={group.avatar} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-sm font-black">#</div>}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{group.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{group.members.length} members</div>
                </div>
                {group.unreadCount > 0 && <span className="min-w-6 h-6 px-1 rounded-full bg-amber-500 text-black font-extrabold text-[11px] flex items-center justify-center">{group.unreadCount}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Right Pane: Message Thread */}
        <div className="flex-1 flex flex-col bg-[#161b22]">
          {activeUser ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {activeUser.isGroup ? (activeUser.avatar ? <img src={activeUser.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center font-black">#</div>) : <img src={activeUser.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=CodeClash'} alt="" className="w-10 h-10 rounded-full object-cover" />}
                    {!activeUser.isGroup && (onlineUsers.includes(activeUser._id) || activeUser.isOnline) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#161b22]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      {activeUser.username}
                      {!activeUser.isGroup && <span className="text-[10px] text-amber-400 font-extrabold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <Coins className="w-3 h-3" /> {activeUser.coins} Coins
                      </span>}
                    </h3>
                    <div className="text-[11px] text-gray-400">{activeUser.isGroup ? `${activeUser.members.length} members` : activeUser.bio || 'Online Challenger'}</div>
                  </div>
                </div>

                {/* Direct Duel Invite Button in Chat */}
                {!activeUser.isGroup && <div className="flex items-center gap-2">
                  <button onClick={handleClearChat} title="Clear chat for me" className="p-2 text-gray-400 hover:text-amber-400 hover:bg-[#21262d] rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  <button onClick={handleToggleBlock} title={isCurrentChatBlocked ? 'Unblock user' : 'Block user'} className={`p-2 rounded-lg hover:bg-[#21262d] ${isCurrentChatBlocked ? 'text-emerald-400' : 'text-gray-400 hover:text-red-400'}`}>
                    {isCurrentChatBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  </button>
                  {!isCurrentChatBlocked && <button
                    onClick={handleSendDuelInvite}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-xs rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer glow-duel"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    Challenge to 100 Coins Duel
                  </button>}
                </div>}
                {activeUser.isGroup && activeUser.createdBy === user?._id && <button type="button" onClick={() => { setGroupDraft({ name: activeUser.name, avatar: activeUser.avatar || '', memberIds: activeUser.members.filter((id) => id !== user._id) }); setShowGroupEditor(true); }} className="p-2 text-gray-400 hover:text-white"><Settings className="w-4 h-4" /></button>}
              </div>

              {/* Message List */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[#0d1117]">
                {isCurrentChatBlocked && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">You blocked {activeUser.username}. Unblock them to send messages again.</div>}
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs">
                    This is the beginning of your conversation with {activeUser.username}. Send a message{activeUser.isGroup ? ' to the group!' : ' or challenge them to a coding duel!'}
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender === user?._id;
                    const isDuelInvite = m.type === 'duel_invite';

                    return (
                      <div
                        key={m._id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {!isMe && (
                          <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-gray-500">
                            <img src={activeUser.isGroup ? m.senderAvatar : activeUser.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                            <span>{activeUser.isGroup ? m.senderName : activeUser.username}</span>
                          </div>
                        )}
                        {isDuelInvite ? (
                          // Interactive Duel Challenge Card
                          <div className="max-w-sm bg-gradient-to-br from-red-950/60 to-[#1e1518] border border-red-500/50 rounded-2xl p-4 shadow-xl space-y-3 my-1">
                            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                              <Swords className="w-4 h-4" /> 1v1 Betting Duel Challenge
                            </div>
                            <p className="text-xs text-gray-200 leading-relaxed font-sans">{m.content}</p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs text-amber-400 font-extrabold flex items-center gap-1">
                                <Coins className="w-4 h-4 fill-amber-400" />
                                Pot: {(m.metadata?.wager || 100) * 2} Coins
                              </span>
                              {!isMe && (
                                <button
                                  onClick={() => onChallengeDuel(activeUser._id)}
                                  className="px-3 py-1 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-xs rounded-lg transition"
                                >
                                  Accept & Battle
                                </button>
                              )}
                            </div>
                          </div>
                        ) : m.type === 'image' ? (
                          <div className={`max-w-md overflow-hidden rounded-2xl border ${isMe ? 'border-blue-500/50 rounded-br-none' : 'border-[#30363d] rounded-bl-none'}`}>
                            <button type="button" onClick={() => setSelectedMedia({ type: 'image', src: m.content, name: m.metadata?.fileName || 'image' })} className="block w-full cursor-zoom-in">
                              <img src={m.content} alt={m.metadata?.fileName || 'Shared image'} className="max-h-80 w-full object-contain bg-black" />
                            </button>
                            <div className="px-3 py-2 bg-[#21262d] text-[10px] text-gray-300 flex items-center gap-2">
                              <span className="truncate flex-1">📷 {m.metadata?.fileName || 'Image'}</span>
                              <a href={m.content} download={m.metadata?.fileName || 'image'} title="Save image" className="p-1 text-blue-300 hover:text-white"><Download className="w-3.5 h-3.5" /></a>
                            </div>
                          </div>
                        ) : m.type === 'audio' ? (
                          <div className={`max-w-md px-4 py-3 rounded-2xl ${isMe ? 'bg-blue-600 rounded-br-none' : 'bg-[#21262d] border border-[#30363d] rounded-bl-none'}`}>
                            <div className="text-[10px] font-semibold mb-2">{m.metadata?.isVoiceMessage ? '🎤 Voice message' : '🎵'} {m.metadata?.fileName || 'Audio message'}</div>
                            <audio controls src={m.content} className="max-w-full h-8" />
                          </div>
                        ) : m.type === 'video' ? (
                          <div className={`max-w-md overflow-hidden rounded-2xl border ${isMe ? 'border-blue-500/50 rounded-br-none' : 'border-[#30363d] rounded-bl-none'}`}>
                            <video controls src={m.content} className="max-h-80 w-full bg-black" />
                            <div className="px-3 py-2 bg-[#21262d] text-[10px] text-gray-300 flex items-center gap-2">
                              <span className="truncate flex-1">🎬 {m.metadata?.fileName || 'Video'}</span>
                              <a href={m.content} download={m.metadata?.fileName || 'video'} title="Save video" className="p-1 text-blue-300 hover:text-white"><Download className="w-3.5 h-3.5" /></a>
                            </div>
                          </div>
                        ) : (
                          // Regular Message Bubble
                          <div
                            className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed font-sans ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                                : 'bg-[#21262d] text-gray-200 rounded-bl-none border border-[#30363d]'
                            }`}
                          >
                            {m.content}
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1 px-1">
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && <CheckCheck className="w-3 h-3 text-blue-400" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              {(isRecording || recordedAudio) && (
                <div className="px-4 py-2 border-t border-[#30363d] bg-[#161b22] flex items-center gap-3 text-xs">
                  {isRecording ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-red-300 font-semibold">Recording voice message…</span>
                      <button type="button" onClick={stopVoiceRecording} className="ml-auto px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold">Stop</button>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-blue-400" />
                      <audio controls src={recordedAudio.content} className="h-8 max-w-[210px]" />
                      <button type="button" onClick={() => setRecordedAudio(null)} className="ml-auto p-1.5 text-gray-400 hover:text-red-400" title="Discard voice message"><X className="w-4 h-4" /></button>
                      <button type="button" onClick={sendRecordedAudio} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Send voice</button>
                    </>
                  )}
                </div>
              )}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#30363d] bg-[#161b22] flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={attachmentType === 'image' ? 'image/*' : attachmentType === 'audio' ? 'audio/*' : 'video/*'}
                  onChange={handleAttachmentChange}
                  className="hidden"
                />
                <button type="button" onClick={() => selectAttachment('image')} title="Send image" className="p-2 text-gray-400 hover:text-blue-400 hover:bg-[#21262d] rounded-lg transition">
                  <ImagePlus className="w-4 h-4" />
                </button>
                <button type="button" onClick={isRecording ? stopVoiceRecording : startVoiceRecording} title={isRecording ? 'Stop recording' : 'Record voice message'} className={`p-2 rounded-lg transition ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-gray-400 hover:text-blue-400 hover:bg-[#21262d]'}`}>
                  <Mic className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => selectAttachment('video')} title="Send video file" className="p-2 text-gray-400 hover:text-blue-400 hover:bg-[#21262d] rounded-lg transition">
                  <Video className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  disabled={isCurrentChatBlocked}
                  placeholder={isCurrentChatBlocked ? `Unblock ${activeUser.username} to message` : `Message ${activeUser.username}...`}
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isCurrentChatBlocked}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              {isTyping && (
                <div className="px-5 pb-2 bg-[#161b22] text-[11px] text-gray-400 italic">
                  {activeUser.username} is typing…
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
              Select a chat or friend on the left to start messaging.
            </div>
          )}
        </div>
      </div>
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedMedia(null)}>
          <div className="relative max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setSelectedMedia(null)} className="absolute -top-10 right-0 p-2 text-white hover:text-amber-400" title="Close preview">
              <X className="w-6 h-6" />
            </button>
            <img src={selectedMedia.src} alt={selectedMedia.name} className="max-h-[80vh] max-w-full rounded-xl object-contain" />
            <div className="mt-3 flex items-center justify-between gap-4 text-sm text-white">
              <span className="truncate">{selectedMedia.name}</span>
              <a href={selectedMedia.src} download={selectedMedia.name} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500">
                <Download className="w-4 h-4" /> Save image
              </a>
            </div>
          </div>
        </div>
      )}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form onSubmit={handleCreateGroup} className="w-full max-w-md rounded-2xl border border-[#30363d] bg-[#161b22] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Create group chat</h3>
              <button type="button" onClick={() => setShowCreateGroup(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <input autoFocus value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name, e.g. DSA Study Team" className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
            <p className="mt-4 mb-2 text-xs font-semibold text-gray-400">Choose members</p>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-[#30363d] p-2">
              {conversations.map((conversation) => {
                const member = conversation.user;
                const checked = selectedMembers.includes(member._id);
                return <label key={member._id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-[#21262d]">
                  <input type="checkbox" checked={checked} onChange={() => setSelectedMembers((members) => checked ? members.filter((id) => id !== member._id) : [...members, member._id])} />
                  <img src={member.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                  <span className="text-xs font-semibold text-gray-200">{member.username}</span>
                </label>;
              })}
              {conversations.length === 0 && <p className="p-2 text-xs text-gray-500">Start a direct chat with friends first, then add them here.</p>}
            </div>
            <button type="submit" disabled={!groupName.trim() || selectedMembers.length === 0} className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-40">Create group</button>
          </form>
        </div>
      )}
      {showProfileEditor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><form onSubmit={saveProfile} className="w-full max-w-md rounded-2xl bg-[#161b22] p-6 border border-[#30363d]"><h3 className="mb-4 font-bold text-white">Edit my chat profile</h3><div className="mb-3 flex items-center gap-3">{profileDraft.avatar ? <img src={profileDraft.avatar} alt="Preview" className="h-14 w-14 rounded-full object-cover" /> : <div className="h-14 w-14 rounded-full bg-[#30363d]" />}<input type="file" accept="image/*" onChange={(e) => loadImage(e, (avatar) => setProfileDraft({ ...profileDraft, avatar }))} className="text-xs text-gray-300" />{profileDraft.avatar && <button type="button" onClick={() => setProfileDraft({ ...profileDraft, avatar: '' })} className="text-xs text-red-400">Remove</button>}</div><input value={profileDraft.username} onChange={(e) => setProfileDraft({ ...profileDraft, username: e.target.value })} placeholder="Display name" className="mb-2 w-full rounded-lg bg-[#0d1117] p-2 text-white" /><textarea value={profileDraft.bio} onChange={(e) => setProfileDraft({ ...profileDraft, bio: e.target.value })} placeholder="Bio" className="mb-3 w-full rounded-lg bg-[#0d1117] p-2 text-white" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowProfileEditor(false)} className="px-3 py-2 text-gray-300">Cancel</button><button className="rounded-lg bg-blue-600 px-3 py-2 text-white">Save</button></div></form></div>}
      {showGroupEditor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><form onSubmit={saveGroupProfile} className="w-full max-w-md rounded-2xl bg-[#161b22] p-6 border border-[#30363d]"><h3 className="mb-4 font-bold text-white">Edit group profile</h3><div className="mb-3 flex items-center gap-3">{groupDraft.avatar ? <img src={groupDraft.avatar} alt="Group preview" className="h-14 w-14 rounded-full object-cover" /> : <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">#</div>}<input type="file" accept="image/*" onChange={(e) => loadImage(e, (avatar) => setGroupDraft({ ...groupDraft, avatar }))} className="text-xs text-gray-300" />{groupDraft.avatar && <button type="button" onClick={() => setGroupDraft({ ...groupDraft, avatar: '' })} className="text-xs text-red-400">Remove</button>}</div><input value={groupDraft.name} onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })} placeholder="Group name" className="mb-3 w-full rounded-lg bg-[#0d1117] p-2 text-white" /><p className="mb-2 text-xs text-gray-400">Add or remove members</p><div className="max-h-44 overflow-y-auto">{conversations.map(({ user: member }) => <label key={member._id} className="flex items-center gap-2 p-2 text-xs text-white"><input type="checkbox" checked={groupDraft.memberIds.includes(member._id)} onChange={() => setGroupDraft((draft) => ({ ...draft, memberIds: draft.memberIds.includes(member._id) ? draft.memberIds.filter((id) => id !== member._id) : [...draft.memberIds, member._id] }))} />{member.username}</label>)}</div><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setShowGroupEditor(false)} className="px-3 py-2 text-gray-300">Cancel</button><button className="rounded-lg bg-blue-600 px-3 py-2 text-white">Save group</button></div></form></div>}
    </div>
  );
}
