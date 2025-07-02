import { BrowserRouter as Router, Routes, Route } from "react-router";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import AppBuilder from "./pages/AppBuilder";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="app-builder" element={<AppBuilder />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
