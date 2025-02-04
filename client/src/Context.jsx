import React, { createContext, useEffect, useRef, useState } from "react";
import api from "./api";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const socket = io(api.defaults.baseURL, { autoConnect: true });

export const SocketContext = createContext();
const SocketProvider = ({ children }) => {
  // Current user's database_id and name is kept
  const [me, setMe] = useState(null);
  //Target user's database_id and name is kept
  const [user, setUser] = useState(null);
  //current user's video stream is kept
  const [stream, setStream] = useState(null);
  //target user's video stream is kept
  const [userStream, setUserStream] = useState(null);
  //call is on the way
  const [callOnTheWay, setCallOnTheWay] = useState(null);
  //call is received
  const [callIsReceived, setCallIsReceived] = useState(null);
  //call is rejected
  const [callIsRejected, setCallIsRejected] = useState("");
  //call is accepted
  const [callIsAccepted, setCallIsAccepted] = useState(null);
  //call ended
  const [callIsEnded, setCallIsEnded] = useState(null);
  //call is missed
  const [callIsMissed, setCallIsMissed] = useState(null);
  //if user is busy
  const [isUserBusy, setIsUserBusy] = useState("");
  // if user is not online
  const [isUserNotOnline, setIsUserNotOnline] = useState("");
  // Reference to Peer connection
  const connectionRef = useRef(null);

  // Request media stream when component mounts
  useEffect(() => {
    const getUserMedia = async () => {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(newStream);
      } catch (error) {
        console.error("Error accessing media devices:", error.message);
        alert("Unable to access camera or microphone.");
      }
    };
    getUserMedia();
    const handleIncomingCall = ({ callerDBId, callerName, receiverDBId, receiverName, callerStream }) => {
      setUser({ callerDBId, callerName, receiverDBId, receiverName, callerStream });
    };
    // Listen for incoming calls
    socket.on("callToYou", handleIncomingCall);

    return () => {
      socket.off("callToYou", handleIncomingCall);
    };
  }, []);

  //call to a user function
  const callUserFn = async ({ receiverDBId, receiverName }) => {
    if (!me) {
      alert("Please select a user.");
      return;
    }

    if (!stream) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(newStream);
      } catch (error) {
        console.error("Error accessing media devices:", error.message);
        alert("Unable to access camera or microphone.");
        return;
      }
    }

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    connectionRef.current = peer;

    peer.on("signal", (data) => {
      socket.emit("callToUser", {
        callerDBId: me._id,
        callerName: me.name,
        receiverDBId,
        receiverName,
        callerStream: data,
      });
      setCallOnTheWay(true);
    });

    peer.on("stream", (remoteStream) => {
      setUserStream(remoteStream);
    });

    peer.on("error", (error) => {
      console.error("Peer error:", error);
      alert("Failed to establish peer connection.");
    });

    peer.on("close", () => {
      connectionRef.current = null;
      setCallOnTheWay(false);
      alert("Connection closed");
    });

    socket.once("busyUser", (message) => {
      setIsUserBusy(message);
      setTimeout(() => {
        setIsUserBusy("");
      }, 3000);
    });

    socket.once("UserIsNotOnline", (message) => {
      setIsUserNotOnline(message);
      setTimeout(() => {
        setIsUserNotOnline("");
      }, 3000);
    });
    socket.once("callAccepted", (message) => {
      setCallIsAccepted(true);
      setUser(message);
    });
    socket.once("callRejected", (message) => {
      if (connectionRef.current) {
        connectionRef.current.destroy();
        connectionRef.current = null;
      }
      setCallIsRejected(message);
      setTimeout(() => {
        setCallIsRejected("");
      }, 3000);
    });
  };

  //answer a call function
  function answerCallFn() {
    let peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    connectionRef.current = peer;
    peer.on("signal", (data) => {
      socket.emit("answerCall", {
        responserDBId: me._id,
        responserName: me.name,
        receiverDBId: user.receiverDBId,
        receiverName: user.receiverName,
        responserStream: data,
      });
    });
    peer.on("stream", (remoteStream) => {
      setUserStream(remoteStream);
    });
    peer.signal(user.callerStream);
  }

  //reject a call function
  function rejectCallFn() {
    socket.emit("rejectCall", {
      rejecterDBId: me._id,
      rejecterName: me.name,
      receiverDBId: user.receiver,
      receiverName: user.receiverName,
    });
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
  }

  //end a call function
  function endCallFn() {}

  return (
    <SocketContext.Provider
      value={{
        socket,
        me,
        setMe,
        user,
        setUser,
        stream,
        userStream,
        callOnTheWay,
        callIsReceived,
        callIsRejected,
        callIsAccepted,
        callIsEnded,
        callIsMissed,
        isUserBusy,
        isUserNotOnline,
        callUserFn,
        answerCallFn,
        rejectCallFn,
        endCallFn,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
