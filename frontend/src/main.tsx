import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MunimProvider } from "./hooks/useMunim";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MunimProvider>
      <App />
    </MunimProvider>
  </React.StrictMode>,
);
