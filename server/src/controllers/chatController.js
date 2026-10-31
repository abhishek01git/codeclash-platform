import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';

export async function getConversations(req, res) {
  try {
    const currentUserId = req.user.userId;
    const currentUser = await User.findById(currentUserId).select('friends clearedChats');

    // Collect all user IDs this user has talked with or is friends with
    const conversationUserIds = new Set(currentUser?.friends || []);
    const allMessages = await Message.find({
      recipient: { $exists: true, $ne: null },
      $or: [{ sender: currentUserId }, { recipient: currentUserId }]
    });
    allMessages.forEach(m => {
      if (m.sender === currentUserId) conversationUserIds.add(m.recipient);
      if (m.recipient === currentUserId) conversationUserIds.add(m.sender);
    });
    conversationUserIds.delete(currentUserId);

    const conversations = await Promise.all(
      [...conversationUserIds].map(async targetId => {
        const targetUser = await User.findById(targetId).select('username avatar bio coins');
        if (!targetUser) return null;

        const clearedAt = currentUser?.clearedChats?.get(targetId) || null;
        const threadQuery = {
          recipient: { $exists: true, $ne: null },
          $or: [
            { sender: currentUserId, recipient: targetId },
            { sender: targetId, recipient: currentUserId }
          ]
        };
        if (clearedAt) threadQuery.createdAt = { $gt: new Date(clearedAt) };

        const thread = await Message.find(threadQuery).sort({ createdAt: -1 });
        const unreadCount = thread.filter(m => m.recipient === currentUserId && !m.read).length;

        return {
          user: { _id: targetUser._id, username: targetUser.username, avatar: targetUser.avatar, bio: targetUser.bio, coins: targetUser.coins, isOnline: true },
          lastMessage: thread[0] || null,
          unreadCount
        };
      })
    );

    const result = conversations
      .filter(Boolean)
      .sort((a, b) => {
        const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return tb - ta;
      });

    res.json({ conversations: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMessages(req, res) {
  try {
    const currentUserId = req.user.userId;
    const { otherUserId } = req.params;
    const currentUser = await User.findById(currentUserId).select('clearedChats');
    const clearedAt = currentUser?.clearedChats?.get(otherUserId) || null;

    const query = {
      recipient: { $exists: true, $ne: null },
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId }
      ]
    };
    if (clearedAt) query.createdAt = { $gt: new Date(clearedAt) };

    const thread = await Message.find(query).sort({ createdAt: 1 });

    // Mark incoming messages as read
    await Message.updateMany(
      { sender: otherUserId, recipient: currentUserId, read: false },
      { $set: { read: true } }
    );

    res.json({ messages: thread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function sendMessage(req, res) {
  try {
    const currentUserId = req.user.userId;
    const { recipientId, content, type = 'text', metadata = null } = req.body;

    if (!recipientId || !content) return res.status(400).json({ error: 'Recipient and content are required' });
    if (typeof content !== 'string') return res.status(400).json({ error: 'Message content must be text' });

    const allowedTypes = ['text', 'duel_invite', 'image', 'audio', 'video'];
    if (!allowedTypes.includes(type)) return res.status(400).json({ error: 'Unsupported message type' });

    const [sender, recipient] = await Promise.all([
      User.findById(currentUserId).select('blockedUsers'),
      User.findById(recipientId).select('blockedUsers')
    ]);
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
    if (sender?.blockedUsers?.includes(recipientId) || recipient.blockedUsers?.includes(currentUserId)) {
      return res.status(403).json({ error: 'This user is blocked. Unblock them to send messages.' });
    }

    if (type !== 'text' && type !== 'duel_invite') {
      if (!content.startsWith(`data:${type}/`) || content.length > 6 * 1024 * 1024) {
        return res.status(400).json({ error: `Invalid ${type} attachment` });
      }
    } else if (content.length > 5000) {
      return res.status(400).json({ error: 'Text messages are limited to 5,000 characters' });
    }

    const newMsg = await Message.create({
      _id: `msg_${Date.now()}`,
      sender: currentUserId,
      recipient: recipientId,
      content, type, metadata
    });

    res.status(201).json({ message: newMsg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function blockUser(req, res) {
  try {
    const currentUser = await User.findById(req.user.userId);
    const targetId = req.params.userId;
    if (!currentUser || currentUser._id === targetId) return res.status(400).json({ error: 'Invalid user' });
    currentUser.blockedUsers = [...new Set([...(currentUser.blockedUsers || []), targetId])];
    await currentUser.save();
    res.json({ blockedUsers: currentUser.blockedUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function unblockUser(req, res) {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });
    currentUser.blockedUsers = (currentUser.blockedUsers || []).filter(id => id !== req.params.userId);
    await currentUser.save();
    res.json({ blockedUsers: currentUser.blockedUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function clearChat(req, res) {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });
    if (!currentUser.clearedChats) currentUser.clearedChats = new Map();
    currentUser.clearedChats.set(req.params.userId, new Date().toISOString());
    currentUser.markModified('clearedChats');
    await currentUser.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getGroups(req, res) {
  try {
    const userId = req.user.userId;
    const groups = await Group.find({ members: userId });

    const result = await Promise.all(groups.map(async group => {
      const members = await User.find({ _id: { $in: group.members } }).select('_id username avatar');
      const groupMessages = await Message.find({ groupId: group._id }).sort({ createdAt: -1 });
      return {
        ...group.toObject(),
        memberProfiles: members,
        lastMessage: groupMessages[0] || null,
        unreadCount: groupMessages.filter(m => !m.readBy?.includes(userId)).length
      };
    }));

    result.sort((a, b) => new Date(b.lastMessage?.createdAt || b.createdAt) - new Date(a.lastMessage?.createdAt || a.createdAt));
    res.json({ groups: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createGroup(req, res) {
  try {
    const userId = req.user.userId;
    const { name, memberIds = [], avatar = '' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' });

    const memberSet = [...new Set([userId, ...memberIds])];
    const validUsers = await User.find({ _id: { $in: memberSet } }).select('_id');
    const members = validUsers.map(u => u._id);
    if (members.length < 2) return res.status(400).json({ error: 'Choose at least one other member' });

    const group = await Group.create({
      _id: `group_${Date.now()}`,
      name: name.trim().slice(0, 60),
      avatar: typeof avatar === 'string' ? avatar.slice(0, 2 * 1024 * 1024) : '',
      createdBy: userId,
      members
    });

    res.status(201).json({ group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateGroup(req, res) {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.createdBy !== req.user.userId) return res.status(403).json({ error: 'Only the group creator can edit this group' });

    const { name, memberIds = [], avatar } = req.body;
    if (name?.trim()) group.name = name.trim().slice(0, 60);
    if (typeof avatar === 'string') group.avatar = avatar.slice(0, 2 * 1024 * 1024);

    const validUsers = await User.find({ _id: { $in: [...new Set([group.createdBy, ...memberIds])] } }).select('_id');
    group.members = validUsers.map(u => u._id);
    await group.save();

    res.json({ group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getGroupMessages(req, res) {
  try {
    const userId = req.user.userId;
    const group = await Group.findById(req.params.groupId);
    if (!group || !group.members.includes(userId)) return res.status(404).json({ error: 'Group not found' });

    const messages = await Message.find({ groupId: group._id }).sort({ createdAt: 1 });
    await Message.updateMany({ groupId: group._id, readBy: { $ne: userId } }, { $addToSet: { readBy: userId } });

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function sendGroupMessage(req, res) {
  try {
    const userId = req.user.userId;
    const { content, type = 'text', metadata = null } = req.body;

    const group = await Group.findById(req.params.groupId);
    if (!group || !group.members.includes(userId)) return res.status(404).json({ error: 'Group not found' });
    if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Message content is required' });

    const allowedTypes = ['text', 'image', 'audio', 'video'];
    if (!allowedTypes.includes(type)) return res.status(400).json({ error: 'Unsupported message type' });
    if (type !== 'text' && (!content.startsWith(`data:${type}/`) || content.length > 6 * 1024 * 1024)) {
      return res.status(400).json({ error: 'Invalid or oversized attachment' });
    }
    if (type === 'text' && content.length > 5000) return res.status(400).json({ error: 'Text messages are limited to 5,000 characters' });

    const sender = await User.findById(userId).select('username avatar');
    const message = await Message.create({
      _id: `msg_${Date.now()}`,
      groupId: group._id,
      sender: userId,
      senderName: sender?.username || 'Member',
      senderAvatar: sender?.avatar || '',
      content, type, metadata,
      readBy: [userId]
    });

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
