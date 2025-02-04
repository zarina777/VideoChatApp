const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const userRoute = require("./users/users");
const PORT = 3000;

const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

app.use("/users", userRoute);

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const connectedUsers = new Map();
io.on("connection", (socket) => {
  socket.on("authentificate", (mdb_id) => {
    connectedUsers.set(mdb_id, { currentId: socket.id, busy: false });
    console.log(`User authenticated: ${mdb_id}`);
    console.log(connectedUsers);
  });
  socket.on("callToUser", ({ callerDBId, callerName, receiverDBId, receiverName, callerStream }) => {
    const targetUser = connectedUsers.get(receiverDBId);
    const currentUser = connectedUsers.get(callerDBId);
    if (targetUser) {
      if (targetUser.busy) {
        socket.emit("busyUser", `${receiverName} is currently busy`);
      } else {
        connectedUsers.set(callerDBId, { ...currentUser, busy: true });
        connectedUsers.set(receiverDBId, { ...targetUser, busy: true });
        socket.to(targetUser.currentId).emit("callToYou", { callerDBId, callerName, callerStream, receiverDBId, receiverName });
      }
    } else {
      socket.emit("UserIsNotOnline", `${receiverName} is not online`);
    }
  });

  socket.on("noResponse", ({ noResFromName, fromDBID, noResToName }) => {
    let targetUser = connectedUsers.get(fromDBID);
    socket.emit("noResponse", `No response from ${noResFromName}`);
    socket.to(targetUser.currentId).emit("missedCall", `You missed a call from ${noResToName}`);
  });

  socket.on("answerCall", ({ responserDBId, responserName, receiverDBId, receiverName, responserStream }) => {
    let targetUser = connectedUsers.get(receiverDBId);
    let currentUser = connectedUsers.get(responserDBId);
    if (targetUser && currentUser) {
      io.to(targetUser.currentId).emit("callAccepted", { responserDBId, responserName, receiverDBId, receiverName, responserStream });

      // Update busy status for both users
      connectedUsers.set(receiverDBId, { ...targetUser, busy: true });
      connectedUsers.set(responserDBId, { ...currentUser, busy: true });
    } else if (!targetUser) {
      socket.emit("UserIsNotOnline", `${receiverName} is not online`);
    } else if (!currentUser) {
      socket.emit("UserIsNotOnline", `${responserName} is not online`);
    }
  });
  socket.on("rejectCall", ({ rejecterDBId, rejecterName, receiverDBId, receiverName }) => {
    let targetUser = connectedUsers.get(receiverDBId);
    let currentUser = connectedUsers.get(rejecterDBId);
    if (targetUser && currentUser) {
      connectedUsers.set(rejecterDBId, { ...currentUser, busy: false });
      connectedUsers.set(receiverDBId, { ...targetUser, busy: false });
      socket.to(targetUser.currentId).emit("callRejected", ` ${rejecterName} rejected the call`);
    }
  });
  socket.on("endCall", ({ enderDBId, enderName, receiverDBId, receiverName }) => {
    let targetUser = connectedUsers.get(receiverDBId);
    let currentUser = connectedUsers.get(enderDBId);
    if (targetUser && currentUser) {
      socket.to(targetUser.currentId).emit("endCall", { enderDBId, enderName });
      connectedUsers.set(enderDBId, { ...currentUser, busy: false });
      connectedUsers.set(receiverDBId, { ...targetUser, busy: false });
    } else {
      socket.to(targetUser.currentId).emit("UserIsNotOnline", `${enderName} or ${receiverName} is not online`);
    }
  });
  socket.on("disconnect", () => {
    const user = [...connectedUsers].find(([mdb_id, userInfo]) => userInfo.currentId === socket.id);
    if (user) {
      connectedUsers.delete(user[0]);
      console.log(`User disconnected: ${user[0]}`);
    }
  });
});
mongoose
  .connect("mongodb+srv://archerel_db:archerel02@cluster0.8sbew.mongodb.net/")
  .then(() => console.log("Connected to DB"))
  .then(() => {
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.log(err));
