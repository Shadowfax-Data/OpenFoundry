import { createBrowserRouter } from "react-router";
import { Layout } from "@/components/layout";
import { Home } from "@/pages/Home";
import { Apps } from "@/pages/Apps";
import { AppChat } from "@/pages/AppChat";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "apps",
        element: <Apps />,
      },
      {
        path: "apps/:appId/sessions/:sessionId/chat",
        element: <AppChat />,
      },
    ],
  },
]);
