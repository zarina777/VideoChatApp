import React from "react";
import Login from "./components/Login";
import { Users } from "./components/Users";
import Video from "./components/Video";

const App = () => {
  return (
    <div className="bg-blue-gray-400 grid grid-cols-3 w-full">
      <Login />
      <Video />
      <Users />
    </div>
  );
};

export default App;
