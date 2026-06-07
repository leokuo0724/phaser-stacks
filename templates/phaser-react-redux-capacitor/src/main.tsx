import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import App from "~/App";
import { setupNativeFeedback } from "~/native/feedback";
import { store } from "~/store";
import { hydrateHighScore } from "~/store/game/slice";
import { loadPersistedHighScore } from "~/store/middleware/persist-high-score";

import "./global.css";

// Native/cross-cutting wiring (Capacitor) — works on web too, lights up on a phone.
setupNativeFeedback();
void loadPersistedHighScore().then((value) => {
  if (value != null) store.dispatch(hydrateHighScore(value));
});

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element in index.html");

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
