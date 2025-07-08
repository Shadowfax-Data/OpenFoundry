import { createBrowserRouter } from "react-router";
import { Layout } from "@/components/layout";
import { Home } from "@/pages/Home";
import { Apps } from "@/pages/Apps";
import { AppChat } from "@/pages/AppChat";
import { Connections } from "@/pages/Connections";
import { SnowflakeConnectionPage } from "@/pages/SnowflakeConnectionPage";
import { DatabricksConnectionPage } from "@/pages/DatabricksConnectionPage";

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
      {
        path: "connections",
        element: <Connections />,
      },
      {
        path: "connections/snowflake/new",
        element: <SnowflakeConnectionPage />,
      },
      {
        path: "connections/databricks/new",
        element: <DatabricksConnectionPage />,
      },
    ],
  },
]);
