import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { ThemeProvider } from "@material-tailwind/react";
import SocketProvider from "./context";

ReactDOM.createRoot(document.getElementById("root")).render(
  <SocketProvider>
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  </SocketProvider>
);
