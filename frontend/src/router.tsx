import { createBrowserRouter } from "react-router";

import { Layout } from "@/components/layout/layout";
import { AppChat } from "@/pages/AppChat";
import { Apps } from "@/pages/Apps";
import { Connections } from "@/pages/Connections";
import { DatabricksConnectionPage } from "@/pages/DatabricksConnectionPage";
import { Home } from "@/pages/Home";
import { SnowflakeConnectionPage } from "@/pages/SnowflakeConnectionPage";

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
        path: "apps/new",
        element: <Apps autoOpenCreateDialog={true} />,
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
        path: "connections/snowflake/:connectionId",
        element: <SnowflakeConnectionPage />,
      },
      {
        path: "connections/databricks/new",
        element: <DatabricksConnectionPage />,
      },
      {
        path: "connections/databricks/:connectionId",
        element: <DatabricksConnectionPage />,
      },
    ],
  },
]);
