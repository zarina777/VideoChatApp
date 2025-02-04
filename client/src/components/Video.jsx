import React, { useContext, useEffect, useRef, useState } from "react";
import { MdCallEnd, MdMic, MdMicOff, MdVideocam, MdVideocamOff } from "react-icons/md";

import { SocketContext } from "../Context";

const Video = () => {
  const {
    stream,
    me,
    userStream,
    answerCallFn,
    user,
    endCallFn,
    rejectCallFn,
    callIsRejected,
    callOnTheWay,
    notification,
    isUserNotOnline,
    callIsEnded,
    isCameraOn,
    isMicOn,
    toggleCamera,
    toggleMic,
  } = useContext(SocketContext);
  const myVideo = useRef();
  const userVideo = useRef();
  useEffect(() => {
    if (stream) {
      myVideo.current.srcObject = stream;
    }
  }, [stream]);
  useEffect(() => {
    if (userStream) {
      userVideo.current.srcObject = userStream;
    }
  }, [userStream]);

  return (
    <div className="h-full w-full flex justify-center items-center flex-col bg-gray-900">
      {callIsRejected && <h2 className="text-xl text-center p-3 text-white bg-red-400 rounded-lg mb-2">{callIsRejected}</h2>}
      {callIsEnded && <h2 className="text-xl text-center p-3 text-white bg-red-400 rounded-lg mb-2">{callIsEnded}</h2>}
      {isUserNotOnline && <h2 className="text-xl text-center p-3 text-white bg-blue-400 rounded-lg mb-2">{isUserNotOnline}</h2>}
      {callOnTheWay && <h2 className="text-xl text-center p-3 text-white bg-light-green-600 rounded-lg mb-2">{callOnTheWay}</h2>}
      <div className="videos flex flex-col gap-5 justify-center w-full px-10">
        {notification && (
          <div className="flex items-center gap-2 justify-between mb-10 w-full border rounded border-black p-3">
            <h2 className="text-white">{user?.name} is calling...</h2>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  answerCallFn();
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-xl"
              >
                Accept
              </button>
              <button onClick={rejectCallFn} className="bg-red-500 text-white px-4 py-2 rounded-xl">
                Deny
              </button>
            </div>
          </div>
        )}

        {/* My Video */}
        <div className="w-full bg-gray-100 rounded-lg p-2">
          {me && <h2 className="text-center font-semibold">{me?.name}</h2>}
          <video ref={myVideo} playsInline className="w-full bg-black rounded-md" muted autoPlay />
        </div>
        {/* User Video */}
        {userStream && (
          <div className="w-full bg-gray-100 rounded-lg p-2">
            <h2 className="text-center font-semibold">{user.name}</h2>
            <video ref={userVideo} playsInline className="w-full bg-black rounded-md" autoPlay />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mt-6 -translate-y-4">
        <button
          onClick={toggleMic}
          className={`text-2xl  border border-red-500 rounded-full p-5 ${
            isMicOn ? "text-red-700 hover:bg-red-600 hover:text-white" : "text-white bg-red-600 "
          }  transition-all duration-200`}
        >
          {isMicOn ? <MdMic /> : <MdMicOff />}
        </button>
        <button
          onClick={toggleCamera}
          className={`text-2xl  border border-red-500 rounded-full p-5 ${
            isCameraOn ? "text-red-700 hover:bg-red-600 hover:text-white" : "text-white bg-red-600 "
          }  transition-all duration-200`}
        >
          {isCameraOn ? <MdVideocam /> : <MdVideocamOff />}
        </button>

        {userStream && (
          <button onClick={endCallFn} className="p-4 text-3xl rounded-full bg-red-700 text-white hover:-translate-y-2 transition-all duration-200">
            <MdCallEnd />
          </button>
        )}
      </div>
    </div>
  );
};

export default Video;
