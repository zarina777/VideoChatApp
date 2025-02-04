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
  const [callOnTheWay, setCallOnTheWay] = useState("");
  //call is rejected
  const [callIsRejected, setCallIsRejected] = useState("");
  //call is accepted
  const [callIsAccepted, setCallIsAccepted] = useState(null);
  //call ended
  const [callIsEnded, setCallIsEnded] = useState("");
  //call is missed
  const [callIsMissed, setCallIsMissed] = useState(null);
  //if user is busy
  const [isUserBusy, setIsUserBusy] = useState("");
  // if user is not online
  const [isUserNotOnline, setIsUserNotOnline] = useState("");
  // Reference to Peer connection
  const connectionRef = useRef(null);
  // Notification
  const [notification, setNotification] = useState(false);
  //Microphone and camera controls
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  // Request media stream when component mounts
  useEffect(() => {
    const getUserMedia = async () => {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(newStream);
      } catch (error) {
        console.error("Error accessing media devices:", error.message);
      }
    };
    getUserMedia();
    const handleIncomingCall = ({ callerDBId, callerName, receiverDBId, receiverName, callerStream }) => {
      setUser({ id: callerDBId, name: callerName, fromID: receiverDBId, fromName: receiverName, stream: callerStream });
      setNotification(true);
    };
    const handleEndCall = (message) => {
      if (connectionRef.current) {
        connectionRef.current.removeAllListeners();
        connectionRef.current.destroy();
        connectionRef.current = null;
      }
      if (stream) {
        setStream(null);
      }
      // Reset state related to the call
      setCallIsEnded(`${message.enderName} ended the call`);
      setTimeout(() => {
        setCallIsEnded("");
      }, 2000);
      setUser(null);
      setUserStream(null);
    };
    // Listen for incoming calls
    socket.on("callToYou", handleIncomingCall);
    socket.on("endCall", handleEndCall);
    return () => {
      socket.off("callToYou", handleIncomingCall);
      socket.off("endCall", handleEndCall);
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
        callerDBId: me?._id,
        callerName: me?.name,
        receiverDBId,
        receiverName,
        callerStream: data,
      });
      setCallOnTheWay(`Wait for ${receiverName}'s response`);
    });

    peer.on("stream", (remoteStream) => {
      setUserStream(remoteStream);
    });

    peer.on("error", (error) => {
      console.error("Peer error:", error);
    });

    socket.once("busyUser", (message) => {
      setIsUserBusy(message);
      setTimeout(() => {
        setIsUserBusy("");
      }, 3000);
    });

    socket.once("UserIsNotOnline", (message) => {
      setCallOnTheWay("");

      setIsUserNotOnline(message);
      setTimeout(() => {
        setIsUserNotOnline("");
      }, 3000);
    });
    socket.once("callAccepted", ({ responserDBId, responserName, receiverDBId, receiverName, responserStream }) => {
      setCallOnTheWay("");
      setCallIsAccepted(true);
      setUser({ id: responserDBId, name: responserName, stream: responserStream, fromID: receiverDBId, fromName: receiverName });
      peer.signal(responserStream);
    });
    socket.once("callRejected", (message) => {
      setCallOnTheWay("");
      setCallIsRejected(message);

      setTimeout(() => {
        setCallIsRejected("");
      }, 2000);
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
        receiverDBId: user.id,
        receiverName: user.name,
        responserStream: data,
      });
    });
    peer.on("stream", (remoteStream) => {
      setUserStream(remoteStream);
    });
    peer.signal(user.stream);
    setNotification(false);
  }

  //reject a call function
  function rejectCallFn() {
    socket.emit("rejectCall", {
      rejecterDBId: me._id,
      rejecterName: me.name,
      receiverDBId: user.id,
      receiverName: user.name,
    });

    setUser(null);
    setNotification(false);
  }

  //end a call function
  function endCallFn() {
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    socket.emit("endCall", { enderDBId: me._id, enderName: me.name, receiverDBId: user.id, receiverName: user.name });
    setUserStream(null);
    setUser(null);
  }
  const toggleCamera = async () => {
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);

      if (connectionRef.current) {
        const sender = connectionRef.current._pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack); // Update track for peer
        }
      }
    }
  };
  const toggleMic = () => {
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];

    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);

      if (connectionRef.current) {
        const sender = connectionRef.current._pc.getSenders().find((s) => s.track?.kind === "audio");
        if (sender) {
          sender.replaceTrack(audioTrack); // Update track for peer
        }
      }
    }
  };

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
        notification,
        toggleCamera,
        toggleMic,
        isCameraOn,
        isMicOn,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
