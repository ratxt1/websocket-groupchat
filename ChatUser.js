/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require('./Room');

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** make chat: store connection-device, rooom */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** send msgs to this client using underlying connection-send-function */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** handle joining: add to room members, announce join */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} joined "${this.room.name}".`
    });
  }

  /** handle a chat: broadcast to room. */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: 'chat',
      text: text
    });
  }

  handlePrivateChat(toUser, text) {
    this.room.sendPrivate({
      to: toUser,
      name: this.name,
      type: 'chat',
      text: text
    });
  }

  handleNameChange(newName) {
    let oldName = this.name;
    for (let member of this.room.members) {
      if (member.name === oldName) {
        member.name = newName;
      }
    }
    this.room.broadcast({
      type: 'note',
      text: `"${oldName}" updated name to "${newName}".`
    });

  }

  /** Handle messages from client:
   *
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);
    if (msg.type === 'join') this.handleJoin(msg.name);
    else if (msg.type === 'joke') this.handleJoke();
    else if (msg.type === 'chat') this.handleChat(msg.text);
    else if (msg.type === 'members') this.handleGetMembers();
    else if (msg.type === 'pm') this.handlePrivateChat(msg.to, msg.text);
    else if (msg.type === 'newname') this.handleNameChange(msg.newName);
    else throw new Error(`bad message: ${msg.type}`);
  }

  handleGetMembers(){
    let memberNames = [...this.room.members].map(u => u.name);
    
    let data = {
      type: 'note',
      text:  "In room: " + memberNames.join(", ")
    }
    this.send(JSON.stringify(data));
  }

  handleJoke() {
   let randomIndex = Math.floor(Math.random() * this.room.jokes.length)
   let data = {
    type: 'note',
    text: this.room.jokes[randomIndex]
   }
   this.send(JSON.stringify(data));
  }
  /** Connection was closed: leave room, announce exit to others */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} left ${this.room.name}.`
    });
  }
}

module.exports = ChatUser;
